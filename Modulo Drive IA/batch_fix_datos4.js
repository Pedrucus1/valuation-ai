/**
 * batch_fix_datos4.js — Corrección de entradas SIM con nombres incorrectos
 * Problema: batch3 usó nombres que no coinciden con claves IDX → pool filter dc.includes(s) falla
 * Fix: reemplazar con claves IDX exactas verificadas
 * Uso: node batch_fix_datos4.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));
let sc = 0;

function sim(arr) { return arr.map(c => ({ colonia: c, peso: 20 - arr.indexOf(c) * 2 })); }

// Claves IDX exactas verificadas por municipio
// Motor usa: listing_colonia.includes(similar_name) → similar debe ser substring del key IDX
const sim_fixes = {
    // Tlaquepaque — IDX tiene: revolucion, pedregal del bosque, loma bonita ejidal, los olivos de tlaquepaque, santa cruz del valle
    'cantera colorada': sim(['revolucion','pedregal del bosque','loma bonita ejidal','los olivos de tlaquepaque','santa cruz del valle']),
    'tinajitas':        sim(['revolucion','pedregal del bosque','loma bonita ejidal','los olivos de tlaquepaque','santa cruz del valle']),
    'atotonilquillo':   sim(['revolucion','pedregal del bosque','loma bonita ejidal','santa cruz del valle']),

    // Guadalajara — claves exactas IDX
    'balcones de oblatos': sim(['oblatos','analco','lomas de polanco','insurgentes','huentitan']),
    'postes cuates':       sim(['oblatos','analco','la federacha','insurgentes','heliodoro hernandez loza 1a']),
    // "san elias" ($28k) → jardines del bosque, americana, jardines del country, ladron de guevara
    'san elias': sim(['jardines del bosque','americana','jardines del country','ladron de guevara','vallarta poniente']),

    // Zapopan — claves exactas IDX (mision del bosque, alta california)
    'mision del bosque': sim(['valle imperial','nuevo mexico','ionamiento bugambilias','ciudad bugambilia','capital norte']),
    'alta california':   sim(['nuevo mexico','ciudad bugambilia','el fortin','parques de tesistan','santa ana tepetitlan']),

    // Tlajomulco — claves exactas IDX
    'el refugio': sim(['cajititlan','lomas de santa anita','real del sol','jardines de la calera','santa cruz de las flores']),

    // Tonalá — claves exactas IDX
    'parques de la victoria': sim(['tonala','loma dorada a','hacienda del real','coyula','vistas del pedregal i']),
};

for (const [col, sims] of Object.entries(sim_fixes)) {
    const prev = SIM[col] ? SIM[col].length : 0;
    const prevNames = SIM[col] ? SIM[col].map(s=>s.colonia).join(', ') : 'NONE';
    SIM[col] = sims;
    console.log(`  SIM: "${col}"`);
    console.log(`       antes: ${prevNames}`);
    console.log(`       ahora: ${sims.map(s=>s.colonia).join(', ')}`);
    sc++;
}

fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ SIM: ${sc} entradas corregidas con claves IDX exactas`);
