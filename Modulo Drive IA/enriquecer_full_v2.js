/**
 * Enriquece TODO colonias_similares.json → colonias_similares.enriquecido.v2.json
 * Usa sepomex_v2 con resolución multi-match por zona del sujeto.
 * NO modifica el archivo original.
 */
const fs = require('fs');
const { normCol } = require('./motor_remi_api');

const sim = JSON.parse(fs.readFileSync('colonias_similares.json', 'utf8'));
const sepo = JSON.parse(fs.readFileSync('sepomex_v2.json', 'utf8'));
const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

const colMuni = {};
cerebro.forEach(d => {
  const n = normCol(d.sujetoColonia || '');
  if (!n) return;
  if (!colMuni[n]) colMuni[n] = {};
  const m = (d.municipio || '').trim();
  if (m) colMuni[n][m] = (colMuni[n][m] || 0) + 1;
});

const ZONAS = {
  'guadalajara':'AMG-Centro','zapopan':'AMG-NW','tlaquepaque':'AMG-SE','san pedro tlaquepaque':'AMG-SE',
  'tonalá':'AMG-E','tonala':'AMG-E','tlajomulco de zúñiga':'AMG-S','tlajomulco':'AMG-S',
  'el salto':'AMG-S','juanacatlán':'AMG-S','ixtlahuacán de los membrillos':'AMG-S',
  'chapala':'Chapala','jocotepec':'Chapala','poncitlán':'Chapala','ajijic':'Chapala',
  'puerto vallarta':'Costa-Sur','bahía de banderas':'Costa-Sur','compostela':'Costa-Sur',
  'manzanillo':'Costa-Colima','armería':'Costa-Colima',
};
function zonaOf(m) { return m ? (ZONAS[m.toLowerCase()] || 'Otro') : null; }

function sujetoMuni(key) {
  // Cerebro primero (perito's reality)
  if (colMuni[key] && Object.keys(colMuni[key]).length) {
    const sorted = Object.entries(colMuni[key]).sort((a,b)=>b[1]-a[1]);
    const muni = sorted[0][0];
    // Si hay también match en SEPOMEX y son distintos → flag conflicto
    const sepEntries = sepo[key] || [];
    if (sepEntries.length === 1 && sepEntries[0].municipio !== muni) {
      return { municipio: muni, fuente: 'cerebro', conflicto_sepomex: sepEntries[0].municipio };
    }
    return { municipio: muni, fuente: 'cerebro' };
  }
  // SEPOMEX si match único
  const arr = sepo[key];
  if (arr && arr.length === 1) return { municipio: arr[0].municipio, fuente: 'sepomex' };
  if (arr && arr.length > 1) {
    const amg = arr.filter(e => ZONAS[e.municipio.toLowerCase()] && ZONAS[e.municipio.toLowerCase()].startsWith('AMG'));
    if (amg.length === 1) return { municipio: amg[0].municipio, fuente: 'sepomex-amg' };
    return { municipio: null, fuente: 'ambiguo_sin_zona', candidatos: [...new Set(arr.map(e => e.municipio + '/' + e.estado))] };
  }
  return { municipio: null, fuente: 'sin_datos' };
}

function resolverSimilar(nombre, zonaSujeto, muniSujeto) {
  const k = normCol(nombre);
  const arr = sepo[k] || [];
  if (arr.length === 1) {
    return { municipio: arr[0].municipio, estado: arr[0].estado, zona: zonaOf(arr[0].municipio), tipo: arr[0].tipo, fuente: 'sepomex' };
  }
  if (arr.length > 1) {
    // 1) match exacto de municipio
    if (muniSujeto) {
      const mismo = arr.filter(e => e.municipio.toLowerCase() === muniSujeto.toLowerCase());
      if (mismo.length === 1) return { municipio: mismo[0].municipio, estado: mismo[0].estado, zona: zonaSujeto, tipo: mismo[0].tipo, fuente: 'sepomex+muni-sujeto' };
      if (mismo.length > 1) return { municipio: mismo[0].municipio, estado: mismo[0].estado, zona: zonaSujeto, tipo: mismo[0].tipo, fuente: 'sepomex+muni-sujeto-primero', n_matches: mismo.length };
    }
    // 2) match por zona
    if (zonaSujeto) {
      const mismaZona = arr.filter(e => zonaOf(e.municipio) === zonaSujeto);
      if (mismaZona.length === 1) return { municipio: mismaZona[0].municipio, estado: mismaZona[0].estado, zona: zonaSujeto, tipo: mismaZona[0].tipo, fuente: 'sepomex+zona-sujeto' };
      if (mismaZona.length > 1) return { municipio: mismaZona[0].municipio, estado: mismaZona[0].estado, zona: zonaSujeto, tipo: mismaZona[0].tipo, fuente: 'sepomex+zona-sujeto-primero', n_matches: mismaZona.length };
    }
    return { municipio: null, fuente: 'sepomex_ambiguo', candidatos: [...new Set(arr.map(e => e.municipio + '/' + e.estado))].slice(0, 8) };
  }
  // Cerebro fallback
  if (colMuni[k] && Object.keys(colMuni[k]).length) {
    const sorted = Object.entries(colMuni[k]).sort((a,b)=>b[1]-a[1]);
    return { municipio: sorted[0][0], zona: zonaOf(sorted[0][0]), fuente: 'cerebro' };
  }
  return { municipio: null, fuente: 'sin_datos' };
}

const out = {};
const stats = {
  keys_total: 0, keys_resueltos: 0, keys_sin_datos: 0, keys_ambiguos: 0, conflictos_sujeto: 0,
  sim_total: 0, sim_sepomex: 0, sim_sepomex_zona: 0, sim_cerebro: 0, sim_ambiguo: 0, sim_sin_datos: 0,
};

Object.entries(sim).forEach(([key, arr]) => {
  stats.keys_total++;
  const sm = sujetoMuni(key);
  const zonaSujeto = zonaOf(sm.municipio);
  if (sm.municipio) stats.keys_resueltos++;
  else if (sm.fuente === 'ambiguo_sin_zona') stats.keys_ambiguos++;
  else stats.keys_sin_datos++;
  if (sm.conflicto_sepomex) stats.conflictos_sujeto++;

  out[key] = {
    _sujeto: { municipio: sm.municipio, zona: zonaSujeto, fuente: sm.fuente, ...(sm.candidatos ? {candidatos: sm.candidatos} : {}), ...(sm.conflicto_sepomex ? {conflicto_sepomex: sm.conflicto_sepomex} : {}) },
    similares: arr.map(e => {
      stats.sim_total++;
      const r = resolverSimilar(e.colonia, zonaSujeto, sm.municipio);
      if (r.fuente === 'sepomex') stats.sim_sepomex++;
      else if (r.fuente && r.fuente.startsWith('sepomex+')) stats.sim_sepomex_zona++;
      else if (r.fuente === 'cerebro') stats.sim_cerebro++;
      else if (r.fuente === 'sepomex_ambiguo') stats.sim_ambiguo++;
      else stats.sim_sin_datos++;
      return { colonia: e.colonia, ...r, menciones: e.menciones };
    })
  };
});

fs.writeFileSync('colonias_similares.enriquecido.v2.json', JSON.stringify(out, null, 2));

console.log('=== ENRIQUECIMIENTO COMPLETO V2 ===');
console.log('Archivo: colonias_similares.enriquecido.v2.json');
console.log();
console.log('SUJETOS (keys):');
console.log('  Total:                ', stats.keys_total);
console.log('  Resueltos con muni:   ', stats.keys_resueltos, '(' + (stats.keys_resueltos*100/stats.keys_total).toFixed(1) + '%)');
console.log('  Ambiguos (multi-muni):', stats.keys_ambiguos);
console.log('  Sin datos:            ', stats.keys_sin_datos);
console.log('  Conflictos cerebro/sepomex:', stats.conflictos_sujeto);
console.log();
console.log('SIMILARES (entries):');
console.log('  Total:                ', stats.sim_total);
console.log('  sepomex directo:      ', stats.sim_sepomex, '(' + (stats.sim_sepomex*100/stats.sim_total).toFixed(1) + '%)');
console.log('  sepomex+zona/muni:    ', stats.sim_sepomex_zona, '(' + (stats.sim_sepomex_zona*100/stats.sim_total).toFixed(1) + '%)');
console.log('  cerebro fallback:     ', stats.sim_cerebro, '(' + (stats.sim_cerebro*100/stats.sim_total).toFixed(1) + '%)');
console.log('  AMBIGUOS:             ', stats.sim_ambiguo, '(' + (stats.sim_ambiguo*100/stats.sim_total).toFixed(1) + '%)');
console.log('  SIN DATOS:            ', stats.sim_sin_datos, '(' + (stats.sim_sin_datos*100/stats.sim_total).toFixed(1) + '%)');

const totalResueltos = stats.sim_sepomex + stats.sim_sepomex_zona + stats.sim_cerebro;
console.log('  → Total resueltos:    ', totalResueltos, '(' + (totalResueltos*100/stats.sim_total).toFixed(1) + '%)');
