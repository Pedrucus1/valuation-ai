/**
 * build_colonias_similares.js
 *
 * Lee cerebro_datos.json y construye/actualiza colonias_similares.json:
 * Para cada OPI: extrae sujetoColonia + colonias de comparables (MERCADO tab).
 * Agrupa: sujetoColonia → Set de colonias comparables (con conteo de menciones).
 *
 * Uso:
 *   node build_colonias_similares.js           -- actualiza sin sobrescribir existentes
 *   node build_colonias_similares.js --dry-run  -- imprime sin escribir
 *
 * Requiere cerebro_datos.json con el campo sujetoColonia y comparables[].colonia
 * (generado por extractor_masivo.js --force tras los fixes del 20-may-2026)
 */

const fs   = require('fs');
const path = require('path');

const CEREBRO_PATH  = path.join(__dirname, 'cerebro_datos.json');
const SIM_PATH      = path.join(__dirname, 'colonias_similares.json');
const dryRun        = process.argv.includes('--dry-run');

// ── Normalización ─────────────────────────────────────────────────────────────
function normCol(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|coto|privada|conjunto)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function esColoniaValida(c) {
    if (!c || c.length < 4) return false;
    if (/^(calle|avenida|blvd|carretera|priv|callejon)/i.test(c)) return false;
    if (/^\d/.test(c)) return false;   // empieza con número → probablemente CP
    if (c.length > 60) return false;    // demasiado largo → dirección completa
    return true;
}

// Extrae colonia del nombre de archivo OPI
// "OPI-26-4-09-AV Calle 5, Colonia Nombre, 45185 Municipio, Jal." → "Colonia Nombre"
function coloniaDeFileName(fileName) {
    if (!fileName) return '';
    const partes = fileName.split(',');
    if (partes.length < 2) return '';
    const raw = partes[1].trim()
        .replace(/^\d{5}\s*/, '')
        .replace(/^col\.\s*/i, '')
        .replace(/^fracc\.\s*/i, '')
        .replace(/^residencial\s+/i, '');
    return raw.trim();
}

// ── Cargar datos ──────────────────────────────────────────────────────────────
if (!fs.existsSync(CEREBRO_PATH)) {
    console.error('cerebro_datos.json no encontrado. Correr: node extractor_masivo.js --force');
    process.exit(1);
}

const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
const simExistente = fs.existsSync(SIM_PATH)
    ? JSON.parse(fs.readFileSync(SIM_PATH, 'utf8'))
    : {};

console.log(`cerebro_datos: ${cerebro.length} OPIs`);

// ── Construir mapa sujetoColonia → { colonia: menciones } ────────────────────
const mapa = {};   // normSujeto → { normComp: count }

let sinSujeto = 0, sinComps = 0, totalComps = 0;

for (const opi of cerebro) {
    // Usar fileName para extraer colonia (más confiable que direccion extraída del Sheet)
    // sujetoColonia existe en registros nuevos (post-fix extractor); fallback a fileName
    const sujetoRaw = opi.sujetoColonia || coloniaDeFileName(opi.fileName) || '';
    const sujeto = normCol(sujetoRaw);

    if (!esColoniaValida(sujeto)) { sinSujeto++; continue; }
    if (!mapa[sujeto]) mapa[sujeto] = {};

    const comps = opi.comparables || [];
    const coloniaComps = comps
        .map(c => normCol(c?.colonia || ''))
        .filter(esColoniaValida)
        .filter(c => c !== sujeto);  // no incluir la misma colonia como "similar"

    if (!coloniaComps.length) { sinComps++; continue; }

    for (const cc of coloniaComps) {
        mapa[sujeto][cc] = (mapa[sujeto][cc] || 0) + 1;
        totalComps++;
    }
}

console.log(`Mapeadas: ${Object.keys(mapa).length} colonias sujeto`);
console.log(`Sin colonia sujeto válida: ${sinSujeto} | Sin comps: ${sinComps} | Total menciones: ${totalComps}`);

// ── Construir salida: colonias ordenadas por menciones ─────────────────────────
let nuevas = 0, actualizadas = 0;

const simActualizado = { ...simExistente };

for (const [sujeto, compMap] of Object.entries(mapa)) {
    const colonias = Object.entries(compMap)
        .sort((a, b) => b[1] - a[1])
        .map(([colonia, menciones]) => ({ colonia, menciones }));

    if (!simActualizado[sujeto]) {
        simActualizado[sujeto] = colonias;
        nuevas++;
    } else {
        // Merge: agregar colonias que no estaban, respetar las existentes (tienen orden manual)
        const existentes = new Set(simActualizado[sujeto].map(x => x.colonia));
        const agregar = colonias.filter(x => !existentes.has(x.colonia));
        if (agregar.length) {
            simActualizado[sujeto] = [...simActualizado[sujeto], ...agregar];
            actualizadas++;
        }
    }
}

console.log(`\nNuevas colonias en mapa: ${nuevas} | Actualizadas con más comps: ${actualizadas}`);
console.log(`Total colonias en colonias_similares: ${Object.keys(simActualizado).length}`);

// ── Diagnóstico: colonias sin datos de comp ───────────────────────────────────
const conComps    = cerebro.filter(o => (o.comparables||[]).some(c => c?.colonia));
const sinColonias = cerebro.filter(o => !(o.comparables||[]).some(c => c?.colonia));
console.log(`\nOPIs con colonia en comparables: ${conComps.length}`);
console.log(`OPIs sin colonia en comparables (necesitan URL fix): ${sinColonias.length}`);
if (sinColonias.length > 0) {
    console.log('Muestra sin colonia:', sinColonias.slice(0,3).map(o=>o.fileName?.slice(0,60)));
}

if (dryRun) {
    console.log('\n[dry-run] No se escribió ningún archivo.');
    console.log('Muestra del mapa generado:');
    Object.entries(mapa).slice(0, 5).forEach(([s, m]) => {
        console.log(`  "${s}" → ${Object.keys(m).slice(0,4).join(', ')}`);
    });
} else {
    fs.writeFileSync(SIM_PATH, JSON.stringify(simActualizado, null, 2));
    console.log(`\n✓ colonias_similares.json actualizado.`);
}
