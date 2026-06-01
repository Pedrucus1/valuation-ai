/**
 * consolidar_comps_acumulados.js
 * Lee el log append-only comps_acumulados.ndjson (escrito por el motor en cada avalúo
 * con búsqueda web), deduplica por URL (gana el más reciente) y CLASIFICA cada comp por
 * confianza, cruzándolo contra la mediana real de su zona (cache_index / idx_valoracion):
 *
 *   verificado    → pm2c coherente con la mediana real de su colonia Y portal confiable
 *   por_verificar → sin referencia de zona, o moderadamente fuera, o portal dudoso (ej. Facebook)
 *   sospechoso    → pm2c fuera de rango absoluto o muy lejos de la referencia
 *
 * Solo los `verificado` deberían entrar al pool de valuación (Fase 3b). NO toca la valuación
 * ni los datos del scraper/perito — solo etiqueta el archivo aparte.
 *
 * Emite comps_acumulados.json (con campo `confianza`). Uso: node consolidar_comps_acumulados.js
 */
const fs = require('fs');
const path = require('path');
const { normCol, normMuni, normTipo } = require('./motor_remi_api');

const NDJSON = path.join(__dirname, 'comps_acumulados.ndjson');
const OUT    = path.join(__dirname, 'comps_acumulados.json');

if (!fs.existsSync(NDJSON)) {
  console.log('No hay comps_acumulados.ndjson todavía — el motor lo genera al hacer avalúos con búsqueda web.');
  process.exit(0);
}

// Referencias de mercado YA confiables (scraper + idx)
const IDX    = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const idxVal = (() => { const { _meta, ...c } = JSON.parse(fs.readFileSync(path.join(__dirname, 'idx_valoracion.json'), 'utf8')); return c; })();

// Portales inmobiliarios reales (un listing aquí es corroborable). Otros (Facebook, desconocidos)
// no pueden ser "verificado" sin que su precio cuadre muy bien con la zona.
const TRUSTED = /inmuebles24|lamudi|casasyterrenos|vivanuncios|propiedades\.com|mercadolibre|icasas|century21|pincali|trovit|nestoria|iadmexico|monopolio|pulppo|guiacasasyterrenos|propiedadesmexico/i;

function dominio(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } }

function refPm2c(c) {
  const muni = normMuni(c.municipio || ''), col = normCol(c.colonia || ''), tipo = normTipo(c.tipo || 'casa');
  let r = IDX[muni]?.[tipo]?.[col]?.medianaPm2c;
  if (r > 0) return { ref: r, fuente: 'scraper-colonia' };
  r = idxVal[col]?.[tipo]?.global?.medianaPm2 || idxVal[col]?.casa?.global?.medianaPm2;
  if (r > 0) return { ref: r, fuente: 'idx_valoracion' };
  return { ref: 0, fuente: 'sin-referencia' };
}

function clasificar(c) {
  const pm2 = c.precio / c.m2c;
  if (pm2 < 3000 || pm2 > 90000) return { confianza: 'sospechoso', motivo: `pm2c ${Math.round(pm2)} fuera de rango absoluto` };
  const portalOk = TRUSTED.test(dominio(c.url));
  const { ref, fuente } = refPm2c(c);
  if (ref > 0) {
    const ratio = pm2 / ref;
    if (ratio < 0.45 || ratio > 2.2) return { confianza: 'sospechoso', motivo: `pm2c ${Math.round(pm2)} vs ref ${Math.round(ref)} (${fuente})` };
    if (ratio >= 0.65 && ratio <= 1.55 && portalOk) return { confianza: 'verificado', motivo: `coherente con ${fuente} (ratio ${ratio.toFixed(2)})` };
    return { confianza: 'por_verificar', motivo: `ratio ${ratio.toFixed(2)} vs ${fuente}${portalOk ? '' : ' / portal dudoso'}` };
  }
  return { confianza: 'por_verificar', motivo: 'sin referencia de zona' + (portalOk ? '' : ' / portal dudoso') };
}

// Dedup por URL (gana el más reciente)
const lineas = fs.readFileSync(NDJSON, 'utf8').split('\n').filter(Boolean);
let malformadas = 0;
const porUrl = new Map();
for (const l of lineas) {
  let c; try { c = JSON.parse(l); } catch { malformadas++; continue; }
  if (!c.url || !(c.precio > 0) || !(c.m2c > 0)) { malformadas++; continue; }
  const prev = porUrl.get(c.url);
  if (!prev || (c.fecha || '') >= (prev.fecha || '')) porUrl.set(c.url, c);
}

const comps = [...porUrl.values()].map(c => { const { confianza, motivo } = clasificar(c); return { ...c, confianza, motivo }; });
fs.writeFileSync(OUT, JSON.stringify(comps, null, 1));

// Reporte
const conf = { verificado: 0, por_verificar: 0, sospechoso: 0 };
const porMuni = {};
for (const c of comps) { conf[c.confianza]++; const m = (c.municipio || '?').toLowerCase(); porMuni[m] = (porMuni[m] || 0) + 1; }

console.log('=== COMPS ACUMULADOS CONSOLIDADOS + CLASIFICADOS ===');
console.log('Líneas en log:        ', lineas.length, '(inválidas:', malformadas + ')');
console.log('Comps únicos (por URL):', comps.length);
console.log('Archivo:              ', OUT);
console.log('\nConfianza:');
console.log('  ✅ verificado   ', conf.verificado, '(' + (conf.verificado * 100 / comps.length).toFixed(0) + '%) — listos para Fase 3b');
console.log('  🟡 por_verificar', conf.por_verificar, '(' + (conf.por_verificar * 100 / comps.length).toFixed(0) + '%) — necesitan corroboración');
console.log('  🔴 sospechoso   ', conf.sospechoso, '(' + (conf.sospechoso * 100 / comps.length).toFixed(0) + '%) — NO usar');
console.log('\nPor municipio:');
Object.entries(porMuni).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([m, n]) => console.log('  ' + m.padEnd(26), n));
