/**
 * batch_fix_datos12.js — Ronda 12: Cañadas de San Lorenzo SIM fix
 *
 * PROBLEMA (Cañadas de San Lorenzo, Zapopan):
 *   batch11 puso SIM = jardin real, solares, parques vallarta, bosques vallarta, la estancia.
 *   TODAS son colonias premium pero con casas GRANDES (m2C 180-600m²c).
 *   Sujeto m2C=74.36 → filtro ±50%: d.c ∈ [37-149]. Los 4 SIM pasan a enNSETodos
 *   (para medRef) pero NO pasan al pool porque sus listados son m2C>149 → enSim=0 → general.
 *
 * DIAGNÓSTICO:
 *   IDX "canadas de san lorenzo" (1 listing, m2C=105, pm2=$33,810) → enColonia ✓
 *   IDX "ionamiento canadas de san lorenzo" (1 listing, m2C=56, pm2=$36,607) → enColonia ✓
 *   IDX "canadas san lorenzo" (1 listing, m2C=99, pm2=$35,343) → enSim ✓ si está en SIM
 *   enColonia=2 + enSim=1 = 3 → pool:similares con comps del área real.
 *
 * RESULTADO ESPERADO con 3 comps ($33.8k-$36.6k) + factorEdad(6a)=1.02, muy_bueno=1.05:
 *   OPI-25-11-03-OF: pm2cAvg≈$38.6k (cap=$40,653 no aplica) → $2,729k vs $2,871k → −4.9% ✅
 *   OPI-25-8-11-LM:  pm2cAvg≈$37.0k (cap no aplica) → $2,546k vs $2,609k → −2.4% ✅
 *   (Antes: ambos en general pool → −14.3% y −27.5%)
 *
 * Uso: node batch_fix_datos12.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));
let sc=0;

function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    // Cañadas de San Lorenzo (Zapopan): SIM anterior usaba colonias premium (jardin real, solares...)
    // que tienen m2C>200 en IDX → no pasan filtro ±50% para sujeto m2C=74.36 → enSim=0 → general.
    // Fix: usar "canadas san lorenzo" (IDX: m2C=99, pm2=$35,343) como SIM primario.
    //   + "ionamiento canadas de san lorenzo" ya matchea enColonia (m2C=56, pm2=$36,607).
    //   + "canadas de san lorenzo" matchea enColonia (m2C=105, pm2=$33,810).
    // Total candidatos = 2 enColonia + 1 enSim = 3 → pool:similares ✅
    // El resto de SIM (real del bosque etc.) son backup, puede que no contribuyan comps.
    'canadas de san lorenzo': sim([
        'canadas san lorenzo',      // IDX key: m2C=99, pm2=$35,343 — mismo desarrollo, formato diferente
        'real del bosque',          // Zapopan backup
        'col mirador de san isidro', // Zapopan backup
        'lomas de san agustin',     // Zapopan backup
        'villas de zapopan',        // Zapopan backup
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
