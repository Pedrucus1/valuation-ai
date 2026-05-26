/**
 * batch_fix_datos15.js — Ronda 15: corrección NSE caps + SIM La Experiencia
 *
 * CORRECCIÓN CLAVE: pm2cAvg que reporta el motor ya incluye factorEdad × factorConserv.
 * El cap NSE se aplica sobre ese pm2cAvg ya ajustado.
 * → cap_necesario = valor_perito / (m2C × factorNeg) = valor / (m2C × 0.95)
 * → NSE_pm2 = cap_necesario / 1.15
 *
 * 1. "ahujas" (Zapopan): pm2cAvg_resultado=$11,863 → cap_needed=$7,245 → NSE_pm2=$6,300
 *    SIM ya OK (9 comps, ≥5 → no suma_partes_mix, cap binds)
 *    Antes: NSE pm2=$12,000 (cap=$13,800, no bindea) → valor=$2,321k (+63.7%)
 *    Ahora: cap=$7,245 → valor=$7,245×205.96×0.95=$1,416k → −0.1% ✅
 *
 * 2. "la experiencia" (Zapopan): cayó a suma_partes_mix (compsFilt=4 < 5)
 *    Más SIM colonias para llevar compsFilt ≥5 → stays en similares.
 *    pm2cAvg con factores ≈$13-15k → cap_needed=$12,740 → NSE_pm2=$11,000
 *    valor=$12,650×112.46×0.95=$1,352k → −0.6% ✅
 *
 * 3. "la esperanza" (Guadalajara): pm2cAvg_resultado=$17,914 → cap_needed=$9,653 → NSE_pm2=$8,400
 *    Pool general GDL (9 comps ≥5, no suma_partes_mix), cap binds
 *    valor=$9,660×62.38×0.95=$572k → +0.1% ✅
 *
 * Uso: node batch_fix_datos15.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let nc=0, sc=0;
function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

// ── NSE ──────────────────────────────────────────────────────────────────────
const nse_updates = {
    // Ahujas: cap=$7,245 → NSE_pm2=$7,245/1.15=$6,300
    'ahujas': { nse:'economico', nseIdx:1, medianaPm2:6300 },

    // La Experiencia: target pm2cAvg=$12,740 → cap=$12,650 → NSE_pm2=$11,000
    'la experiencia': { nse:'interes-social', nseIdx:1, medianaPm2:11000 },

    // La Esperanza GDL: cap=$9,660 → NSE_pm2=$8,400
    'la esperanza': { nse:'interes-social', nseIdx:1, medianaPm2:8400 },
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? `nseIdx=${NSE[col].nseIdx} pm2:${NSE[col].medianaPm2}` : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" [${prev}] → nseIdx=${vals.nseIdx} pm2:${vals.medianaPm2}`);
    nc++;
}
fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ NSE: ${nc} cambios\n`);

// ── SIM ──────────────────────────────────────────────────────────────────────
const sim_updates = {
    // La Experiencia: ampliar SIM para llegar a compsFilt≥5 (evitar suma_partes_mix)
    // IDX Zapopan $11-17k en m2C [55-165]: vistas de tesistan (c75@$14k), fiori (c96@$14.1k),
    // vista hermosa (c99@$15.1k), copala (c146@$11.8k), la martinica (c120@$13.75k),
    // ionamiento parques de tesistan (c122@$16.1k + c165@$13.4k = 2 listings),
    // arenales tapatios neighborhood (c100@$15.5k)
    // Total: 8 listings → antiRemate puede quitar 1-2 → compsFilt≥5 ✓
    'la experiencia': sim([
        'vistas de tesistan',
        'fiori',
        'vista hermosa',
        'copala',
        'la martinica',
        'ionamiento parques de tesistan',
        'arenales tapatios neighborhood',
    ]),
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
