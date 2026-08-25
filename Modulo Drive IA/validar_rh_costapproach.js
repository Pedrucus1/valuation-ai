// ponytail: script de validación puntual (server.py cost-approach vieja vs result_lab_rh),
// no productivo, vive junto a los demás validadores del motor.
// Replica el bloque calculate_valuation() de backend/server.py (comparativo 80% + físico 20%,
// sanity clamp) sobre los OPIs reales de cerebro_datos.json, comparando la fórmula de
// depreciación VIEJA (age/60, tope 0.85) vs la LAB (Ross-Heidecke calibrada, result_lab_rh)
// contra valorMercado real del perito. 100% offline, no toca Mongo ni APIs.
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

function num(s) {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

const CONSERV_MAP = {
  nuevo: 'Nuevo', muy_bueno: 'Muy Bueno', bueno: 'Bueno',
  regular_bueno: 'Regular Bueno', regular_medio: 'Regular', regular_malo: 'Regular Malo',
  malo: 'Malo', muy_malo: 'Muy Malo',
};

// ---- fórmula VIEJA (server.py, tal cual prod) ----
const CONSERVATION_FACTORS_OLD = {
  'Nuevo': 1.0, 'Muy Bueno': 1.0, 'Excelente': 1.0, 'Bueno': 0.85,
  'Regular Bueno': 0.75, 'Regular': 0.65, 'Regular Malo': 0.52,
  'Malo': 0.40, 'Muy Malo': 0.25,
};
function depreciacionVieja(edad, conservation) {
  const usefulLife = 60;
  const cf = CONSERVATION_FACTORS_OLD[conservation] ?? 0.85;
  const ageDep = edad / usefulLife;
  let total = ageDep + (1 - cf) * 0.3;
  return Math.min(total, 0.85);
}

// ---- fórmula LAB (result_lab_rh, Ross-Heidecke calibrada) ----
const FACTORES_CONSERVACION_LAB = {
  'Nuevo': 1.05, 'Muy Bueno': 1.05, 'Bueno': 1.00, 'Regular Bueno': 0.85,
  'Regular': 0.75, 'Regular Malo': 0.65, 'Malo': 0.55, 'Muy Malo': 0.45,
};
function getRH(edad, vida = 70) {
  if (edad <= 0) return 1.0;
  const x = Math.min(1, edad / vida);
  return Math.max(0.20, 1 - 0.5 * (x + x * x));
}
function depreciacionLab(edad, conservation) {
  const vida = 60; // sin construction_quality en cerebro_datos.json -> default "medio" = 60
  const valorRestante = getRH(edad, vida) * (FACTORES_CONSERVACION_LAB[conservation] ?? 1.00);
  return 1 - Math.max(0, Math.min(1.05, valorRestante));
}
// RH con vida=70 (confirmado en avalúo SHF real 26080015287: Fed=1-0.5*(x+x²), edad=34,
// vida=70 -> 0.64, coincide EXACTO con el PDF -- incluso siendo el sujeto "Interés Social",
// lo que contradice la regla vieja de vida=70 solo para Medio Alto+)
function depreciacionRH70(edad, conservation) {
  const valorRestante = getRH(edad, 70) * (FACTORES_CONSERVACION_LAB[conservation] ?? 1.00);
  return 1 - Math.max(0, Math.min(1.05, valorRestante));
}

// ---- fórmula LINEAL (catalogo2 A142:C185 de opi_perito.xlsx, la que SÍ usa el perito
// para homologar comps por edad: % = 100 - 0.5*edad, ajuste r²=1 exacto sobre 43 filas reales) ----
function depreciacionLineal(edad, conservation) {
  const valorRestanteEdad = Math.max(0.20, 1 - 0.5 * (edad / 100)); // piso 0.20 (no documentado más allá de 85a, asumido igual que las otras curvas)
  const valorRestante = valorRestanteEdad * (FACTORES_CONSERVACION_LAB[conservation] ?? 1.00);
  return 1 - Math.max(0, Math.min(1.05, valorRestante));
}

function medianaArr(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[(n - 1) / 2];
}

const LAND_RATIO = 0.40; // Jalisco
const QUALITY_COST = 19000; // "Medio Medio" default (no hay construction_quality en cerebro_datos.json)

const rows = [];
let descartados = { sin_edad: 0, sin_valor: 0, sin_m2c: 0, pocos_comps: 0 };

for (const opi of raw) {
  const edad = num(opi.edad);
  const valorMercado = num(opi.valorMercado);
  const m2C = num(opi.m2Construccion);
  const m2T = num(opi.m2Terreno) || 0;
  const conservRaw = (opi.estadoConservacion || '').toLowerCase();
  const conservation = CONSERV_MAP[conservRaw] || 'Bueno';

  if (edad == null || edad <= 0) { descartados.sin_edad++; continue; }
  if (!valorMercado || valorMercado <= 0) { descartados.sin_valor++; continue; }
  if (!m2C || m2C <= 0) { descartados.sin_m2c++; continue; }

  const comps = (opi.comparables || []).filter(c => c.precio > 0 && c.construccion > 0);
  if (comps.length < 3) { descartados.pocos_comps++; continue; }

  // comparativo (idéntico para ambas fórmulas — solo cambia el físico)
  const pxm = comps.map(c => c.precio / c.construccion);
  const avgPx = pxm.reduce((a, b) => a + b, 0) / pxm.length;
  const medPx = medianaArr(pxm);
  const finalPxm = medPx * 0.7 + avgPx * 0.3;
  const comparativeWeighted = finalPxm * m2C;
  const comparableAvgTotal = comps.reduce((a, c) => a + c.precio, 0) / comps.length;

  // físico
  const landValuePerSqm = finalPxm * LAND_RATIO;
  const landValue = landValuePerSqm * m2T;
  const constructionNew = QUALITY_COST * m2C;

  const depOld = depreciacionVieja(edad, conservation);
  const physicalOld = landValue + constructionNew * (1 - depOld);
  let estOld = comparativeWeighted * 0.80 + physicalOld * 0.20;
  if (estOld < comparableAvgTotal * 0.70) estOld = (estOld + comparableAvgTotal * 0.70) / 2;
  if (estOld > comparableAvgTotal * 1.30) estOld = (estOld + comparableAvgTotal * 1.30) / 2;

  const depLab = depreciacionLab(edad, conservation);
  const physicalLab = landValue + constructionNew * (1 - depLab);
  let estLab = comparativeWeighted * 0.80 + physicalLab * 0.20;
  if (estLab < comparableAvgTotal * 0.70) estLab = (estLab + comparableAvgTotal * 0.70) / 2;
  if (estLab > comparableAvgTotal * 1.30) estLab = (estLab + comparableAvgTotal * 1.30) / 2;

  const depLin = depreciacionLineal(edad, conservation);
  const physicalLin = landValue + constructionNew * (1 - depLin);
  let estLin = comparativeWeighted * 0.80 + physicalLin * 0.20;
  if (estLin < comparableAvgTotal * 0.70) estLin = (estLin + comparableAvgTotal * 0.70) / 2;
  if (estLin > comparableAvgTotal * 1.30) estLin = (estLin + comparableAvgTotal * 1.30) / 2;

  const depRH70 = depreciacionRH70(edad, conservation);
  const physicalRH70 = landValue + constructionNew * (1 - depRH70);
  let estRH70 = comparativeWeighted * 0.80 + physicalRH70 * 0.20;
  if (estRH70 < comparableAvgTotal * 0.70) estRH70 = (estRH70 + comparableAvgTotal * 0.70) / 2;
  if (estRH70 > comparableAvgTotal * 1.30) estRH70 = (estRH70 + comparableAvgTotal * 1.30) / 2;

  // mismas 2 curvas SIN clamp -- aislar el efecto real de la curva sin el tope de seguridad
  const estOldNoClamp = comparativeWeighted * 0.80 + physicalOld * 0.20;
  const estRH70NoClamp = comparativeWeighted * 0.80 + physicalRH70 * 0.20;

  // comparativo puro (0% físico) — para aislar si el sesgo ya viene de ahí
  const errComp = (comparativeWeighted - valorMercado) / valorMercado * 100;

  rows.push({
    folio: opi.folio, edad, conservation,
    errOld: (estOld - valorMercado) / valorMercado * 100,
    errLab: (estLab - valorMercado) / valorMercado * 100,
    errLin: (estLin - valorMercado) / valorMercado * 100,
    errRH70: (estRH70 - valorMercado) / valorMercado * 100,
    errOldNoClamp: (estOldNoClamp - valorMercado) / valorMercado * 100,
    errRH70NoClamp: (estRH70NoClamp - valorMercado) / valorMercado * 100,
    errComp,
  });
}

function metrics(errs) {
  const abs = errs.map(Math.abs);
  const n = abs.length;
  const within = (t) => (abs.filter(e => e <= t).length / n * 100).toFixed(1);
  const errAbs = (abs.reduce((a, b) => a + b, 0) / n).toFixed(1);
  const mediana = medianaArr(errs).toFixed(1);
  return { n, p10: within(10), p15: within(15), p20: within(20), errAbs, mediana };
}

console.log('=== Validación cost-approach: VIEJA vs LAB(RH) vs LINEAL(catalogo2/perito real) ===');
console.log('OPIs usables:', rows.length, 'de', raw.length, '| descartados:', JSON.stringify(descartados));
console.log('');
console.log('VIEJA        :', JSON.stringify(metrics(rows.map(r => r.errOld))));
console.log('LAB-RH(v=60) :', JSON.stringify(metrics(rows.map(r => r.errLab))));
console.log('RH-REAL(v=70):', JSON.stringify(metrics(rows.map(r => r.errRH70))));
console.log('LINEAL       :', JSON.stringify(metrics(rows.map(r => r.errLin))));
console.log('COMP-PURO (0% físico, solo comps del perito):', JSON.stringify(metrics(rows.map(r => r.errComp))));
console.log('');
console.log('--- SIN CLAMP (tope de seguridad ±30% desactivado, para aislar la curva) ---');
console.log('VIEJA  sin clamp:', JSON.stringify(metrics(rows.map(r => r.errOldNoClamp))));
console.log('RH70   sin clamp:', JSON.stringify(metrics(rows.map(r => r.errRH70NoClamp))));
console.log('');

// subset edad>15 (el mismo corte del sanity check original de 26 OPIs)
const viejas = rows.filter(r => r.edad > 15);
console.log(`--- Subset edad>15a (n=${viejas.length}) ---`);
console.log('VIEJA        :', JSON.stringify(metrics(viejas.map(r => r.errOld))));
console.log('LAB-RH(v=60) :', JSON.stringify(metrics(viejas.map(r => r.errLab))));
console.log('RH-REAL(v=70):', JSON.stringify(metrics(viejas.map(r => r.errRH70))));
console.log('LINEAL       :', JSON.stringify(metrics(viejas.map(r => r.errLin))));

// subset edad>35 (donde la curva lineal (piso mas alto) y RH (piso 0.20 mas agresivo) mas divergen)
const muyviejas = rows.filter(r => r.edad > 35);
console.log(`--- Subset edad>35a (n=${muyviejas.length}, donde LINEAL y RH mas divergen) ---`);
console.log('VIEJA        :', JSON.stringify(metrics(muyviejas.map(r => r.errOld))));
console.log('LAB-RH(v=60) :', JSON.stringify(metrics(muyviejas.map(r => r.errLab))));
console.log('RH-REAL(v=70):', JSON.stringify(metrics(muyviejas.map(r => r.errRH70))));
console.log('LINEAL       :', JSON.stringify(metrics(muyviejas.map(r => r.errLin))));

fs.writeFileSync(path.join(__dirname, 'validar_rh_costapproach.out.json'), JSON.stringify(rows, null, 1));
console.log('\nDetalle guardado en validar_rh_costapproach.out.json');
