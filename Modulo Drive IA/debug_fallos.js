require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { valuarPropiedad, normTipo, normCol, normMuni, M2C_ATIPICA } = require('./motor_romina_api');

const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
const IDX     = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));

function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    return m ? parseFloat(m[0].replace(/,/g,'')) : 0;
}

// Folios que fallan >20%
const FOLIOS_FALLO = [
    'OPI-26-2-21-OF','OPI-26-3-03-OF','OPI-26-2-19-OF','OPI-26-4-04-OF',
    'OPI-26-2-14-OF','OPI-26-2-06-OF','OPI-26-1-19-OF','OPI-26-2-26-OF',
    'OPI-26-2-03-OF','OPI-26-3-01-OF','OPI-26-2-08-OF','OPI-26-4-08-OF',
    'OPI-26-2-13-OF','OPI-26-2-02-OF'
];

const opisFallo = cerebro.filter(o => FOLIOS_FALLO.includes(o.folio));

for (const opi of opisFallo) {
    const valorPerito = parsePesos(opi.valorMercado);
    const m2C = parsePesos(opi.m2Construccion);
    const prop = {
        tipo: normTipo(opi.tipo || 'casa'),
        construccion: m2C,
        terreno: parsePesos(opi.m2Terreno) || 0,
        edad: parsePesos(opi.edad) || 0,
        estadoConservacion: opi.estadoConservacion || 'bueno',
        recamaras: 3, banos: 2,
        municipio: opi.municipio || '',
        colonia: opi.sujetoColonia || '',
    };

    const result = valuarPropiedad(prop);
    const diff = ((result.valor - valorPerito) / valorPerito * 100).toFixed(1);

    const muniNorm = normMuni(prop.municipio);
    const colNorm  = normCol(prop.colonia);
    const muniIdx  = IDX[muniNorm] || IDX[prop.municipio.toLowerCase()] || {};

    // Ver qué hay en el cache para esta colonia
    const tipoIdx = muniIdx[prop.tipo] || {};
    const exacta  = tipoIdx[colNorm];
    const pm2cExacta = exacta ? Math.round(exacta.medianaPm2c) : 0;
    const nExacta    = exacta ? exacta.count : 0;

    // Mediana general del municipio/tipo
    let totalCount = 0, sumaMedianas = 0, nCols = 0;
    for (const [col, data] of Object.entries(tipoIdx)) {
        if (data.medianaPm2c > 0) { sumaMedianas += data.medianaPm2c; totalCount += data.count; nCols++; }
    }
    const pm2cGeneral = nCols ? Math.round(sumaMedianas / nCols) : 0;

    console.log(`\n── ${opi.folio} | ${opi.municipio} / ${opi.sujetoColonia}`);
    console.log(`   tipo:${prop.tipo} m2C:${m2C} edad:${prop.edad} conserv:${prop.estadoConservacion}`);
    console.log(`   perito:$${Math.round(valorPerito/1000)}k  motor:$${Math.round(result.valor/1000)}k  diff:${diff}%  pool:${result.poolTipo} n:${result.nComps}`);
    console.log(`   pm2c motor:$${result.pm2cAvg}/m²  |  exacta cache: $${pm2cExacta}/m² (n=${nExacta})  |  general muni: $${pm2cGeneral}/m² (${nCols} cols)`);
    console.log(`   pm2c perito implícito: $${Math.round(valorPerito/m2C)}/m²`);
    if (result.nComps < 4) console.log(`   ⚠️  POCOS COMPS — candidato para Gemini`);
    if (pm2cExacta > 0 && Math.abs(pm2cExacta - valorPerito/m2C) / (valorPerito/m2C) > 0.3)
        console.log(`   ⚠️  Cache exacta muy diferente al perito (${Math.round(pm2cExacta)} vs ${Math.round(valorPerito/m2C)})`);
}
