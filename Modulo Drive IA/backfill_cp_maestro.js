/**
 * backfill_cp_maestro.js
 * Join determinista: agrega campo `cp` a colonias_maestro.json
 * usando colonia_cp.json (SEPOMEX).
 * Sin IA, sin APIs. Solo lectura/escritura local.
 */
const fs = require('fs');
const path = require('path');

function normalizar(texto) {
  if (!texto) return '';
  return texto.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

const MAESTRO_PATH = path.join(__dirname, 'colonias_maestro.json');
const CP_PATH = path.join(__dirname, '_geo', 'colonia_cp.json');

// Leer
const maestro = JSON.parse(fs.readFileSync(MAESTRO_PATH, 'utf8'));
const coloniaCP = JSON.parse(fs.readFileSync(CP_PATH, 'utf8'));

// Stats
let total = 0, conMunicipio = 0, matches = 0, sinMatch = 0, yaConCP = 0, skipped = 0;

for (const [key, rec] of Object.entries(maestro)) {
  if (key === '_meta') { skipped++; continue; }
  if (!rec || typeof rec !== 'object') { skipped++; continue; }
  total++;

  if (!rec.municipio) { continue; }
  conMunicipio++;

  const lookupKey = normalizar(key) + '|' + normalizar(rec.municipio);
  const cpVal = coloniaCP[lookupKey];

  if (cpVal !== undefined) {
    if (rec.cp) yaConCP++;
    rec.cp = cpVal;
    matches++;
  } else {
    sinMatch++;
  }
}

// Escribir de vuelta (mismo formato: indent 1)
fs.writeFileSync(MAESTRO_PATH, JSON.stringify(maestro, null, 1), 'utf8');

console.log('=== BACKFILL CP COMPLETADO ===');
console.log(`Colonias totales:     ${total}`);
console.log(`  con municipio:      ${conMunicipio}`);
console.log(`  matches CP:         ${matches}`);
console.log(`  sin match:          ${sinMatch}`);
console.log(`  ya tenían CP:       ${yaConCP}`);
console.log(`  skipped (_meta etc): ${skipped}`);
console.log(`Archivo actualizado:  ${MAESTRO_PATH}`);
const kb = (fs.statSync(MAESTRO_PATH).size / 1024).toFixed(0);
console.log(`Tamaño final:         ${kb} KB`);
