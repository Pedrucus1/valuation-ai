/**
 * build_cache_index.js
 *
 * Genera cache_index.json a partir de cache_consolidado.json.
 * El índice agrupa por municipio → tipo_canon → colonia_normalizada → listings.
 *
 * Uso:
 *   node build_cache_index.js
 *   node build_cache_index.js --inegi CPdescarga.csv   (agrega colonias sin datos de scraper)
 *
 * Salida: cache_index.json  (~1-2MB vs 50MB del cache completo)
 * Los scripts de análisis cargan SOLO el índice — sin barridos de 59k registros.
 */

const fs   = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'cache_consolidado.json');
const NSE_PATH   = path.join(__dirname, 'colonias_nse.json');
const SIM_PATH   = path.join(__dirname, 'colonias_similares.json');
const OUT_PATH   = path.join(__dirname, 'cache_index.json');

// ── Tipos canónicos ───────────────────────────────────────────────────────────
const TIPO_CANON = {
    casa:       ['casa','casas','residencia','chalet','villa'],
    depto:      ['departamento','depto','apartamento','flat','loft','penthouse','suite'],
    terreno:    ['terreno','lote','predio','solar'],
    local:      ['local comercial','local','comercial'],
    oficina:    ['oficina'],
    bodega:     ['bodega','almacen'],
};

function canonTipo(raw) {
    const r = (raw||'').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_CANON)) {
        if (sins.some(s => r.includes(s))) return canon;
    }
    return 'otro';
}

// ── Normalización de colonia ──────────────────────────────────────────────────
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
        .replace(/san pedro tlaquepaque/, 'tlaquepaque')  // nombre oficial (antes duplicaba → "tlaquepaquetlaquepaque")
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de zúñiga/, 'tlajomulco')
        .replace(/(\b\w+)\1\b/, '$1');  // colapsa nombre duplicado por el bug previo
}

// ── AMG municipios de interés ─────────────────────────────────────────────────
const AMG_MUNIS = new Set([
    'guadalajara','zapopan','tlaquepaque','tonala','tlajomulco',
    'el salto','juanacatlan','ixtlahuacan de los membrillos',
    'puerto vallarta','bahia de banderas','chapala','ajijic'
]);

// ── Deduplicación: mismo precio ±2% + mismo m²C = mismo anuncio ──────────────
function dedup(listings) {
    const seen = new Set();
    return listings.filter(l => {
        const key = `${Math.round(l.precio/1000)}_${l.m2c || l.m2t}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
}

// ── Construir índice ──────────────────────────────────────────────────────────
console.log('Leyendo cache_consolidado.json...');
const { datos: CACHE } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
console.log(`  ${CACHE.length} registros cargados.`);

// #101 — Puente: comps web verificados (archivo lateral, no muta el cache). Se inyectan DESPUÉS
// de indexar el scraper, SOLO en celdas pobres (<3 listings del scraper), para llenar colonias
// sin/con poca data sin distorsionar las bien cubiertas (los comps web son precios asking).
const PUENTE_PATH = path.join(__dirname, 'comps_verificados.json');
const PUENTE_GATE = 3;  // máximo de listings scraper para que entren comps web
const _verificados = fs.existsSync(PUENTE_PATH) ? JSON.parse(fs.readFileSync(PUENTE_PATH, 'utf8')) : [];

const _nse = fs.existsSync(NSE_PATH) ? JSON.parse(fs.readFileSync(NSE_PATH, 'utf8')) : {};
const _sim = fs.existsSync(SIM_PATH) ? JSON.parse(fs.readFileSync(SIM_PATH, 'utf8')) : {};

const idx = {};  // { municipio: { tipo: { colonia: { listings, medianaPm2c, count } } } }

let skipped = 0;
for (const d of CACHE) {
    if (!d.precio || (!d.m2c && !d.m2t)) { skipped++; continue; }

    const muni  = normMuni(d.muni || '');
    const tipo  = canonTipo(d.tipo || '');
    // Colonia con mismo nombre que el municipio → renombrar a "X centro"
    const colRaw = normCol(d.colonia || '');
    const col    = colRaw === muni ? muni + ' centro' : colRaw;

    if (!muni) { skipped++; continue; }

    // Colonia inválida: vacía, larga, o contiene frases operacionales
    // NOTA: "La Venta del Astillero" y "Pinar de la Venta" son colonias REALES → no rechazar "venta" en medio
    const coloniaInvalida = !col || col.length > 45
        || /\b(en venta|en renta|for sale|for rent|oportunidad|inversion)\b/i.test(col)
        || /^(venta|renta|sale)\b/i.test(col)
        || /\b(departamento|bodega|oficina|local|warehouse|apartment)\b/i.test(col)
        || /\b(downtown|center|centre|av |calle |blvd |carretera )\b/i.test(col)
        || /\d{4,}/.test(col);
    if (coloniaInvalida) { skipped++; continue; }

    if (!idx[muni])        idx[muni] = {};
    if (!idx[muni][tipo])  idx[muni][tipo] = {};
    if (!idx[muni][tipo][col]) idx[muni][tipo][col] = [];

    // Solo guardar los campos que usan los motores: precio, m²C, m²T, fecha_scraping, año (#90/#91)
    idx[muni][tipo][col].push({ precio: d.precio, m2c: d.m2c, m2t: d.m2t || 0, fecha: d.fecha || null, anio: d.anio || null });
}

// #101 — Inyectar comps web verificados SOLO en celdas pobres (<PUENTE_GATE scraper).
let puenteAdd = 0;
for (const d of _verificados) {
    if (!d.precio || (!d.m2c && !d.m2t)) continue;
    const muni = normMuni(d.muni || '');
    const tipo = canonTipo(d.tipo || '');
    const colRaw = normCol(d.colonia || '');
    const col = colRaw === muni ? muni + ' centro' : colRaw;
    if (!muni || !col) continue;
    const cell = idx[muni]?.[tipo]?.[col];
    // Comps del perito (flywheel) = venta vetada → SIEMPRE sumar (no aplica el gate).
    // Comps web (asking) = solo rellenan celdas pobres (<PUENTE_GATE) para no distorsionar.
    if (d.fuente !== 'perito_flywheel' && cell && cell.length >= PUENTE_GATE) continue;
    if (!idx[muni])       idx[muni] = {};
    if (!idx[muni][tipo]) idx[muni][tipo] = {};
    if (!idx[muni][tipo][col]) idx[muni][tipo][col] = [];
    idx[muni][tipo][col].push({ precio: d.precio, m2c: d.m2c, m2t: d.m2t || 0, fecha: d.fecha || null, web: 1 });
    puenteAdd++;
}
if (_verificados.length) console.log(`  Puente #101: ${puenteAdd}/${_verificados.length} comps web inyectados en celdas pobres (<${PUENTE_GATE}).`);

// Post-procesar: dedup + calcular mediana por colonia
let totalListings = 0;
let totalColonias = 0;

for (const muni of Object.keys(idx)) {
    for (const tipo of Object.keys(idx[muni])) {
        for (const col of Object.keys(idx[muni][tipo])) {
            const raw = idx[muni][tipo][col];
            const dd  = dedup(raw);
            // Terrenos usan t (m²T) para $/m²; resto usan c (m²C)
            const esTerr = tipo === 'terreno';
            const pm2cs = esTerr
                ? dd.filter(l => l.m2t > 0).map(l => l.precio / l.m2t)
                : dd.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);
            // #90 — edad mediana de la zona (años) desde los `anio` presentes. Solo si ≥3 listings con año.
            const ANIO_ACTUAL = new Date().getFullYear();
            const edades = dd.filter(l => l.anio > 1900 && l.anio <= ANIO_ACTUAL).map(l => ANIO_ACTUAL - l.anio);
            idx[muni][tipo][col] = {
                listings:    dd,
                medianaPm2c: pm2cs.length ? Math.round(mediana(pm2cs)) : null,
                count:       dd.length,
                edadMedianaZona: edades.length >= 3 ? Math.round(mediana(edades)) : null,
            };
            totalListings += dd.length;
            totalColonias++;
        }
    }
}

// #90/#91 — Overlay de EDAD desde Mongo (fuente oficial; el cache de precio viene de
// Sheets, que casi no trae año). El pool de edades es SEPARADO de los listings de
// precio → no toca $/m². Solo setea edadMedianaZona en colonias con ≥3 años de Mongo.
const EDAD_MONGO_PATH = path.join(__dirname, 'edad_mongo.json');
if (fs.existsSync(EDAD_MONGO_PATH)) {
    const edadRaw = JSON.parse(fs.readFileSync(EDAD_MONGO_PATH, 'utf8'));
    const ANIO = new Date().getFullYear();
    const pool = {};  // "muni|tipo|col" -> [edades]
    for (const e of edadRaw) {
        const muni = normMuni(e.muni || '');
        const tipo = canonTipo(e.tipo || '');
        const colRaw = normCol(e.colonia || '');
        const col = colRaw === muni ? muni + ' centro' : colRaw;
        if (!muni || !col || !(e.anio > 1900 && e.anio <= ANIO)) continue;
        const k = muni + '|' + tipo + '|' + col;
        (pool[k] = pool[k] || []).push(ANIO - e.anio);
    }
    let aplicadas = 0;
    for (const muni of Object.keys(idx)) {
        for (const tipo of Object.keys(idx[muni])) {
            for (const col of Object.keys(idx[muni][tipo])) {
                const edades = pool[muni + '|' + tipo + '|' + col];
                if (edades && edades.length >= 3) {
                    idx[muni][tipo][col].edadMedianaZona = Math.round(mediana(edades));
                    aplicadas++;
                }
            }
        }
    }
    console.log(`  Overlay edad Mongo: ${edadRaw.length} props → edadMedianaZona en ${aplicadas} colonias.`);
}

// ── Agregar colonias INEGI (si se pasa el CSV) ────────────────────────────────
const inegiArg = process.argv.find(a => a.endsWith('.csv') || a.endsWith('.txt'));
if (inegiArg && fs.existsSync(inegiArg)) {
    console.log(`\nAgregando colonias INEGI desde ${inegiArg}...`);
    const lines = fs.readFileSync(inegiArg, 'latin1').split('\n');
    // Formato SEPOMEX CPdescarga.txt:
    // d_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado|d_ciudad|d_CP|...
    // Columnas relevantes: 1=colonia, 3=municipio, 4=estado
    let added = 0;
    for (const line of lines.slice(1)) {
        const cols = line.split('|');
        if (cols.length < 5) continue;
        const estado = (cols[4]||'').trim();
        if (!estado.toLowerCase().includes('jalisco')) continue;
        const colNorm = normCol(cols[1]||'');
        const muniNorm = normMuni(cols[3]||'');
        if (!colNorm || !muniNorm) continue;
        // Solo AMG + alrededores
        if (!AMG_MUNIS.has(muniNorm) && !muniNorm.includes('guadalajara')) continue;
        // Registrar colonia aunque no tenga datos del scraper
        if (!idx[muniNorm]) idx[muniNorm] = {};
        if (!idx[muniNorm]['casa']) idx[muniNorm]['casa'] = {};
        if (!idx[muniNorm]['casa'][colNorm]) {
            idx[muniNorm]['casa'][colNorm] = { listings: [], medianaPm2c: null, count: 0 };
            added++;
        }
    }
    console.log(`  ${added} colonias nuevas de INEGI agregadas.`);
}

// ── Metadata ──────────────────────────────────────────────────────────────────
const meta = {
    builtAt:       new Date().toISOString(),
    totalListings,
    totalColonias,
    skipped,
    municipios:    Object.keys(idx).length,
    nseColonias:   Object.keys(_nse).length,
    simColonias:   Object.keys(_sim).length,
    nota: 'Agregar colonias INEGI: node build_cache_index.js CPdescarga.csv',
};

const output = { _meta: meta, ...idx };

fs.writeFileSync(OUT_PATH, JSON.stringify(output));
const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);

console.log('\n✓ cache_index.json generado:');
console.log(`  Municipios : ${meta.municipios}`);
console.log(`  Colonias   : ${meta.totalColonias.toLocaleString()}`);
console.log(`  Listings   : ${meta.totalListings.toLocaleString()} (${skipped} sin precio/m²C omitidos)`);
console.log(`  Tamaño     : ${sizeMB} MB`);

// Validador de municipios: reporta municipios del cache que NO están en el catálogo oficial
// (cp_coords.json = SEPOMEX Jalisco). Caza phantom (colonias mal puestas como municipio) y doblados.
// NO filtra — solo reporta (hay datos legítimos de otros estados: CDMX, Nayarit, Edomex).
try {
    const cpCoords = JSON.parse(fs.readFileSync(path.join(__dirname, '_geo', 'cp_coords.json'), 'utf8'));
    const validos = new Set(Object.values(cpCoords).map(v => normMuni(v.municipio || '')).filter(Boolean));
    const phantom = Object.keys(idx).filter(m => !validos.has(normMuni(m)))
        .map(m => [m, Object.values(idx[m]).reduce((s, t) => s + Object.values(t).reduce((a, c) => a + (c.count || 0), 0), 0)])
        .sort((a, b) => b[1] - a[1]);
    if (phantom.length) {
        console.log(`\n  ⚠ Municipios fuera del catálogo Jalisco (${phantom.length}) — phantom o de otros estados:`);
        phantom.slice(0, 12).forEach(([m, n]) => console.log(`     ${m}: ${n} listings`));
    }
} catch (e) { /* sin catálogo → no se reporta */ }
console.log(`\nUso en scripts:`);
console.log(`  const IDX = require('./cache_index.json');`);
console.log(`  const casasZapopan = IDX['zapopan']?.['casa'] ?? {};`);
console.log(`  const comps = casasZapopan['chapalita inn']?.listings ?? [];`);
