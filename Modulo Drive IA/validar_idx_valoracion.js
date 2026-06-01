/**
 * validar_idx_valoracion.js
 *
 * Compara idx_valoracion.json vs colonias_nse.json (v1) para detectar
 * divergencias antes de conectar el índice nuevo al motor.
 *
 * Reporta:
 *  - Colonias calibradas en v1 que tienen entrada en idx (¿valores alineados?)
 *  - Colonias nuevas en idx sin entrada en v1 (cobertura ganada)
 *  - Divergencias de nseIdx y medianaPm2 por tipo
 *  - Resumen de confianza por tipo
 *
 * Uso:
 *   node validar_idx_valoracion.js
 *   node validar_idx_valoracion.js --tipo depto     (filtrar por tipo)
 *   node validar_idx_valoracion.js --divergencias    (solo casos con diff NSE)
 */

const fs   = require('fs');
const path = require('path');

const IDX_V_PATH  = path.join(__dirname, 'idx_valoracion.json');
const NSE_V1_PATH = path.join(__dirname, 'colonias_nse.json');
const NSE_V2_PATH = path.join(__dirname, 'colonias_nse_v2.json');

const args          = process.argv.slice(2);
const filtroTipo    = args.find((_, i) => args[i - 1] === '--tipo') || null;
const soloDiverg    = args.includes('--divergencias');
const soloNuevas    = args.includes('--nuevas');

const idxV   = JSON.parse(fs.readFileSync(IDX_V_PATH,  'utf8'));
const nseV1  = JSON.parse(fs.readFileSync(NSE_V1_PATH, 'utf8'));
const nseV2  = fs.existsSync(NSE_V2_PATH) ? JSON.parse(fs.readFileSync(NSE_V2_PATH, 'utf8')) : {};

const { _meta, ...colonias } = idxV;

// Colonias calibradas en v1 (tienen medianaPm2 manualmente ajustada o calculada)
const v1Keys = new Set(Object.keys(nseV1));

// ── Colonias calibradas en v1 conocidas del validador ────────────────────────
// Estas son las que más importa que no rompamos
const CALIBRADAS = new Set([
    'jardines de la calera','miguel hidalgo','heliodoro hernandez loza',
    'colli urbano','naturezza','loma bonita ejidal','tinajitas',
    'cortijo san agustin','real del valle','provenza',
    'tabachines','santa margarita','lagos de oriente','el fortin',
    'colinas del rey','rancho nuevo','ahujas','la experiencia',
    'vista california','haciendas de san jose','canadas de san lorenzo',
    'villas belenes','el bethel','el campanario','el castillo',
    'parques de la victoria','j de guadalupe','colon industrial',
    'la guadalupana','altagracia','el cerrito','san isidro ejidal',
    'zapopan','las conchas','la paz','miravalle','tabachines',
    'villas de la hacienda','el batan','paseos del sol',
    'campo real','colinas de santa anita','hacienda santa fe',
    'mision del bosque','balcones de oblatos','san elias',
]);

const TIPOS = filtroTipo ? [filtroTipo] : ['casa', 'depto', 'terreno', 'bodega'];

// ── Análisis ──────────────────────────────────────────────────────────────────
const stats = {
    totalColonias: Object.keys(colonias).length,
    conV1:         0,
    nuevas:        0,
    calibradasConIdx: 0,
    calibradasSinIdx: 0,
};

const divergencias  = []; // { col, tipo, v1pm2, idxPm2, v1nse, idxNse, diff% }
const nuevasBuenas  = []; // { col, tipo, seg, medianaPm2, nListings, nse }
const calibradasOk  = []; // { col, tipo, v1pm2, idxPm2, diff% }

for (const [col, tipos] of Object.entries(colonias)) {
    const enV1 = v1Keys.has(col);
    if (enV1) stats.conV1++; else stats.nuevas++;

    for (const tipo of TIPOS) {
        const tipoData = tipos[tipo];
        if (!tipoData?.global) continue;

        const idxEntry = tipoData.global;

        if (!enV1) {
            nuevasBuenas.push({
                col, tipo,
                medianaPm2: idxEntry.medianaPm2,
                nListings:  idxEntry.nListings,
                nse:        idxEntry.nse,
                nseIdx:     idxEntry.nseIdx,
                fuente:     idxEntry.fuente,
            });
            continue;
        }

        const v1 = nseV1[col];
        const diffPm2  = ((idxEntry.medianaPm2 - v1.medianaPm2) / v1.medianaPm2 * 100).toFixed(1);
        const diffNse  = idxEntry.nseIdx - v1.nseIdx;
        const esCal    = CALIBRADAS.has(col);

        if (diffNse !== 0 || Math.abs(parseFloat(diffPm2)) > 20) {
            divergencias.push({
                col, tipo,
                calibrada: esCal,
                v1pm2:  v1.medianaPm2,
                idxPm2: idxEntry.medianaPm2,
                diffPm2: parseFloat(diffPm2),
                v1nse:  v1.nse,
                idxNse: idxEntry.nse,
                diffNse,
                nListings: idxEntry.nListings,
            });
        } else {
            calibradasOk.push({ col, tipo, v1pm2: v1.medianaPm2, idxPm2: idxEntry.medianaPm2, diffPm2: parseFloat(diffPm2) });
        }
    }
}

// Colonias calibradas sin entrada en idx
for (const col of CALIBRADAS) {
    if (!colonias[col]) stats.calibradasSinIdx++;
    else stats.calibradasConIdx++;
}

// ── Reporte ───────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════');
console.log('  VALIDACIÓN idx_valoracion.json vs colonias_nse.json');
console.log('═══════════════════════════════════════════════════════\n');

console.log('RESUMEN GENERAL:');
console.log(`  Colonias en idx_valoracion  : ${stats.totalColonias}`);
console.log(`  Con entrada en NSE v1       : ${stats.conV1}`);
console.log(`  Nuevas (no en v1)           : ${stats.nuevas}`);
console.log(`  Calibradas con idx          : ${stats.calibradasConIdx}`);
console.log(`  Calibradas SIN idx          : ${stats.calibradasSinIdx}  ← sin cobertura todavía`);

// Desglose por tipo
console.log('\nENTRADAS POR TIPO (global):');
for (const tipo of ['casa','depto','terreno','bodega']) {
    const n = Object.values(colonias).filter(t => t[tipo]?.global).length;
    console.log(`  ${tipo.padEnd(10)}: ${n} colonias`);
}

// ── Divergencias ──────────────────────────────────────────────────────────────
const divCalibradas = divergencias.filter(d => d.calibrada);
const divNoCalibradas = divergencias.filter(d => !d.calibrada);

if (!soloNuevas) {
    console.log(`\n─── DIVERGENCIAS (diff NSE o pm2 >20%) ───────────────────`);
    console.log(`  Total: ${divergencias.length}  |  En calibradas: ${divCalibradas.length}  |  Otras: ${divNoCalibradas.length}`);

    if (divCalibradas.length > 0) {
        console.log('\n  ⚠️  CALIBRADAS CON DIVERGENCIA — revisar antes de conectar:');
        divCalibradas
            .sort((a, b) => Math.abs(b.diffPm2) - Math.abs(a.diffPm2))
            .forEach(d => {
                const dir = d.diffPm2 > 0 ? '↑' : '↓';
                const nseChg = d.diffNse !== 0 ? ` NSE:${d.diffNse > 0 ? '+' : ''}${d.diffNse}` : '';
                console.log(
                    `    ${d.col.padEnd(34)} [${d.tipo}]  v1:$${d.v1pm2.toLocaleString()} → idx:$${d.idxPm2.toLocaleString()}  ${dir}${Math.abs(d.diffPm2)}%${nseChg}  n=${d.nListings}`
                );
            });
    }

    if (!soloDiverg && divNoCalibradas.length > 0) {
        console.log('\n  ℹ️  Otras divergencias (no calibradas, primeras 20):');
        divNoCalibradas
            .sort((a, b) => Math.abs(b.diffPm2) - Math.abs(a.diffPm2))
            .slice(0, 20)
            .forEach(d => {
                const dir = d.diffPm2 > 0 ? '↑' : '↓';
                const nseChg = d.diffNse !== 0 ? ` NSE:${d.diffNse > 0 ? '+' : ''}${d.diffNse}` : '';
                console.log(
                    `    ${d.col.padEnd(34)} [${d.tipo}]  v1:$${d.v1pm2.toLocaleString()} → idx:$${d.idxPm2.toLocaleString()}  ${dir}${Math.abs(d.diffPm2)}%${nseChg}  n=${d.nListings}`
                );
            });
    }

    console.log(`\n  ✅ Sin divergencia (diff NSE=0 y pm2 <20%): ${calibradasOk.length} entradas`);
}

// ── Colonias nuevas (en idx, no en v1) ───────────────────────────────────────
if (!soloDiverg) {
    const nuevasPorTipo = {};
    for (const t of TIPOS) {
        nuevasPorTipo[t] = nuevasBuenas.filter(n => n.tipo === t);
    }

    console.log('\n─── COBERTURA NUEVA (colonias en idx, no en v1) ──────────');
    for (const tipo of TIPOS) {
        const arr = nuevasPorTipo[tipo];
        if (!arr.length) continue;
        console.log(`\n  ${tipo.toUpperCase()} — ${arr.length} colonias nuevas:`);
        arr
            .sort((a, b) => b.nListings - a.nListings)
            .slice(0, 30)
            .forEach(n => {
                const fuenteTag = n.fuente === `idx-${_meta?.ventanaMeses || 18}m` ? ' 🕐' : '';
                console.log(
                    `    ${n.col.padEnd(34)} $${n.medianaPm2.toLocaleString()}/m² (${n.nse}, idx:${n.nseIdx})  n=${n.nListings}${fuenteTag}`
                );
            });
        if (arr.length > 30) console.log(`    ... y ${arr.length - 30} más`);
    }
}

// ── Segmentos disponibles para colonias calibradas ────────────────────────────
console.log('\n─── SEGMENTOS en colonias calibradas ─────────────────────');
let conSegs = 0;
for (const col of CALIBRADAS) {
    const entry = colonias[col];
    if (!entry) continue;
    for (const tipo of TIPOS) {
        const segs = entry[tipo];
        if (!segs) continue;
        const segKeys = Object.keys(segs).filter(k => k !== 'global');
        if (segKeys.length > 0) {
            conSegs++;
            const segStr = segKeys.map(k => {
                const s = segs[k];
                return `${k}:$${s.medianaPm2.toLocaleString()}(n=${s.nListings})`;
            }).join(' | ');
            console.log(`  ${col.padEnd(30)} [${tipo}] ${segStr}`);
        }
    }
}
if (conSegs === 0) console.log('  Ninguna colonia calibrada tiene segmentos con datos suficientes (n≥3)');

console.log('\n═══════════════════════════════════════════════════════\n');
