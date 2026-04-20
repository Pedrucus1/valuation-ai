/**
 * comparar_metodologias.js
 *
 * Para cada avalúo en cerebro_datos.json:
 *  1. Busca comparables en el Sheets del scraper por colonia/municipio
 *  2. Corre 3 métodos: Beta-OPI, Beta-Scraper, Romina-Scraper
 *  3. Exporta comparativa a Google Sheets tab 'Comparativa Metodologias'
 */

const fs = require('fs');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const SCRAPER_SHEET_ID = '1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE';
const SALIDA_SHEET_ID  = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
const MAX_AVALUOS = 5;
const FILTRO_ZONA = ''; // todos los municipios

// ── helpers ──────────────────────────────────────────────────────────────────

function cleanNum(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.toString().replace(/[^0-9.-]+/g, '')) || 0;
}

function antiRemate(precios) {
    if (!precios.length) return [];
    if (precios.length <= 2) return precios;
    const sorted = [...precios].sort((a, b) => a - b);
    const mediana = sorted[Math.floor(sorted.length / 2)];
    // Filtro bidireccional: ±40% de la mediana descarta remates Y colonias caras
    const f = precios.filter(p => p >= mediana * 0.60 && p <= mediana * 1.40);
    return f.length >= 2 ? f : precios.slice().sort((a, b) => b - a).slice(0, 2);
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function getRH(edad, vida = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vida);
    return Math.max(0.20, 1 - 0.5 * (x + x * x));
}

// ── métodos de valuación ─────────────────────────────────────────────────────

/**
 * Beta-OPI: usa comparables extraídos de la pestaña MERCADO de los propios avalúos.
 * comps = [{terreno, precio, link}]
 */
function metodoBetaOPI(prop) {
    if (!prop.compsOPI || !prop.compsOPI.length) return 0;

    const tipo = (prop.tipo || '').toUpperCase();
    const esRustico = tipo.includes('RÚSTICO') || tipo.includes('RUSTICO');
    const esTerreno = tipo.includes('TERRENO') || esRustico;

    const vistos = new Set();
    const unicos = prop.compsOPI.filter(c => {
        const t = cleanNum(c.terreno), p = cleanNum(c.precio);
        if (!t || !p) return false;
        const key = `${t}-${p}`;
        if (vistos.has(key)) return false;
        vistos.add(key); return true;
    });
    if (!unicos.length) return 0;

    const compsURL  = unicos.filter(c => (c.link || '').startsWith('http'));
    const compsPm2  = unicos.filter(c => {
        const l = c.link || '';
        return l.includes('$') && !l.startsWith('http') && cleanNum(l) > 100;
    });

    const factorRH  = getRH(prop.edad) / getRH(10);
    const factorNeg = 0.95;
    const areaRef   = compsURL.length ? avg(compsURL.map(c => cleanNum(c.terreno))) : 0;
    const factorSup = (areaRef > 0 && prop.terreno > 0) ? Math.pow(areaRef / prop.terreno, 1/6) : 1.0;

    const pm2T = avg(antiRemate(compsURL.map(c => cleanNum(c.precio) / cleanNum(c.terreno))));
    const pm2C = avg(antiRemate(compsPm2.map(c => cleanNum(c.link))));

    if (esRustico)  return pm2T ? pm2T * prop.terreno * factorSup * factorNeg * 0.35 : 0;
    if (esTerreno)  return pm2T ? pm2T * prop.terreno * factorSup * factorNeg : 0;

    if (pm2C && pm2T) return pm2T * prop.terreno * factorSup + pm2C * prop.construccion * factorRH * factorNeg;
    if (pm2C)         return pm2C * prop.construccion * factorRH * factorNeg + (prop.terreno ? pm2C * prop.terreno * 0.60 * factorNeg : 0);
    if (pm2T)         return pm2T * prop.terreno * factorSup * factorNeg + pm2T * prop.construccion * factorRH * 0.50 * factorNeg;
    return 0;
}

/**
 * Beta-Scraper: Suma de Partes usando SOLO m²C de comps (sin fallback a m²T).
 */
function metodoBetaScraper(prop, comps) {
    if (!comps || !comps.length) return 0;

    const tipo = (prop.tipo || '').toUpperCase();
    const esTerreno = tipo.includes('TERRENO') || tipo.includes('RÚSTICO') || tipo.includes('RUSTICO');
    const factorRH  = getRH(prop.edad) / getRH(10);
    const factorNeg = 0.95;

    // Solo comps que tienen m²C — sin fallback a m²T
    const compsValidos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
    if (!compsValidos.length) return 0;

    const pm2CArr = antiRemate(compsValidos.map(c => c.precio / c.m2_const));
    const pm2C    = avg(pm2CArr);
    if (!pm2C) return 0;

    if (esTerreno) return 0; // terrenos necesitan m²T, no aplica aquí

    // Para casas/deptos: pm2C × m²C_sujeto (con factorRH y negociación)
    // El terreno se valúa como proporción del valor de construcción
    const valorConstr  = pm2C * prop.construccion * factorRH * factorNeg;
    const valorTerreno = prop.terreno > 0 ? pm2C * prop.terreno * 0.40 * factorNeg : 0;
    return valorConstr + valorTerreno;
}

/**
 * Romina-Scraper: Homologación Directa usando m²C de comps del scraper.
 * comps = [{m2_const, precio}]
 */
function metodoRominaScraper(prop, comps) {
    if (!comps || !comps.length || !prop.construccion) return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0 };

    const validos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
    if (!validos.length) return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0 };

    const pm2c = validos.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));

    let suma = 0;
    compsFilt.forEach(c => {
        const pu = c.precio / c.m2_const;
        const factorSup  = Math.pow(c.m2_const / prop.construccion, 1/6);
        const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);
        suma += pu * factorSup * factorEdad;
    });

    const pm2cAvg = suma / compsFilt.length;
    const valor = Math.round(pm2cAvg * prop.construccion);

    // Confianza: compara el $/m²C de los comps vs el $/m²C implícito del valor real
    // Si los comps tienen $/m²C mucho mayor que lo que implica el valor del sujeto → zona incorrecta
    const mean = avg(pm2cFilt);
    const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
    const cv = mean > 0 ? stddev / mean : 1;

    // Ratio entre pm2c de comps y pm2c implícito del valor real del sujeto
    const pm2cImplicito = prop.valorReal > 0 ? prop.valorReal / prop.construccion : 0;
    const ratioZona = pm2cImplicito > 0 ? mean / pm2cImplicito : 1;
    // ratioZona ~1.0 = comps de zona correcta, >1.5 = comps de zona cara, <0.7 = comps de zona barata
    const confianza = ratioZona > 1.40 || ratioZona < 0.70 ? 'BAJA'
                    : ratioZona > 1.20 || ratioZona < 0.85 ? 'MEDIA' : 'ALTA';

    return { valor, confianza, cv: cv.toFixed(2), nComps: compsFilt.length };
}

// ── buscar comparables en el Sheets del scraper ───────────────────────────────

function extraerColoniaMunicipio(fileName) {
    // Municipios conocidos a buscar directamente
    const municipiosConocidos = [
        'zapopan','guadalajara','tlajomulco','tonalá','tonala',
        'tlaquepaque','puerto vallarta','bahía de banderas','bahia de banderas',
        'tepic','nayarit','chapala','ajijic','cajititlan','cajititlán'
    ];

    const lower = fileName.toLowerCase();
    let municipio = '';
    for (const m of municipiosConocidos) {
        if (lower.includes(m)) { municipio = m; break; }
    }

    // Colonia: segunda parte del nombre (entre primera y segunda coma)
    const partes = fileName.split(',');
    const colonia = partes.length > 1 ? partes[1].trim().toLowerCase() : '';

    return { colonia, municipio };
}

const TIPO_SINONIMOS = {
    'casa':         ['casa', 'casas', 'casa habitacion', 'casa habitación', 'residencia', 'chalet', 'villa', 'campestre'],
    'departamento': ['departamento', 'depto', 'apartamento', 'flat', 'loft', 'penthouse', 'suite'],
    'terreno':      ['terreno', 'lote', 'predio', 'solar'],
    'local':        ['local comercial', 'local', 'comercial'],
    'oficina':      ['oficina', 'despacho'],
    'bodega':       ['bodega', 'almacen', 'almacén'],
};

function normalizaTipo(raw) {
    const r = (raw || '').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_SINONIMOS)) {
        if (sins.some(s => r.includes(s))) return canon;
    }
    return r;
}

function tiposCoinciden(tipoSujeto, tipoProp) {
    return normalizaTipo(tipoSujeto) === normalizaTipo(tipoProp);
}

async function buscarCompsEnScraper(sheets, zona, prop) {
    let meta;
    try {
        meta = await sheets.spreadsheets.get({ spreadsheetId: SCRAPER_SHEET_ID });
    } catch(e) {
        console.error('Error accediendo al scraper sheet:', e.message);
        return [];
    }

    const tabs = meta.data.sheets.map(s => s.properties.title);
    // Preferir CONSOLIDADO si existe
    const tabsOrden = tabs.includes('CONSOLIDADO')
        ? ['CONSOLIDADO']
        : tabs.filter(t => !t.includes('CONSOLIDADO')).slice(0, 6);

    // Siempre usar CONSOLIDADO
    const tabFuente = tabs.includes('CONSOLIDADO') ? 'CONSOLIDADO' : tabs[0];
    let todos = [];
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SCRAPER_SHEET_ID,
            range: `'${tabFuente}'!A2:V9999`
        });
        (res.data.values || []).forEach(row => {
            const municipio = (row[7] || '').toLowerCase();
            const tipoProp  = (row[5] || '').toLowerCase();
            const tipoOp    = (row[4] || '').toLowerCase();
            const activo    = (row[21] || '').toString();
            const precio    = cleanNum(row[2]);
            const m2c       = cleanNum(row[11]);
            const m2t       = cleanNum(row[12]);

            // Filtro geográfico
            if (zona.municipio && !municipio.includes(zona.municipio)) return;

            // Solo venta y activos
            if (!tipoOp.includes('venta')) return;
            if (activo === 'false' || activo === '0') return;

            // Solo tipo coincidente
            if (!tiposCoinciden(prop.tipo, tipoProp)) return;

            // Exigir m²C — sin m²C no es comparable válido para casas/deptos
            if (m2c <= 0) return;

            // Precio mínimo razonable
            if (precio < 100000) return;

            // Área de referencia del sujeto: m²C
            const areaRef = prop.construccion > 0 ? prop.construccion : prop.terreno;

            // Filtro duro de área: ±50%
            if (areaRef > 0 && m2c < areaRef * 0.50) return;
            if (areaRef > 0 && m2c > areaRef * 1.50) return;

            // Filtro CUS ±35%
            if (prop.construccion > 0 && prop.terreno > 0 && m2t > 0) {
                const cusSubj = prop.construccion / prop.terreno;
                const cusComp = m2c / m2t;
                if (Math.abs(cusComp - cusSubj) / Math.max(cusSubj, 0.01) > 0.35) return;
            }

            // Score por similitud de m²C
            const score = areaRef > 0
                ? 1 - Math.abs(m2c - areaRef) / Math.max(m2c, areaRef)
                : 0;

            todos.push({ precio, m2_const: m2c, m2_terreno: m2t, colonia: row[6], municipio: row[7], score });
        });
    } catch(e) { console.error('Error leyendo CONSOLIDADO:', e.message); }

    // Ordenar por similitud y tomar los 10 mejores
    todos.sort((a, b) => b.score - a.score);
    return todos.slice(0, 10);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

    const validos = cerebro.filter(d =>
        d.fileName && d.fileName.includes('-26-') &&
        !d.fileName.toLowerCase().includes('guadalajara') &&
        (FILTRO_ZONA === '' || d.fileName.toLowerCase().includes(FILTRO_ZONA)) &&
        d.valorMercado && d.valorMercado !== 'No hallado' &&
        cleanNum(d.valorMercado) > 0 &&
        cleanNum(d.m2Construccion) > 0 &&
        d.comparables && d.comparables.length >= 3 &&
        !(d.tipo || '').toUpperCase().includes('EJIDAL') &&
        (d.tipo || '').toUpperCase().includes('CASA')
    ).slice(0, MAX_AVALUOS);

    console.log(`\nProbando ${validos.length} avalúos...\n`);

    const auth   = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    const MXN = v => v ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v) : 'N/A';
    const dif = (calc, real) => calc && real ? (((calc / real) - 1) * 100).toFixed(1) + '%' : 'N/A';

    const rows = [[
        'Archivo', 'Tipo', 'M2C', 'M2T', 'Edad',
        'Perito',
        'Beta-OPI', 'Dif%',
        'Beta-Scraper (solo m²C)', 'Dif%',
        'Romina-Scraper', 'Dif%', 'Confianza', 'CV',
        '#CompsOPI', '#CompsScraper'
    ]];

    for (const d of validos) {
        let edad = 10;
        const en = cleanNum(d.edad); if (en > 0) edad = en;

        const prop = {
            tipo: d.tipo,
            terreno:     cleanNum(d.m2Terreno),
            construccion: cleanNum(d.m2Construccion),
            valorReal:   cleanNum(d.valorMercado),
            edad,
            compsOPI: d.comparables
        };

        console.log(`Procesando: ${d.fileName}`);
        const zona = extraerColoniaMunicipio(d.fileName);
        console.log(`  Zona detectada: municipio="${zona.municipio}"`);

        const compsScraper = await buscarCompsEnScraper(sheets, zona, prop);
        console.log(`  Comps scraper encontrados: ${compsScraper.length}`);

        const betaOPI       = Math.round(metodoBetaOPI(prop));
        const betaScraper   = Math.round(metodoBetaScraper(prop, compsScraper));
        const romina        = metodoRominaScraper(prop, compsScraper);

        console.log(`  Perito:               ${MXN(prop.valorReal)}`);
        console.log(`  Beta-OPI:             ${MXN(betaOPI)}  (${dif(betaOPI, prop.valorReal)})`);
        console.log(`  Beta-Scraper(m²C):    ${MXN(betaScraper)}  (${dif(betaScraper, prop.valorReal)})`);
        console.log(`  Romina-Scraper:       ${MXN(romina.valor)}  (${dif(romina.valor, prop.valorReal)})  ← Confianza: ${romina.confianza} (CV:${romina.cv}, n:${romina.nComps})`);
        console.log('');

        rows.push([
            d.fileName, prop.tipo, prop.construccion, prop.terreno, edad,
            prop.valorReal,
            betaOPI     || 'N/A', dif(betaOPI, prop.valorReal),
            betaScraper || 'N/A', dif(betaScraper, prop.valorReal),
            romina.valor || 'N/A', dif(romina.valor, prop.valorReal),
            romina.confianza, romina.cv,
            prop.compsOPI.length, compsScraper.length
        ]);
    }

    // Exportar a Sheets — crear pestaña si no existe
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SALIDA_SHEET_ID });
        const tabExiste = meta.data.sheets.some(s => s.properties.title === 'Comparativa Metodologias');
        if (!tabExiste) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SALIDA_SHEET_ID,
                resource: { requests: [{ addSheet: { properties: { title: 'Comparativa Metodologias' } } }] }
            });
            console.log('Pestaña "Comparativa Metodologias" creada.');
        }
        await sheets.spreadsheets.values.update({
            spreadsheetId: SALIDA_SHEET_ID,
            range: 'Comparativa Metodologias!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        });
        console.log(`\nExportado a: https://docs.google.com/spreadsheets/d/${SALIDA_SHEET_ID}`);
    } catch(e) {
        console.error('Error exportando a Sheets:', e.message);
        console.log('\nResultados en consola:', JSON.stringify(rows, null, 2));
    }
}

main().catch(console.error);
