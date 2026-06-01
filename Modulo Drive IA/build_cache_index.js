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
        .replace(/^san pedro /, 'tlaquepaque')  // "san pedro tlaquepaque" → "tlaquepaque"
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de zúñiga/, 'tlajomulco');
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
        const key = `${Math.round(l.p/1000)}_${l.c || l.t}`;
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

const _nse = fs.existsSync(NSE_PATH) ? JSON.parse(fs.readFileSync(NSE_PATH, 'utf8')) : {};
const _sim = fs.existsSync(SIM_PATH) ? JSON.parse(fs.readFileSync(SIM_PATH, 'utf8')) : {};

const idx = {};  // { municipio: { tipo: { colonia: { listings, medianaPm2c, count } } } }

let skipped = 0;
for (const d of CACHE) {
    if (!d.p || (!d.c && !d.t)) { skipped++; continue; }

    const muni  = normMuni(d.mu || '');
    const tipo  = canonTipo(d.tp || '');
    // Colonia con mismo nombre que el municipio → renombrar a "X centro"
    const colRaw = normCol(d.co || '');
    const col    = colRaw === muni ? muni + ' centro' : colRaw;

    if (!muni) { skipped++; continue; }

    if (!idx[muni])        idx[muni] = {};
    if (!idx[muni][tipo])  idx[muni][tipo] = {};
    if (!idx[muni][tipo][col]) idx[muni][tipo][col] = [];

    // Solo guardar los campos que usan los motores: precio, m²C, m²T, fecha_scraping
    idx[muni][tipo][col].push({ p: d.p, c: d.c, t: d.t || 0, fs: d.fs || null });
}

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
                ? dd.filter(l => l.t > 0).map(l => l.p / l.t)
                : dd.filter(l => l.c > 0).map(l => l.p / l.c);
            idx[muni][tipo][col] = {
                listings:    dd,
                medianaPm2c: pm2cs.length ? Math.round(mediana(pm2cs)) : null,
                count:       dd.length,
            };
            totalListings += dd.length;
            totalColonias++;
        }
    }
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
console.log(`\nUso en scripts:`);
console.log(`  const IDX = require('./cache_index.json');`);
console.log(`  const casasZapopan = IDX['zapopan']?.['casa'] ?? {};`);
console.log(`  const comps = casasZapopan['chapalita inn']?.listings ?? [];`);
