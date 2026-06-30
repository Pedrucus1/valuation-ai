/**
 * cosechar_comps_opis.js
 *
 * Extrae comparables verificados por peritos de todos los OPIs 2026 en cerebro_datos.json
 * y los escribe en comps_verificados.json (bridge para colonias con pocas lisitngs en IDX).
 *
 * Solo procesa comps con construccion > 0 (casas/deptos/locales — no terrenos puros).
 * Los comps están validados implícitamente por el perito que los usó.
 *
 * Uso: node cosechar_comps_opis.js [--anio 2025] [--append]
 *   --anio 2025   incluir también OPIs de 2025 (default: solo 2026)
 *   --append      agregar a comps_verificados.json existente en lugar de reemplazar
 */

const fs   = require('fs');
const path = require('path');

const CEREBRO_PATH    = path.join(__dirname, 'cerebro_datos.json');
const VERIFICADOS_PATH = path.join(__dirname, 'comps_verificados.json');

const args = process.argv.slice(2);
const ANIO_MIN = args.includes('--anio') ? parseInt(args[args.indexOf('--anio')+1]) : 2026;
const APPEND   = args.includes('--append');

// ── Normalización (igual que build_cache_index.js) ───────────────────────────
function normCol(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|coto|privada|conjunto)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normMuni(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/^san pedro /, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z[uú][nñ]iga/, 'tlajomulco');
}

function canonTipo(tipoOpi) {
    const t = (tipoOpi || '').toLowerCase();
    if (t.includes('departamento')) return 'depto';
    if (t.includes('local') || t.includes('comercial') || t.includes('oficin') || t.includes('bodega')) return 'local';
    return 'casa';
}

// ── Cargar datos ─────────────────────────────────────────────────────────────
const raw  = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
const opis = Array.isArray(raw) ? raw : Object.values(raw);

// Filtrar por año
const anioStr = `-${String(ANIO_MIN).slice(-2)}-`;
const candidatos = opis.filter(o =>
    o.folio && o.folio.includes(anioStr) &&
    o.comparables && o.comparables.length > 0
);
console.log(`OPIs ${ANIO_MIN}+ con comparables: ${candidatos.length}`);

// ── Cosechar comps ────────────────────────────────────────────────────────────
const cosechados = [];
let skippedSinColonia = 0, skippedSinPrecio = 0, skippedTerreno = 0;

for (const opi of candidatos) {
    const muni  = normMuni(opi.municipio || '');
    const tipo  = canonTipo(opi.tipo);
    const fecha = opi.fecha || null;

    for (const comp of opi.comparables) {
        const m2c = comp.construccion || 0;
        const m2t = comp.terreno || 0;

        if (m2c <= 0) { skippedTerreno++; continue; }

        const precio = comp.precio;
        if (!precio || precio < 100000) { skippedSinPrecio++; continue; }

        const colRaw = normCol(comp.colonia || '');
        if (!colRaw || colRaw.length < 3) { skippedSinColonia++; continue; }

        // Rechazar colonias que parecen direcciones o basura
        const esInvalida = colRaw.length > 45
            || /\b(venta|renta|sale|for rent|oportunidad)\b/.test(colRaw)
            || /\b(av\b|calle\b|blvd\b|carretera\b)\b/.test(colRaw)
            || /\d{4,}/.test(colRaw);
        if (esInvalida) { skippedSinColonia++; continue; }

        cosechados.push({
            precio,
            m2c,
            m2t,
            colonia: colRaw,
            muni,
            tipo,
            fecha,
            fuente: opi.folio,  // para auditoría
        });
    }
}

// ── Dedup: misma colonia+muni+precio±2%+m2c ─────────────────────────────────
const seen = new Set();
const deduped = cosechados.filter(c => {
    const k = `${c.muni}|${c.colonia}|${Math.round(c.precio/1000)}|${c.m2c}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
});

// ── Merge con existente si --append ─────────────────────────────────────────
let salida = deduped;
if (APPEND && fs.existsSync(VERIFICADOS_PATH)) {
    const existentes = JSON.parse(fs.readFileSync(VERIFICADOS_PATH, 'utf8'));
    // Re-dedup contra existentes
    const seenEx = new Set(existentes.map(c => `${c.muni}|${c.colonia}|${Math.round(c.precio/1000)}|${c.m2c}`));
    const nuevos = deduped.filter(c => !seenEx.has(`${c.muni}|${c.colonia}|${Math.round(c.precio/1000)}|${c.m2c}`));
    salida = [...existentes, ...nuevos];
    console.log(`Merge: ${existentes.length} existentes + ${nuevos.length} nuevos = ${salida.length} total`);
}

fs.writeFileSync(VERIFICADOS_PATH, JSON.stringify(salida, null, 2));

// ── Resumen ──────────────────────────────────────────────────────────────────
const porMuni = {};
for (const c of deduped) porMuni[c.muni] = (porMuni[c.muni]||0) + 1;

console.log(`\n✓ comps_verificados.json generado:`);
console.log(`  Cosechados:        ${cosechados.length}`);
console.log(`  Deduplicados:      ${deduped.length}`);
console.log(`  Skip sin colonia:  ${skippedSinColonia}`);
console.log(`  Skip sin precio:   ${skippedSinPrecio}`);
console.log(`  Skip terrenos:     ${skippedTerreno}`);
console.log(`\nPor municipio:`);
for (const [m, n] of Object.entries(porMuni).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${m.padEnd(30)} ${n}`);
}

// Muestra distribución por colonia (top 20)
const porCol = {};
for (const c of deduped) {
    const k = `${c.muni}/${c.colonia}`;
    porCol[k] = (porCol[k]||0)+1;
}
const top = Object.entries(porCol).sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log(`\nTop colonias:`);
for (const [k, n] of top) console.log(`  ${k.padEnd(50)} ${n}`);
