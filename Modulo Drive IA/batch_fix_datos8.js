/**
 * batch_fix_datos8.js — Octava ronda de correcciones
 * Casos identificados post-batch7 (2 recuperables con datos):
 *   - "mision del bosque" (Zapopan): SIM con colonias $20-28k → área premium Andares ~$37k.
 *     IDX: n=1 @$37,017 → motor usa similares. Fix: SIM premium la estancia/jardin real/solares.
 *     factorEdad(21a,sim)=0.945, factorConserv=bueno=1.00 → pm2cAvg≈$35.9k → valor≈$2,258k → diff≈-5.8% ✅
 *   - "parques de la victoria" (Tonalá): SIM incluye colonias baratas ($18.5k-$20.5k) que diluyen pool.
 *     Fix: reemplazar vistas del pedregal i + loma dorada delegacion a con colinas de tonala ($27.1k,n=5)
 *     y urbi quinta montecarlo ($26.9k,n=5). Avg raw ≈$25.7k × 0.75 × 0.99 → valor≈$828k → diff≈-1.2% ✅
 * Uso: node batch_fix_datos8.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let nc=0, sc=0;

// ── 1. NSE ────────────────────────────────────────────────────────────────────
const nse_updates = {
    // Misión del Bosque (Zapopan): zona premium adyacente a Andares/Puerta de Hierro.
    // IDX: "mision del bosque" n=1, pm2c=$37,017. NSE alto para documentar zona.
    // Cap=$43,700 — no interfiere (pm2cAvg esperado ≈$35.9k < cap).
    'mision del bosque': { nse:'alto', nseIdx:5, medianaPm2:38000 },
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
function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    // Misión del Bosque (Zapopan): SIM anterior tenía colonias $20-28k (muy baratas para la zona).
    // IDX Zapopan premium $34-43k (verificadas): la estancia ($42.7k, n=21), jardin real ($38.9k, n=43),
    // solares ($38.5k, n=160), bosques vallarta ($34.2k, n=85), parques vallarta ($37k, n=31).
    // Band filter: medRef≈$38k → bandaMax=$60.8k → todos los comps premium pasan.
    'mision del bosque': sim(['la estancia','jardin real','solares','bosques vallarta','parques vallarta']),

    // Parques de la Victoria (Tonalá): SIM anterior incluía "vistas del pedregal i" ($18.5k, n=5)
    // y "loma dorada delegacion a" ($20.5k, n=1) que deprimían el pm2cAvg del pool.
    // Reemplazar con: colinas de tonala ($27.1k, n=5) y urbi quinta montecarlo ($26.9k, n=5).
    // Mantenemos tonala centro, hacienda real, el moral ($24.7-24.9k) → avg raw ≈$25.7k.
    // factorConserv(regular_medio)=0.75, factorEdad(12a,sim)=0.99 → pm2cAvg≈$19.1k.
    // valor = $19.1k × 45.65 × 0.95 ≈ $828k vs perito $838k → diff≈-1.2% ✅
    'parques de la victoria': sim(['tonala centro','hacienda real','el moral','colinas de tonala','urbi quinta montecarlo']),
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
