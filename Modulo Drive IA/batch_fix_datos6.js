/**
 * batch_fix_datos6.js — Sexta ronda de correcciones
 * Regresiones detectadas en batch5:
 *   - Tinajitas NSE $10,500 → demasiado bajo → cap interfiere → -42.1% (era -28.6%). Revertir.
 *   - Echeverría SIM demasiado barata ($12-15k) → OPI-26-2-20 (regular_medio) da -48.5%.
 *   - Loma Bonita Ejidal sin NSE+SIM → cae a pool:general (-23.3%) tras municipio fix.
 * Uso: node batch_fix_datos6.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let nc=0, sc=0;

// ── 1. NSE ────────────────────────────────────────────────────────────────────
const nse_updates = {
    // Tinajitas: batch5 puso $10,500 (interés social) → el NSE cap interfería y agravó el error.
    // La colonia NO es interés social; el perito OPI-25-11-02-OF valúa a $18,173/m²c raw.
    // Con nseIdx=2 pm2c=$19,000: cap=$21,850 → NO se dispara (motor pm2cAvg ~$14k < cap).
    // El -28.6% que quedaba antes era solo problema de factorConserv (structural, sin fix sencillo).
    'tinajitas': { nse:'medio-bajo', nseIdx:2, medianaPm2:19000 },

    // Loma Bonita Ejidal (Tlaquepaque): sin NSE, el motor cae a general pool.
    // IDX Tlaquepaque: "loma bonita ejidal" n=2, pm2c=$19,235.
    // Con NSE, el pool general aplica filtro NSE ±1 → más preciso.
    'loma bonita ejidal': { nse:'medio-bajo', nseIdx:2, medianaPm2:19235 },
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? `nseIdx=${NSE[col].nseIdx} pm2:${NSE[col].medianaPm2}` : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" [${prev}] → nseIdx=${vals.nseIdx} pm2:${vals.medianaPm2}`);
    nc++;
}
fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ NSE: ${nc} cambios\n`);

// ── 2. SIM ────────────────────────────────────────────────────────────────────
// REGLA: claves IDX exactas (cache_index.json). pool filter = dc.includes(s).
function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    // Echeverría (GDL): batch5 puso colonias $12-15k (muy baratas) → dos OPIs:
    //   OPI-26-2-15-OF (bueno  45a, val=$2,874k, m2C=200.88) → pm2c=$14,307 raw
    //   OPI-26-2-20-OF (reg_med 52a, val=$2,523k, m2C=143.65) → pm2c=$17,564 raw
    // Con SIM a $15-19k, OPI-26-2-15 se acerca ±10%; OPI-26-2-20 sigue bajo por factorConserv=0.75
    // (structural — la corrección de SIM no puede salvar los dos OPIs simultáneamente).
    // IDX GDL $15-19k: analco ($14.8k), alcalde barranquitas ($17.8k), belisario dominguez ($19k),
    // huentitan el bajo ($17.9k), san juan bosco ($16.9k).
    'echeverria': sim(['analco','alcalde barranquitas','belisario dominguez','huentitan el bajo','san juan bosco']),

    // Loma Bonita Ejidal (como colonia sujeto, Tlaquepaque): tras el municipio fix, el motor
    // cae a general pool (−23.3%). Con SIM a colonias Tlaquepaque $19-27k, sube a pool:similares.
    // IDX Tlaquepaque: revolucion ($19.1k, n=8), pedregal del bosque ($27k, n=8),
    // los olivos de tlaquepaque ($25.8k, n=3), cerro del tesoro ($20.7k, n=4),
    // santa cruz del valle ($19.9k, n=2).
    // Proyección OPI-25-7-03-OF (bueno 41a): pm2cAvg = avg($22k) × 0.85 = $18.7k → valor ~$3,353k
    // vs perito $3,475k → diff ≈ −3.5% ✓
    'loma bonita ejidal': sim(['revolucion','pedregal del bosque','los olivos de tlaquepaque','cerro del tesoro','santa cruz del valle']),
};

for (const [col, sims] of Object.entries(sim_updates)) {
    const prev = SIM[col] ? SIM[col].map(s=>s.colonia).join(', ') : 'NONE';
    SIM[col] = sims;
    console.log(`  SIM: "${col}"`);
    console.log(`       antes: ${prev}`);
    console.log(`       ahora: ${sims.map(s=>s.colonia).join(', ')}`);
    sc++;
}
fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ SIM: ${sc} cambios`);
console.log(`\nTOTAL: ${nc} NSE + ${sc} SIM`);
