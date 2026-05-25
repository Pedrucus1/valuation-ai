/**
 * batch_fix_datos.js — Aplica todas las correcciones de datos en un solo pase.
 * Toca: cerebro_datos.json, colonias_nse.json, colonias_similares.json
 * Uso: node batch_fix_datos.js
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const cerebro = JSON.parse(fs.readFileSync(path.join(DIR,'cerebro_datos.json'),'utf8'));
const NSE     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let cerebro_changes = 0;
let nse_changes = 0;
let sim_changes = 0;

// ═══════════════════════════════════════════════════════════════════════════
// 1. CEREBRO: correcciones de municipio y colonia
// ═══════════════════════════════════════════════════════════════════════════
const cerebro_fixes_muni = {
    'Tesistán': 'Zapopan',          // Tesistán es localidad de Zapopan
    'tesistan': 'Zapopan',
    'Tesistan': 'Zapopan',
};
const cerebro_fixes_colonia = {
    // folio → { municipio?, sujetoColonia }
    'OPI-23-9-09-OF':  { sujetoColonia: 'Jardin Real' },
    'OPI-24-6-32-OF':  { sujetoColonia: 'Senderos de Monte Verde' },
    'OPI-24-5-23-EK':  { sujetoColonia: 'Mirador de San Isidro' },
    'OPI-24-10-09-AV': { sujetoColonia: 'Nuevo Mexico', municipio: 'Zapopan' },
    'OPI-26-2-01-OF':  { sujetoColonia: 'Miguel Hidalgo' },
    'OPI-23-9-12-OF':  { sujetoColonia: 'Independencia Oriente' },  // limpia sufijo ciudad + ortografía
};

for (const o of cerebro) {
    let changed = false;
    // Fix municipios
    if (cerebro_fixes_muni[o.municipio]) {
        console.log(`  MUNI FIX: ${o.folio} "${o.municipio}" → "Zapopan"`);
        o.municipio = 'Zapopan';
        changed = true;
    }
    // Fix colonia/municipio por folio
    if (o.folio && cerebro_fixes_colonia[o.folio]) {
        const fix = cerebro_fixes_colonia[o.folio];
        if (fix.sujetoColonia && fix.sujetoColonia !== o.sujetoColonia) {
            console.log(`  COL FIX: ${o.folio} "${o.sujetoColonia}" → "${fix.sujetoColonia}"`);
            o.sujetoColonia = fix.sujetoColonia;
            changed = true;
        }
        if (fix.municipio && fix.municipio !== o.municipio) {
            console.log(`  MUNI FIX2: ${o.folio} "${o.municipio}" → "${fix.municipio}"`);
            o.municipio = fix.municipio;
            changed = true;
        }
    }
    if (changed) cerebro_changes++;
}

fs.writeFileSync(path.join(DIR,'cerebro_datos.json'), JSON.stringify(cerebro, null, 2));
console.log(`✅ cerebro_datos.json: ${cerebro_changes} OPIs corregidos\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. NSE: correcciones de valores erróneos
// ═══════════════════════════════════════════════════════════════════════════
const nse_updates = {
    // Colonias con NSE completamente erróneo (económico/lujo cuando no corresponde)
    'mesa colorada poniente': { nse:'medio', nseIdx:3, medianaPm2:20000 },          // norte Zapopan mid-range, cap era $4,250!
    'la providencia':         { nse:'medio-bajo', nseIdx:2, medianaPm2:15000 },     // Tonalá, IDX $19,667, cap era $7,056!
    'villa fontana':          { nse:'medio-bajo', nseIdx:2, medianaPm2:16500 },     // Zapopan, IDX $18,333, cap era $26,538 (muy alto)
    'haciendas del valle':    { nse:'medio-bajo', nseIdx:2, medianaPm2:20000 },     // Tlajomulco, cap era $31,290 (muy alto)
    'mezquitan country':      { nse:'medio-alto', nseIdx:4, medianaPm2:27371 },     // GDL, era "lujo/5 $56,629" pero es zona media-alta
    'emiliano zapata':        { nse:'medio-bajo', nseIdx:2, medianaPm2:14634 },     // Zapopan IDX n=1 $14,634, era $19,089
    // Colonias sin NSE que lo necesitan
    'nueva santa maria':      { nse:'medio-bajo', nseIdx:2, medianaPm2:16534 },
    'pinar de las palomas':   { nse:'medio-bajo', nseIdx:2, medianaPm2:16402 },
    'independencia oriente':  { nse:'medio', nseIdx:3, medianaPm2:28000 },          // GDL, NSE ya existía con $31,591 — ajustar a $28k
    'jardines del vergel':    { nse:'medio-bajo', nseIdx:2, medianaPm2:24000 },     // Tlajomulco
    'san martin':             { nse:'medio-bajo', nseIdx:2, medianaPm2:15000 },     // GDL barrio popular
    'villas de guadalupe':    { nse:'medio-bajo', nseIdx:2, medianaPm2:16549 },     // Zapopan
    'vallarta la patria':     { nse:'alto', nseIdx:5, medianaPm2:38024 },           // Zapopan high-end
    'lagos del country':      { nse:'alto', nseIdx:5, medianaPm2:40000 },           // Zapopan high-end
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? JSON.stringify(NSE[col]) : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" ${prev} → ${JSON.stringify(NSE[col])}`);
    nse_changes++;
}

fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ colonias_nse.json: ${nse_changes} entradas actualizadas\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. SIMILARES: reemplazar entradas basura, agregar nuevas
// ═══════════════════════════════════════════════════════════════════════════
function sim(arr) {
    // arr = [colonia, peso]
    return arr.map(([c,p]) => ({ colonia: c, peso: p }));
}

const sim_updates = {
    // ── Entradas con datos BASURA que deben reemplazarse ──────────────────
    'mesa colorada poniente': sim([
        ['valle imperial',20],['nuevo mexico',18],['bosques vallarta',16],
        ['ionamiento valle imperial',14],['sol de vallarta',12],
    ]),
    'la providencia': sim([
        ['loma dorada a',20],['coyula',18],['hacienda del real',16],
        ['vistas del pedregal i',14],['urbi quinta montecarlo',12],
    ]),
    'villa fontana': sim([
        ['tesistan',20],['mariano otero',18],['mirador del bosque',16],
        ['el campanario',14],['la moraleja',12],
    ]),
    'haciendas del valle': sim([
        ['senderos de monte verde',20],['santa cruz del valle',18],
        ['villa california',16],['real del valle',14],['adamar',12],
    ]),
    'lagos del country': sim([
        ['valle real',20],['virreyes',18],['puerta de hierro',16],
        ['ciudad granja',14],['las canadas',12],
    ]),
    'emiliano zapata': sim([
        ['la primavera',20],['el campanario',18],['miramar',16],['paraisos del colli',14],
    ]),
    'mezquitan country': sim([
        ['moderna',20],['verde valle',18],['bosques de la victoria',16],
        ['jardines de la cruz',14],['santa teresita',12],
    ]),
    'vallarta la patria': sim([
        ['la estancia',20],['ciudad granja',18],['virreyes',16],['solares',14],['jardin real',12],
    ]),
    'nueva santa maria': sim([
        ['alcalde barranquitas',20],['belisario dominguez',18],['el retiro',16],
        ['huentitan el bajo',14],['san juan bosco',12],
    ]),
    'pinar de las palomas': sim([
        ['loma dorada a',20],['coyula',18],['hacienda del real',16],
        ['vistas del pedregal i',14],['tonala centro',12],
    ]),
    'independiencia oriente guadalajara': [], // vaciar — el OPI se corrigió a "independencia oriente"
    // ── Entradas NUEVAS ───────────────────────────────────────────────────
    'jardines del vergel': sim([
        ['san agustin',20],['bosques santa anita',18],['santa anita',16],['nueva galicia',14],
    ]),
    'san martin': sim([
        ['moderna',20],['santa teresita',18],['jardines de la cruz',16],['guadalajara centro',14],
    ]),
    'villas de guadalupe': sim([
        ['tesistan',20],['parques de tesistan',18],['mariano otero',16],['mirador del bosque',14],
    ]),
    'independencia oriente': sim([
        ['americana',20],['moderna',18],['verde valle',16],
        ['bosques de la victoria',14],['guadalajara centro',12],
    ]),
    'pinar de las palomas': sim([
        ['loma dorada a',20],['coyula',18],['hacienda del real',16],
        ['vistas del pedregal i',14],['tonala centro',12],
    ]),
    // ── Fixes adicionales para otras colonias con garbage ─────────────────
    'bugambilias 2da seccion': sim([
        ['colinas de san javier',20],['bugambilias',18],['jardines de santa izabel',16],
    ]),
    'colonia san antonio': sim([
        ['jardines del country',20],['jardines del bosque',18],['jardines alcalde',16],
    ]),
    'arroyo hondo': sim([
        ['colinas de san javier',20],['bugambilias',18],['jardines de santa izabel',16],
    ]),
    'colli urbano': sim([
        ['parques de tesistan',20],['zapopan centro',18],['tesistan',16],['nuevo mexico',14],
    ]),
};

for (const [col, sims] of Object.entries(sim_updates)) {
    const prev_len = SIM[col] ? SIM[col].length : 0;
    SIM[col] = sims;
    console.log(`  SIM: "${col}" ${prev_len} entradas → ${sims.length} entradas`);
    sim_changes++;
}

fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ colonias_similares.json: ${sim_changes} entradas actualizadas\n`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`TOTAL: ${cerebro_changes} cerebro + ${nse_changes} NSE + ${sim_changes} similares`);
