/**
 * Reconstruye sepomex_jalisco.json preservando MÚLTIPLES entradas por nombre.
 * Incluye Jalisco + Nayarit + Colima (zonas Costa relevantes).
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { normCol } = require('./motor_remi_api');

const XLS = 'C:/Users/pedru/Downloads/CPdescarga_extracted/CPdescarga.xls';
const ESTADOS = ['Jalisco', 'Nayarit', 'Colima'];

console.log('Cargando XLS...');
const wb = XLSX.readFile(XLS);

const mapa = {}; // normCol → [ { nombre, municipio, cp, tipo, estado }, ... ]

for (const estado of ESTADOS) {
  const sheet = wb.Sheets[estado];
  if (!sheet) { console.log('⚠️  hoja faltante:', estado); continue; }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(estado + ':', rows.length, 'filas');
  rows.forEach(r => {
    const nombre = (r.d_asenta || '').trim();
    if (!nombre) return;
    const key = normCol(nombre);
    if (!key) return;
    const e = {
      nombre,
      municipio: (r.D_mnpio || '').trim(),
      cp: String(r.d_codigo || ''),
      tipo: (r.d_tipo_asenta || '').trim(),
      estado: (r.d_estado || '').trim(),
    };
    if (!mapa[key]) mapa[key] = [];
    mapa[key].push(e);
  });
}

// Deduplicar entradas idénticas dentro de cada key (mismo nombre+muni+cp+tipo)
let dedup = 0;
Object.keys(mapa).forEach(k => {
  const seen = new Set();
  mapa[k] = mapa[k].filter(e => {
    const sig = e.nombre + '|' + e.municipio + '|' + e.cp + '|' + e.tipo;
    if (seen.has(sig)) { dedup++; return false; }
    seen.add(sig);
    return true;
  });
});

const keys = Object.keys(mapa);
const totalEntries = keys.reduce((s, k) => s + mapa[k].length, 0);
const multi = keys.filter(k => mapa[k].length > 1);

fs.writeFileSync('sepomex_v2.json', JSON.stringify(mapa, null, 2));
console.log();
console.log('✓ Guardado: sepomex_v2.json');
console.log('  keys únicos:', keys.length);
console.log('  total entradas:', totalEntries);
console.log('  keys con múltiples ocurrencias:', multi.length);
console.log('  duplicados exactos removidos:', dedup);

// Top 10 keys con más colisiones
const top = multi.sort((a, b) => mapa[b].length - mapa[a].length).slice(0, 15);
console.log('\nTop colisiones:');
top.forEach(k => {
  const munis = [...new Set(mapa[k].map(e => e.municipio + '/' + e.estado))];
  console.log('  ' + k + ' (' + mapa[k].length + ' entradas, ' + munis.length + ' munis):');
  munis.slice(0, 5).forEach(m => console.log('    -', m));
});
