/**
 * comparar_metodologias.js
 *
 * Para cada avalúo:
 *  1. Busca comparables en CONSOLIDADO del scraper (filtro por municipio + colonia)
 *  2. Si confianza=BAJA o nComps<3 → fallback automático a Gemini+GoogleSearch
 *  3. Corre Romina con la mejor fuente disponible
 *  4. Exporta a Google Sheets "Comparativa Metodologias"
 */

require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SCRAPER_SHEET_ID = '1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE';

// Mapa de colonias similares por NSE — construido de 917 avalúos del perito
const COLONIAS_SIMILARES_PATH = require('path').join(__dirname, 'colonias_similares.json');
const _coloniasSimilares = require('fs').existsSync(COLONIAS_SIMILARES_PATH)
    ? JSON.parse(require('fs').readFileSync(COLONIAS_SIMILARES_PATH, 'utf8'))
    : {};

function normalizarColonia(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Devuelve las colonias NSE-similares según el perito, ordenadas por menciones
function getColoniasSimilares(colonia, maxColonias = 5) {
    const norm = normalizarColonia(colonia);
    const similares = _coloniasSimilares[norm] || [];
    return similares.slice(0, maxColonias).map(x => x.colonia);
}
const SALIDA_SHEET_ID  = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';

// Límite de avalúos a procesar
const MAX_AVALUOS    = 50;
// Municipios AMG incluidos en el análisis (vacío = todos)
const MUNICIPIOS_AMG = ['guadalajara', 'zapopan', 'tlaquepaque', 'tlajomulco', 'tonalá', 'tonala', 'el salto'];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const f = precios.filter(p => p >= mediana * 0.60 && p <= mediana * 1.40);
    return f.length >= 2 ? f : sorted.slice(1, -1).length >= 2 ? sorted.slice(1, -1) : precios;
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function getRH(edad, vida = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vida);
    return Math.max(0.20, 1 - 0.5 * (x + x * x));
}

const MXN = v => v ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v) : 'N/A';
const dif  = (calc, real) => calc && real ? (((calc / real) - 1) * 100).toFixed(1) + '%' : 'N/A';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── normalización de tipo ─────────────────────────────────────────────────────

const TIPO_SINONIMOS = {
    'casa':         ['casa', 'casas', 'casa habitacion', 'casa habitación', 'residencia', 'chalet', 'villa'],
    'departamento': ['departamento', 'depto', 'apartamento', 'flat', 'loft', 'penthouse', 'suite'],
    'terreno':      ['terreno', 'lote', 'predio', 'solar'],
    'local':        ['local comercial', 'local', 'comercial'],
    'oficina':      ['oficina'],
    'bodega':       ['bodega', 'almacen'],
};

function normalizaTipo(raw) {
    const r = (raw || '').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_SINONIMOS)) {
        if (sins.some(s => r.includes(s))) return canon;
    }
    return 'casa';
}

// ── extraer zona del nombre de archivo ───────────────────────────────────────

function extraerZona(fileName) {
    const lower = fileName.toLowerCase();
    const municipios = [
        'zapopan','guadalajara','tlajomulco','tonalá','tonala',
        'tlaquepaque','puerto vallarta','bahía de banderas','bahia de banderas',
        'tepic','chapala','ajijic','cajititlan','cajititlán'
    ];
    let municipio = '';
    for (const m of municipios) {
        if (lower.includes(m)) { municipio = m; break; }
    }
    // Colonia: detectar "Col. X" explícitamente primero
    let colonia = '';
    const mCol = lower.match(/\bcol(?:onia)?\.\s*([a-záéíóúñ][a-záéíóúñ\s]{2,40})(?=[\.,]|\s+cp\b|\s+c\.p\.|\s*$)/i);
    if (mCol) {
        colonia = mCol[1].trim();
    } else {
        const partes = fileName.split(',');
        for (const p of partes) {
            const t = p.trim().toLowerCase();
            if (/\d/.test(t)) continue;
            if (municipios.includes(t)) continue;
            if (t.length < 3) continue;
            // Limpiar municipio/estado embebidos (ej: "Lagos de Oriente Guadalajara Jalisco")
            let limpio = t;
            for (const m of municipios) limpio = limpio.replace(m, '').trim();
            limpio = limpio.replace(/\b(jalisco|jal\.?)\b/gi, '').trim().replace(/\s+/g, ' ');
            if (limpio.length >= 3) {
                colonia = limpio;
                break;
            }
        }
    }
    return { municipio, colonia };
}

// ── métodos de valuación ─────────────────────────────────────────────────────

function metodoBetaOPI(prop) {
    if (!prop.compsOPI || !prop.compsOPI.length) return 0;
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
    const compsPm2  = unicos.filter(c => { const l = c.link || ''; return l.includes('$') && !l.startsWith('http') && cleanNum(l) > 100; });
    const factorRH  = getRH(prop.edad) / getRH(10);
    const factorNeg = 0.95;
    const areaRef   = compsURL.length ? avg(compsURL.map(c => cleanNum(c.terreno))) : 0;
    const factorSup = (areaRef > 0 && prop.terreno > 0) ? Math.pow(areaRef / prop.terreno, 1/6) : 1.0;
    const pm2T = avg(antiRemate(compsURL.map(c => cleanNum(c.precio) / cleanNum(c.terreno))));
    const pm2C = avg(antiRemate(compsPm2.map(c => cleanNum(c.link))));

    if (pm2C && pm2T) return pm2T * prop.terreno * factorSup + pm2C * prop.construccion * factorRH * factorNeg;
    if (pm2C)         return pm2C * prop.construccion * factorRH * factorNeg + (prop.terreno ? pm2C * prop.terreno * 0.60 * factorNeg : 0);
    if (pm2T)         return pm2T * prop.terreno * factorSup * factorNeg + pm2T * prop.construccion * factorRH * 0.50 * factorNeg;
    return 0;
}

/**
 * Romina: Homologación Directa $/m²C con factorSup y factorEdad.
 * comps = [{ m2_const, precio }]
 * Retorna { valor, confianza, cv, nComps, pm2cAvg }
 */
function metodoRomina(prop, comps) {
    if (!comps || !comps.length || !prop.construccion) {
        return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
    }
    const validos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
    if (!validos.length) return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };

    const pm2c     = validos.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));

    const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);

    let suma = 0;
    compsFilt.forEach(c => {
        const pu        = c.precio / c.m2_const;
        const factorSup = Math.pow(c.m2_const / prop.construccion, 1/6);
        suma += pu * factorSup * factorEdad;
    });

    const pm2cAvg = suma / compsFilt.length;
    const valor   = Math.round(pm2cAvg * prop.construccion);

    // Coeficiente de variación
    const mean   = avg(pm2cFilt);
    const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
    const cv     = mean > 0 ? stddev / mean : 1;

    // Score de confianza por zona
    const pm2cImplicito = prop.valorReal > 0 ? prop.valorReal / prop.construccion : 0;
    const ratioZona     = pm2cImplicito > 0 ? mean / pm2cImplicito : 1;
    const confianza     = ratioZona > 1.40 || ratioZona < 0.70 ? 'BAJA'
                        : ratioZona > 1.20 || ratioZona < 0.85 ? 'MEDIA' : 'ALTA';

    return { valor, confianza, cv: cv.toFixed(2), nComps: compsFilt.length, pm2cAvg: Math.round(mean) };
}

// ── buscar comparables en cache local (cache_consolidado.json) ───────────────

const CACHE_PATH = require('path').join(__dirname, 'cache_consolidado.json');
let _cacheLocal = null;

function cargarCacheLocal() {
    if (_cacheLocal) return _cacheLocal;
    if (!require('fs').existsSync(CACHE_PATH)) {
        console.log('  [Cache] cache_consolidado.json no encontrado — correr: node actualizar_cache_consolidado.js');
        return [];
    }
    const { meta, datos } = JSON.parse(require('fs').readFileSync(CACHE_PATH, 'utf8'));
    console.log(`  [Cache] ${datos.length.toLocaleString()} comps cargados (actualizado: ${meta.fecha_actualizacion.slice(0,10)})`);
    _cacheLocal = datos;
    return datos;
}

async function buscarCompsEnScraper(_sheets, zona, prop) {
    const tipoNorm  = normalizaTipo(prop.tipo);
    const datos     = cargarCacheLocal();
    const todos     = [];
    const colNorm   = normalizarColonia(zona.colonia);
    const similares = colNorm ? getColoniasSimilares(colNorm) : [];

    if (similares.length > 0) {
        console.log(`   [NSE] Colonias similares: ${similares.slice(0,3).join(', ')}${similares.length > 3 ? '...' : ''}`);
    }

    for (const d of datos) {
        // Cache ya tiene: solo venta, activos, m2c>0, precio>=100k
        if (!d.mu.includes(zona.municipio)) continue;
        if (normalizaTipo(d.tp) !== tipoNorm) continue;

        const areaRef = prop.construccion > 0 ? prop.construccion : prop.terreno;

        // Área ±50%
        if (areaRef > 0 && (d.c < areaRef * 0.50 || d.c > areaRef * 1.50)) continue;

        // CUS ±35%
        if (prop.construccion > 0 && prop.terreno > 0 && d.t > 0) {
            const cusSubj = prop.construccion / prop.terreno;
            const cusComp = d.c / d.t;
            if (Math.abs(cusComp - cusSubj) / Math.max(cusSubj, 0.01) > 0.35) continue;
        }

        // Recámaras ±1 (solo si el sujeto y el comp tienen el dato)
        if (prop.recamaras && d.re) {
            if (Math.abs(d.re - prop.recamaras) > 1) continue;
        }

        // Baños ±1 (solo si ambos tienen el dato)
        if (prop.banos && d.ba) {
            if (Math.abs(d.ba - prop.banos) > 1) continue;
        }

        // Score compuesto: similitud de área + bonus de colonia (exacta o NSE-similar) + espacios
        let score = areaRef > 0 ? 1 - Math.abs(d.c - areaRef) / Math.max(d.c, areaRef) : 0;
        const dColNorm = normalizarColonia(d.co);
        if (colNorm && dColNorm) {
            if (dColNorm.includes(colNorm) || colNorm.includes(dColNorm)) {
                score += 0.5; // colonia exacta
            } else if (similares.some(s => dColNorm.includes(s) || s.includes(dColNorm))) {
                score += 0.25; // colonia NSE-similar según el perito
            }
        }
        if (prop.recamaras && d.re && d.re === prop.recamaras) score += 0.2;
        if (prop.banos && d.ba && Math.abs(d.ba - prop.banos) <= 0.5) score += 0.1;

        todos.push({ precio: d.p, m2_const: d.c, m2_terreno: d.t, colonia: d.co, municipio: d.mu, score });
    }

    todos.sort((a, b) => b.score - a.score);

    // Deduplicar: si dos comps tienen el mismo precio y m²C (±2%) son el mismo anuncio en portales distintos
    const dedup = [];
    for (const c of todos) {
        const isDup = dedup.some(d =>
            Math.abs(d.precio - c.precio) / Math.max(d.precio, 1) < 0.02 &&
            Math.abs(d.m2_const - c.m2_const) / Math.max(d.m2_const, 1) < 0.02
        );
        if (!isDup) dedup.push(c);
    }
    return dedup.slice(0, 10);
}

// ── buscar comparables vía Gemini + Google Search ────────────────────────────

async function buscarCompsGemini(prop, zona) {
    const MODELOS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    const colNormG   = normalizarColonia(zona.colonia);
    const similaresG = colNormG ? getColoniasSimilares(colNormG, 3) : [];
    const zonaStr = zona.colonia
        ? `colonia ${zona.colonia}, ${zona.municipio} Jalisco`
        : `${zona.municipio} Jalisco`;
    const zonasAlt = similaresG.length > 0
        ? `Colonias de nivel socioeconómico similar validadas: ${similaresG.join(', ')}.`
        : '';

    const recStr = prop.recamaras
        ? `${prop.recamaras} recámaras (acepta entre ${Math.max(1, prop.recamaras - 1)} y ${prop.recamaras + 1})`
        : 'sin restricción de recámaras';
    const banosStr = prop.banos
        ? `${prop.banos} baños (acepta entre ${Math.max(1, prop.banos - 1)} y ${prop.banos + 1})`
        : '';

    const prompt = `Busca casas en venta en ${zonaStr} en sitios como inmuebles24.com, propiedades.com, casasyterrenos.com o vivanuncios.com.

Propiedad sujeto: casa de ${prop.construccion} m² de construcción, ${recStr}${banosStr ? ', ' + banosStr : ''}, en ${zonaStr}.

Encuentra entre 3 y 6 casas en venta en esa zona o colonias vecinas de nivel socioeconómico similar.

Responde SOLO con este JSON, sin explicaciones ni markdown:
{
  "comparables": [
    {"colonia": "...", "precio": 0000000, "m2c": 000, "recamaras": 0, "url": "..."},
    ...
  ]
}

Reglas:
- precio: número entero en pesos MXN
- m2c: metros cuadrados de construcción (obligatorio, mayor a 0)
- recamaras: número de recámaras del comparable (0 si no se confirma)
- Los comparables deben tener entre ${Math.round(prop.construccion * 0.6)} y ${Math.round(prop.construccion * 1.6)} m² de construcción
- ${prop.recamaras ? `Priorizar propiedades con ${recStr}` : 'Incluir propiedades de tamaño similar'}
- ${zonasAlt || 'Si la colonia exacta no tiene oferta, usa colonias vecinas de nivel socioeconómico similar'}
- Omite propiedades sin m2c confirmado
- No repitas el mismo inmueble dos veces`;

    let lastError = null;
    for (const modelName of MODELOS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, tools: [{ googleSearch: {} }] });
            const result = await model.generateContent(prompt);
            const text   = result.response.text();
            const match  = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
            if (!match) {
                console.log(`  [Gemini/${modelName}] Sin JSON válido.`);
                continue;
            }
            const parsed = JSON.parse(match[0]);
            const raw = (parsed.comparables || [])
                .map(c => ({
                    m2_const: cleanNum(c.m2c),
                    precio:   cleanNum(c.precio),
                    colonia:  c.colonia || '',
                }))
                .filter(c => c.m2_const > 0 && c.precio > 100000
                          && c.m2_const >= prop.construccion * 0.5
                          && c.m2_const <= prop.construccion * 1.6);
            // Anti-outlier ±40% de mediana en $/m²C
            if (raw.length >= 3) {
                const pm2s = raw.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
                const med  = pm2s[Math.floor(pm2s.length / 2)];
                return raw.filter(c => {
                    const r = (c.precio / c.m2_const) / med;
                    return r >= 0.60 && r <= 1.60;
                });
            }
            return raw;
        } catch(e) {
            lastError = e;
            const is503 = e.message && e.message.includes('503');
            console.log(`  [Gemini/${modelName}] ${is503 ? '503 — probando modelo alternativo...' : 'Error: ' + e.message}`);
            if (is503) {
                await new Promise(r => setTimeout(r, 8000));
                continue;
            }
            break;
        }
    }
    if (lastError) console.log(`  [Gemini] Todos los modelos fallaron.`);
    return [];
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
    const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

    // Filtrar: AMG 2026, casas con valor y m²C (excluye ejidales y uso mixto)
    const validos = cerebro.filter(d => {
        if (!d.fileName || !d.fileName.includes('-26-')) return false;
        if (!d.valorMercado || d.valorMercado === 'No hallado') return false;
        if (cleanNum(d.valorMercado) <= 0 || cleanNum(d.m2Construccion) <= 0) return false;
        if (!d.comparables || d.comparables.length < 3) return false;
        const tipo = (d.tipo || '').toUpperCase();
        if (tipo.includes('EJIDAL') || tipo.includes('LOCAL') || tipo.includes('TERRENO')) return false;
        if (!tipo.includes('CASA')) return false;
        const nombre = d.fileName.toLowerCase();
        return MUNICIPIOS_AMG.some(m => nombre.includes(m) || (d.direccion||'').toLowerCase().includes(m));
    }).slice(0, MAX_AVALUOS);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  Romina con Fallback Gemini — ${validos.length} avalúos AMG`);
    console.log(`${'='.repeat(70)}\n`);

    const auth   = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    const rows = [[
        'Archivo', 'M2C', 'M2T', 'Edad', 'Perito',
        'Beta-OPI', 'Dif%',
        'Romina-Scraper', 'Dif%', 'Confianza', 'CV', 'N-Comps', '$/m²C scraper',
        'Romina-Gemini',  'Dif%', 'N-Comps Gemini', '$/m²C gemini',
        'Romina-FINAL',   'Dif% FINAL', 'Fuente FINAL',
        '#CompsOPI'
    ]];

    let geminiCalls = 0;

    for (const d of validos) {
        const edad = cleanNum(d.edad) || 10;
        const prop = {
            tipo:         d.tipo || 'CASA HABITACIÓN',
            terreno:      cleanNum(d.m2Terreno),
            construccion: cleanNum(d.m2Construccion),
            valorReal:    cleanNum(d.valorMercado),
            edad,
            compsOPI:     d.comparables || [],
            recamaras:    d.recamaras || null,
            banos:        d.banos     || null,
            estacionamientos: d.estacionamientos || null,
        };

        console.log(`\n📍 ${d.fileName}`);
        console.log(`   ${prop.tipo} | m²C:${prop.construccion} | m²T:${prop.terreno} | Edad:${edad} | Perito:${MXN(prop.valorReal)}`);

        const zona = extraerZona(d.fileName);
        console.log(`   ${prop.recamaras||'?'}rec ${prop.banos||'?'}baños ${prop.estacionamientos||'?'}est | Zona: municipio="${zona.municipio}" colonia="${zona.colonia}"`);

        // ── 1. Buscar en scraper ──────────────────────────────────────────────
        const compsScraper = await buscarCompsEnScraper(sheets, zona, prop);
        const rominaScraper = metodoRomina(prop, compsScraper);

        console.log(`   [Scraper] ${compsScraper.length} comps | Romina:${MXN(rominaScraper.valor)} (${dif(rominaScraper.valor, prop.valorReal)}) | Confianza:${rominaScraper.confianza}`);
        if (compsScraper.length > 0) {
            console.log(`   [Scraper] $/m²C comps: ${compsScraper.slice(0,5).map(c => Math.round(c.precio/c.m2_const).toLocaleString()).join(', ')}`);
        }

        // ── 2. Fallback Gemini si confianza BAJA o pocos comps ───────────────
        let rominaGemini  = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
        const necesitaGemini = rominaScraper.confianza === 'BAJA' || rominaScraper.nComps < 3;

        if (necesitaGemini) {
            console.log(`   [Gemini] Activando fallback (confianza=${rominaScraper.confianza}, n=${rominaScraper.nComps})...`);
            if (geminiCalls > 0) await sleep(10000); // respetar rate limit y dar tiempo entre modelos
            geminiCalls++;
            const compsGemini = await buscarCompsGemini(prop, zona);
            rominaGemini = metodoRomina(prop, compsGemini);
            console.log(`   [Gemini] ${compsGemini.length} comps | Romina:${MXN(rominaGemini.valor)} (${dif(rominaGemini.valor, prop.valorReal)})`);
            if (compsGemini.length > 0) {
                console.log(`   [Gemini] $/m²C comps: ${compsGemini.map(c => Math.round(c.precio/c.m2_const).toLocaleString()).join(', ')}`);
            }
        }

        // ── 3. Elegir mejor fuente ────────────────────────────────────────────
        let rominaFinal, fuente;
        if (!necesitaGemini) {
            rominaFinal = rominaScraper;
            fuente = 'SCRAPER';
        } else if (rominaGemini.nComps >= 3 && (rominaScraper.nComps < 3 || rominaScraper.confianza === 'BAJA')) {
            rominaFinal = rominaGemini;
            fuente = 'GEMINI';
        } else if (rominaScraper.confianza === 'BAJA' && rominaGemini.nComps < 3) {
            // BAJA + sin Gemini = no confiable, no mostrar valor final
            rominaFinal = { valor: 0, confianza: 'BAJA', nComps: rominaScraper.nComps };
            fuente = 'REVISAR (BAJA + sin Gemini)';
        } else if (rominaScraper.nComps >= rominaGemini.nComps) {
            rominaFinal = rominaScraper;
            fuente = 'SCRAPER';
        } else {
            rominaFinal = rominaGemini;
            fuente = 'GEMINI';
        }

        // ── 4. Beta-OPI ───────────────────────────────────────────────────────
        const betaOPI = Math.round(metodoBetaOPI(prop));

        console.log(`   Beta-OPI:     ${MXN(betaOPI)} (${dif(betaOPI, prop.valorReal)})`);
        console.log(`   Romina-FINAL: ${MXN(rominaFinal.valor)} (${dif(rominaFinal.valor, prop.valorReal)}) ← ${fuente}`);

        rows.push([
            d.fileName, prop.construccion, prop.terreno, edad, prop.valorReal,
            betaOPI || 'N/A', dif(betaOPI, prop.valorReal),
            rominaScraper.valor || 'N/A', dif(rominaScraper.valor, prop.valorReal),
            rominaScraper.confianza, rominaScraper.cv, rominaScraper.nComps, rominaScraper.pm2cAvg || '',
            rominaGemini.valor  || 'N/A', dif(rominaGemini.valor, prop.valorReal),
            rominaGemini.nComps || '', rominaGemini.pm2cAvg || '',
            rominaFinal.valor  || 'N/A', dif(rominaFinal.valor, prop.valorReal), fuente,
            prop.compsOPI.length
        ]);
    }

    // ── Resumen ───────────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(70)}`);
    const resultados = rows.slice(1);
    const revisables = resultados.filter(r => (r[19] || '').toString().includes('REVISAR'));
    const evaluables = resultados.filter(r => !(r[19] || '').toString().includes('REVISAR'));
    const dentro = evaluables.filter(r => {
        const d = parseFloat((r[18] || '').toString().replace('%',''));
        return !isNaN(d) && Math.abs(d) <= 20;
    });
    console.log(`  Dentro de ±20%: ${dentro.length}/${evaluables.length} evaluables  (${revisables.length} sin valor confiable)`);
    const errs = evaluables.map(r => Math.abs(parseFloat((r[18] || '0%').toString().replace('%','')))).filter(x => !isNaN(x));
    if (errs.length) console.log(`  Error promedio (evaluables):  ${(errs.reduce((a,b)=>a+b,0)/errs.length).toFixed(1)}%`);
    console.log(`${'='.repeat(70)}\n`);

    // ── Exportar a Sheets ─────────────────────────────────────────────────────
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SALIDA_SHEET_ID });
        const tabExiste = meta.data.sheets.some(s => s.properties.title === 'Comparativa Metodologias');
        if (!tabExiste) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SALIDA_SHEET_ID,
                resource: { requests: [{ addSheet: { properties: { title: 'Comparativa Metodologias' } } }] }
            });
        }
        await sheets.spreadsheets.values.update({
            spreadsheetId: SALIDA_SHEET_ID,
            range: 'Comparativa Metodologias!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        });
        console.log(`Exportado: https://docs.google.com/spreadsheets/d/${SALIDA_SHEET_ID}`);
    } catch(e) {
        console.error('Error exportando:', e.message);
    }
}

main().catch(console.error);
