/**
 * construir_calibraciones_perito.js  (Flywheel — Fase 3)
 * Deriva, por colonia, un NSE/pm2c VERIFICADO a partir de los avalúos reales del perito
 * (cerebro_datos.json) → calibraciones_perito.json.
 *
 * Es la capa que hace crecer v1 sola: cada avalúo del perito aporta valor real verificado.
 * Cascada en el motor: v1 → PERITO → v2 → idx  (v1 se respeta; el perito solo mejora donde
 * no hay v1, ganándole a las estimaciones del scraper).
 *
 * Uso:
 *   node construir_calibraciones_perito.js                 → usa TODOS los avalúos (producción)
 *   node construir_calibraciones_perito.js --antes-de 2025-07
 *        → solo avalúos anteriores a ese mes (split temporal para medir honesto en el validador)
 */
const fs = require('fs');
const path = require('path');
const { normCol } = require('./motor_remi_api');

// Mismo mapeo pm2c→NSE que construir_nse_v2.js (consistencia con v1/v2/idx)
const NSE_CATEGORIAS = [
  { idx: 0, nombre: 'economico',      min: 0,      max: 9000     },
  { idx: 1, nombre: 'interes-social', min: 9000,   max: 14000    },
  { idx: 2, nombre: 'medio-bajo',     min: 14000,  max: 21000    },
  { idx: 3, nombre: 'medio-medio',    min: 21000,  max: 33000    },
  { idx: 4, nombre: 'medio-alto',     min: 33000,  max: 52000    },
  { idx: 5, nombre: 'lujo',           min: 52000,  max: 85000    },
  { idx: 6, nombre: 'super-lujo',     min: 85000,  max: Infinity },
];
const clasificarNSE = pm2 => NSE_CATEGORIAS.find(c => pm2 >= c.min && pm2 < c.max) || NSE_CATEGORIAS[NSE_CATEGORIAS.length - 1];

const args = process.argv.slice(2);
const ANTES_DE = args[args.indexOf('--antes-de') !== -1 ? args.indexOf('--antes-de') + 1 : -1] || null;
let cutAnio = 0, cutMes = 0;
if (ANTES_DE) { const [a, m] = ANTES_DE.split('-').map(Number); cutAnio = a; cutMes = m; }

const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;
const ym = folio => { const m = (folio || '').match(/OPI-(\d+)-(\d+)-/); return m ? [2000 + +m[1], +m[2]] : null; };
const antesDeCorte = f => !ANTES_DE || (f && (f[0] < cutAnio || (f[0] === cutAnio && f[1] < cutMes)));

const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

const porColonia = {};   // normCol → { pm2s:[], munis:{}, fechaMax }
let usados = 0;
for (const x of cerebro) {
  if (!x.sujetoColonia) continue;
  const pm2 = (() => { const vm = num(x.valorMercado), mc = num(x.m2Construccion); return (vm > 0 && mc > 0) ? vm / mc : 0; })();
  if (!(pm2 > 2000 && pm2 < 120000)) continue;          // descarta capturas dudosas
  const f = ym(x.folio);
  if (!antesDeCorte(f)) continue;                        // split temporal
  usados++;
  const k = normCol(x.sujetoColonia);
  if (!k) continue;
  if (!porColonia[k]) porColonia[k] = { pm2s: [], munis: {}, fechaMax: '' };
  const e = porColonia[k];
  e.pm2s.push(pm2);
  if (x.municipio) e.munis[x.municipio] = (e.munis[x.municipio] || 0) + 1;
  if (f) { const fs2 = `${f[0]}-${String(f[1]).padStart(2, '0')}`; if (fs2 > e.fechaMax) e.fechaMax = fs2; }
}

const mediana = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const out = {};
for (const [k, e] of Object.entries(porColonia)) {
  const pm2 = Math.round(mediana(e.pm2s));
  const cat = clasificarNSE(pm2);
  const muni = Object.entries(e.munis).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  out[k] = {
    nse: cat.nombre, nseIdx: cat.idx, medianaPm2: pm2,
    nListings: e.pm2s.length, n_avaluos: e.pm2s.length,
    municipio: muni, fecha_verificacion: e.fechaMax, fuente: 'perito',
  };
}

const OUT = path.join(__dirname, 'calibraciones_perito.json');
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

console.log('=== CALIBRACIONES PERITO (flywheel) ===');
console.log('Modo:', ANTES_DE ? `solo avalúos antes de ${ANTES_DE} (split)` : 'TODOS los avalúos (producción)');
console.log('Avalúos usados:', usados);
console.log('Colonias calibradas:', Object.keys(out).length);
console.log('Archivo:', OUT);
const dist = {};
Object.values(out).forEach(v => dist[v.nse] = (dist[v.nse] || 0) + 1);
console.log('Distribución NSE:', JSON.stringify(dist));
