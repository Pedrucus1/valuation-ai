/**
 * analizar_rescate.js — diagnóstico de los violadores ±20% CON datos (similares/exacta).
 * Para cada OPI: perito vs motor, comps usados y mediana de caché de la colonia →
 * revela si es caché contaminado (rescatable) o atípico real.
 * Uso: node analizar_rescate.js
 */
const fs = require('fs');
const path = require('path');
const { valuarPropiedad, normTipo, normCol, normMuni } = require('./motor_remi_api');

const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;
const FACTOR = { 2026: 1.00, 2025: 1.04, 2024: 1.13, 2023: 1.14 };

const TARGETS = ['OPI-25-5-08-OF','OPI-25-9-02-OF','OPI-25-6-04-LM','OPI-25-4-20-AV','OPI-25-5-03-AV','OPI-25-4-06-OF','OPI-26-2-25-OF'];

for (const folio of TARGETS) {
  const o = cerebro.find(x => (x.folio || '') === folio);
  if (!o) { console.log(folio, '— no encontrado'); continue; }
  const m2C = num(o.m2Construccion);
  const prop = {
    tipo: normTipo(o.tipo || 'casa'), construccion: m2C, terreno: num(o.m2Terreno),
    edad: num(o.edad), estadoConservacion: o.estadoConservacion || 'bueno',
    municipio: o.municipio || '', colonia: o.sujetoColonia || '', esEjidal: o.esEjidal || false,
  };
  const yr = 2000 + +(folio.match(/OPI-(\d+)/)[1]);
  const peritoPm2 = num(o.valorMercado) / m2C;
  const peritoAdj = peritoPm2 * (FACTOR[yr] || 1);
  const r = valuarPropiedad(prop);
  const motorPm2 = r.pm2cAvg || (r.valor / m2C);
  const diff = ((motorPm2 - peritoAdj) / peritoAdj * 100);
  const colN = normCol(prop.colonia), muniN = normMuni(prop.municipio);
  const idxCol = IDX[muniN]?.[prop.tipo]?.[colN];

  console.log('━━━', folio, '|', prop.colonia, '/', prop.municipio, '|', m2C + 'm²C', '| pool:', r.poolTipo, 'n:' + r.nComps);
  console.log('   perito: $' + Math.round(peritoPm2) + '/m²  (ajust ' + yr + '×' + FACTOR[yr] + ' = $' + Math.round(peritoAdj) + ')   motor: $' + Math.round(motorPm2) + '/m²   diff: ' + (diff > 0 ? '+' : '') + diff.toFixed(0) + '%');
  console.log('   caché colonia exacta:', idxCol ? ('mediana $' + idxCol.medianaPm2c + '/m²C, ' + idxCol.count + ' listings') : 'SIN datos exactos');
  if (r._comps && r._comps.length) {
    const pm2s = r._comps.map(c => Math.round(c.precio / c.m2c)).sort((a, b) => a - b);
    console.log('   comps motor pm2c:', pm2s.join(', '));
  }
  console.log();
}
