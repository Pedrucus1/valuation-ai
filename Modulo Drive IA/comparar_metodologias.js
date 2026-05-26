/**
 * comparar_metodologias.js
 *
 * Para cada avalúo:
 *  1. Busca comparables en CONSOLIDADO del scraper (filtro por municipio + colonia)
 *  2. Si confianza=BAJA o nComps<3 → fallback automático a Gemini+GoogleSearch
 *  3. Corre remi con la mejor fuente disponible
 *  4. Exporta a Google Sheets "Comparativa Metodologias"
 */

require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

// DeepSeek: procesamiento pesado (comparable-finding, primario)
const deepseekClient = process.env.DEEPSEEK_API_KEY
    ? new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' })
    : null;
// Claude Code (esta sesión) actúa como auditor leyendo anomalias.json al terminar

const GEMINI_CACHE_PATH = require('path').join(__dirname, 'gemini_cache.json');
let _geminiCache = null;
function cargarGeminiCache() {
    if (_geminiCache) return _geminiCache;
    _geminiCache = fs.existsSync(GEMINI_CACHE_PATH)
        ? JSON.parse(fs.readFileSync(GEMINI_CACHE_PATH, 'utf8'))
        : {};
    console.log(`  [GeminiCache] ${Object.keys(_geminiCache).length} entradas cargadas`);
    return _geminiCache;
}
function guardarGeminiCache() {
    fs.writeFileSync(GEMINI_CACHE_PATH, JSON.stringify(_geminiCache, null, 2));
}

const SCRAPER_SHEET_ID = '1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE';

// Mapa de colonias similares por NSE — construido de 917 avalúos del perito
const COLONIAS_SIMILARES_PATH = require('path').join(__dirname, 'colonias_similares.json');
const _coloniasSimilares = require('fs').existsSync(COLONIAS_SIMILARES_PATH)
    ? JSON.parse(require('fs').readFileSync(COLONIAS_SIMILARES_PATH, 'utf8'))
    : {};

// Clasificación NSE de colonias derivada del cache ($/m²C mediano)
const COLONIAS_NSE_PATH = require('path').join(__dirname, 'colonias_nse.json');
const _coloniasNSE = require('fs').existsSync(COLONIAS_NSE_PATH)
    ? JSON.parse(require('fs').readFileSync(COLONIAS_NSE_PATH, 'utf8'))
    : {};

const NSE_CATEGORIAS = [
    { idx: 0, nombre: 'economico'      },
    { idx: 1, nombre: 'interes-social' },
    { idx: 2, nombre: 'medio-bajo'     },
    { idx: 3, nombre: 'medio-medio'    },
    { idx: 4, nombre: 'medio-alto'     },
    { idx: 5, nombre: 'lujo'           },
    { idx: 6, nombre: 'super-lujo'     },
];

function getNSEColonia(colNorm) {
    return _coloniasNSE[colNorm] || null;
}

// Factores de depreciación por estado de conservación
// bueno=1.0 como referencia (los comps del scraper son mayoritariamente "bueno")
// Escala de 5% por estado, igual que tabla del perito
const FACTORES_CONSERVACION = {
    nuevo:         1.05,
    muy_bueno:     1.05,
    bueno:         1.00,
    regular_bueno: 0.85,
    regular_medio: 0.75,
    regular_malo:  0.65,
    malo:          0.55,
    muy_malo:      0.45,
};

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
    // Colonias cuyo municipio no aparece en el nombre del archivo
    const COLONIA_MUNICIPIO = { 'paseo del prado': 'tlaquepaque', 'santa anita': 'tlajomulco' };
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
    // Municipio desde colonia conocida (cuando no aparece en el nombre del archivo)
    if (!municipio && colonia) {
        const colNorm = normalizarColonia(colonia);
        if (COLONIA_MUNICIPIO[colNorm]) municipio = COLONIA_MUNICIPIO[colNorm];
    }

    // Fallback: cuando colonia vacía, buscar si alguna colonia conocida en NSE aparece en el nombre de archivo
    if (!colonia && Object.keys(_coloniasNSE).length > 0) {
        const fnNorm = normalizarColonia(fileName);
        // Solo buscar colonias con ≥3 chars que aparezcan como palabra completa en el nombre
        const encontrada = Object.keys(_coloniasNSE).find(col =>
            col.length >= 4 && new RegExp(`\\b${col.replace(/\s+/g, '\\s+')}\\b`).test(fnNorm)
        );
        if (encontrada) colonia = encontrada;
    }

    return { municipio, colonia };
}

// ── métodos de valuación ─────────────────────────────────────────────────────

function metodoBetaOPI(prop, zona = {}) {
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
    // Piso dinámico: evita depreciar la construcción casi a cero en casas viejas bien conservadas
    const PISOS_RH = { bueno: 0.55, regular_bueno: 0.48, regular_medio: 0.35, regular_bajo: 0.28, malo: 0.20 };
    const pisoRH   = PISOS_RH[prop.estadoConservacion] ?? 0.35;
    const factorRH = Math.max(pisoRH, getRH(prop.edad) / getRH(10));
    const factorNeg = 0.95;
    const areaRef   = compsURL.length ? avg(compsURL.map(c => cleanNum(c.terreno))) : 0;
    const factorSup = (areaRef > 0 && prop.terreno > 0) ? Math.pow(areaRef / prop.terreno, 1/6) : 1.0;
    // pm2T: avg sin antiRemate — lotes grandes tienen $/m²T bajo (escala), no son outliers falsos
    const pm2T = avg(compsURL.map(c => cleanNum(c.precio) / cleanNum(c.terreno)));
    const pm2C = avg(antiRemate(compsPm2.map(c => cleanNum(c.link))));

    // Obsolescencia urbana en terreno: cuando la propiedad es antigua y tiene baja densidad
    // (CUS < 0.85), los comps de terreno suelen ser lotes de desarrollo sobrevaluados vs
    // el uso residencial real. No aplica a construcciones densas (CUS alto) como Santa María.
    const cusProp = prop.construccion > 0 && prop.terreno > 0 ? prop.construccion / prop.terreno : 1.0;
    const factorObsTerreno = (prop.edad > 30 && cusProp < 0.85 && compsURL.length >= 3)
        ? Math.max(0.70, 1 - (prop.edad - 30) * 0.008)
        : 1.0;

    // Terreno: factorNeg=0.95 (precio oferta → precio venta, factor "OTRO" de la tabla perito)
    // Factor Comercial de construcción: 10-20% según perito. Graduado por edad — en casas
    // recientes el costo BIMSA ya refleja el mercado; en casas antiguas compensa la depreciación.
    const FACTOR_COMERCIAL = prop.edad > 35 ? 1.20 : prop.edad > 20 ? 1.10 : 1.05;
    if (pm2C && pm2T) return pm2T * prop.terreno * factorSup * factorNeg * factorObsTerreno + pm2C * prop.construccion * factorRH * FACTOR_COMERCIAL;
    if (pm2C)         return pm2C * prop.construccion * factorRH * FACTOR_COMERCIAL + (prop.terreno ? pm2C * prop.terreno * 0.60 * factorNeg : 0);
    if (pm2T)         return pm2T * prop.terreno * factorSup * factorNeg + pm2T * prop.construccion * factorRH * 0.50 * FACTOR_COMERCIAL;
    return 0;
}

/**
 * remi: Homologación Directa $/m²C con factorSup y factorEdad.
 * comps = [{ m2_const, precio }]
 * Retorna { valor, confianza, cv, nComps, pm2cAvg }
 */
// poolTipo: 'exacta' | 'similares' | 'general'
// - exacta:   mismo fraccionamiento/era → factorEdad=1.0
// - similares: zona similar → mitad del ajuste
// - general:  municipio amplio → ajuste completo
function metodoremi(prop, comps, poolTipo = 'general') {
    if (!comps || !comps.length || !prop.construccion) {
        return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
    }
    const validos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
    if (!validos.length) return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };

    const pm2c     = validos.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));

    const edad = prop.edad || 0;
    const factorEdad = poolTipo === 'exacta'   ? 1.0
                     : poolTipo === 'similares' ? Math.max(0.85, 1 - (edad - 10) * 0.005)
                     :                            Math.max(0.70, 1 - (edad - 10) * 0.01);
    const factorConservacion = FACTORES_CONSERVACION[prop.estadoConservacion] || 1.00;
    const factorNeg          = 0.95; // precio oferta → precio cierre

    let suma = 0;
    compsFilt.forEach(c => {
        const pu        = c.precio / c.m2_const;
        const factorSup = Math.pow(c.m2_const / prop.construccion, 1/6);
        suma += pu * factorSup * factorEdad * factorConservacion;
    });

    const pm2cAvg = suma / compsFilt.length;
    const valor   = Math.round(pm2cAvg * prop.construccion * factorNeg);

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

// ── cache_index.json (1.6MB vs 50MB de cache_consolidado) ────────────────────

const INDEX_PATH = require('path').join(__dirname, 'cache_index.json');
let _idx = null;

function cargarIdx() {
    if (_idx) return _idx;
    if (!require('fs').existsSync(INDEX_PATH)) {
        console.log('  [Cache] cache_index.json no encontrado — correr: node build_cache_index.js');
        return {};
    }
    _idx = JSON.parse(require('fs').readFileSync(INDEX_PATH, 'utf8'));
    const meta = _idx._meta || {};
    console.log(`  [Cache] cache_index: ${(meta.totalListings||0).toLocaleString()} comps, ${(meta.totalColonias||0).toLocaleString()} colonias`);
    return _idx;
}

function normMuni(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/^san pedro /, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z.niga/, 'tlajomulco');
}

// Mapeo tipo normalizado → clave en cache_index
const TIPO_IDX = { 'departamento': 'depto' };
function tipoIdx(tipoNorm) { return TIPO_IDX[tipoNorm] || tipoNorm; }

// Devuelve todos los listings del municipio+tipo como array plano con {p,c,t,co}
function listingsEnMuni(muniNorm, tipoNorm) {
    const idx = cargarIdx();
    const colonias = idx[muniNorm]?.[tipoIdx(tipoNorm)] ?? {};
    const out = [];
    for (const [col, data] of Object.entries(colonias)) {
        for (const l of data.listings) {
            out.push({ p: l.p, c: l.c, t: l.t || 0, co: col, mu: muniNorm });
        }
    }
    return out;
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function deduplicar(arr) {
    const out = [];
    for (const c of arr) {
        const dup = out.some(d =>
            Math.abs(d.precio - c.precio) / Math.max(d.precio, 1) < 0.02 &&
            Math.abs(d.m2_const - c.m2_const) / Math.max(d.m2_const, 1) < 0.02
        );
        if (!dup) out.push(c);
    }
    return out;
}

function puntuar(candidatos, prop, colNorm, similares) {
    return candidatos.map(d => {
        const dColNorm = normalizarColonia(d.co);

        // Score base: similitud de m²C (0–1)
        let score = prop.construccion > 0
            ? 1 - Math.abs(d.c - prop.construccion) / Math.max(d.c, prop.construccion)
            : 0;

        // Colonia (exacta +0.50, NSE-similar +0.25)
        if (colNorm && dColNorm) {
            if (dColNorm.includes(colNorm) || colNorm.includes(dColNorm)) score += 0.50;
            else if (similares.some(s => dColNorm.includes(s) || s.includes(dColNorm))) score += 0.25;
        }

        // CUS — bonus suave por similitud de densidad
        if (prop.construccion > 0 && prop.terreno > 0 && d.t > 0) {
            const cusSubj = prop.construccion / prop.terreno;
            const cusComp = d.c / d.t;
            const difCUS  = Math.abs(cusComp - cusSubj) / Math.max(cusSubj, 0.01);
            if (difCUS < 0.20)      score += 0.30;
            else if (difCUS < 0.35) score += 0.15;
        }

        // Recámaras — soft: bonus si coincide, penalización suave si difiere mucho
        if (prop.recamaras && d.re) {
            const difRec = Math.abs(d.re - prop.recamaras);
            if (difRec === 0)      score += 0.20;
            else if (difRec === 1) score += 0.10;
            else if (difRec >= 3)  score -= 0.15;
        }

        // Baños — soft
        if (prop.banos && d.ba) {
            if (Math.abs(d.ba - prop.banos) <= 0.5) score += 0.10;
        }

        return { precio: d.p, m2_const: d.c, m2_terreno: d.t, colonia: d.co, municipio: d.mu, score };
    }).sort((a, b) => b.score - a.score);
}

async function buscarCompsEnScraper(_sheets, zona, prop) {
    const tipoNorm  = normalizaTipo(prop.tipo);
    const colNorm   = normalizarColonia(zona.colonia);
    const muniNorm  = normMuni(zona.municipio || '');

    // NSE del sujeto — filtra colonias similares a ±1 nivel
    const nseSubjeto = colNorm ? getNSEColonia(colNorm) : null;

    const similaresBrutos = colNorm ? getColoniasSimilares(colNorm) : [];
    const similares = nseSubjeto
        ? similaresBrutos.filter(s => {
            const nseS = getNSEColonia(normalizarColonia(s));
            if (!nseS) return true; // sin datos → incluir por defecto
            return Math.abs(nseS.nseIdx - nseSubjeto.nseIdx) <= 1;
          })
        : similaresBrutos;

    if (nseSubjeto) {
        console.log(`   [NSE] Sujeto: ${nseSubjeto.nse} (idx ${nseSubjeto.nseIdx}) | med $/m²C zona: ${nseSubjeto.medianaPm2.toLocaleString()}`);
    }
    if (similares.length > 0) {
        console.log(`   [NSE] Colonias similares (±1 NSE): ${similares.slice(0,3).join(', ')}${similares.length > 3 ? '...' : ''}`);
    }

    // ── PASO 1: determinar la banda de precio de la ZONA ─────────────────────
    const todosEnMunicipio = listingsEnMuni(muniNorm, tipoNorm);

    // Comps en colonia exacta (cualquier tamaño) para derivar banda de precio
    const enColoniaTodos = colNorm
        ? todosEnMunicipio.filter(d => {
            const dc = normalizarColonia(d.co);
            return dc.includes(colNorm) || colNorm.includes(dc);
        })
        : [];

    // Comps en NSE-similares (cualquier tamaño)
    const enNSETodos = similares.length > 0
        ? todosEnMunicipio.filter(d => {
            const dc = normalizarColonia(d.co);
            return similares.some(s => dc.includes(s) || s.includes(dc));
        })
        : [];

    // Fuente para calcular banda: colonia exacta si tiene ≥5, si no agregar NSE
    const fuenteBanda = enColoniaTodos.length >= 5
        ? enColoniaTodos
        : [...enColoniaTodos, ...enNSETodos];

    const pm2sBanda = fuenteBanda.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    const medBanda  = mediana(pm2sBanda);

    // Si no hay datos de zona, usar todo el municipio como referencia
    const pm2sRef   = pm2sBanda.length >= 3 ? pm2sBanda
                    : todosEnMunicipio.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    const medRef    = pm2sBanda.length >= 3 ? medBanda : mediana(pm2sRef);

    // Banda de precio: ±60% de la mediana de la zona
    const bandaMin = medRef * 0.40;
    const bandaMax = medRef * 1.60;

    console.log(`   [Zona] med $/m²C zona:${Math.round(medRef).toLocaleString()} | banda:[${Math.round(bandaMin).toLocaleString()} – ${Math.round(bandaMax).toLocaleString()}] (fuente:${fuenteBanda.length >= 5 ? 'colonia' : pm2sBanda.length >= 3 ? 'colonia+NSE' : 'municipio'})`);

    // Escalafón de m²C: segmentos de mercado distintos (definición del perito)
    const m2C  = prop.construccion || 0;
    const tierLo = m2C <= 62  ? 30  : m2C <= 100 ? 52  : m2C <= 145 ? 88  : m2C <= 200 ? 125 : 170;
    const tierHi = m2C <= 62  ? 72  : m2C <= 100 ? 112 : m2C <= 145 ? 162 : m2C <= 200 ? 225 : 9999;
    const inTier = c => c >= tierLo && c <= tierHi;

    // ── PASO 2: pool de candidatos = municipio + tipo + m²C ±50% + dentro de banda ──
    const pool = todosEnMunicipio.filter(d => {
        if (m2C > 0 && Math.abs(d.c - m2C) / Math.max(d.c, m2C) >= 0.50) return false;
        const pm2 = d.p / d.c;
        return pm2 >= bandaMin && pm2 <= bandaMax;
    });

    // Deduplicar pool: mismo precio ±2% y mismo m²C → mismo anuncio en varios portales
    const poolDedup = deduplicar(pool);

    // ── PASO 3: cascada colonia exacta → colonias similares → municipio ─────
    const enColonia = colNorm
        ? poolDedup.filter(d => {
            const dc = normalizarColonia(d.co);
            if (!dc || dc.length < 5) return false;
            const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
            return ratio >= 0.55 && (dc.includes(colNorm) || colNorm.includes(dc));
        })
        : [];

    let candidatos = puntuar(enColonia, prop, colNorm, similares);
    let poolTipo = 'exacta';

    // Si <3 en colonia exacta → agregar colonias similares
    if (candidatos.length < 3 && similares.length > 0) {
        const enNSE = poolDedup.filter(d => {
            const dc = normalizarColonia(d.co);
            if (!dc || dc.length < 4) return false;
            if (colNorm && (dc.includes(colNorm) || colNorm.includes(dc))) return false;
            // Solo dc.includes(s) — evita que "guadalajara centro" capture toda la ciudad
            return similares.some(s => s.length >= 4 && dc.includes(normalizarColonia(s)));
        });
        if (enNSE.length > 0) {
            console.log(`   [Cascada] +${enNSE.length} comps similares`);
            candidatos = puntuar([...enColonia, ...enNSE], prop, colNorm, similares);
            poolTipo = 'similares';
        }
    }

    // Si <3 → todo el municipio dentro de la banda
    if (candidatos.length < 3) {
        console.log(`   [Cascada] <3 → municipio (banda de precio)`);
        candidatos = puntuar(poolDedup, prop, colNorm, similares);
        poolTipo = 'general';
    }

    const scored = candidatos.sort((a, b) => b.score - a.score).slice(0, 10);

    // Filtro post-scoring por escalafón: usar solo comps del mismo tier si hay ≥3
    const enTier  = scored.filter(d => inTier(d.m2_const));
    const comps   = enTier.length >= 3 ? enTier : scored;

    // Mediana de m²C en la zona (para detección de propiedad atípica)
    // Requiere ≥5 muestras para ser confiable
    const m2cZona = (enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos])
        .map(d => d.c).filter(v => v > 5 && v < 2000); // filtrar valores absurdos
    const medM2CZona = m2cZona.length >= 5 ? mediana(m2cZona) : 0;

    return { comps, poolTipo, medM2CZona, medPm2Zona: medRef };
}

// ── buscar comparables vía Gemini + Google Search (con cache local) ──────────

function geminiCacheKey(zona, prop) {
    const col    = normalizarColonia(zona.colonia) || normalizarColonia(zona.municipio);
    const bucket = Math.round(prop.construccion / 20) * 20; // agrupa en rangos de ±10m²
    const rec    = prop.recamaras ? `_${prop.recamaras}rec` : '';
    return `${col}_${bucket}m2${rec}`;
}

async function buscarCompsGemini(prop, zona) {
    const cache = cargarGeminiCache();
    const key   = geminiCacheKey(zona, prop);

    if (cache[key]) {
        console.log(`  [GeminiCache] HIT: "${key}" (${cache[key].comps.length} comps)`);
        return cache[key].comps;
    }

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
            const model  = genAI.getGenerativeModel({ model: modelName, tools: [{ googleSearch: {} }] });
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
            let final = raw;
            if (raw.length >= 3) {
                const pm2s = raw.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
                const med  = pm2s[Math.floor(pm2s.length / 2)];
                final = raw.filter(c => {
                    const r = (c.precio / c.m2_const) / med;
                    return r >= 0.60 && r <= 1.60;
                });
            }

            // Guardar en cache si se obtuvieron comps
            if (final.length > 0) {
                cache[key] = { comps: final, fecha: new Date().toISOString(), zona: zonaStr };
                guardarGeminiCache();
                console.log(`  [GeminiCache] MISS → guardado: "${key}"`);
            }
            return final;

        } catch(e) {
            lastError = e;
            const is503 = e.message && e.message.includes('503');
            const is429 = e.message && (e.message.includes('429') || e.message.includes('quota') || e.message.includes('RESOURCE_EXHAUSTED'));
            if (is429) {
                console.log(`  [Gemini/${modelName}] Quota agotada — probando modelo alternativo...`);
                await sleep(5000);
                continue;
            }
            console.log(`  [Gemini/${modelName}] ${is503 ? '503 — reintentando...' : 'Error: ' + e.message}`);
            if (is503) { await sleep(8000); continue; }
            break;
        }
    }
    if (lastError) console.log(`  [Gemini] Todos los modelos fallaron.`);
    return [];
}

/**
 * Serper.dev — Google Search real-time para listings inmobiliarios.
 * Usa SERPER_API_KEY (ya en .env). Sin setup de CSE requerido.
 * Busca en casasyterrenos.com, inmuebles24.com, propiedades.com, vivanuncios.
 * Free tier: 2,500 queries incluidas.
 */
async function buscarCompsGoogleSearch(prop, zona) {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        console.log('  [GoogleSearch] Sin SERPER_API_KEY — omitiendo.');
        return [];
    }

    const cache  = cargarGeminiCache();
    const keyGS  = `gs_${geminiCacheKey(zona, prop)}`;
    if (cache[keyGS]) {
        console.log(`  [GoogleSearch] Cache HIT: "${keyGS}" (${cache[keyGS].comps.length} comps)`);
        return cache[keyGS].comps;
    }

    const colonia   = zona.colonia || zona.municipio || '';
    const municipio = zona.municipio || '';
    const tipo      = prop.tipo === 'departamento' ? 'departamento' : 'casa';
    const m2C       = prop.construccion;

    // Restringir a portales de confianza
    const sitios = 'site:casasyterrenos.com OR site:inmuebles24.com OR site:propiedades.com OR site:vivanuncios.com.mx';
    const query  = `${tipo} en venta ${colonia} ${municipio} Jalisco (${sitios})`;
    console.log(`  [GoogleSearch] Query: "${query.slice(0,80)}..."`);

    try {
        const https = require('https');
        const body  = JSON.stringify({ q: query, gl: 'mx', hl: 'es', num: 10 });
        const data  = await new Promise((res, rej) => {
            const req = https.request({
                hostname: 'google.serper.dev', path: '/search', method: 'POST',
                headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            }, r => {
                let out = '';
                r.on('data', d => out += d);
                r.on('end', () => { try { res(JSON.parse(out)); } catch(e) { rej(e); } });
            });
            req.on('error', rej);
            req.write(body);
            req.end();
        });

        const items = [...(data.organic || []), ...(data.answerBox ? [data.answerBox] : [])];
        const comps = [];

        for (const item of items) {
            const texto = `${item.title || ''} ${item.snippet || ''}`;

            // Extraer precio: $X,XXX,XXX o X millones
            let precio = 0;
            const mPrecio = texto.match(/\$\s?([\d,]+(?:\.\d+)?)\s*(millones?|mdp|mxn)?/i)
                         || texto.match(/([\d,]+(?:\.\d+)?)\s*(millones?)\s*(?:de\s+)?(?:pesos?)?/i);
            if (mPrecio) {
                const num = parseFloat(mPrecio[1].replace(/,/g, ''));
                const esMillon = /millon/i.test(mPrecio[2] || '');
                precio = esMillon ? num * 1_000_000 : num;
            }

            // Extraer m²C: 120m², 120 m2, 120 metros
            let m2comp = 0;
            const mM2 = texto.match(/(\d{2,4})\s*m[²2]/i)
                     || texto.match(/(\d{2,4})\s*metros?\s*(?:de\s+)?construcci/i);
            if (mM2) m2comp = parseInt(mM2[1]);

            if (precio > 200_000 && m2comp > 0
                && m2comp >= m2C * 0.5 && m2comp <= m2C * 1.6
                && precio / m2comp > 3_000 && precio / m2comp < 150_000) {

                // Extraer colonia del link o snippet
                const coloniaComp = extraerColoniaDeURLFallback(item.link) || colonia;
                comps.push({ precio, m2_const: m2comp, colonia: coloniaComp, url: item.link });
            }
        }

        // Anti-outlier
        let final = comps;
        if (comps.length >= 3) {
            const pm2s = comps.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
            const med  = pm2s[Math.floor(pm2s.length / 2)];
            final = comps.filter(c => {
                const r = (c.precio / c.m2_const) / med;
                return r >= 0.60 && r <= 1.60;
            });
        }

        if (final.length > 0) {
            cache[keyGS] = { comps: final, fecha: new Date().toISOString(), zona: `${colonia} ${municipio}`, fuente: 'google_search' };
            guardarGeminiCache();
            console.log(`  [GoogleSearch] ${final.length} comps encontrados`);
            final.forEach(c => console.log(`    $/m²C: $${Math.round(c.precio/c.m2_const).toLocaleString()} (${c.m2_const}m²C) — ${c.url?.slice(0,60)}`));
        } else {
            console.log(`  [GoogleSearch] Sin comps válidos en ${items.length} resultados`);
        }
        return final;

    } catch(e) {
        console.log(`  [GoogleSearch] Error: ${e.message}`);
        return [];
    }
}

function extraerColoniaDeURLFallback(url) {
    if (!url) return '';
    const m1 = url.match(/colonia-([a-z0-9-]+?)-(?:[a-z]+-){0,2}jal/i);
    if (m1) return m1[1].replace(/-/g, ' ');
    const m2 = url.match(/en-([a-z0-9-]+?)(?:-zapopan|-guadalajara|-tlaquepaque|-tlajomulco|-tonala)/i);
    if (m2) return m2[1].replace(/-/g, ' ');
    return '';
}

/**
 * DeepSeek fallback para buscar comparables.
 * Comparte el mismo caché que Gemini (misma key → no duplica consultas).
 * DeepSeek no tiene acceso a web en tiempo real, pero tiene conocimiento
 * del mercado inmobiliario mexicano hasta su fecha de corte.
 */
async function buscarCompsDeepSeek(prop, zona) {
    if (!deepseekClient) {
        console.log('  [DeepSeek] Sin API key — omitiendo.');
        return [];
    }

    const cache   = cargarGeminiCache();
    const keyBase = geminiCacheKey(zona, prop);
    const keyDS   = `ds_${keyBase}`;

    // Revisar caché compartido: primero entrada de Gemini, luego de DeepSeek
    if (cache[keyBase]) {
        console.log(`  [DeepSeekCache] HIT (Gemini cache): "${keyBase}" (${cache[keyBase].comps.length} comps)`);
        return cache[keyBase].comps;
    }
    if (cache[keyDS]) {
        console.log(`  [DeepSeekCache] HIT: "${keyDS}" (${cache[keyDS].comps.length} comps)`);
        return cache[keyDS].comps;
    }

    const colNorm    = normalizarColonia(zona.colonia);
    const similares  = colNorm ? getColoniasSimilares(colNorm, 3) : [];
    const zonaStr    = zona.colonia
        ? `colonia ${zona.colonia}, ${zona.municipio} Jalisco`
        : `${zona.municipio} Jalisco`;
    const zonasAlt   = similares.length > 0
        ? `Colonias de NSE similar: ${similares.join(', ')}.`
        : '';
    const recStr     = prop.recamaras
        ? `${prop.recamaras} recámaras (±1 aceptable)`
        : 'sin restricción de recámaras';

    const prompt = `Eres un valuador inmobiliario experto en el mercado de Guadalajara, Jalisco, México.

Necesito que me proporciones de 3 a 6 comparables reales de casas en venta en ${zonaStr}.

Propiedad sujeto: ${prop.construccion}m² de construcción, ${recStr}, en ${zonaStr}.
${zonasAlt}

Usa tu conocimiento del mercado inmobiliario de Jalisco para dar precios representativos de la zona en el año 2025-2026.

Responde SOLO con este JSON exacto, sin markdown ni explicaciones:
{
  "comparables": [
    {"colonia": "nombre_colonia", "precio": 0000000, "m2c": 000, "recamaras": 0},
    ...
  ]
}

Reglas:
- precio: precio total en pesos MXN (número entero, sin comas ni símbolos)
- m2c: metros cuadrados de construcción (entre ${Math.round(prop.construccion * 0.6)} y ${Math.round(prop.construccion * 1.6)})
- recamaras: número entero
- Usa precios reales de mercado de esa zona (no subestimes ni sobreestimes)
- Si la colonia exacta no tiene suficiente oferta, usa colonias vecinas de nivel similar`;

    try {
        const response = await deepseekClient.chat.completions.create({
            model: 'deepseek-chat', // DeepSeek-V3
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000,
        });

        const text  = response.choices[0]?.message?.content || '';
        const match = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!match) {
            console.log('  [DeepSeek] Sin JSON válido en respuesta.');
            return [];
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
        let final = raw;
        if (raw.length >= 3) {
            const pm2s = raw.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
            const med  = pm2s[Math.floor(pm2s.length / 2)];
            final = raw.filter(c => {
                const r = (c.precio / c.m2_const) / med;
                return r >= 0.60 && r <= 1.60;
            });
        }

        if (final.length > 0) {
            cache[keyDS] = { comps: final, fecha: new Date().toISOString(), zona: zonaStr, fuente: 'deepseek' };
            guardarGeminiCache();
            console.log(`  [DeepSeekCache] MISS → guardado: "${keyDS}" (${final.length} comps)`);
            final.forEach(c => console.log(`    ${c.colonia}: $${Math.round(c.precio/c.m2_const).toLocaleString()}/m²C (${c.m2_const}m²C)`));
        }
        return final;

    } catch(e) {
        console.log(`  [DeepSeek] Error: ${e.message}`);
        return [];
    }
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
    console.log(`  remi con Fallback Gemini — ${validos.length} avalúos AMG`);
    console.log(`${'='.repeat(70)}\n`);

    const auth   = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    const anomalias = []; // casos con error >30% → Claude Code los audita al terminar

    const rows = [[
        'Archivo', 'M2C', 'M2T', 'Edad', 'Perito',
        'Beta-OPI', 'Dif%',
        'remi-Scraper', 'Dif%', 'Confianza', 'CV', 'N-Comps', '$/m²C scraper',
        'remi-Gemini',  'Dif%', 'N-Comps Gemini', '$/m²C gemini',
        'remi-FINAL',   'Dif% FINAL', 'Fuente FINAL',
        '#CompsOPI', 'Nota-Claude'
    ]];

    let geminiCalls = 0;

    for (const d of validos) {
        const edad = cleanNum(d.edad) || 10;
        const prop = {
            tipo:              d.tipo || 'CASA HABITACIÓN',
            terreno:           cleanNum(d.m2Terreno),
            construccion:      cleanNum(d.m2Construccion),
            valorReal:         cleanNum(d.valorMercado),
            edad,
            compsOPI:          d.comparables || [],
            recamaras:         d.recamaras || null,
            banos:             d.banos     || null,
            estacionamientos:  d.estacionamientos || null,
            estadoConservacion: d.estadoConservacion || 'bueno',
        };

        console.log(`\n📍 ${d.fileName}`);
        console.log(`   ${prop.tipo} | m²C:${prop.construccion} | m²T:${prop.terreno} | Edad:${edad} | Perito:${MXN(prop.valorReal)}`);

        const zona = extraerZona(d.fileName);
        console.log(`   ${prop.recamaras||'?'}rec ${prop.banos||'?'}baños ${prop.estacionamientos||'?'}est | Conserv:${prop.estadoConservacion}(×${FACTORES_CONSERVACION[prop.estadoConservacion]||0.93}) | Zona: municipio="${zona.municipio}" colonia="${zona.colonia}"`);

        // ── 1. Buscar en scraper ──────────────────────────────────────────────
        const { comps: compsScraper, poolTipo: scraperPoolTipo, medM2CZona, medPm2Zona } = await buscarCompsEnScraper(sheets, zona, prop);

        // ATÍPICA: construcción > 2.5× mediana de la zona → no valuar, pedir perito
        const factorAtipica = 2.5;
        if (medM2CZona > 0 && prop.construccion > medM2CZona * factorAtipica) {
            const msg = `ATÍPICA: ${prop.construccion}m²C >> mediana zona ${Math.round(medM2CZona)}m²C (${(prop.construccion/medM2CZona).toFixed(1)}×). Verificar m²C y tipo de construcción con perito en campo.`;
            console.log(`   ⚠️  ${msg}`);
            rows.push([
                d.fileName, prop.construccion, prop.terreno, edad, prop.valorReal,
                'N/A', 'N/A',
                'ATÍPICA', msg, 'ATÍPICA', 'N/A', 0, '',
                'N/A', 'N/A', '', '',
                'ATÍPICA', 'N/A', 'ATÍPICA',
                prop.compsOPI.length
            ]);
            continue;
        }

        const remiScraper = metodoremi(prop, compsScraper, scraperPoolTipo);

        console.log(`   [Scraper] ${compsScraper.length} comps | remi:${MXN(remiScraper.valor)} (${dif(remiScraper.valor, prop.valorReal)}) | Confianza:${remiScraper.confianza}`);
        if (compsScraper.length > 0) {
            console.log(`   [Scraper] $/m²C comps: ${compsScraper.slice(0,5).map(c => Math.round(c.precio/c.m2_const).toLocaleString()).join(', ')}`);
        }

        // ── 2. Beta-OPI (calculado siempre para decidir fuente) ──────────────
        const betaOPI = Math.round(metodoBetaOPI(prop, zona));

        // Detectar método físico del perito por MAGNITUD de $/m²C en links:
        //   - Costos físicos depreciados: $5k-$16k/m²C (<<< mediana zona)
        //   - Precios de mercado: $14k-$50k/m²C (≈ mediana zona)
        // El header "$/M2 CONST. Usado" aparece en TODAS las plantillas → no usar como detector.
        const compsPm2Values = prop.compsOPI
            .filter(c => {
                const l = c.link || '';
                return l.includes('$') && !l.startsWith('http') && cleanNum(l) > 1000;
            })
            .map(c => cleanNum(c.link));
        const compsPm2Count = compsPm2Values.length;
        const compsURLCount = prop.compsOPI.filter(c => (c.link || '').startsWith('http')).length;

        // Umbral: si el mayor $/m²C de los links es < 60% de la mediana de zona → costos físicos
        const pm2cMax = compsPm2Count > 0 ? Math.max(...compsPm2Values) : 0;
        const umbralFisico = medPm2Zona > 0 ? medPm2Zona * 0.60 : 18000;
        const esMetodoFisico    = compsPm2Count > 0 && pm2cMax < umbralFisico && compsURLCount >= 2;
        const esMetodoTerrenoPuro = compsPm2Count === 0 && compsURLCount >= 3;
        const esMetodoTerreno   = esMetodoFisico || esMetodoTerrenoPuro;

        if (esMetodoTerreno) {
            const razon = esMetodoFisico
                ? `avalúo físico (pm2cMax=$${Math.round(pm2cMax).toLocaleString()} < umbral=$${Math.round(umbralFisico).toLocaleString()}, ${compsURLCount} terrenos)`
                : `terreno puro (${compsURLCount} URL, 0 $/m²C)`;
            console.log(`   [Método] ${razon} → Beta-OPI preferido`);
        } else if (compsPm2Count > 0) {
            console.log(`   [Método] mercado (pm2cMax=$${Math.round(pm2cMax).toLocaleString()} ≥ umbral=$${Math.round(umbralFisico).toLocaleString()}) → remi/Gemini`);
        }

        // ── 3. Fallback cascade: GoogleSearch → DeepSeek → Gemini
        //      GoogleSearch: listings reales en tiempo real (mejor calidad)
        //      DeepSeek: conocimiento de mercado sin web real-time (barato)
        //      Gemini: Google Search integrado (último recurso, rate-limited)
        let remiGoogleSearch = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
        let remiDeepSeek     = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
        let remiGemini       = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
        const esGrande         = prop.construccion > 300;
        const necesitaAI       = (remiScraper.confianza === 'BAJA' || remiScraper.nComps < 3)
                                 && (!esMetodoTerreno || esGrande);

        if (necesitaAI) {
            console.log(`   [AI] Activando fallback (confianza=${remiScraper.confianza}, n=${remiScraper.nComps})...`);

            // 1. Google Search API (listings reales en portales — mejor calidad)
            const compsGS = await buscarCompsGoogleSearch(prop, zona);
            remiGoogleSearch = metodoremi(prop, compsGS);
            if (remiGoogleSearch.nComps > 0) {
                console.log(`   [GoogleSearch] ${compsGS.length} comps | remi:${MXN(remiGoogleSearch.valor)} (${dif(remiGoogleSearch.valor, prop.valorReal)})`);
            }

            // 2. DeepSeek si Google Search retorna <3 comps
            if (remiGoogleSearch.nComps < 3 && deepseekClient) {
                const compsDS = await buscarCompsDeepSeek(prop, zona);
                remiDeepSeek = metodoremi(prop, compsDS);
                if (remiDeepSeek.nComps > 0) {
                    console.log(`   [DeepSeek] ${compsDS.length} comps | remi:${MXN(remiDeepSeek.valor)} (${dif(remiDeepSeek.valor, prop.valorReal)})`);
                    console.log(`   [DeepSeek] $/m²C: ${compsDS.map(c => Math.round(c.precio/c.m2_const).toLocaleString()).join(', ')}`);
                }
            }

            // 3. Gemini si los anteriores retornan <3 comps (rate-limited)
            if (remiGoogleSearch.nComps < 3 && remiDeepSeek.nComps < 3) {
                if (geminiCalls > 0) await sleep(10000);
                geminiCalls++;
                const compsG = await buscarCompsGemini(prop, zona);
                remiGemini = metodoremi(prop, compsG);
                if (remiGemini.nComps > 0) {
                    console.log(`   [Gemini] ${compsG.length} comps | remi:${MXN(remiGemini.valor)} (${dif(remiGemini.valor, prop.valorReal)})`);
                    console.log(`   [Gemini] $/m²C: ${compsG.map(c => Math.round(c.precio/c.m2_const).toLocaleString()).join(', ')}`);
                }
            }
        }

        // Mejor AI: GoogleSearch > DeepSeek > Gemini (prioridad por calidad de datos)
        const candidatosAI = [
            { r: remiGoogleSearch, f: 'GOOGLE_SEARCH' },
            { r: remiDeepSeek,     f: 'DEEPSEEK' },
            { r: remiGemini,       f: 'GEMINI' },
        ].filter(x => x.r.nComps > 0);
        const mejorAIEntry = candidatosAI[0] || { r: remiDeepSeek, f: 'DEEPSEEK' };
        const mejorAI      = mejorAIEntry.r;
        const fuenteAI     = mejorAIEntry.f;

        // ── 4. Elegir mejor fuente ────────────────────────────────────────────
        let remiFinal, fuente;

        // Cuando no se detectó una colonia específica (el fallback encontró el municipio),
        // el Scraper usa promedios demasiado amplios. Preferir Beta-OPI si está disponible.
        const NOMBRES_MUNICIPIO = new Set(['guadalajara','zapopan','tonala','tlaquepaque','tlajomulco','el salto']);
        const coloniaEsVaga = !zona.colonia || NOMBRES_MUNICIPIO.has(normalizarColonia(zona.colonia));

        // Método terreno: Beta-OPI preferido. Para propiedades grandes, comparar con AI.
        if (esMetodoTerreno && betaOPI > 0 && !(esGrande && mejorAI.nComps >= 3)) {
            remiFinal = { valor: betaOPI, confianza: 'MEDIA', cv: 'N/A', nComps: compsURLCount, pm2cAvg: 0 };
            fuente = 'BETA-OPI (terreno)';
        } else if (!necesitaAI && coloniaEsVaga && betaOPI > 0) {
            // Sin colonia específica: el Scraper tiene poca precisión zonal — usar Beta-OPI si existe
            remiFinal = { valor: betaOPI, confianza: 'MEDIA', cv: 'N/A', nComps: compsURLCount, pm2cAvg: 0 };
            fuente = 'BETA-OPI (sin colonia)';
            console.log(`   [Colonia vaga] "${zona.colonia}" → prefiriendo Beta-OPI sobre Scraper`);
        } else if (!necesitaAI) {
            remiFinal = remiScraper;
            fuente = 'SCRAPER';
        } else if (mejorAI.nComps >= 3 && (remiScraper.nComps < 3 || remiScraper.confianza === 'BAJA')) {
            remiFinal = mejorAI;
            fuente = fuenteAI;
        } else if (remiScraper.confianza === 'BAJA' && mejorAI.nComps < 3) {
            if (remiScraper.nComps >= 3) {
                remiFinal = remiScraper;
                fuente = 'SCRAPER (BAJA)';
            } else {
                remiFinal = { valor: 0, confianza: 'BAJA', nComps: remiScraper.nComps };
                fuente = 'REVISAR (sin datos)';
            }
        } else if (remiScraper.nComps >= mejorAI.nComps) {
            remiFinal = remiScraper;
            fuente = 'SCRAPER';
        } else {
            remiFinal = mejorAI;
            fuente = fuenteAI;
        }

        // Prima por vivienda pequeña: aplica solo a remi (Scraper/AI), no a Beta-OPI.
        // Beta-OPI ya tiene terreno + pm2C*m2C independientes; la prima lo desbalancearía.
        if (remiFinal.valor > 0 && prop.construccion < 65 && !fuente.startsWith('BETA-OPI')) {
            const factorPequena = prop.construccion < 45 ? 1.22 : 1.12;
            remiFinal = { ...remiFinal, valor: Math.round(remiFinal.valor * factorPequena) };
            console.log(`   [Prima pequeña] m²C=${prop.construccion} → ×${factorPequena}`);
        }

        // Prima uso mixto (casa + local comercial): el local agrega valor comercial
        // sobre el valor habitacional base. Rango: 10–20% según ubicación.
        // - Municipios de alta actividad comercial (GDL, Tlaquepaque, Tonalá): 20%
        // - Zapopan, Tlajomulco, otros: 15%
        // - Sin dato de municipio: 10% conservador
        const tipoUpper = (prop.tipo || '').toUpperCase();
        const esMixto = tipoUpper.includes('CON LOCAL') || tipoUpper.includes('LOCAL COMERCIAL CON');
        if (remiFinal.valor > 0 && esMixto) {
            const muniNorm = (prop.municipio || '').toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
            const MUNIS_ALTA_ACTIVIDAD = ['guadalajara', 'tlaquepaque', 'san pedro tlaquepaque', 'tonala', 'tonalá'];
            const factorMixto = MUNIS_ALTA_ACTIVIDAD.includes(muniNorm) ? 1.20
                              : muniNorm ? 1.15
                              : 1.10;
            remiFinal = { ...remiFinal, valor: Math.round(remiFinal.valor * factorMixto) };
            console.log(`   [Prima mixto] ${prop.municipio} → ×${factorMixto} (${tipoUpper})`);
        }

        console.log(`   Beta-OPI:     ${MXN(betaOPI)} (${dif(betaOPI, prop.valorReal)})`);
        console.log(`   remi-FINAL: ${MXN(remiFinal.valor)} (${dif(remiFinal.valor, prop.valorReal)}) ← ${fuente}`);

        // ── 5. Registrar anomalías para auditoría posterior en Claude Code ──────
        let notaClaude = '';
        const errorFinal = prop.valorReal > 0 && remiFinal.valor > 0
            ? Math.abs(remiFinal.valor / prop.valorReal - 1)
            : 0;
        if (errorFinal > 0.30) {
            anomalias.push({
                archivo:      d.fileName,
                m2C: prop.construccion, m2T: prop.terreno, edad,
                conservacion: prop.estadoConservacion,
                colonia: zona.colonia, municipio: zona.municipio,
                valorPerito:  prop.valorReal,
                valorModelo:  remiFinal.valor,
                errorPct:     Math.round(errorFinal * 100),
                fuente,
                betaOPI,
                pm2cScraper:  remiScraper.pm2cAvg || 0,
                nCompsScraper: remiScraper.nComps,
                compsOPI:     prop.compsOPI.length,
            });
        }

        rows.push([
            d.fileName, prop.construccion, prop.terreno, edad, prop.valorReal,
            betaOPI || 'N/A', dif(betaOPI, prop.valorReal),
            remiScraper.valor || 'N/A', dif(remiScraper.valor, prop.valorReal),
            remiScraper.confianza, remiScraper.cv, remiScraper.nComps, remiScraper.pm2cAvg || '',
            remiGemini.valor  || 'N/A', dif(remiGemini.valor, prop.valorReal),
            remiGemini.nComps || '', remiGemini.pm2cAvg || '',
            remiFinal.valor  || 'N/A', dif(remiFinal.valor, prop.valorReal), fuente,
            prop.compsOPI.length,
            notaClaude || '',
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

    // Guardar anomalías para auditoría en Claude Code
    if (anomalias.length > 0) {
        fs.writeFileSync(
            require('path').join(__dirname, 'anomalias.json'),
            JSON.stringify(anomalias, null, 2)
        );
        console.log(`\n⚠️  ${anomalias.length} anomalías (error >30%) guardadas en anomalias.json — revisar con Claude Code`);
    }
}

main().catch(console.error);
