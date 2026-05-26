/**
 * batch_fix_datos10.js — Colonias-municipio: SIM y NSE para colonias vaga del AMG
 * Problema: OPIs donde colonia = municipio → coloniaEsVaga=true → va a similares SI hay SIM.
 * "tlaquepaque" tenía SIM con colonias de El Salto (no matchean IDX Tlaquepaque) → general pool.
 * "el salto" (como colonia del municipio El Salto) no tenía NSE.
 * Uso: node batch_fix_datos10.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let nc=0, sc=0;

// ── 1. NSE ────────────────────────────────────────────────────────────────────
const nse_updates = {
    // "el salto" (colonia del municipio El Salto): zona centro industrial-habitacional.
    // IDX El Salto casa: el salto centro $12.5k, las pintitas $10.3k, parques del triunfo $13.3k.
    // NSE cap $16,100 ($14k×1.15) — no dispara el pool de similares pero documenta la zona.
    'el salto': { nse:'interes-social', nseIdx:1, medianaPm2:14000 },
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
    // "tlaquepaque" (colonia-municipio): SIM anterior apuntaba a El Salto (minerales, ladrillera)
    // que NO existen en IDX Tlaquepaque → enSim=[] → general pool (-20.0%).
    // Fix: colonias Tlaquepaque IDX $19-28k verificadas:
    // pedregal del bosque ($27k, n=8), revolucion ($19.1k, n=8), cerro del tesoro ($20.7k, n=4),
    // los olivos de tlaquepaque ($25.8k, n=3), santa cruz del valle ($19.9k, n=2).
    // NSE nseIdx=2 pm2=18863 → cap=$21,693 — se activa con pool premium, centra en $19-22k.
    'tlaquepaque': sim(['pedregal del bosque','revolucion','cerro del tesoro','los olivos de tlaquepaque','santa cruz del valle']),

    // "el salto" (colonia-municipio): colonias El Salto $10-14k:
    // el salto centro ($12.5k, n=5), las pintitas centro ($12.4k, n=8), las pintas ($13.3k, n=6),
    // parques del triunfo ($13.3k, n=4), cima serena ($12.1k, n=3).
    'el salto': sim(['el salto centro','las pintitas centro','las pintas','parques del triunfo','cima serena']),
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
