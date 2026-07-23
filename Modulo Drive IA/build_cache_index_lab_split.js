/**
 * build_cache_index_lab_split.js — LAB v2, no toca cache_index.json de producción.
 *
 * Corrige el bug de la v1 (build_cache_index_lab_usado.js): esa version FORZABA
 * "usado" para todos los sujetos por igual, sin mirar la edad real de cada sujeto —
 * eso explicaba la regresion medida (rompia el techo/cap de poolTipo=exacta con un
 * valor ciego a la edad). Esta version calcula AMBOS buckets por celda:
 *   medianaPm2c        -> blend, IDENTICO a produccion (fallback, no se toca)
 *   medianaPm2c_nuevo   -> mediana de comps con edad<=CORTE, solo si hay >=MIN
 *   medianaPm2c_usado   -> mediana de comps con edad>CORTE,  solo si hay >=MIN
 * El motor (parche LAB_NSE_SPLIT en motor_remi_api.js) elige el bucket segun la
 * edad REAL del sujeto de cada valuacion, con fallback a blend si el bucket no
 * tiene volumen. Nunca se sobreescribe medianaPm2c: el fallback siempre es el
 * comportamiento identico a produccion.
 *
 * Salida: cache_index.LAB_SPLIT.json
 * Uso:    LAB_INDEX_PATH=./cache_index.LAB_SPLIT.json LAB_NSE_SPLIT=1 node validar_40_opis.js --n 400
 */
const fs   = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'cache_consolidado.json');
const OUT_PATH   = path.join(__dirname, 'cache_index.LAB_SPLIT8.json');
const CORTE_NUEVO_ANIOS = 2;
const MIN_BUCKET = 8;

const TIPO_CANON = {
    casa: ['casa','casas','residencia','chalet','villa'],
    depto: ['departamento','depto','apartamento','flat','loft','penthouse','suite'],
    terreno: ['terreno','lote','predio','solar'],
    local: ['local comercial','local','comercial'],
    oficina: ['oficina'],
    bodega: ['bodega','almacen'],
};
function canonTipo(raw) {
    const r = (raw||'').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_CANON)) if (sins.some(s => r.includes(s))) return canon;
    return 'otro';
}
function normCol(s) {
    if (!s) return '';
    return s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|coto|privada|conjunto)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function normMuni(s) {
    if (!s) return '';
    return s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/san pedro tlaquepaque/, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco').replace(/tlajomulco de zúñiga/, 'tlajomulco')
        .replace(/(\b\w+)\1\b/, '$1');
}
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

console.log('Leyendo cache_consolidado.json...');
const { datos: CACHE } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
console.log(`  ${CACHE.length} registros cargados.`);

const ANIO_ACTUAL = new Date().getFullYear();
const idx = {};
let skipped = 0;
for (const d of CACHE) {
    if (!d.precio || (!d.m2c && !d.m2t)) { skipped++; continue; }
    const muni = normMuni(d.muni || '');
    const tipo = canonTipo(d.tipo || '');
    const colRaw = normCol(d.colonia || '');
    const col = colRaw === muni ? muni + ' centro' : colRaw;
    if (!muni) { skipped++; continue; }
    const coloniaInvalida = !col || col.length > 45
        || /\b(en venta|en renta|for sale|for rent|oportunidad|inversion)\b/i.test(col)
        || /^(venta|renta|sale)\b/i.test(col)
        || /\b(departamento|bodega|oficina|local|warehouse|apartment)\b/i.test(col)
        || /\b(downtown|center|centre|av |calle |blvd |carretera )\b/i.test(col)
        || /\d{4,}/.test(col);
    if (coloniaInvalida) { skipped++; continue; }
    if (!idx[muni]) idx[muni] = {};
    if (!idx[muni][tipo]) idx[muni][tipo] = {};
    if (!idx[muni][tipo][col]) idx[muni][tipo][col] = [];
    idx[muni][tipo][col].push({ precio: d.precio, m2c: d.m2c, m2t: d.m2t || 0, fecha: d.fecha || null, anio: d.anio || null,
        recamaras: d.recamaras || 0, banos: d.banos || 0, estac: d.estac || 0 });
}

let totalListings = 0, totalColonias = 0, celdasConNuevo = 0, celdasConUsado = 0, celdasConAmbos = 0;
for (const muni of Object.keys(idx)) {
    for (const tipo of Object.keys(idx[muni])) {
        for (const col of Object.keys(idx[muni][tipo])) {
            const raw = idx[muni][tipo][col];
            const dd = dedup(raw);
            const esTerr = tipo === 'terreno';

            const pm2csBlend = esTerr
                ? dd.filter(l => l.m2t > 0).map(l => l.precio / l.m2t)
                : dd.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);

            let medianaPm2c_nuevo = null, medianaPm2c_usado = null, n_nuevo = 0, n_usado = 0;
            if (!esTerr) {
                const conEdad = dd.filter(l => l.anio && l.anio > 1900 && l.anio <= ANIO_ACTUAL);
                const nuevos = conEdad.filter(l => (ANIO_ACTUAL - l.anio) <= CORTE_NUEVO_ANIOS);
                const usados = conEdad.filter(l => (ANIO_ACTUAL - l.anio) > CORTE_NUEVO_ANIOS);
                const pm2cNuevo = nuevos.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);
                const pm2cUsado = usados.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);
                if (pm2cNuevo.length >= MIN_BUCKET) { medianaPm2c_nuevo = Math.round(mediana(pm2cNuevo)); n_nuevo = pm2cNuevo.length; celdasConNuevo++; }
                if (pm2cUsado.length >= MIN_BUCKET) { medianaPm2c_usado = Math.round(mediana(pm2cUsado)); n_usado = pm2cUsado.length; celdasConUsado++; }
                if (medianaPm2c_nuevo && medianaPm2c_usado) celdasConAmbos++;
            }

            const conEdadZona = dd.filter(l => l.anio && l.anio > 1900 && l.anio <= ANIO_ACTUAL);
            const edades = conEdadZona.map(l => ANIO_ACTUAL - l.anio);
            idx[muni][tipo][col] = {
                listings: dd,
                medianaPm2c: pm2csBlend.length ? Math.round(mediana(pm2csBlend)) : null,  // IDENTICO a produccion
                count: dd.length,
                edadMedianaZona: edades.length >= 3 ? Math.round(mediana(edades)) : null,
                medianaPm2c_nuevo, n_nuevo, medianaPm2c_usado, n_usado,
            };
            totalListings += dd.length;
            totalColonias++;
        }
    }
}

const meta = {
    builtAt: new Date().toISOString(), totalListings, totalColonias, skipped,
    municipios: Object.keys(idx).length,
    celdasConNuevo, celdasConUsado, celdasConAmbos,
    nota: `LAB split: medianaPm2c sin tocar (=produccion). medianaPm2c_nuevo/usado solo si >=${MIN_BUCKET} comps en ese bucket (corte ${CORTE_NUEVO_ANIOS}a).`,
};
fs.writeFileSync(OUT_PATH, JSON.stringify({ _meta: meta, ...idx }));
console.log(`\n✓ ${OUT_PATH} generado.`);
console.log(`  Celdas con bucket nuevo:  ${celdasConNuevo}/${totalColonias} (${(100*celdasConNuevo/totalColonias).toFixed(1)}%)`);
console.log(`  Celdas con bucket usado:  ${celdasConUsado}/${totalColonias} (${(100*celdasConUsado/totalColonias).toFixed(1)}%)`);
console.log(`  Celdas con AMBOS buckets: ${celdasConAmbos}/${totalColonias} (${(100*celdasConAmbos/totalColonias).toFixed(1)}%)`);
