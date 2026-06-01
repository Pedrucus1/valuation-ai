/**
 * plain_fetch.js — Fetch HTTP simple de una URL con fetch nativo de Node.
 *
 * Uso:  node plain_fetch.js <url> <archivo_salida>
 *       Escribe el HTML en <archivo_salida> (sync) e imprime "OK <bytes>" a stdout.
 *
 * Por qué Node y no requests de Python: propiedades.com (Akamai) hace TARPIT por
 * fingerprint TLS — el `requests` de Python se cuelga (read timeout), pero el fetch
 * de Node (HTTP/2, fingerprint tipo-navegador) recibe 200 con el __NEXT_DATA__ completo.
 * NO necesita Chrome, CDP ni proxy. Verificado 01-Jun-2026.
 *
 * Se escribe a archivo (no a stdout) para evitar el assertion de libuv en Windows al
 * cerrar el handle de stdout a mitad de un write grande (~1.5 MB).
 */
const fs = require('fs');

const TARGET_URL = process.argv[2];
const OUT_FILE = process.argv[3];
if (!TARGET_URL || !OUT_FILE) {
  process.stderr.write('Usage: node plain_fetch.js <url> <archivo_salida>\n');
  process.exit(1);
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Upgrade-Insecure-Requests': '1',
};

(async () => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(TARGET_URL, { headers: HEADERS, redirect: 'follow', signal: ctrl.signal });
    const html = await res.text();
    clearTimeout(t);
    if (/Challenge Validation|Access Denied|Pardon Our Interruption/i.test(html)) {
      process.stderr.write(`plain_fetch: challenge/bloqueo en ${TARGET_URL}\n`);
      process.exit(1);
    }
    if (html.length < 5000) {
      process.stderr.write(`plain_fetch: respuesta corta (${html.length} bytes)\n`);
      process.exit(1);
    }
    fs.writeFileSync(OUT_FILE, html, 'utf-8');   // sync: sin handles async pendientes al salir
    process.stdout.write(`OK ${html.length}`);
    process.exit(0);
  } catch (e) {
    clearTimeout(t);
    process.stderr.write('plain_fetch error: ' + e.message + '\n');
    process.exit(1);
  }
})();
