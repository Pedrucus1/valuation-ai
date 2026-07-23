/**
 * merge_simIA_a_maestro.js
 * Merge ADITIVO (no destructivo) de colonias_similares_enriquecido.json (fix SEPOMEX,
 * 22/23-jul-2026) hacia colonias_maestro.json.
 *
 * A diferencia de construir_maestro.js (rebuild completo desde 6 fuentes, que pierde
 * cualquier edición hecha directamente sobre colonias_maestro.json a lo largo de
 * sesiones pasadas — medido: -647 colonias con similares), este script:
 *   - NO toca nse/idx/municipio/zona de ninguna colonia existente.
 *   - Para similares: UNION de lo que ya había + pares nuevos de simIA, dedupe por nombre.
 *   - Para colonias nuevas (en simIA pero no en maestro): las agrega con similares +
 *     municipio/zona si simV2 trae el _sujeto.
 *
 * Uso: node merge_simIA_a_maestro.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');

const R = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};

const MAESTRO_PATH = path.join(__dirname, 'colonias_maestro.json');
const maestro = R(MAESTRO_PATH);
const simIA = R(path.join(__dirname, 'colonias_similares_enriquecido.json'));
const simV2 = R(path.join(__dirname, 'colonias_similares.enriquecido.v2.json'));

function normSims(arr) {
  return (arr || []).map(x => typeof x === 'string' ? { colonia: x, fuente: 'ia-sepomex-jul23' } : x);
}

let coloniasNuevas = 0, coloniasAmpliadas = 0, paresAgregados = 0;

for (const [key, simsRaw] of Object.entries(simIA)) {
  if (key === '_meta' || !simsRaw || !simsRaw.length) continue;
  const nuevos = normSims(simsRaw);

  if (!maestro[key]) {
    // Colonia nueva por completo
    const rec = { similares: nuevos };
    const suj = simV2[key] && simV2[key]._sujeto;
    if (suj && suj.municipio) { rec.municipio = suj.municipio; if (suj.zona) rec.zona = suj.zona; }
    maestro[key] = rec;
    coloniasNuevas++;
    paresAgregados += nuevos.length;
    continue;
  }

  const existentes = maestro[key].similares || [];
  const nombresExistentes = new Set(existentes.map(s => s.colonia));
  const aAgregar = nuevos.filter(s => s.colonia && !nombresExistentes.has(s.colonia));
  if (aAgregar.length) {
    maestro[key].similares = [...existentes, ...aAgregar];
    coloniasAmpliadas++;
    paresAgregados += aAgregar.length;
  }
}

console.log('=== MERGE ADITIVO simIA -> maestro ===');
console.log(`Colonias nuevas agregadas:        ${coloniasNuevas}`);
console.log(`Colonias existentes ampliadas:     ${coloniasAmpliadas}`);
console.log(`Pares de similares agregados:      ${paresAgregados}`);
console.log(`Total colonias en maestro después: ${Object.keys(maestro).length}`);

if (DRY) {
  console.log('\n[DRY-RUN] no se escribió nada.');
} else {
  fs.writeFileSync(MAESTRO_PATH, JSON.stringify(maestro, null, 1));
  console.log(`\nGuardado en ${MAESTRO_PATH}`);
}
