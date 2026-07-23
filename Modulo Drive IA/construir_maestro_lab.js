/**
 * construir_maestro.js
 * Fusiona las 6 fuentes por-colonia en UN archivo: colonias_maestro.json
 *
 * Fusión POR COLUMNAS, no destructiva: cada colonia es un registro con sub-campos.
 * La cascada del motor (v1 → v2 → idx) se preserva idéntica; solo cambia de dónde lee.
 *
 *   { "<colonia norm>": {
 *       municipio, zona,                 // referencia (de la enriquecida v2 _sujeto)
 *       nse: { v1, v2 },                 // v2 solo si NO está en v1 (cascada nunca lee v2 si hay v1)
 *       idx: {...},                      // idx_valoracion[colonia] tal cual
 *       similares: [...]                 // primer no-vacío: v2 → sim → simIA (mismo orden que getSimilares)
 *   } }
 *
 * Uso: node construir_maestro.js
 * NO modifica las fuentes — siguen siendo los inputs editables.
 */
const fs = require('fs');
const path = require('path');
const { coordsDeColonia } = require('./_geo/proximidad.cjs');

const R = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};

const nse   = R(path.join(__dirname, 'colonias_nse.json'));
const nse2  = R(path.join(__dirname, 'colonias_nse_v2.json'));
const idxRaw = R(path.join(__dirname, 'idx_valoracion.json'));
const idxMeta = idxRaw._meta || {};
const idxVal = (() => { const { _meta, ...c } = idxRaw; return c; })();
const simV2 = R(path.join(__dirname, 'colonias_similares.enriquecido.v2.json'));
const sim   = R(path.join(__dirname, 'colonias_similares.json'));
const simIA = R(path.join(__dirname, 'colonias_similares_enriquecido.json'));
// Capa GANADA del perito (flywheel): NSE verificado de avalúos reales. Cascada v1 → perito → v2.
const perito = R(path.join(__dirname, 'calibraciones_perito.json'));

// Similares en el MISMO orden de prioridad que getSimilares: v2 → sim → simIA
function similaresDe(key) {
  const v2 = simV2[key] && simV2[key].similares;
  if (v2 && v2.length) return v2;                       // conservan municipio/zona
  const base = sim[key];
  if (base && base.length) return base;
  const ia = simIA[key];
  if (ia && ia.length) return ia.map(x => typeof x === 'string' ? { colonia: x, menciones: 1 } : x);
  return null;
}

const todas = new Set([
  ...Object.keys(nse), ...Object.keys(nse2), ...Object.keys(idxVal), ...Object.keys(perito),
  ...Object.keys(simV2), ...Object.keys(sim), ...Object.keys(simIA),
]);

const maestro = {};
const stats = { total: 0, con_v1: 0, con_perito: 0, con_v2: 0, con_idx: 0, con_sim: 0, con_geo: 0, v2_omitidas: 0, v1_con_fecha: 0 };

for (const key of todas) {
  if (!key) continue;
  if (key === '_meta') continue;   // nunca tratar metadatos como colonia
  stats.total++;
  const rec = {};

  // Geo (referencia) — de la enriquecida v2
  const suj = simV2[key] && simV2[key]._sujeto;
  if (suj && suj.municipio) {
      rec.municipio = suj.municipio;
      if (suj.zona) rec.zona = suj.zona;
      stats.con_geo++;
      
      // Intentar adjuntar el CP (Componente 1)
      const coordInfo = coordsDeColonia(key, rec.municipio);
      if (coordInfo && coordInfo.cp) {
          rec.cp = coordInfo.cp;
      }
  }

  // NSE — cascada v1 → perito → v2 → idx. Cada capa se guarda; v2 solo si no hay v1 ni perito.
  const nseObj = {};
  if (nse[key])    { nseObj.v1 = nse[key]; stats.con_v1++; if (nse[key].fecha_verificacion) stats.v1_con_fecha++; }
  if (perito[key]) { nseObj.perito = perito[key]; stats.con_perito++; }
  if (nse2[key]) {
    if (nse[key] || perito[key]) stats.v2_omitidas++;   // redundante: v1/perito ganan
    else { nseObj.v2 = nse2[key]; stats.con_v2++; }
  }
  if (Object.keys(nseObj).length) rec.nse = nseObj;

  // IDX por tipo/segmento — tal cual
  if (idxVal[key]) { rec.idx = idxVal[key]; stats.con_idx++; }

  // Similares (cascada al construir)
  const sims = similaresDe(key);
  if (sims) { rec.similares = sims; stats.con_sim++; }

  maestro[key] = rec;
}

// _meta: capas (ganada vs derivada) + temporalidad. El motor ignora "_meta" (no es colonia).
maestro._meta = {
  generado: new Date().toISOString(),
  capas: {
    ganada_v1: { campo: 'nse.v1', fuente: 'colonias_nse.json (calibración histórica)', prioridad: 1 },
    ganada_perito: { campo: 'nse.perito', fuente: 'calibraciones_perito.json (avalúos reales, flywheel)', temporal: 'fecha_verificacion por colonia', prioridad: 2 },
    derivada: { campos: 'nse.v2 / idx', fuente: 'scraper', ventanaMeses: idxMeta.ventanaMeses || null, fechaCalculo: idxMeta.fechaCalculo || null, prioridad: 3 },
  },
  cascada_nse: 'nse.v1 → nse.perito → nse.v2 → idx[tipo].global → idx.casa.global',
  nota: 'Regenerar con: node construir_maestro.js. Llave = colonia normalizada; municipio/zona son columnas de referencia.',
};

const OUT = path.join(__dirname, 'colonias_maestro.lab.json');
fs.writeFileSync(OUT, JSON.stringify(maestro, null, 1));

console.log('=== MAESTRO CONSTRUIDO ===');
console.log('Archivo:', OUT);
console.log('Colonias totales:   ', stats.total);
console.log('  con NSE v1 (ganada):', stats.con_v1, '— con fecha_verificacion:', stats.v1_con_fecha);
console.log('  con NSE perito (flywheel):', stats.con_perito);
console.log('  con NSE v2 (solo):', stats.con_v2, '(v2 redundantes omitidas:', stats.v2_omitidas + ')');
console.log('  con idx:          ', stats.con_idx);
console.log('  con similares:    ', stats.con_sim);
console.log('  con geo (muni):   ', stats.con_geo);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('Tamaño maestro:     ', kb, 'KB');
