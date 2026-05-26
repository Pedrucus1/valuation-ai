/**
 * batch_fix_datos9.js — Novena ronda: revert Misión del Bosque
 * batch8 cambió SIM de "mision del bosque" a colonias premium (la estancia, jardin real, solares).
 * PROBLEMA: el OPI es 66m²c. Solares/la estancia tienen listados de 180-300m²c → filtro m²c
 * (|d.c-66|/max<0.50) los rechaza → pool cae a general (n:8, diff=-31.1%) peor que antes (-24.9%).
 * Fix: restaurar SIM original de batch4 (ciudad bugambilia, nuevo mexico, etc.) que sí tienen
 * casas compactas ~60-130m²c y daban pool:similares n:10 con diff=-24.9%.
 * El -24.9% es una limitación estructural (perito premium sobre IDX con solo n=1 listing exacto).
 * Uso: node batch_fix_datos9.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));
let sc=0;

function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    // Misión del Bosque: revertir a colonias batch4 que dan pool:similares n:10 con casas ~60-130m²c.
    // Zapopan compacto $24-28k: valle imperial ($24k), nuevo mexico ($26.7k),
    // ionamiento bugambilias (~$26k), ciudad bugambilia ($28k), capital norte ($26.3k).
    // Resultado antes del revert: pool:similares n:10, diff=-24.9% (structural — n=1 IDX exacto).
    'mision del bosque': sim(['valle imperial','nuevo mexico','ionamiento bugambilias','ciudad bugambilia','capital norte']),
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
console.log(`\n✅ SIM: ${sc} cambios (revert Misión del Bosque)`);
