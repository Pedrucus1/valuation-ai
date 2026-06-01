/**
 * comparar_nse_fuentes.js
 * Compara accuracy del motor con 3 cascadas de fuente NSE:
 *   Modo 1 (actual):  v1 → v2 → idx_valoracion
 *   Modo 2 (v2 prim): v2 → v1 → idx_valoracion
 *   Modo 3 (idx puro): idx_valoracion solo (sin v1 ni v2)
 *
 * Uso: node comparar_nse_fuentes.js [--n 80] [--desde 2025-07]
 *
 * Estrategia: intercambia los archivos NSE temporalmente y re-require el motor
 * entre cada modo. Restaura siempre al terminar (try/finally).
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');

const DIR = __dirname;
const CEREBRO_PATH = path.join(DIR, 'cerebro_datos.json');
const NSE_V1_PATH  = path.join(DIR, 'colonias_nse.json');
const NSE_V2_PATH  = path.join(DIR, 'colonias_nse_v2.json');
const NSE_BAK_PATH = path.join(DIR, 'colonias_nse.json._bak_test');

// ── Filtros CLI ────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const N      = parseInt(args[args.indexOf('--n') + 1] || 200);
const DESDE_RAW = args[args.indexOf('--desde') + 1] || null;
const DESDE_ANIO = DESDE_RAW ? parseInt(DESDE_RAW.split('-')[0]) : 0;
const DESDE_MES  = DESDE_RAW ? parseInt(DESDE_RAW.split('-')[1] || '1') : 0;

// ── OPIs excluidos (misma lista que validar_40_opis.js) ───────────────────────
const EXCLUIR = new Set([
    'OPI-26-1-15-OF','OPI-25-11-12-OF','OPI-25-7-21-LM','OPI-25-7-20-LM',
    'OPI-25-3-06-AV','OPI-26-3-22-OF','OPI-26-3-23-OF','OPI-26-3-19-OF',
]);

function cleanNum(s) {
    if (!s) return 0;
    return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
}

function parseFecha(folio) {
    const m = folio.match(/OPI-(\d{2})-(\d{1,2})-/);
    if (!m) return { anio: 0, mes: 0 };
    return { anio: 2000 + parseInt(m[1]), mes: parseInt(m[2]) };
}

// Cargar cerebro y filtrar OPIs válidos
const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
const opis = cerebro.filter(p => {
    if (!p.folio || EXCLUIR.has(p.folio)) return false;
    if (!p.valorMercado || !p.m2Construccion) return false;
    const m2c = cleanNum(p.m2Construccion);
    if (m2c <= 0 || m2c > 300) return false;
    if (DESDE_RAW) {
        const { anio, mes } = parseFecha(p.folio);
        if (anio < DESDE_ANIO || (anio === DESDE_ANIO && mes < DESDE_MES)) return false;
    }
    return true;
}).slice(0, N);

console.log(`OPIs a evaluar: ${opis.length} | NSE desde: ${DESDE_RAW || 'todos'}\n`);

// ── Cargar motor fresco para cada modo ────────────────────────────────────────
function cargarMotor() {
    // Limpiar cache de require para forzar recarga
    Object.keys(require.cache).forEach(k => {
        if (k.includes('motor_remi_api') || k.includes('cache_index') ||
            k.includes('colonias_nse') || k.includes('idx_valoracion') ||
            k.includes('colonias_similares')) {
            delete require.cache[k];
        }
    });
    return require('./motor_remi_api');
}

// ── Correr un modo ─────────────────────────────────────────────────────────────
function correrModo(label) {
    const motor = cargarMotor();
    const { valuarPropiedad } = motor;

    let dentro10 = 0, dentro20 = 0, total = 0;
    const errores = [];
    const fuera = [];

    for (const p of opis) {
        const perito = cleanNum(p.valorMercado);
        if (perito <= 0) continue;

        const prop = {
            tipo:              p.tipo || 'CASA HABITACIÓN',
            construccion:      cleanNum(p.m2Construccion),
            terreno:           cleanNum(p.m2Terreno),
            edad:              cleanNum(p.edad),
            estadoConservacion: (p.estadoConservacion || 'regular_medio').toLowerCase().replace(/\s+/g, '_'),
            municipio:         p.municipio || '',
            colonia:           p.sujetoColonia || '',
            esEjidal:          p.esEjidal || false,
        };

        try {
            const r = valuarPropiedad(prop);
            if (!r || r.valor <= 0) continue;
            const dif = (r.valor - perito) / perito * 100;
            const absDif = Math.abs(dif);
            total++;
            if (absDif <= 10) dentro10++;
            if (absDif <= 20) dentro20++;
            errores.push(absDif);
            if (absDif > 20) fuera.push({ folio: p.folio, dif: Math.round(dif), pool: r.poolTipo, n: r.nComps });
        } catch(e) {
            // skip
        }
    }

    const sorted = [...errores].sort((a,b) => a-b);
    const mediana = sorted[Math.floor(sorted.length/2)] || 0;
    const errorAbs = errores.length ? errores.reduce((a,b)=>a+b,0)/errores.length : 0;

    return { label, total, dentro10, dentro20, errorAbs: Math.round(errorAbs*10)/10, mediana: Math.round(mediana*10)/10, fuera };
}

// ── Ejecutar los 3 modos ───────────────────────────────────────────────────────
const resultados = [];

// Copias originales
const v1Original = fs.readFileSync(NSE_V1_PATH);
const v2Content  = fs.existsSync(NSE_V2_PATH) ? fs.readFileSync(NSE_V2_PATH) : null;

try {
    // MODO 1: actual (v1 → v2 → idx)
    console.log('Corriendo Modo 1: v1 → v2 → idx (actual)...');
    resultados.push(correrModo('Modo 1: v1→v2→idx (actual)'));

    // MODO 2: v2 primero (v2 → v1 → idx)
    // Swap: poner v2 en lugar de v1
    if (v2Content) {
        console.log('Corriendo Modo 2: v2 → v1 → idx...');
        fs.writeFileSync(NSE_BAK_PATH, v1Original);   // backup de v1
        fs.writeFileSync(NSE_V1_PATH, v2Content);      // v2 como primario
        resultados.push(correrModo('Modo 2: v2→v1→idx'));
        fs.writeFileSync(NSE_V1_PATH, v1Original);     // restaurar v1
        if (fs.existsSync(NSE_BAK_PATH)) fs.unlinkSync(NSE_BAK_PATH);
    } else {
        resultados.push({ label: 'Modo 2: v2→v1→idx', total: 0, dentro10: 0, dentro20: 0, errorAbs: 0, mediana: 0, fuera: [], nota: 'Sin v2' });
    }

    // MODO 3: idx puro (vaciar v1 y v2 para que solo use idx_valoracion)
    console.log('Corriendo Modo 3: idx_valoracion solo...');
    const vacio = Buffer.from('{}');
    fs.writeFileSync(NSE_BAK_PATH, v1Original);
    fs.writeFileSync(NSE_V1_PATH, vacio);
    resultados.push(correrModo('Modo 3: idx_valoracion solo'));
    fs.writeFileSync(NSE_V1_PATH, v1Original);
    if (fs.existsSync(NSE_BAK_PATH)) fs.unlinkSync(NSE_BAK_PATH);

} finally {
    // Restaurar siempre, pase lo que pase
    fs.writeFileSync(NSE_V1_PATH, v1Original);
    if (fs.existsSync(NSE_BAK_PATH)) fs.unlinkSync(NSE_BAK_PATH);
    console.log('Archivos NSE restaurados.\n');
}

// ── Reporte ────────────────────────────────────────────────────────────────────
console.log('═'.repeat(65));
console.log('COMPARACIÓN NSE: v1 vs v2 vs idx_valoracion');
console.log('═'.repeat(65));
console.log(`${'Modo'.padEnd(28)} ${'±10%'.padStart(6)} ${'±20%'.padStart(6)} ${'ErrAbs'.padStart(7)} ${'Med'.padStart(6)}`);
console.log('─'.repeat(65));

let ganador10 = '', maxPct10 = 0;
for (const r of resultados) {
    if (!r.total) { console.log(`${r.label.padEnd(28)} ${r.nota || 'sin datos'}`); continue; }
    const pct10 = Math.round(r.dentro10/r.total*100);
    const pct20 = Math.round(r.dentro20/r.total*100);
    const marker = pct10 > maxPct10 ? ' ←' : '';
    if (pct10 > maxPct10) { maxPct10 = pct10; ganador10 = r.label; }
    console.log(`${r.label.padEnd(28)} ${(pct10+'%').padStart(6)} ${(pct20+'%').padStart(6)} ${(r.errorAbs+'%').padStart(7)} ${(r.mediana+'%').padStart(6)}${marker}`);
}

console.log('─'.repeat(65));
console.log(`\nMejor ±10%: ${ganador10}`);

// Detalle de fuera ±20% por modo
for (const r of resultados) {
    if (!r.fuera || !r.fuera.length) continue;
    console.log(`\n[${r.label}] OPIs fuera ±20% (${r.fuera.length}):`);
    r.fuera.forEach(f => console.log(`  ${f.folio}  ${(f.dif>0?'+':'')+f.dif}%  pool:${f.pool}  n:${f.n}`));
}
