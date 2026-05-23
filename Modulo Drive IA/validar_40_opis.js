/**
 * validar_40_opis.js — Validación inline de motor Romina vs valores del perito
 * Uso: node validar_40_opis.js [--n 40] [--skip N]
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const { valuarPropiedadCompleto, normTipo, M2C_ATIPICA } = require('./motor_romina_api');

const args  = process.argv.slice(2);
const N     = parseInt(args[args.indexOf('--n') !== -1 ? args.indexOf('--n') + 1 : -1] || 40);
const SKIP  = parseInt(args[args.indexOf('--skip') !== -1 ? args.indexOf('--skip') + 1 : -1] || 0);

const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    if (!m) return 0;
    return parseFloat(m[0].replace(/,/g, '')) || 0;
}

const TIPOS_RESIDENCIAL = [
    'CASA HABITACIÓN','DEPARTAMENTO EN CONDOMINIO','CASA HABITACIÓN EN CONDOMINIO',
    'CASA HABITACIÓN CON LOCAL','CASA HABITACIÓN TIPO DÚPLEX','CASA HABITACIÓN TIPO DUPLEX',
    'DEPARTAMENTO CON TERRAZA','DEPARTAMENTO EN CONDOMINIO LOCKOFF'
];

// Municipios válidos del AMG (para detectar municipio mal extraído)
const MUNIS_VALIDOS = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto','chapala',
    'ocotlan','tepatitlan','lagos de moreno','autlan','puerto vallarta',
    'la huerta','cihuatlan','cabo corrientes','tala','ameca',
    'tesistan','nextipac','cocula'
]);

function muniValido(m) {
    const n = (m||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
    return MUNIS_VALIDOS.has(n) || n.length >= 4;
}

const MUNIS_AMG = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto'
]);
function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
}

const candidatos = cerebro.filter(o =>
    TIPOS_RESIDENCIAL.some(t => (o.tipo||'').toUpperCase().startsWith(t.slice(0,10)))
    && MUNIS_AMG.has(normSimple(o.municipio))
    && parsePesos(o.valorMercado) > 0
    && parsePesos(o.m2Construccion) > 0
);

const muestra = candidatos.slice(SKIP, SKIP + N);
console.log(`\n=== VALIDACIÓN ROMINA vs PERITO — OPIs ${SKIP+1}–${SKIP+muestra.length} de ${candidatos.length} candidatos ===\n`);

const resultados = [];

async function main() {
for (const opi of muestra) {
    const valorPerito = parsePesos(opi.valorMercado);
    const m2C   = parsePesos(opi.m2Construccion);
    const m2T   = parsePesos(opi.m2Terreno) || 0;
    const edad  = parsePesos(opi.edad) || 0;

    const prop = {
        tipo:              normTipo(opi.tipo || 'casa'),
        construccion:      m2C,
        terreno:           m2T,
        edad,
        estadoConservacion: opi.estadoConservacion || 'bueno',
        recamaras:         parsePesos(opi.recamaras) || 3,
        banos:             parsePesos(opi.banos) || 2,
        municipio:         opi.municipio || '',
        colonia:           opi.sujetoColonia || '',
    };

    let motorResult;
    try { motorResult = await valuarPropiedadCompleto(prop); }
    catch (e) { motorResult = { valor: 0, nComps: 0, poolTipo: '?', error: e.message }; }

    const valorMotor = motorResult.valor || 0;
    const diff = valorPerito > 0 ? ((valorMotor - valorPerito) / valorPerito) * 100 : null;
    const ok    = diff !== null && Math.abs(diff) <= 10;
    const cerca = diff !== null && Math.abs(diff) <= 20;

    const label = motorResult.error === 'atipica' ? '🔶 ATIP '
        : diff === null   ? '❌ N/A  '
        : ok              ? '✅ ±10% '
        : cerca           ? '⚠️  ±20% '
        :                   '❌ FALLA ';

    const folio   = (opi.folio || '?').padEnd(16);
    const muni    = (opi.municipio || '').slice(0,11).padEnd(11);
    const col     = (opi.sujetoColonia || '').slice(0,20).padEnd(20);
    const pool    = (motorResult.poolTipo || '?').slice(0,8).padEnd(8);
    const nC      = String(motorResult.nComps || 0).padStart(3);
    const diffStr = diff !== null ? ((diff>0?'+':'')+diff.toFixed(1)+'%').padStart(7) : '    N/A';

    console.log(
        `${label}${folio} ${muni} ${col}` +
        `  perito:${Math.round(valorPerito/1000).toString().padStart(6)}k` +
        `  motor:${Math.round(valorMotor/1000).toString().padStart(6)}k` +
        `  diff:${diffStr}  pool:${pool} n:${nC}` +
        (motorResult.factorMixto ? ' [mixto]' : '')
    );

    resultados.push({ folio: opi.folio, diff, ok, cerca, pool: motorResult.poolTipo, nComps: motorResult.nComps, error: motorResult.error });
}

// ── Resumen ───────────────────────────────────────────────────────────────────
const conDiff  = resultados.filter(r => r.diff !== null && r.error !== 'atipica');
const en10     = conDiff.filter(r => Math.abs(r.diff) <= 10);
const en20     = conDiff.filter(r => Math.abs(r.diff) <= 20);
const avgAbs   = conDiff.length ? conDiff.reduce((s,r) => s+Math.abs(r.diff),0) / conDiff.length : 0;
const sorted   = [...conDiff].sort((a,b) => Math.abs(a.diff)-Math.abs(b.diff));
const mediana  = sorted[Math.floor(sorted.length/2)]?.diff ?? 0;
const sinComps = resultados.filter(r => !r.error && r.nComps === 0 || r.error === 'sin_comps');
const atip     = resultados.filter(r => r.error === 'atipica');

const pools = {};
resultados.forEach(r => { const k = r.pool||'?'; pools[k]=(pools[k]||0)+1; });

console.log('\n─────────────────────────────────────────────────────────');
console.log(`✅ dentro ±10%:  ${en10.length}/${conDiff.length} (${(en10.length/conDiff.length*100||0).toFixed(1)}%)`);
console.log(`⚠️  dentro ±20%:  ${en20.length}/${conDiff.length} (${(en20.length/conDiff.length*100||0).toFixed(1)}%)`);
console.log(`📊 diff abs promedio: ${avgAbs.toFixed(1)}%  |  mediana diff: ${mediana.toFixed(1)}%`);
console.log(`🔴 sin comps: ${sinComps.length}  |  atípicas: ${atip.length}`);
console.log(`Pools: ${Object.entries(pools).map(([k,v])=>`${k}:${v}`).join(' | ')}`);

const fallos = conDiff.filter(r => Math.abs(r.diff) > 20);
if (fallos.length) {
    console.log(`\nFUERA ±20% (${fallos.length}):`);
    fallos.sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff))
          .forEach(r => console.log(`  ${(r.folio||'?').padEnd(16)} diff:${(r.diff>0?'+':'')+r.diff.toFixed(1)}%  pool:${r.pool||'?'}  n:${r.nComps||0}`));
}
console.log('');
} // end main()

main().catch(console.error);
