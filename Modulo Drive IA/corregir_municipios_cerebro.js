/**
 * corregir_municipios_cerebro.js
 * Corrige el municipio mal capturado en cerebro_datos.json para colonias cuyo inventario
 * real está en OTRO municipio. Guardrail anti-falso-positivo: el pm2c del perito DEBE coincidir
 * con la mediana del municipio candidato (descarta nombres genéricos como "Centro").
 *
 * Regla de corrección (alta confianza):
 *   - colonia con <3 listings en el municipio del avalúo
 *   - otro municipio con ≥8 listings de esa colonia
 *   - |peritoPm2 − medianaOtroMuni| / medianaOtroMuni ≤ 0.30  (el perito "vive" en ese muni)
 *
 * Uso:
 *   node corregir_municipios_cerebro.js           # DRY-RUN (solo muestra)
 *   node corregir_municipios_cerebro.js --apply   # aplica (sobre cerebro_datos.json)
 */
const fs = require('fs');
const path = require('path');
const { normCol, normMuni, normTipo } = require('./motor_remi_api');

const APPLY = process.argv.includes('--apply');
const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');
const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;

// nombres genéricos: aunque pasen el guardrail, requerir match aún más estricto
const GENERICO = /^(centro|san isidro|san jose|la cruz|el refugio|guadalupe|las flores|lomas|el mirador)$/;

function distListings(colK, tipo) {
  const r = {};
  for (const mun of Object.keys(IDX)) {
    const d = IDX[mun]?.[tipo]?.[colK];
    if (d && d.count) r[mun] = { count: d.count, median: d.medianaPm2c };
  }
  return r;
}

let corregidos = 0, revisados = 0;
const cambios = [];

for (const o of cerebro) {
  const col = o.sujetoColonia, muniRaw = o.municipio;
  if (!col || !muniRaw) continue;
  const m2C = num(o.m2Construccion), vm = num(o.valorMercado);
  const peritoPm2 = (m2C > 0 && vm > 0) ? vm / m2C : 0;
  if (!peritoPm2) continue;
  const k = normCol(col), mn = normMuni(muniRaw), tipo = normTipo(o.tipo || 'casa');
  revisados++;

  const dist = distListings(k, tipo);
  const statedCount = dist[mn]?.count || 0;
  if (statedCount >= 3) continue;

  const otros = Object.entries(dist).filter(([m]) => m !== mn).sort((a, b) => b[1].count - a[1].count);
  if (!otros.length) continue;
  const [bestMuni, best] = otros[0];
  if (best.count < 8) continue;

  const tol = GENERICO.test(k) ? 0.15 : 0.30;        // genéricos: más estricto
  const matchOtro = Math.abs(peritoPm2 - best.median) / best.median <= tol;
  if (!matchOtro) continue;

  cambios.push({ folio: o.folio, col, de: muniRaw, a: bestMuni, peritoPm2: Math.round(peritoPm2), medOtro: best.median, n: best.count });
  if (APPLY) { o.municipio = bestMuni; }   // muni canónico del caché (lowercase normalizado)
  corregidos++;
}

console.log(`=== CORRECCIÓN MUNICIPIOS ${APPLY ? '(APLICANDO)' : '(DRY-RUN)'} ===`);
console.log('Avalúos revisados:', revisados, '| correcciones:', corregidos, '\n');
cambios.sort((a, b) => b.n - a.n).forEach(c =>
  console.log(`  ${(c.folio || '?').padEnd(16)} ${c.col.padEnd(24)} ${c.de} → ${c.a}  (perito $${c.peritoPm2} ≈ med $${c.medOtro}, n=${c.n})`));

if (APPLY) {
  fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
  console.log('\n✓ cerebro_datos.json actualizado. Backup en _backups/.');
} else {
  console.log('\n(DRY-RUN — nada modificado. Correr con --apply para aplicar.)');
}
