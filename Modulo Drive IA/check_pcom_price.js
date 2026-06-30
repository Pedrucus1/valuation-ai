/**
 * check_pcom_price.js — verifica precio en PCOM via CDP
 * node check_pcom_price.js
 */
// PCOM usa plain_fetch.js (Node HTTP que pasa Akamai), no CDP
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PLAIN_FETCH = path.join(__dirname, '../scraper-inmuebles/scrapers/plain_fetch.js');

const URLS = [
    'https://propiedades.com/inmuebles/casa-en-renta-c-reforma-2529-ladron-de-guevara-ladron-de-guevara-44600-guadalajara-jal-sn-ladron-de-guevara-jalisco',
    'https://propiedades.com/inmuebles/departamento-en-venta-av-fray-andres-de-urdaneta-1939-24-jardines-de-la-cruz-1a-seccion-jalisco-30816543',
];

(async () => {
    for (const url of URLS) {
        console.log(`\nURL: ${url.substring(0, 90)}`);
        try {
            const tmp = path.join(os.tmpdir(), `pcom_check_${Date.now()}.html`);
            const { spawnSync } = require('child_process');
            spawnSync('node', [PLAIN_FETCH, url, tmp], { timeout: 60000, encoding: 'utf8' });
            // La assertion de libuv ocurre DESPUÉS de escribir el archivo — leer igual
            const html = fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '';
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
            if (!html) { console.log('  Sin respuesta'); continue; }
            if (!html) { console.log('  Sin respuesta'); continue; }

            // 1. span.currency
            const currencyRe = /<span[^>]*class="[^"]*currency[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
            const currencies = [...html.matchAll(currencyRe)].map(m => m[1].trim().substring(0, 60));
            console.log(`  span.currency: ${currencies.slice(0,3).join(' | ') || 'NINGUNO'}`);

            // 2. Cualquier $ visible en el HTML
            const precios = [...new Set((html.match(/\$\s*[\d,]+/g) || []))].slice(0, 6);
            console.log(`  $ visibles: ${precios.join(' | ') || 'NINGUNO'}`);

            // 3. __NEXT_DATA__ → campos precio
            const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (nd) {
                const data = JSON.parse(nd[1]);
                const results = data?.props?.pageProps?.initialState?.Property?.property?.results || {};
                const inner = results?.property || {};
                const amenities = results?.amenities || {};

                // Todos los campos con "price" en alguno de los niveles
                const found = {};
                for (const [k, v] of Object.entries({...inner, ...amenities, ...results})) {
                    if (/price|precio|valor|monto|rent|sale/i.test(k) && v !== undefined) {
                        found[k] = v;
                    }
                }
                console.log(`  __NEXT_DATA__ price fields: ${JSON.stringify(found)}`);
                console.log(`  inner keys (${Object.keys(inner).length}): ${Object.keys(inner).slice(0,25).join(', ')}`);
            } else {
                console.log('  __NEXT_DATA__: no encontrado');
            }
        } catch(e) {
            console.log(`  Error: ${e.message.substring(0, 120)}`);
        }
    }
    process.exit(0);
})();
