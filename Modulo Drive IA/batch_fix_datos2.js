/**
 * batch_fix_datos2.js — Segunda ronda de correcciones
 * Uso: node batch_fix_datos2.js
 */
const fs   = require('fs');
const path = require('path');

const DIR    = __dirname;
const cerebro = JSON.parse(fs.readFileSync(path.join(DIR,'cerebro_datos.json'),'utf8'));
const NSE    = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM    = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let cc=0, nc=0, sc=0;

// ── 1. Cerebro ──────────────────────────────────────────────────────────────
const col_fixes = {
    'OPI-23-7-28-OF': { sujetoColonia: 'Guadalajara Centro' },  // IDX tiene exacta n=19 $20k para "guadalajara centro"
    'OPI-24-10-17-AV': { sujetoColonia: 'El Vergel' },          // limpia sufijo "to" que era basura
};

for (const o of cerebro) {
    if (o.folio && col_fixes[o.folio]) {
        const fix = col_fixes[o.folio];
        if (fix.sujetoColonia && fix.sujetoColonia !== o.sujetoColonia) {
            console.log(`  COL: ${o.folio} "${o.sujetoColonia}" → "${fix.sujetoColonia}"`);
            o.sujetoColonia = fix.sujetoColonia; cc++;
        }
    }
}
fs.writeFileSync(path.join(DIR,'cerebro_datos.json'), JSON.stringify(cerebro, null, 2));
console.log(`✅ cerebro: ${cc} cambios\n`);

// ── 2. NSE ──────────────────────────────────────────────────────────────────
const nse_updates = {
    'paseo de los agaves': { nse:'interes-social', nseIdx:1, medianaPm2:13028 },   // era $1,100 → catastrophic fix
    'miramar':             { nse:'medio-alto', nseIdx:4, medianaPm2:26175 },        // Zapopan, era nseIdx=2 $14,398
    'lomas de polanco':    { nse:'medio-bajo', nseIdx:2, medianaPm2:12880 },        // Zapopan, era $17,571 → NSE cap too high
    'villa hermosa':       { nse:'medio-bajo', nseIdx:2, medianaPm2:13235 },        // GDL, era nseIdx=3 $32,014 → catastrophic
    'lomas independencia': { nse:'medio-bajo', nseIdx:2, medianaPm2:17308 },        // GDL, IDX contaminado a $35k → cap correcto
    'rinconadas de coyula':{ nse:'interes-social', nseIdx:1, medianaPm2:12140 },   // Tonalá, perito pm2c real
    'echeverria':          { nse:'medio-bajo', nseIdx:2, medianaPm2:18000 },        // GDL Echeverría barrio
    'segunda seccion zona industrial': { nse:'medio-bajo', nseIdx:2, medianaPm2:12368 }, // zona industrial GDL, perito pm2c
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? `nseIdx=${NSE[col].nseIdx} pm2:${NSE[col].medianaPm2}` : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" [${prev}] → nseIdx=${vals.nseIdx} pm2:${vals.medianaPm2}`);
    nc++;
}
fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ NSE: ${nc} cambios\n`);

// ── 3. Similares ────────────────────────────────────────────────────────────
function sim(arr) { return arr.map(([c,p])=>({ colonia:c, peso:p })); }

const sim_updates = {
    'paseo de los agaves': sim([
        ['cajititlan',20],['jardines de la calera',18],['santa cruz de las flores',16],
        ['san diego',14],['valle de los encinos',12],
    ]),
    'miramar': sim([
        ['valle imperial',20],['nuevo mexico',18],['ionamiento bugambilias',16],
        ['ciudad bugambilia',14],['los robles',12],
    ]),
    'lomas de polanco': sim([
        ['la primavera',20],['los molinos',18],['paraisos del colli',16],['el campanario',14],
    ]),
    'villa hermosa': sim([
        ['huentitan el bajo',20],['alcalde barranquitas',18],['belisario dominguez',16],
        ['san juan bosco',14],['el retiro',12],
    ]),
    'echeverria': sim([
        ['moderna',20],['verde valle',18],['guadalajara centro',16],
        ['bosques de la victoria',14],['jardines de la cruz',12],
    ]),
    'rinconadas de coyula': sim([
        ['santa paula',20],['bosques de tonala',18],['jauja',16],['la providencia',14],
    ]),
    'bugambilias 2da seccion': sim([   // fix: colinas de san javier ($61k) era demasiado caro
        ['bugambilias',20],['ciudad bugambilia',18],['los robles',16],
    ]),
    'lomas independencia': sim([
        ['guadalajara centro',20],['modern',18],['santa teresita',16],['jardines de la cruz',14],
    ]),
    // Limpiar entradas basura adicionales detectadas
    'independencia': sim([   // GDL Independencia barrio
        ['moderna',20],['santa teresita',18],['guadalajara centro',16],['jardines de la cruz',14],
    ]),
};

for (const [col, sims] of Object.entries(sim_updates)) {
    const prev = SIM[col] ? SIM[col].length : 0;
    SIM[col] = sims;
    console.log(`  SIM: "${col}" ${prev} → ${sims.length}`);
    sc++;
}
fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ SIM: ${sc} cambios`);
console.log(`\nTOTAL: ${cc} cerebro + ${nc} NSE + ${sc} similares`);
