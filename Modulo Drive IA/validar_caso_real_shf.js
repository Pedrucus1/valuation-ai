// ponytail: caso único real (avalúo SHF 26080015287, Demostenes 3730 21-A, GDL) para comparar
// el pipeline de producción de server.py con distintas curvas de edad contra el valor real.
// Comps y factores tomados directo del PDF (raw = "Valor unitario", adj = "Valor unitario resultante").

const comps = [
  { raw: 21556.60, adj: 18969.81, precio: 1142500 },
  { raw: 23454.55, adj: 22281.82, precio: 1290000 },
  { raw: 22033.90, adj: 19169.49, precio: 1300000 },
  { raw: 23728.81, adj: 22067.79, precio: 1400000 },
  { raw: 23026.32, adj: 18421.06, precio: 1750000 },
  { raw: 21186.44, adj: 18644.07, precio: 1250000 },
];

const m2C = 61.7, m2T = 61.7, edad = 34;
const VR_NUEVO_REAL = 10700; // del propio PDF (calidad "Interés Social", real, no el default $19,000 de server.py)
const LAND_RATIO = 0.40; // Jalisco
const CONSERVATION_FACTOR_OLD = 0.85; // "Bueno" en server.py viejo
const FACTOR_CONSERV_LAB = 1.00; // "Bueno" en FACTORES_CONSERVACION_LAB

function mediana(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[(n - 1) / 2];
}

// ---- comparativo (idéntico en todas las variantes, replica exacto server.py) ----
const weighted = comps.map(c => c.adj * 0.6 + c.raw * 0.4);
const avgPx = weighted.reduce((a, b) => a + b, 0) / weighted.length;
const medPx = mediana(weighted);
const finalPxm = medPx * 0.7 + avgPx * 0.3;
const comparativeWeighted = finalPxm * m2C;
const comparableAvgTotal = comps.reduce((a, c) => a + c.precio, 0) / comps.length;

const landValuePerSqm = finalPxm * LAND_RATIO;
const landValue = landValuePerSqm * m2T;

function blend(physicalTotal) {
  let est = comparativeWeighted * 0.80 + physicalTotal * 0.20;
  if (est < comparableAvgTotal * 0.70) est = (est + comparableAvgTotal * 0.70) / 2;
  if (est > comparableAvgTotal * 1.30) est = (est + comparableAvgTotal * 1.30) / 2;
  return est;
}

function correr(nombre, constructionNew, depFrac) {
  const constructionDepreciated = constructionNew * (1 - depFrac);
  const physicalTotal = landValue + constructionDepreciated;
  const est = blend(physicalTotal);
  return { nombre, depFrac, constructionDepreciated, physicalTotal, est };
}

// ---- 4 variantes de depreciación ----
// A) VIEJA (server.py prod, vida=60, tope 0.85)
const depVieja = Math.min(34 / 60 + (1 - CONSERVATION_FACTOR_OLD) * 0.3, 0.85);
// B) LAB-RH (result_lab_rh actual, vida=60 default por falta de construction_quality)
function getRH(e, vida) { const x = Math.min(1, e / vida); return Math.max(0.20, 1 - 0.5 * (x + x * x)); }
const depLabRH60 = 1 - Math.max(0, Math.min(1.05, getRH(edad, 60) * FACTOR_CONSERV_LAB));
// C) RH-REAL (vida=70, la que el PDF real usa y confirma con Fed=0.64 exacto)
const depRH70 = 1 - Math.max(0, Math.min(1.05, getRH(edad, 70) * FACTOR_CONSERV_LAB));
// D) LINEAL (catalogo2, 100-0.5*edad, piso 0.20)
const depLineal = 1 - Math.max(0, Math.min(1.05, Math.max(0.20, 1 - 0.5 * (edad / 100)) * FACTOR_CONSERV_LAB));

const runs = [
  correr('VIEJA (prod, vida=60)', VR_NUEVO_REAL * m2C, depVieja),
  correr('LAB-RH (vida=60, default actual)', VR_NUEVO_REAL * m2C, depLabRH60),
  correr('RH-REAL (vida=70, confirmado en PDF: Fed=0.64)', VR_NUEVO_REAL * m2C, depRH70),
  correr('LINEAL (catalogo2)', VR_NUEVO_REAL * m2C, depLineal),
];

const VALOR_MERCADO_REAL = 1228000;
const VALOR_FISICO_REAL = 986000;

console.log('=== Caso real SHF 26080015287 (Demostenes 3730 21-A, depto 61.7m², edad 34, Bueno) ===');
console.log('Comparativo (80% del blend, idéntico en las 4):', Math.round(comparativeWeighted), '| PDF real:', VALOR_MERCADO_REAL);
console.log('Valor terreno estimado (backend, land_ratio 0.40):', Math.round(landValue), '| PDF real (estudio de terreno):', 598490);
console.log('');
for (const r of runs) {
  const errVsMercado = ((r.est - VALOR_MERCADO_REAL) / VALOR_MERCADO_REAL * 100).toFixed(1);
  const errFisicoVsReal = ((r.physicalTotal - VALOR_FISICO_REAL) / VALOR_FISICO_REAL * 100).toFixed(1);
  console.log(`${r.nombre}`);
  console.log(`  depreciación=${(r.depFrac*100).toFixed(1)}%  construcción depreciada=${Math.round(r.constructionDepreciated)}`);
  console.log(`  físico(backend)=${Math.round(r.physicalTotal)} (real=${VALOR_FISICO_REAL}, delta=${errFisicoVsReal}%)`);
  console.log(`  estimated_value(blend 80/20)=${Math.round(r.est)}  vs mercado real=${VALOR_MERCADO_REAL}  error=${errVsMercado}%`);
  console.log('');
}
