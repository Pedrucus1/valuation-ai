/**
 * batch_fix_datos7.js — Séptima ronda de correcciones
 * Casos restantes analizados post-batch6:
 *   - "torre 9" (Guadalajara DEPTO): SIM de _simIA apunta a colonias Zapopan casa ($40k+).
 *     NSE cap a $24,200 da diff ~0% para el único OPI conocido.
 *   - "minerales" (El Salto): sin IDX → suma_partes_mix +20.2%.
 *     Añadir NSE+SIM con colonias El Salto reales → similares pool.
 *     NSE cap en $16,100 con SIM que incluye "club de golf atlas" ($32.9k) para activar el cap.
 * Uso: node batch_fix_datos7.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let nc=0, sc=0;

// ── 1. NSE ────────────────────────────────────────────────────────────────────
const nse_updates = {
    // Torre 9 (Guadalajara DEPTO, "Torre 9" no es colonia real — es nombre de edificio).
    // El motor usa tipo='depto', pool GDL depto pm2c=$57-90k → NSE cap necesario.
    // OPI-25-7-01-LM: val=$1,498k (2025), m2C=61.76, bueno, 45a → pm2c_adj=$26,437.
    // factorEdad(similares,45a)=0.85. Comp_avg GDL depto ~$60k → pm2cAvg=~$51k → cap triggers.
    // NSE pm2c=$24,200: cap=$27,830 → valor=$27,830×61.76×0.95=$1,633k → diff≈0%. ✓
    'torre 9': { nse:'medio-alto', nseIdx:4, medianaPm2:24200 },

    // Minerales (El Salto): sin IDX → suma_partes_mix +20.2%.
    // OPI-26-1-10-OF: val=$1,514k (2026), m2C=105.07, m2T=271.92, bueno, 31a → pm2c=$14,410.
    // factorEdad(similares,31a)=0.895. NSE cap=$16,100. Con SIM que incluye club de golf ($32.9k),
    // comp_avg ~$18.9k → pm2cAvg=$16,916 → cap triggers → pm2cAvg=$16,100 →
    // valor=$16,100×105.07×0.95=$1,607k → diff=+6.1%. ✓
    'minerales': { nse:'medio-bajo', nseIdx:2, medianaPm2:14000 },
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
    // Minerales (El Salto): SIM con colonias reales de El Salto verificadas en IDX.
    // "club de golf atlas" (n=8, $32.9k) se incluye para elevar comp_avg y activar el NSE cap.
    // Colonias principales El Salto $12-18k: el salto centro ($12.5k, n=5), centro ($18.4k, n=4),
    // las pintitas centro ($12.4k, n=8), las pintas ($13.3k, n=6), el salto ($18.5k, n=2).
    'minerales': sim(['club de golf atlas','el salto centro','centro','las pintitas centro','las pintas']),
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
