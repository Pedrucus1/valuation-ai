/**
 * consolidar_comps_acumulados.js
 * Lee el log append-only comps_acumulados.ndjson (escrito por el motor en cada avalúo
 * con búsqueda web), deduplica por URL (gana el más reciente) y emite:
 *   - comps_acumulados.json  → base limpia de comparables reales acumulados
 * Reporta cobertura por municipio/portal. NO toca cache_consolidado (eso es un paso aparte).
 *
 * Uso: node consolidar_comps_acumulados.js
 */
const fs = require('fs');
const path = require('path');

const NDJSON = path.join(__dirname, 'comps_acumulados.ndjson');
const OUT    = path.join(__dirname, 'comps_acumulados.json');

if (!fs.existsSync(NDJSON)) {
  console.log('No hay comps_acumulados.ndjson todavía — el motor lo genera al hacer avalúos con búsqueda web.');
  process.exit(0);
}

const lineas = fs.readFileSync(NDJSON, 'utf8').split('\n').filter(Boolean);
let ok = 0, malformadas = 0;
const porUrl = new Map();   // url → comp (gana el más reciente por fecha)

for (const l of lineas) {
  let c;
  try { c = JSON.parse(l); } catch { malformadas++; continue; }
  if (!c.url || !(c.precio > 0) || !(c.m2c > 0)) { malformadas++; continue; }
  ok++;
  const prev = porUrl.get(c.url);
  if (!prev || (c.fecha || '') >= (prev.fecha || '')) porUrl.set(c.url, c);
}

const comps = [...porUrl.values()];
fs.writeFileSync(OUT, JSON.stringify(comps, null, 1));

// Reporte
const porMuni = {}, porPortal = {};
for (const c of comps) {
  const m = (c.municipio || '?').toLowerCase();
  porMuni[m]   = (porMuni[m] || 0) + 1;
  porPortal[c.portal || '?'] = (porPortal[c.portal || '?'] || 0) + 1;
}

console.log('=== COMPS ACUMULADOS CONSOLIDADOS ===');
console.log('Líneas en log:        ', lineas.length, '(malformadas/inválidas:', malformadas + ')');
console.log('Comps únicos (por URL):', comps.length);
console.log('Archivo limpio:       ', OUT);
console.log('\nPor municipio:');
Object.entries(porMuni).sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([m, n]) => console.log('  ' + m.padEnd(28), n));
console.log('\nPor portal:');
Object.entries(porPortal).sort((a, b) => b[1] - a[1])
  .forEach(([p, n]) => console.log('  ' + p.padEnd(28), n));
