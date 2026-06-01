/**
 * diagnostico_violadores.js — abre CADA violador ±20% de 2025-2026 y muestra la causa real:
 * perito vs motor, comps que usó (spread pm2c) y qué hay en el caché de la colonia (fuzzy).
 */
const fs = require('fs');
const path = require('path');
const { valuarPropiedad, normCol, normMuni, normTipo } = require('./motor_remi_api');
const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;
const F = { 2026: 1.00, 2025: 1.04 };

const VIOL = ['OPI-25-9-01-OF','OPI-25-9-02-OF','OPI-25-1-38-AV','OPI-25-3-11-AV','OPI-26-1-19-OF',
  'OPI-25-6-04-LM','OPI-25-2-03-RM','OPI-25-4-15-AV','OPI-25-5-03-AV','OPI-25-11-02-OF',
  'OPI-26-2-25-OF','OPI-25-1-12-AV'];

function cacheFuzzy(muniN, tipo, colK) {
  const t = IDX[muniN]?.[tipo] || {};
  return Object.keys(t).filter(c => c.includes(colK) || colK.includes(c))
    .map(c => `${c}(n=${t[c].count},$${t[c].medianaPm2c})`);
}

for (const folio of VIOL) {
  const o = cerebro.find(x => (x.folio || '') === folio); if (!o) continue;
  const m2C = num(o.m2Construccion); if (!m2C) continue;
  const yr = 2000 + +(folio.match(/OPI-(\d+)/)[1]);
  const pAdj = (num(o.valorMercado) / m2C) * (F[yr] || 1.04);
  const tipo = normTipo(o.tipo || 'casa'), colK = normCol(o.sujetoColonia || ''), muniN = normMuni(o.municipio || '');
  const r = valuarPropiedad({ tipo, construccion: m2C, terreno: num(o.m2Terreno), edad: num(o.edad), estadoConservacion: o.estadoConservacion || 'bueno', colonia: o.sujetoColonia, municipio: o.municipio, esEjidal: o.esEjidal || false });
  const pm = r.pm2cAvg || Math.round(r.valor / m2C);
  const diff = ((pm - pAdj) / pAdj * 100).toFixed(0);
  const comps = (r._comps || []).map(c => Math.round(c.precio / c.m2c)).sort((a, b) => a - b);
  console.log(`\n━━ ${folio} | ${o.sujetoColonia} / ${o.municipio} | ${m2C}m²C ${num(o.edad)}a ${o.estadoConservacion||'?'}`);
  console.log(`   perito $${Math.round(pAdj)} | motor $${pm} (${diff>0?'+':''}${diff}%) | pool ${r.poolTipo} n=${r.nComps}`);
  if (comps.length) console.log(`   comps usados pm2c: [${comps.join(', ')}]`);
  const fz = cacheFuzzy(muniN, tipo, colK).slice(0, 10);
  console.log(`   caché ${muniN}/${tipo} fuzzy "${colK}": ${fz.length ? fz.join('  ') : 'NINGUNO'}`);
}
