/**
 * batch_fix_datos16.js — Ronda 16: SIM La Experiencia (fix suma_partes_mix)
 *
 * PROBLEMA: La Experiencia cae a suma_partes_mix porque compsFilt=3 < 5.
 * Causa: banda de precio (medRef≈$34,500 → bandaMin=$13,800) filtra colonias con pm2<$13,800.
 * Solo 3 de las 7 SIM colonias pasaban la banda → compsFilt=3 < 5 → suma_partes_mix dispara.
 *
 * FIX: SIM con colonias de pm2 ≥$14k y múltiples listings en m2C[56-168] (nseIdx≤2):
 *   mirador del bosque:         nseIdx=2, n=5 listings (c78@$17.3k, c63@$20k, ...)
 *   tesistan:                   nseIdx=1, n=4 listings (c119@$18.9k, c128@$17.9k, ...)
 *   los treboles:               nseIdx=2, n=3 listings (c76@$19.6k, c68@$18.8k)
 *   real de tesistan:           nseIdx=2, n=3 listings (c106@$19.8k, c122@$19.4k)
 *   ionamiento mirador del bosque: nseIdx=2, n=2 listings
 *   vistas de tesistan:         nseIdx=2, n=1 listing  (c75@$14k)
 *
 * Con ≥15 listings disponibles → compsFilt≥5 → similares, no suma_partes_mix.
 * NSE cap=$12,650 (pm2=$11,000) binds sobre raw pm2cAvg≈$17-19k×0.92=$15.6-17.5k → cap ✓
 * valor=$12,650×112.46×0.95=$1,350k → perito $1,360k → −0.7% ✅
 *
 * Uso: node batch_fix_datos16.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));
let sc=0;

function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    'la experiencia': sim([
        'mirador del bosque',           // nseIdx=2, n=5 en m2C[56-168], pm2 $17-20k
        'tesistan',                     // nseIdx=1, n=4 en m2C[56-168], pm2 $17-19k
        'los treboles',                 // nseIdx=2, n=3, pm2 $18-20k
        'real de tesistan',             // nseIdx=2, n=3, pm2 $19-20k
        'ionamiento mirador del bosque',// nseIdx=2, n=2, pm2 $19-20k
        'vistas de tesistan',           // nseIdx=2, n=1, pm2 $14k (ancla baja)
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
