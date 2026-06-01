/**
 * construir_puente_comps.js  (#101 — Puente NSE de comps acumulados)
 *
 * Toma los comps web ya clasificados por consolidar_comps_acumulados.js (comps_acumulados.json)
 * y deja en comps_verificados.json SOLO los `verificado`, mapeados al esquema del cache que lee
 * el motor (p,c,t,tp,co,mu,fs). build_cache_index.js los concatena a cache_consolidado.json antes
 * de indexar, de modo que el flywheel web alimente el pool de valuación.
 *
 * Diseño: archivo lateral (no muta cache_consolidado.json → sobrevive a los refrescos de Sheets).
 * Idempotente (dedup por URL). Revertir = borrar comps_verificados.json + rebuild.
 *
 * Uso:
 *   node construir_puente_comps.js                 — solo `verificado`
 *   node construir_puente_comps.js --incluir-pv    — además `por_verificar` de portal confiable
 */
const fs = require('fs');
const path = require('path');

const IN  = path.join(__dirname, 'comps_acumulados.json');
const OUT = path.join(__dirname, 'comps_verificados.json');

if (!fs.existsSync(IN)) {
  console.log('No existe comps_acumulados.json — corre antes: node consolidar_comps_acumulados.js');
  process.exit(0);
}

const incluirPV = process.argv.includes('--incluir-pv');
// Mismos portales confiables que consolidar_comps_acumulados.js
const TRUSTED = /inmuebles24|lamudi|casasyterrenos|vivanuncios|propiedades\.com|mercadolibre|icasas|century21|pincali|trovit|nestoria|iadmexico|monopolio|pulppo|guiacasasyterrenos|propiedadesmexico/i;
function dominio(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } }

const comps = JSON.parse(fs.readFileSync(IN, 'utf8'));

const aceptado = c => c.confianza === 'verificado'
  || (incluirPV && c.confianza === 'por_verificar' && TRUSTED.test(dominio(c.url)));

// Dedup por URL (gana el más reciente)
const porUrl = new Map();
let descartados = 0;
for (const c of comps) {
  if (!aceptado(c)) { descartados++; continue; }
  if (!(c.precio > 0) || !(c.m2c > 0) || !c.colonia || !c.municipio) { descartados++; continue; }
  const prev = porUrl.get(c.url);
  if (!prev || (c.fecha || '') >= (prev.fecha || '')) porUrl.set(c.url, c);
}

const datos = [...porUrl.values()].map(c => ({
  p:  Math.round(c.precio),
  c:  Math.round(c.m2c),
  t:  Math.round(c.m2t) || 0,
  tp: (c.tipo || 'casa').toLowerCase(),
  co: c.colonia.toLowerCase(),
  mu: c.municipio.toLowerCase(),
  fs: (c.fecha || '').toString().slice(0, 10) || null,
  _fuente: 'web_verificado',
}));

fs.writeFileSync(OUT, JSON.stringify(datos, null, 1));

const porConf = {};
comps.forEach(c => porConf[c.confianza] = (porConf[c.confianza] || 0) + 1);
console.log('=== PUENTE COMPS VERIFICADOS (#101) ===');
console.log('Entrada (comps_acumulados.json):', comps.length, JSON.stringify(porConf));
console.log('Incluir por_verificar (portal confiable):', incluirPV);
console.log('Aceptados al puente:', datos.length, '· descartados:', descartados);
console.log('Archivo:', OUT);
console.log('→ rebuild: node build_cache_index.js');
