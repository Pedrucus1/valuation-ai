/**
 * build_cache_index_lab_usado.js — LAB, no toca cache_index.json de producción.
 *
 * Copia la lógica de build_cache_index.js pero separa cada celda en nuevo(edad<=CORTE)/usado
 * y usa medianaPm2c = mediana de USADOS cuando hay >=MIN_USADO comps usados; si no alcanza,
 * cae al blended de siempre (igual que produ). Objetivo: medir con el validador de 205 OPIs
 * si anclar en "usado" (el sujeto típico de un avalúo) sube el pass-rate vs el blended actual
 * que la sesión 23-jul confirmó contaminado por obra nueva.
 *
 * Salida: cache_index.LAB_USADO.json (no sobreescribe el de producción).
 * Uso del validador: LAB_INDEX_PATH=cache_index.LAB_USADO.json node validar_40_opis.js --n 400
 */
const fs   = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'cache_consolidado.json');
const OUT_PATH   = path.join(__dirname, 'cache_index.LAB_USADO.json');
const CORTE_NUEVO_ANIOS = 2;
const MIN_USADO = 3;

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

let totalListings = 0, totalColonias = 0, celdasUsadoAplicado = 0;
for (const muni of Object.keys(idx)) {
    for (const tipo of Object.keys(idx[muni])) {
        for (const col of Object.keys(idx[muni][tipo])) {
            const raw = idx[muni][tipo][col];
            const dd = dedup(raw);
            const esTerr = tipo === 'terreno';

            const conEdad = dd.filter(l => l.anio && l.anio > 1900 && l.anio <= ANIO_ACTUAL);
            const usados  = conEdad.filter(l => (ANIO_ACTUAL - l.anio) > CORTE_NUEVO_ANIOS);
            const pm2csUsado = esTerr
                ? usados.filter(l => l.m2t > 0).map(l => l.precio / l.m2t)
                : usados.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);

            const pm2csBlend = esTerr
                ? dd.filter(l => l.m2t > 0).map(l => l.precio / l.m2t)
                : dd.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);

            let medianaPm2c, fuentePm2c;
            if (!esTerr && pm2csUsado.length >= MIN_USADO) {
                medianaPm2c = Math.round(mediana(pm2csUsado));
                fuentePm2c = 'usado';
                celdasUsadoAplicado++;
            } else {
                medianaPm2c = pm2csBlend.length ? Math.round(mediana(pm2csBlend)) : null;
                fuentePm2c = 'blend';
            }

            const edades = conEdad.map(l => ANIO_ACTUAL - l.anio);
            idx[muni][tipo][col] = {
                listings: dd,
                medianaPm2c,
                count: dd.length,
                edadMedianaZona: edades.length >= 3 ? Math.round(mediana(edades)) : null,
                _fuentePm2c: fuentePm2c,
            };
            totalListings += dd.length;
            totalColonias++;
        }
    }
}

const meta = {
    builtAt: new Date().toISOString(), totalListings, totalColonias, skipped,
    municipios: Object.keys(idx).length,
    celdasUsadoAplicado,
    nota: `LAB: medianaPm2c = mediana de comps con edad>${CORTE_NUEVO_ANIOS}a cuando hay >=${MIN_USADO}; si no, blend igual que produ.`,
};
fs.writeFileSync(OUT_PATH, JSON.stringify({ _meta: meta, ...idx }));
console.log(`\n✓ ${OUT_PATH} generado.`);
console.log(`  Celdas con medianaPm2c=usado-only: ${celdasUsadoAplicado}/${totalColonias} (${(100*celdasUsadoAplicado/totalColonias).toFixed(1)}%)`);
