/**
 * scrapear_propiedades_com_urls.js — Scraper puntual para URLs de DETALLE de propiedades.com
 *
 * A diferencia del listado (que Akamai bloquea a Python requests pero no a fetch nativo de
 * Node — mismo motivo que ya documenta buscar_comparables_browser.js), la página de detalle
 * trae un JSON-LD RealEstateListing limpio: precio, tipo, m², dirección. Sin navegador.
 *
 * Uso: node scrapear_propiedades_com_urls.js <url1> <url2> ...
 * Salida: _comparables_browser_temp.json (mismo formato que buscar_comparables_browser.js,
 * listo para `python insertar_comparables_ondemand.py _comparables_browser_temp.json`).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
};

const TIPO_SCHEMA = { House: 'casa', Apartment: 'departamento', Place: 'terreno' };

async function extraerPropiedad(url) {
    const res = await fetch(url, { headers: HEADERS }).catch(() => null);
    if (!res || !res.ok) { console.error(`[FALLO HTTP] ${url}`); return null; }
    const html = await res.text();
    const m = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) { console.error(`[SIN JSON-LD] ${url}`); return null; }
    let data;
    try { data = JSON.parse(m[1]); } catch { console.error(`[JSON ROTO] ${url}`); return null; }

    const offer = data.offers;
    const item = offer?.itemOffered;
    if (!offer || !item) { console.error(`[SIN OFFER] ${url}`); return null; }
    const precio = offer.price;
    const tipo = TIPO_SCHEMA[item['@type']] || 'casa';
    const m2 = item.floorSize?.value || null;
    const addr = item.address || {};
    if (!(precio > 50000)) { console.error(`[PRECIO INVALIDO] ${url}`); return null; }

    // La colonia real suele venir en streetAddress ("X , Col. Y C.P. ...") — addressLocality
    // normalmente es el MUNICIPIO, no la colonia (confirmado real: "El Arenal" repetido).
    let colonia = addr.addressLocality || '';
    const colM = (addr.streetAddress || '').match(/col\.?\s*([^,]+?)\s*c\.?p\.?/i);
    if (colM) colonia = colM[1].trim();

    return {
        id_unico: crypto.createHash('md5').update(url).digest('hex'),
        url_original: url,
        portal_origen: 'PROPIEDADES_COM',
        tipo_propiedad: tipo,
        tipo_operacion: 'venta',
        precio,
        ...(tipo === 'terreno' ? { m2_terreno: m2 } : { m2_construccion: m2 }),
        colonia,
        municipio: addr.addressLocality || '',
        estado: addr.addressRegion || 'Jalisco',
        moneda: offer.priceCurrency || 'MXN',
        fecha_scraping: new Date().toISOString(),
        activo: true,
    };
}

async function main() {
    const urls = process.argv.slice(2);
    if (!urls.length) { console.error('Uso: node scrapear_propiedades_com_urls.js <url1> <url2> ...'); process.exit(1); }
    const docs = [];
    for (const url of urls) {
        const doc = await extraerPropiedad(url.split('#')[0]);
        if (doc) {
            docs.push(doc);
            console.log(`[OK] ${doc.tipo_propiedad} — ${doc.colonia}, ${doc.municipio} — $${doc.precio.toLocaleString()} — ${doc.m2_construccion || doc.m2_terreno}m² — ${url}`);
        }
    }
    const outPath = path.join(__dirname, '_comparables_browser_temp.json');
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
    console.log(`\n=== ${docs.length}/${urls.length} extraídas — guardado en ${outPath} ===`);
}

main();
