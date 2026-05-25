/**
 * generar_similares_sepomex.js
 * Genera colonias_similares_enriquecido.json usando IDX pm2c + sepomex.
 *
 * Estrategia:
 *   1. Para cada colonia en IDX (que tiene pm2c real), busca las N colonias
 *      más similares en pm2c dentro del mismo municipio y tipo.
 *   2. Para colonias del cerebro sin IDX, intenta asignar similares usando
 *      NSE disponible en colonias_nse.json.
 *   3. Escribe colonias_similares_enriquecido.json sin tocar colonias_similares.json.
 *
 * Uso: node generar_similares_sepomex.js [--min-n 3] [--radio 0.25] [--top 5]
 */
const fs   = require('fs');
const path = require('path');

const IDX   = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const NSE   = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_nse.json'), 'utf8'));
const SIM   = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_similares.json'), 'utf8'));
const SEP   = JSON.parse(fs.readFileSync(path.join(__dirname, 'sepomex_jalisco.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

const args   = process.argv.slice(2);
const MIN_N  = parseInt(args[args.indexOf('--min-n') !== -1 ? args.indexOf('--min-n')+1 : -1] || 2);
const RADIO  = parseFloat(args[args.indexOf('--radio') !== -1 ? args.indexOf('--radio')+1 : -1] || 0.30);
const TOP    = parseInt(args[args.indexOf('--top') !== -1 ? args.indexOf('--top')+1 : -1] || 6);

function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s]/g,'').trim();
}
function normCol(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ñ/g,'n').replace(/[^a-z0-9\s]/g,'').trim();
}

const MUNIS_AMG_NORM = {
    'guadalajara': 'guadalajara', 'zapopan': 'zapopan',
    'tlaquepaque': 'tlaquepaque', 'san pedro tlaquepaque': 'tlaquepaque',
    'tlajomulco': 'tlajomulco', 'tlajomulco de zuniga': 'tlajomulco',
    'tlajomulco de zuñiga': 'tlajomulco',
    'tonala': 'tonala', 'el salto': 'el salto',
};

// ── Construir tabla de pm2c por municipio+tipo+colonia ────────────────────
// Structure: { muni: { tipo: { colNorm: { pm2c, n } } } }
const PM2C = {};
for (const [muniRaw, tipos] of Object.entries(IDX)) {
    const muni = MUNIS_AMG_NORM[muniRaw] || muniRaw;
    if (!PM2C[muni]) PM2C[muni] = {};
    for (const [tipo, cols] of Object.entries(tipos)) {
        if (!PM2C[muni][tipo]) PM2C[muni][tipo] = {};
        for (const [col, d] of Object.entries(cols)) {
            if (d.count >= MIN_N && d.medianaPm2c > 3000 && d.medianaPm2c < 150000) {
                PM2C[muni][tipo][col] = { pm2c: Math.round(d.medianaPm2c), n: d.count };
            }
        }
    }
}

// ── Por cada colonia con pm2c, encontrar las más cercanas ─────────────────
function findSimilares(colNorm, muni, tipo, pm2cSujeto) {
    const cols = PM2C[muni]?.[tipo] || {};
    const candidates = Object.entries(cols)
        .filter(([c]) => c !== colNorm)
        .map(([c, d]) => ({ col: c, pm2c: d.pm2c, n: d.n, diff: Math.abs(d.pm2c - pm2cSujeto) / pm2cSujeto }))
        .filter(x => x.diff <= RADIO)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, TOP);
    return candidates.map((x, i) => ({ colonia: x.col, peso: Math.max(10, 20 - i * 2) }));
}

// ── Generar mapa de similares para todas las colonias con IDX ─────────────
const similares = {};
let generados = 0;
let yaEnMain = 0;

for (const [muni, tipos] of Object.entries(PM2C)) {
    for (const [tipo, cols] of Object.entries(tipos)) {
        for (const [colNorm, d] of Object.entries(cols)) {
            // Si ya tiene entrada en colonias_similares.json (el principal), no sobrescribir
            if (SIM[colNorm] !== undefined) { yaEnMain++; continue; }

            const sims = findSimilares(colNorm, muni, tipo, d.pm2c);
            if (sims.length >= 1) {
                if (!similares[colNorm]) {
                    similares[colNorm] = sims;
                    generados++;
                }
            }
        }
    }
}

// ── También generar para colonias del cerebro que tienen NSE pero no IDX ──
let porNSE = 0;
const MUNIS_AMG = new Set(['guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto']);

for (const o of cerebro) {
    const muniN = normSimple(o.municipio||'');
    if (!MUNIS_AMG.has(muniN)) continue;
    const colNorm = normCol(o.sujetoColonia||'');
    if (!colNorm || colNorm.length < 3) continue;
    if (SIM[colNorm] !== undefined || similares[colNorm] !== undefined) continue;

    const nseEntry = NSE[colNorm];
    if (!nseEntry || !nseEntry.medianaPm2) continue;

    // Tipo
    const tipoN = (o.tipo||'').toLowerCase().includes('depart') ? 'departamento' : 'casa';
    const muni = MUNIS_AMG_NORM[muniN] || muniN;

    const sims = findSimilares(colNorm, muni, tipoN, nseEntry.medianaPm2);
    if (sims.length >= 1) {
        similares[colNorm] = sims;
        porNSE++;
    }
}

// ── Guardar ───────────────────────────────────────────────────────────────
const OUTPUT = path.join(__dirname, 'colonias_similares_enriquecido.json');
// Merge con existente para no borrar entradas previas
let existente = {};
try { existente = JSON.parse(fs.readFileSync(OUTPUT, 'utf8')); } catch {}

const merged = { ...similares, ...existente };  // existente tiene prioridad
fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2));

// ── Reporte ───────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║      GENERADOR SIMILARES — SEPOMEX + IDX pm2c            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log(`Parámetros: min-n=${MIN_N}, radio=±${(RADIO*100).toFixed(0)}%, top=${TOP}`);
console.log(`Colonias con IDX procesadas (nuevas):  ${generados}`);
console.log(`Colonias por NSE (sin IDX):            ${porNSE}`);
console.log(`Ya en colonias_similares.json (skip):  ${yaEnMain}`);
console.log(`Total en ${path.basename(OUTPUT)}:     ${Object.keys(merged).length}`);

// Muestra de resultados
console.log('\n── Muestra de colonias generadas (por pm2c) ─────────────────');
Object.entries(similares).slice(0, 20).forEach(([col, sims]) => {
    const pm2c = PM2C['guadalajara']?.['casa']?.[col]?.pm2c
              || PM2C['zapopan']?.['casa']?.[col]?.pm2c
              || PM2C['tlajomulco']?.['casa']?.[col]?.pm2c
              || '?';
    const top3 = sims.slice(0,3).map(s => s.colonia).join(', ');
    console.log(`  ${col.slice(0,30).padEnd(30)} pm2c:${String(pm2c).padStart(6)} → ${top3}`);
});

console.log(`\n✅ Guardado en ${OUTPUT}`);
