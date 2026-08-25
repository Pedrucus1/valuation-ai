// ponytail: aplica RH-vida70 (confirmado real, sesión 24-ago) sobre avalúos REALES ya generados
// en PropValu (staging Mongo, 38 valuations con result calculado), reusando comparative_weighted/
// land_value/construction_new_value ya guardados -- solo se sustituye la depreciación física.
const fs = require('fs');
const path = require('path');

const docs = JSON.parse(fs.readFileSync(path.join(__dirname, 'staging_valuations_reales.json'), 'utf8'));

const FACTORES_CONSERVACION_LAB = {
  'Nuevo': 1.05, 'Muy Bueno': 1.05, 'Bueno': 1.00, 'Regular Bueno': 0.85,
  'Regular': 0.75, 'Regular Malo': 0.65, 'Malo': 0.55, 'Muy Malo': 0.45,
};
function getRH(edad, vida) {
  if (edad <= 0) return 1.0;
  const x = Math.min(1, edad / vida);
  return Math.max(0.20, 1 - 0.5 * (x + x * x));
}
function depRH(edad, conservation, vida) {
  const cf = FACTORES_CONSERVACION_LAB[conservation] ?? 1.00;
  return 1 - Math.max(0, Math.min(1.05, getRH(edad, vida) * cf));
}
function depLineal(edad, conservation) {
  const cf = FACTORES_CONSERVACION_LAB[conservation] ?? 1.00;
  return 1 - Math.max(0, Math.min(1.05, Math.max(0.20, 1 - 0.5 * (edad / 100)) * cf));
}

let rows = [];
for (const doc of docs) {
  const prop = doc.property_data;
  const r = doc.result;
  const edad = prop.estimated_age;
  const conservation = prop.conservation_state || 'Bueno';
  const comps = doc.comparables || [];
  if (!comps.length || !r || !r.estimated_value) continue;
  const comparableAvgTotal = comps.reduce((a, c) => a + c.price, 0) / comps.length;

  const landValue = r.land_value;
  const constructionNew = r.construction_new_value;
  const comparativeWeighted = r.comparative_weighted;
  const regimeMultiplier = r.estimated_value / (comparativeWeighted * 0.80 + r.physical_total * 0.20); // recupera 1-regime_discount implícito (ya aplicado en el stored estimated_value antes del sanity clamp -- aproximación)

  function estFor(depFrac) {
    const physical = landValue + constructionNew * (1 - depFrac);
    let est = (comparativeWeighted * 0.80 + physical * 0.20) * regimeMultiplier;
    if (est < comparableAvgTotal * 0.70) est = (est + comparableAvgTotal * 0.70) / 2;
    if (est > comparableAvgTotal * 1.30) est = (est + comparableAvgTotal * 1.30) / 2;
    return { est, physical };
  }

  const depViejaStored = r.depreciation_percent / 100; // la que ya usó prod al guardar
  const rh60 = estFor(depRH(edad, conservation, 60));
  const rh70 = estFor(depRH(edad, conservation, 70));
  const lin = estFor(depLineal(edad, conservation));

  rows.push({
    id: doc.valuation_id,
    colonia: prop.neighborhood, edad, conservation, calidad: prop.construction_quality,
    estStored: Math.round(r.estimated_value),
    estRH60: Math.round(rh60.est), deltaRH60: ((rh60.est - r.estimated_value) / r.estimated_value * 100).toFixed(1),
    estRH70: Math.round(rh70.est), deltaRH70: ((rh70.est - r.estimated_value) / r.estimated_value * 100).toFixed(1),
    estLin: Math.round(lin.est), deltaLin: ((lin.est - r.estimated_value) / r.estimated_value * 100).toFixed(1),
  });
}

rows.sort((a, b) => b.edad - a.edad);
console.log(`=== ${rows.length} avalúos reales de PropValu (staging) — efecto de cambiar la curva de edad ===`);
console.log('(estStored = valor actual en prod; delta% = cuánto cambiaría con cada curva)\n');
for (const row of rows) {
  console.log(`${row.id}  ${row.colonia}  edad=${row.edad}  ${row.conservation}  calidad=${row.calidad}`);
  console.log(`  actual=$${row.estStored.toLocaleString()}  RH60=${row.deltaRH60}%  RH70=${row.deltaRH70}%  LINEAL=${row.deltaLin}%`);
}

function avg(arr) { return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2); }
console.log('\n--- Promedios (todos, n=' + rows.length + ') ---');
console.log('delta% promedio RH60:', avg(rows.map(r => +r.deltaRH60)));
console.log('delta% promedio RH70:', avg(rows.map(r => +r.deltaRH70)));
console.log('delta% promedio LINEAL:', avg(rows.map(r => +r.deltaLin)));

const viejos = rows.filter(r => r.edad > 30);
console.log(`\n--- Subset edad>30a (n=${viejos.length}) ---`);
console.log('delta% promedio RH60:', avg(viejos.map(r => +r.deltaRH60)));
console.log('delta% promedio RH70:', avg(viejos.map(r => +r.deltaRH70)));
console.log('delta% promedio LINEAL:', avg(viejos.map(r => +r.deltaLin)));
