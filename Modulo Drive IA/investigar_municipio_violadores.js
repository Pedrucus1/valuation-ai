/**
 * investigar_municipio_violadores.js
 * Para cada violador ±20% de 2025-2026: revisa si su colonia tiene inventario en OTRO
 * municipio y prueba re-valuar con el municipio alterno. Revela cuáles se rescatan al corregir muni.
 */
const fs = require('fs');
const path = require('path');
const { valuarPropiedad, normCol, normMuni, normTipo } = require('./motor_remi_api');
const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;
const FACTOR = { 2026: 1.00, 2025: 1.04, 2024: 1.13, 2023: 1.14 };

const VIOL = ['OPI-25-9-01-OF','OPI-25-5-08-OF','OPI-25-9-02-OF','OPI-25-1-38-AV','OPI-25-3-11-AV',
  'OPI-26-1-19-OF','OPI-25-6-04-LM','OPI-25-2-03-RM','OPI-25-4-15-AV','OPI-25-4-20-AV','OPI-25-5-03-AV',
  'OPI-25-11-02-OF','OPI-25-7-03-OF','OPI-25-4-06-OF','OPI-26-2-25-OF','OPI-25-1-12-AV'];

function distMuni(colK, tipo) {
  const r = [];
  for (const m of Object.keys(IDX)) { const d = IDX[m]?.[tipo]?.[colK]; if (d?.count) r.push([m, d.count, d.medianaPm2c]); }
  return r.sort((a, b) => b[1] - a[1]);
}
function valuar(prop) { const r = valuarPropiedad(prop); return { pm2: r.pm2cAvg || Math.round(r.valor / prop.construccion), pool: r.poolTipo, n: r.nComps }; }

for (const folio of VIOL) {
  const o = cerebro.find(x => (x.folio || '') === folio); if (!o) continue;
  const m2C = num(o.m2Construccion); if (!m2C) continue;
  const tipo = normTipo(o.tipo || 'casa'), colK = normCol(o.sujetoColonia || ''), mnStated = normMuni(o.municipio || '');
  const yr = 2000 + +(folio.match(/OPI-(\d+)/)[1]);
  const peritoAdj = (num(o.valorMercado) / m2C) * (FACTOR[yr] || 1);
  const prop = { tipo, construccion: m2C, terreno: num(o.m2Terreno), edad: num(o.edad), estadoConservacion: o.estadoConservacion || 'bueno', colonia: o.sujetoColonia, municipio: o.municipio, esEjidal: o.esEjidal || false };

  const dist = distMuni(colK, tipo);
  const statedN = dist.find(d => d[0] === mnStated)?.[1] || 0;
  const otro = dist.find(d => d[0] !== mnStated && d[1] >= 5);

  const base = valuar(prop);
  const dBase = ((base.pm2 - peritoAdj) / peritoAdj * 100).toFixed(0);
  let linea = `${folio.padEnd(15)} ${(o.sujetoColonia||'').slice(0,20).padEnd(20)} ${mnStated.slice(0,10).padEnd(10)}(n=${statedN}) base:${dBase>0?'+':''}${dBase}%`;
  if (otro) {
    const alt = valuar({ ...prop, municipio: otro[0] });
    const dAlt = ((alt.pm2 - peritoAdj) / peritoAdj * 100).toFixed(0);
    const rescata = Math.abs(dAlt) <= 20 && Math.abs(+dBase) > 20;
    linea += `  | ALT ${otro[0]}(n=${otro[1]}): ${dAlt>0?'+':''}${dAlt}% ${rescata ? '✅RESCATA' : ''}`;
  } else {
    linea += `  | sin inventario alterno (estructural)`;
  }
  console.log(linea);
}
