/**
 * Genera sample enriquecido v2 usando sepomex_v2 con resolución multi-match.
 * Para cada similar:
 *   1) busca en sepomex_v2 todas las ocurrencias del nombre
 *   2) filtra por zona del sujeto (mejor match)
 *   3) si hay 1 → seguro; varios en zona → primero por CP/tipo; ninguno → pendiente
 */
const fs = require('fs');
const { normCol } = require('./motor_remi_api');

const sim = JSON.parse(fs.readFileSync('colonias_similares.json', 'utf8'));
const sepo = JSON.parse(fs.readFileSync('sepomex_v2.json', 'utf8'));
const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

// Sujetos del perito → municipio
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
  'chapala':'Chapala','jocotepec':'Chapala','poncitlán':'Chapala',
  'puerto vallarta':'Costa-Sur','bahía de banderas':'Costa-Sur','compostela':'Costa-Sur',
  'manzanillo':'Costa-Colima','armería':'Costa-Colima',
};
function zonaOf(m) { return m ? (ZONAS[m.toLowerCase()] || 'Otro') : null; }

function sujetoMuni(key) {
  // 1) cerebro
  if (colMuni[key]) {
    const sorted = Object.entries(colMuni[key]).sort((a,b)=>b[1]-a[1]);
    return { municipio: sorted[0][0], fuente: 'cerebro' };
  }
  // 2) sepomex: si hay 1 match único, usarlo
  const arr = sepo[key];
  if (arr && arr.length === 1) return { municipio: arr[0].municipio, fuente: 'sepomex' };
  if (arr && arr.length > 1) {
    // Preferir Jalisco AMG
    const amg = arr.filter(e => ZONAS[e.municipio.toLowerCase()]);
    if (amg.length === 1) return { municipio: amg[0].municipio, fuente: 'sepomex-amg' };
    return { municipio: null, fuente: 'ambiguo', candidatos: arr.map(e => e.municipio + '/' + e.estado) };
  }
  return { municipio: null, fuente: 'sin_datos' };
}

function resolverSimilar(nombreSimilar, zonaSujeto) {
  const k = normCol(nombreSimilar);
  // 1) sepomex
  const arr = sepo[k] || [];
  if (arr.length === 1) {
    return { municipio: arr[0].municipio, estado: arr[0].estado, zona: zonaOf(arr[0].municipio), fuente: 'sepomex', tipo: arr[0].tipo };
  }
  if (arr.length > 1 && zonaSujeto) {
    const mismaZona = arr.filter(e => zonaOf(e.municipio) === zonaSujeto);
    if (mismaZona.length === 1) {
      return { municipio: mismaZona[0].municipio, estado: mismaZona[0].estado, zona: zonaSujeto, fuente: 'sepomex+zona-sujeto', tipo: mismaZona[0].tipo };
    }
    if (mismaZona.length > 1) {
      return { municipio: mismaZona[0].municipio, estado: mismaZona[0].estado, zona: zonaSujeto, fuente: 'sepomex+zona-sujeto-primero', tipo: mismaZona[0].tipo, total_en_zona: mismaZona.length };
    }
    // Sin match en misma zona → ambiguo
    return { municipio: null, fuente: 'sepomex-ambiguo', candidatos: arr.slice(0, 5).map(e => e.municipio + '/' + e.estado) };
  }
  // 2) cerebro
  if (colMuni[k]) {
    const sorted = Object.entries(colMuni[k]).sort((a,b)=>b[1]-a[1]);
    return { municipio: sorted[0][0], zona: zonaOf(sorted[0][0]), fuente: 'cerebro' };
  }
  return { municipio: null, fuente: 'sin_datos' };
}

const SAMPLE = [
  'las juntas','arcos de zapopan','lomas de zapopan','santa maria',
  'el campanario','del pilar','jardines de vallarta',
  'chapalita','providencia','americana','colomos providencia',
  'hacienda santa fe','real del sol','loma bonita ejidal',
  'centro','5 de diciembre'
];

const out = {};
SAMPLE.forEach(key => {
  if (!sim[key]) return;
  const sm = sujetoMuni(key);
  const zonaSujeto = zonaOf(sm.municipio);
  out[key] = {
    _sujeto: { municipio: sm.municipio, zona: zonaSujeto, fuente: sm.fuente, candidatos: sm.candidatos },
    similares: sim[key].map(e => {
      const r = resolverSimilar(e.colonia, zonaSujeto);
      return { colonia: e.colonia, ...r, menciones: e.menciones };
    })
  };
});

fs.writeFileSync('colonias_similares.enriquecido.SAMPLE.v2.json', JSON.stringify(out, null, 2));

// Reporte de calidad
console.log('=== SAMPLE V2 — CALIDAD DE RESOLUCIÓN ===\n');
Object.entries(out).forEach(([k, d]) => {
  console.log('▸ ' + k + ' | sujeto: ' + (d._sujeto.municipio || '?') + ' (' + (d._sujeto.zona || '?') + ') [' + d._sujeto.fuente + ']');
  d.similares.forEach(s => {
    const muniStr = s.municipio ? s.municipio + (s.zona ? ' (' + s.zona + ')' : '') : 'PENDIENTE';
    const flag = s.fuente === 'sepomex' ? '✓' : s.fuente === 'sepomex+zona-sujeto' ? '✓✓' : s.fuente === 'cerebro' ? '~' : s.fuente === 'sepomex-ambiguo' ? '⚠' : '?';
    console.log('    ' + flag + ' ' + s.colonia + ' → ' + muniStr + ' [' + s.fuente + ']' + (s.candidatos ? ' cands: ' + s.candidatos.slice(0,3).join(',') : ''));
  });
  console.log();
});

// Totales
let total = 0, resueltos = 0, conZona = 0, ambiguos = 0, sinDatos = 0;
Object.values(out).forEach(d => {
  d.similares.forEach(s => {
    total++;
    if (s.municipio) resueltos++;
    if (s.fuente === 'sepomex+zona-sujeto') conZona++;
    if (s.fuente === 'sepomex-ambiguo') ambiguos++;
    if (s.fuente === 'sin_datos') sinDatos++;
  });
});
console.log('=== TOTALES ===');
console.log('Total similares:', total);
console.log('  resueltos:', resueltos + ' (' + (resueltos*100/total).toFixed(0) + '%)');
console.log('  resueltos por zona del sujeto:', conZona);
console.log('  ambiguos (no match en zona):', ambiguos);
console.log('  sin datos:', sinDatos);
