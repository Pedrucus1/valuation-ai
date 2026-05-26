/**
 * buscar_comparables_browser.js
 * Busca comparables en portales inmobiliarios usando agent-browser.
 * Fallback entre remi-Scraper y Gemini en comparar_metodologias.js
 *
 * Uso: node buscar_comparables_browser.js --colonia "Tabachines" --municipio "Zapopan" --tipo "casa" --m2 120
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc[v.slice(2)] = arr[i + 1];
    return acc;
}, {});

const COLONIA   = (args.colonia   || '').toLowerCase();
const MUNICIPIO = (args.municipio || '').toLowerCase();
const TIPO      = (args.tipo      || 'casa').toLowerCase();
const M2        = parseFloat(args.m2 || 100);
const M2_MIN    = Math.round(M2 * 0.5);
const M2_MAX    = Math.round(M2 * 1.5);

function ab(cmd) {
    try {
        return execSync(`agent-browser ${cmd}`, { encoding: 'utf8', timeout: 20000 }).trim();
    } catch (e) {
        return '';
    }
}

function getTexto() {
    return ab('get text body');
}

function parseNum(str) {
    const n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
}

async function buscarEnInmuebles24() {
    const comparables = [];
    const tipoUrl = TIPO.includes('depto') || TIPO.includes('departamento') ? 'departamentos' : 'casas';
    const url = `https://www.inmuebles24.com/${tipoUrl}-en-venta-en-${MUNICIPIO.replace(/\s/g,'-')}.html`;

    console.log(`[Inmuebles24] Buscando en ${url}`);
    ab(`open "${url}"`);
    ab('wait --load networkidle');

    const texto = getTexto();
    const lineas = texto.split('\n').filter(l => l.trim());

    // Extraer precios y m² del texto de la página
    let i = 0;
    while (i < lineas.length && comparables.length < 8) {
        const l = lineas[i];
        const precio = l.match(/\$\s*([\d,]+)/);
        if (precio) {
            const p = parseNum(precio[1]);
            if (p > 100000 && p < 50000000) {
                // Buscar m² en líneas cercanas
                let m2c = 0;
                for (let j = i - 3; j <= i + 3; j++) {
                    const m = (lineas[j] || '').match(/(\d+)\s*m[²2]/i);
                    if (m) { m2c = parseNum(m[1]); break; }
                }
                // Buscar colonia en líneas cercanas
                let colonia = '';
                for (let j = i - 2; j <= i + 2; j++) {
                    const lj = (lineas[j] || '').toLowerCase();
                    if (lj.includes(COLONIA) || lj.includes(MUNICIPIO)) { colonia = lineas[j].trim(); break; }
                }
                if (m2c >= M2_MIN && m2c <= M2_MAX) {
                    comparables.push({ precio: p, construccion: m2c, colonia, fuente: 'Inmuebles24' });
                }
            }
        }
        i++;
    }

    ab('close');
    return comparables;
}

async function buscarEnPropiedadesCom() {
    const comparables = [];
    const tipoUrl = TIPO.includes('depto') || TIPO.includes('departamento') ? 'departamentos' : 'casas';
    const busqueda = `${COLONIA} ${MUNICIPIO} jalisco`.trim();
    const url = `https://www.propiedades.com/${tipoUrl}-en-venta?q=${encodeURIComponent(busqueda)}`;

    console.log(`[Propiedades.com] Buscando en ${url}`);
    ab(`open "${url}"`);
    ab('wait --load networkidle');
    ab('wait 2000');

    const texto = getTexto();
    const lineas = texto.split('\n').filter(l => l.trim());

    let i = 0;
    while (i < lineas.length && comparables.length < 8) {
        const l = lineas[i];
        const precio = l.match(/\$\s*([\d,]+)/);
        if (precio) {
            const p = parseNum(precio[1]);
            if (p > 100000 && p < 50000000) {
                let m2c = 0;
                for (let j = i - 3; j <= i + 3; j++) {
                    const m = (lineas[j] || '').match(/(\d+)\s*m[²2]/i);
                    if (m) { m2c = parseNum(m[1]); break; }
                }
                if (m2c >= M2_MIN && m2c <= M2_MAX) {
                    comparables.push({ precio: p, construccion: m2c, colonia: COLONIA, fuente: 'Propiedades.com' });
                }
            }
        }
        i++;
    }

    ab('close');
    return comparables;
}

async function buscarEnCasasYTerrenos() {
    const comparables = [];
    const tipoUrl = TIPO.includes('depto') || TIPO.includes('departamento') ? 'departamento' : 'casa';
    const url = `https://www.casasyterrenos.com/jalisco/${MUNICIPIO.replace(/\s/g,'-')}/${tipoUrl}-venta`;

    console.log(`[CasasYTerrenos] Buscando en ${url}`);
    ab(`open "${url}"`);
    ab('wait --load networkidle');

    const texto = getTexto();
    const lineas = texto.split('\n').filter(l => l.trim());

    let i = 0;
    while (i < lineas.length && comparables.length < 8) {
        const l = lineas[i];
        const precio = l.match(/\$\s*([\d,]+)/);
        if (precio) {
            const p = parseNum(precio[1]);
            if (p > 100000 && p < 50000000) {
                let m2c = 0;
                for (let j = i - 3; j <= i + 3; j++) {
                    const m = (lineas[j] || '').match(/(\d+)\s*m[²2]/i);
                    if (m) { m2c = parseNum(m[1]); break; }
                }
                if (m2c >= M2_MIN && m2c <= M2_MAX) {
                    comparables.push({ precio: p, construccion: m2c, colonia: COLONIA, fuente: 'CasasYTerrenos' });
                }
            }
        }
        i++;
    }

    ab('close');
    return comparables;
}

function deduplicar(comps) {
    const vistos = new Set();
    return comps.filter(c => {
        const key = `${Math.round(c.precio/10000)}_${Math.round(c.construccion/5)}`;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
    });
}

async function main() {
    if (!COLONIA && !MUNICIPIO) {
        console.error('Uso: node buscar_comparables_browser.js --colonia "X" --municipio "Y" --tipo "casa" --m2 120');
        process.exit(1);
    }

    console.log(`\nBuscando comparables: ${TIPO} en ${COLONIA}, ${MUNICIPIO} | m² sujeto: ${M2} (rango ${M2_MIN}-${M2_MAX})\n`);

    const todos = [];
    for (const fn of [buscarEnInmuebles24, buscarEnCasasYTerrenos, buscarEnPropiedadesCom]) {
        try { todos.push(...await fn()); } catch(e) { console.log(`  Error: ${e.message}`); }
    }

    const dedup = deduplicar(todos);

    console.log(`\n=== ${dedup.length} comparables encontrados ===`);
    dedup.forEach((c, i) => {
        const pm2 = c.construccion > 0 ? Math.round(c.precio / c.construccion) : 0;
        console.log(`${i+1}. $${c.precio.toLocaleString()} | ${c.construccion}m² | $${pm2.toLocaleString()}/m² | ${c.colonia} [${c.fuente}]`);
    });

    // Output JSON para integración con comparar_metodologias.js
    const outPath = path.join(__dirname, '_comparables_browser_temp.json');
    fs.writeFileSync(outPath, JSON.stringify(dedup, null, 2));
    console.log(`\nGuardado en ${outPath}`);

    return dedup;
}

main().catch(console.error);
