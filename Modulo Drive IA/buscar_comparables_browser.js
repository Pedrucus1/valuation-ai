/**
 * buscar_comparables_browser.js
 * Scraper on-demand por colonia — llena hueco de comparables en colonias débiles (n<=6).
 *
 * FIX 22-jul: la versión anterior usaba agent-browser (Chrome headless) contra los 3
 * portales equivocados y por eso daba 0 resultados / nav-error:
 *   - Inmuebles24 bloquea Cloudflare a cualquier navegador headless simple (confirmado:
 *     Playwright con browser fresco/página en scrapers/inmuebles24.py es lo único que pasa) → se omite aquí.
 *   - CasasYTerrenos: la URL HTML usada no existe (404); el scraper real usa la API MeiliSearch.
 *   - Propiedades.com: navegador headless dispara el reto Akamai (ERR_HTTP2_PROTOCOL_ERROR);
 *     el scraper real usa fetch nativo de Node sin Chrome (scrapers/plain_fetch.js).
 * Esta versión reusa exactamente el método que YA funciona por portal (scrapers/*.py), sin
 * navegador: PINCALI y Propiedades.com por fetch nativo, NOCNOK y CasasYTerrenos por su API JSON.
 *
 * Uso: node buscar_comparables_browser.js --colonia "Tabachines" --municipio "Zapopan" --tipo "casa" --m2 120
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// normCol/normMuni copiadas de motor_remi_api.js (exportadas, pero requerir ese módulo
// engancha listeners de stdin a nivel de módulo y cuelga este script) — misma lógica, no reinventada.
const SUFIJOS_GEO = [
    'guadalajara', 'zapopan', 'tlaquepaque', 'san pedro tlaquepaque', 'tlajomulco',
    'tlajomulco de zuniga', 'tonala', 'el salto', 'chapala', 'jalisco', 'jal',
    'nayarit', 'nay', 'colima', 'col'
];
function normCol(s) {
    if (!s) return '';
    let r = s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\bcp\s*\d{5}\b/g, '')
        .replace(/,.*$/, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    for (const suf of SUFIJOS_GEO) {
        if (r.endsWith(' ' + suf)) { r = r.slice(0, -(suf.length + 1)).trim(); break; }
    }
    return r;
}
function normMuni(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/san pedro tlaquepaque/, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z.niga/, 'tlajomulco')
        .replace(/(\b\w+)\1\b/, '$1');
}

const args = process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc[v.slice(2)] = arr[i + 1];
    return acc;
}, {});

const COLONIA   = args.colonia   || '';
const MUNICIPIO = args.municipio || '';
const TIPO      = (args.tipo || 'casa').toLowerCase();
const M2        = parseFloat(args.m2 || 100);
const M2_MIN    = Math.round(M2 * 0.5);
const M2_MAX    = Math.round(M2 * 1.5);
const COLONIA_N = normCol(COLONIA);
const MUNI_N    = normMuni(MUNICIPIO);

// --json: modo no interactivo para invocación desde motor_remi_api.js (fallback en vivo) —
// silencia el progreso (a stderr) y termina imprimiendo SOLO el JSON de comps a stdout.
const JSON_MODE = process.argv.includes('--json');
const log = (...a) => { if (JSON_MODE) console.error(...a); else console.log(...a); };

// Zonas/slugs por portal — copiado de scraper-inmuebles/config.py ZONAS (fuente de verdad).
const ZONAS = [
    { municipio: 'Guadalajara',            estado: 'Jalisco', slug_pincali: 'guadalajara-jalisco',              slug_propiedades: 'guadalajara',              nocnok_county: '570' },
    { municipio: 'Zapopan',                estado: 'Jalisco', slug_pincali: 'zapopan-jalisco',                  slug_propiedades: 'zapopan',                  nocnok_county: '651' },
    { municipio: 'Tlaquepaque',            estado: 'Jalisco', slug_pincali: 'san-pedro-tlaquepaque-jalisco',    slug_propiedades: 'san-pedro-tlaquepaque',    nocnok_county: '629' },
    { municipio: 'Tonalá',                 estado: 'Jalisco', slug_pincali: 'tonala-jalisco',                   slug_propiedades: 'tonala',                   nocnok_county: '632' },
    { municipio: 'Tlajomulco de Zúñiga',   estado: 'Jalisco', slug_pincali: 'tlajomulco-de-zuniga-jalisco',     slug_propiedades: 'tlajomulco-de-zuniga',     nocnok_county: '628' },
    { municipio: 'Chapala',                estado: 'Jalisco', slug_pincali: 'chapala-jalisco',                  slug_propiedades: 'chapala',                  nocnok_county: '561' },
    { municipio: 'Ajijic',                 estado: 'Jalisco', slug_pincali: 'ajijic-jalisco',                   slug_propiedades: 'ajijic',                   nocnok_county: null },
    // Agregados 01-sep (commit aca5f36 en scraper-inmuebles/config.py) — slugs sin verificar en vivo.
    { municipio: 'El Arenal',              estado: 'Jalisco', slug_pincali: 'el-arenal-jalisco',                slug_propiedades: 'el-arenal',                nocnok_county: null },
    { municipio: 'Tala',                   estado: 'Jalisco', slug_pincali: 'tala-jalisco',                     slug_propiedades: 'tala',                     nocnok_county: null },
    { municipio: 'Ixtlahuacán de los Membrillos', estado: 'Jalisco', slug_pincali: 'ixtlahuacan-de-los-membrillos-jalisco', slug_propiedades: 'ixtlahuacan-de-los-membrillos', nocnok_county: null },
    { municipio: 'San Isidro Mazatepec',   estado: 'Jalisco', slug_pincali: 'san-isidro-mazatepec-jalisco',     slug_propiedades: 'san-isidro-mazatepec',     nocnok_county: null },
];

function resolverZona(municipioInput) {
    const n = normMuni(municipioInput);
    return ZONAS.find(z => normMuni(z.municipio) === n) || null;
}

async function fetchTexto(url, headers) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
        const res = await fetch(url, { headers, redirect: 'follow', signal: ctrl.signal });
        const body = await res.text();
        return { ok: res.ok, status: res.status, body };
    } catch (e) {
        return { ok: false, status: 0, body: '', error: e.message };
    } finally {
        clearTimeout(t);
    }
}

function parseNum(str) {
    const n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
}

// ── PINCALI (fetch nativo — bloquea navegador headless, no requests con UA real) ──
const PINCALI_TIPO = { casa: 'houses', departamento: 'apartments', terreno: 'land' };
const PINCALI_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
};

async function buscarEnPincali(zona) {
    const comparables = [];
    if (!zona) return comparables;
    const tipoUrl = PINCALI_TIPO[TIPO] || 'houses';
    const url = `https://www.pincali.com/en/properties/${tipoUrl}-for-sale-in-${zona.slug_pincali}`;
    log(`[PINCALI] Buscando en ${url}`);

    const r = await fetchTexto(url, PINCALI_HEADERS);
    if (!r.ok) { log(`  Error HTTP ${r.status}`); return comparables; }

    // Cortar por tarjeta (div.property__component); regex-split porque no hay parser HTML instalado.
    const tarjetas = r.body.split(/<div[^>]*class="[^"]*property__component[^"]*"/i).slice(1);
    for (const raw of tarjetas.slice(0, 20)) {
        const hrefM = raw.match(/href="(\/en\/home\/[^"]+)"/);
        const precioM = raw.match(/\$\s*([\d,]+(?:\.\d+)?)/);
        const m2M = raw.match(/([\d,]+(?:\.\d+)?)\s*m[²2]/i);
        if (!hrefM || !precioM || !m2M) continue;

        const precio = parseNum(precioM[1]);
        const m2c = parseNum(m2M[1]);
        if (!(precio > 100000 && precio < 50000000)) continue;
        if (!(m2c >= M2_MIN && m2c <= M2_MAX)) continue;

        // Colonia no viene confiable en la tarjeta EN — confirmar en detalle ES (regla dura: solo /inmueble/).
        const urlEn = 'https://www.pincali.com' + hrefM[1];
        const urlEs = urlEn.replace('/en/home/', '/inmueble/');
        const d = await fetchTexto(urlEs, PINCALI_HEADERS);
        if (!d.ok) continue;
        const barrioM = d.body.match(/Property Neighborhood[^:]*:?\s*&quot;([^&"]+)&quot;/i)
                     || d.body.match(/vecindario[^:]*:\s*([^<\n]{2,60})/i);
        const colonia = barrioM ? barrioM[1].trim() : '';
        if (!colonia || normCol(colonia) !== COLONIA_N) continue;

        // Año: mismo fetch ES ya cargado — capturar "Año de construcción: 2012" / "A estrenar" (PINCALI_ENRICHER_NOTAS.md).
        let anio = null;
        const anioM = d.body.match(/A[^\s]*o de construcci[^\s]*n:\s*([^<\n]{1,20})/i);
        if (anioM) {
            const val = anioM[1].trim();
            anio = /estrenar/i.test(val) ? new Date().getFullYear() : parseInt(val, 10) || null;
        }

        comparables.push({ precio, construccion: m2c, colonia, anio, fuente: 'PINCALI', url: urlEs });
    }
    return comparables;
}

// ── NOCNOK (API JSON — sin navegador) ──
const NOCNOK_MAX_PAGINAS = 25;      // límite hard del API (mismo que nocnok.py)
const NOCNOK_MAX_DETALLES = 25;     // tope de fetches al detalle por corrida (cortesía con el portal)

async function buscarEnNocnok(zona) {
    const comparables = [];
    if (!zona || !zona.nocnok_county) return comparables;

    const home = await fetchTexto('https://inmuebles.nocnok.com', {});
    const buildIdM = home.body.match(/"buildId"\s*:\s*"([^"]+)"/);
    if (!buildIdM) { log('[NOCNOK] No se pudo obtener buildId'); return comparables; }
    const buildId = buildIdM[1];

    let detallesUsados = 0;
    for (let pagina = 1; pagina <= NOCNOK_MAX_PAGINAS && detallesUsados < NOCNOK_MAX_DETALLES; pagina++) {
        const searchUrl = `https://inmuebles.nocnok.com/api/properties/search?stateId=14&countyIds=${zona.nocnok_county}&operation=sale&pageNumber=${pagina}`;
        const r = await fetchTexto(searchUrl, {});
        if (!r.ok) { log(`[NOCNOK] Error HTTP ${r.status} pág ${pagina}`); break; }

        let data;
        try { data = JSON.parse(r.body); } catch { break; }
        const items = data.data || [];
        if (!items.length) break;
        log(`[NOCNOK] pág ${pagina} — ${items.length} items`);

        for (const item of items) {
            const precio = parseNum(item.price);
            const m2c = parseNum(item.constructionSize);
            if (!(precio > 100000 && precio < 50000000)) continue;
            if (!(m2c >= M2_MIN && m2c <= M2_MAX)) continue;
            if (!item.url) continue;
            // NOCNOK: constructionSize basura del API (INDICE_SCRAPER.md) — un $/m² implausible
            // suele ser el m2c corrupto, no el precio. Filtro de cordura, no dato inventado.
            if (precio / m2c < 5000) continue;

            // Pre-filtro barato: 'location' de búsqueda trae "colonia, municipio, estado".
            const colonieRapida = (item.location || '').split(',')[0].trim();
            let colonia = normCol(colonieRapida) === COLONIA_N ? colonieRapida : '';
            let anio = null;

            if (!colonia) {
                if (detallesUsados >= NOCNOK_MAX_DETALLES) continue;
                detallesUsados++;
                const path_ = item.url.replace('https://inmuebles.nocnok.com', '');
                const d = await fetchTexto(`https://inmuebles.nocnok.com/_next/data/${buildId}${path_}.json`, {});
                if (!d.ok) continue;
                let det;
                try { det = JSON.parse(d.body); } catch { continue; }
                const settlement = det?.pageProps?.property?.settlement || '';
                if (!settlement || normCol(settlement) !== COLONIA_N) continue;
                colonia = settlement;

                // yearBuilt: mismo detalle ya cargado — puede venir como edad-en-años o año directo
                // (mismo criterio que scrapers/nocnok.py::_mapear, no reinventado).
                const yb = parseInt(det?.pageProps?.property?.yearBuilt, 10);
                if (yb) {
                    const hoy = new Date().getFullYear();
                    if (yb > 1 && yb < 150) anio = hoy - yb;
                    else if (yb > 1900 && yb <= hoy + 2) anio = yb;
                }
            }

            comparables.push({ precio, construccion: m2c, colonia, anio, fuente: 'NOCNOK', url: item.url });
        }
    }
    return comparables;
}

// ── CASAS Y TERRENOS (API MeiliSearch — sin navegador) ──
const MEILISEARCH_HOST = 'https://prod-search.casasyterrenos.com';
const MEILISEARCH_KEY  = '3e245d64c60ffb41c81c6e9e36d92cb6da5c15b9c8c09719f3da3fd7a9dd384f';

async function _meilisearch(filtros) {
    const res = await fetch(`${MEILISEARCH_HOST}/indexes/properties/search`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: '', filter: filtros, limit: 100, offset: 0 }),
    }).catch(() => null);
    if (!res || !res.ok) return null;
    return res.json();
}

async function buscarEnCasasYTerrenos(zona) {
    const comparables = [];
    if (!zona) return comparables;

    // 1er intento: filtrar neighborhood server-side (case-insensitive, confirmado con prueba real).
    log(`[CasasYTerrenos] Buscando neighborhood~"${COLONIA}" en ${zona.municipio}`);
    let data = await _meilisearch([`municipality = "${zona.municipio}"`, 'isSale = true', `neighborhood = "${COLONIA}"`]);
    let hits = data?.hits || [];

    // Fallback: sin filtro de colonia (por si difiere en acentos/puntuación) + match client-side.
    if (!hits.length) {
        log('  Sin match directo, probando sin filtro de colonia...');
        data = await _meilisearch([`municipality = "${zona.municipio}"`, 'isSale = true']);
        hits = data?.hits || [];
    }
    if (!data) { log('  Error MeiliSearch'); return comparables; }
    for (const hit of hits) {
        const precio = parseNum(hit.priceSale);
        const m2c = parseNum(hit.construction);
        const colonia = hit.neighborhood || '';
        if (!(precio > 100000 && precio < 50000000)) continue;
        if (!(m2c >= M2_MIN && m2c <= M2_MAX)) continue;
        if (!colonia || normCol(colonia) !== COLONIA_N) continue;

        const slugPath = (hit.slugs && hit.slugs.venta) || hit.canonical || '';
        comparables.push({ precio, construccion: m2c, colonia, fuente: 'CasasYTerrenos', url: 'https://www.casasyterrenos.com' + slugPath });
    }
    return comparables;
}

// ── PROPIEDADES.COM (fetch nativo — navegador dispara reto Akamai) ──
const PROPCOM_TIPO = { casa: 'casas', departamento: 'departamentos', terreno: 'terrenos' };
const PROPCOM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
};

function _extraerTarjetasPropCom(html) {
    // Sin parser HTML instalado: cortar por tarjeta exacta y leer amenities-count en orden
    // (recámaras, baños, m2c — confirmado real 22-jul, mismo orden que SELECTORES de propiedades_com.py).
    return html.split(/<section class="pcom-property-card"/).slice(1).map(raw => {
        const precioM = raw.match(/\$\s*([\d,]+(?:\.\d+)?)/);
        const amenities = [...raw.matchAll(/amenities-count[^>]*>([^<]+)</gi)].map(m => m[1]);
        const altM = raw.match(/alt="[^"]*Col\.?\s+([^,"]+?)(?:\s*C\.?P\.?\s*\d{5}|,|")/i);
        // URL propia del anuncio (NO la de listado) — necesaria para id_unico; si no, todas las
        // tarjetas de una corrida colisionan al mismo id_unico y se pisan entre sí al hacer upsert.
        const hrefM = raw.match(/href="([^"#]+)/i);
        if (!precioM || amenities.length < 3 || !altM || !hrefM) return null;
        return {
            precio: parseNum(precioM[1]),
            construccion: parseNum(amenities[2]),
            colonia: altM[1].trim(),
            url: hrefM[1].replace(/&amp;/g, '&'),
        };
    }).filter(Boolean);
}

async function buscarEnPropiedadesCom(zona) {
    const comparables = [];
    if (!zona) return comparables;
    const tipoUrl = PROPCOM_TIPO[TIPO] || 'casas';

    // 1er intento: URL directa por colonia (confirmada real 22-jul: {colonia-kebab}-{municipio-slug}).
    const colKebab = normCol(COLONIA).replace(/\s+/g, '-');
    const urlColonia = `https://propiedades.com/${colKebab}-${zona.slug_propiedades}/${tipoUrl}-venta`;
    log(`[Propiedades.com] Buscando en ${urlColonia}`);
    let r = await fetchTexto(urlColonia, PROPCOM_HEADERS);
    let tarjetas;

    if (r.ok && r.body.length >= 5000) {
        tarjetas = _extraerTarjetasPropCom(r.body);
    } else {
        // Fallback: listado municipio-wide + match de colonia en el alt de cada tarjeta.
        const urlMuni = `https://propiedades.com/${zona.slug_propiedades}/${tipoUrl}-venta`;
        log(`  Sin URL directa (HTTP ${r.status}), probando municipio-wide: ${urlMuni}`);
        r = await fetchTexto(urlMuni, PROPCOM_HEADERS);
        if (!r.ok || r.body.length < 5000) { log(`  Error HTTP ${r.status} o respuesta corta`); return comparables; }
        tarjetas = _extraerTarjetasPropCom(r.body).filter(t => normCol(t.colonia) === COLONIA_N);
    }

    for (const t of tarjetas) {
        if (!(t.precio > 100000 && t.precio < 50000000)) continue;
        if (!(t.construccion >= M2_MIN && t.construccion <= M2_MAX)) continue;
        if (normCol(t.colonia) !== COLONIA_N) continue;
        comparables.push({ precio: t.precio, construccion: t.construccion, colonia: t.colonia, fuente: 'Propiedades.com', url: t.url });
    }
    return comparables;
}

// fuente (nombre de display) → portal_origen canónico (ESQUEMA_CAMPOS.md / mercado_props).
const PORTAL_ORIGEN = {
    NOCNOK: 'NOCNOK',
    CasasYTerrenos: 'CASAS_Y_TERRENOS',
    PINCALI: 'PINCALI',
    'Propiedades.com': 'PROPIEDADES_COM',
};

function aSchemaMongo(c, zona) {
    const doc = {
        id_unico: crypto.createHash('md5').update(c.url).digest('hex'),
        url_original: c.url,
        portal_origen: PORTAL_ORIGEN[c.fuente] || c.fuente,
        tipo_propiedad: TIPO,          // canónico: casa/departamento/terreno (ya viene así del arg --tipo)
        tipo_operacion: 'venta',
        precio: c.precio,
        m2_construccion: c.construccion,
        colonia: c.colonia,
        municipio: zona.municipio,
        estado: zona.estado,
        moneda: 'MXN',
        fecha_scraping: new Date().toISOString(),
        activo: true,
    };
    if (c.anio) doc.anio_construccion = c.anio;
    return doc;
}

function deduplicar(comps) {
    const vistos = new Set();
    return comps.filter(c => {
        const key = `${Math.round(c.precio / 10000)}_${Math.round(c.construccion / 5)}`;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
    });
}

async function main() {
    if (!COLONIA || !MUNICIPIO) {
        console.error('Uso: node buscar_comparables_browser.js --colonia "X" --municipio "Y" --tipo "casa" --m2 120');
        process.exit(1);
    }

    const zona = resolverZona(MUNICIPIO);
    if (!zona) {
        console.error(`Municipio "${MUNICIPIO}" no está en ZONAS — no se puede armar URL de búsqueda.`);
        process.exit(1);
    }

    log(`\nBuscando comparables: ${TIPO} en ${COLONIA}, ${zona.municipio} | m² sujeto: ${M2} (rango ${M2_MIN}-${M2_MAX})\n`);

    const todos = [];
    for (const fn of [buscarEnNocnok, buscarEnCasasYTerrenos, buscarEnPincali, buscarEnPropiedadesCom]) {
        try { todos.push(...await fn(zona)); } catch (e) { log(`  Error: ${e.message}`); }
    }

    const dedup = deduplicar(todos);

    log(`\n=== ${dedup.length} comparables encontrados ===`);
    dedup.forEach((c, i) => {
        const pm2 = c.construccion > 0 ? Math.round(c.precio / c.construccion) : 0;
        log(`${i + 1}. $${c.precio.toLocaleString()} | ${c.construccion}m² | $${pm2.toLocaleString()}/m² | ${c.colonia} [${c.fuente}]`);
    });

    const docs = dedup.map(c => aSchemaMongo(c, zona));
    const outPath = path.join(__dirname, '_comparables_browser_temp.json');
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
    log(`\nGuardado en ${outPath} (listo para insertar_comparables_ondemand.py --mongo)`);

    // En modo --json, stdout lleva SOLO este JSON (todo lo demás fue a stderr vía log())
    // para que el proceso que invoca (motor_remi_api.js) pueda hacer JSON.parse(stdout) directo.
    if (JSON_MODE) console.log(JSON.stringify(dedup));

    return dedup;
}

main().catch(console.error);
