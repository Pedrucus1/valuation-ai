/**
 * motor_remi_api.js
 *
 * Wrapper stdin→stdout para llamar desde Python via subprocess.
 *
 * Input (stdin JSON):
 *   { tipo, construccion, terreno, edad, estadoConservacion,
 *     recamaras, banos, municipio, colonia }
 *
 * Output (stdout JSON):
 *   { valor, confianza, cv, nComps, pm2cAvg, poolTipo,
 *     medM2CZona, medPm2Zona, error? }
 *
 * Uso desde Python:
 *   import subprocess, json
 *   r = subprocess.run(['node', 'motor_remi_api.js'],
 *       input=json.dumps(prop), capture_output=True, text=True, cwd=MOTOR_DIR)
 *   result = json.loads(r.stdout)
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const _gemini = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const _deepseek = new OpenAI({
    apiKey: 'sk-002d18925d514fa7997b0b35718efd82',
    baseURL: 'https://api.deepseek.com/v1'
});

const _openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Sin umbral fijo de m²C — la atipicidad se determina por falta de comparables en el IDX
// (el motor cae a sumaDePartes o IA fallback si no encuentra comps en el tier del sujeto)

// ── helpers copiados de comparar_metodologias.js ──────────────────────────────

const INDEX_PATH         = path.join(__dirname, 'cache_index.json');
const COLONIAS_NSE_PATH  = path.join(__dirname, 'colonias_nse.json');
const COLONIAS_NSE2_PATH = path.join(__dirname, 'colonias_nse_v2.json');
const IDX_VAL_PATH       = path.join(__dirname, 'idx_valoracion.json');
const COLONIAS_SIM_PATH  = path.join(__dirname, 'colonias_similares.json');
const COLONIAS_IA_PATH   = path.join(__dirname, 'colonias_similares_enriquecido.json');
const COLONIAS_SIM_V2_PATH = path.join(__dirname, 'colonias_similares.enriquecido.v2.json');
const MAESTRO_PATH       = path.join(__dirname, 'colonias_maestro.json');

const IDX     = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

// Fuente única consolidada: cada colonia es un registro { municipio, zona, nse:{v1,v2}, idx, similares }.
// Si existe, el motor lee SOLO de aquí (1 archivo, ~33% menos bytes que las 6 fuentes sueltas).
// Se regenera con: node construir_maestro.js
const _maestro = fs.existsSync(MAESTRO_PATH)
    ? (() => { const { _meta, ...c } = JSON.parse(fs.readFileSync(MAESTRO_PATH, 'utf8')); return c; })()
    : null;

// Fuentes legacy: SOLO se cargan si no hay maestro (compatibilidad / red de seguridad).
const _nse    = !_maestro && fs.existsSync(COLONIAS_NSE_PATH)  ? JSON.parse(fs.readFileSync(COLONIAS_NSE_PATH,  'utf8')) : {};
const _nse2   = !_maestro && fs.existsSync(COLONIAS_NSE2_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_NSE2_PATH, 'utf8')) : {};
const _idxVal = !_maestro && fs.existsSync(IDX_VAL_PATH)       ? (() => { const { _meta, ...c } = JSON.parse(fs.readFileSync(IDX_VAL_PATH, 'utf8')); return c; })() : {};
const _sim    = !_maestro && fs.existsSync(COLONIAS_SIM_PATH)  ? JSON.parse(fs.readFileSync(COLONIAS_SIM_PATH,  'utf8')) : {};
const _simIA  = !_maestro && fs.existsSync(COLONIAS_IA_PATH)   ? JSON.parse(fs.readFileSync(COLONIAS_IA_PATH,   'utf8')) : {};
const _simV2  = !_maestro && fs.existsSync(COLONIAS_SIM_V2_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_SIM_V2_PATH, 'utf8')) : {};

// Zonas geográficas — claves en formato normMuni (sin acentos, lowercase)
// Quirk: normMuni("San Pedro Tlaquepaque") → "tlaquepaquetlaquepaque" (la regex "^san pedro " reemplaza
// el prefijo con "tlaquepaque" pero el sufijo ya contiene "tlaquepaque" → duplicación). Ambas formas apuntan a AMG-SE.
const _ZONAS_MAP = {
    'guadalajara': 'AMG-Centro', 'zapopan': 'AMG-NW',
    'tlaquepaque': 'AMG-SE', 'tlaquepaquetlaquepaque': 'AMG-SE',
    'tonala': 'AMG-E',
    'tlajomulco': 'AMG-S',       // normMuni convierte "tlajomulco de zuniga" → "tlajomulco"
    'el salto': 'AMG-S',         'juanacatlan': 'AMG-S',
    'ixtlahuacan de los membrillos': 'AMG-S',
    'chapala': 'Chapala',        'jocotepec': 'Chapala', 'poncitlan': 'Chapala',
    'puerto vallarta': 'Costa-Sur', 'bahia de banderas': 'Costa-Sur', 'compostela': 'Costa-Sur',
    'manzanillo': 'Costa-Colima', 'armeria': 'Costa-Colima',
};
function _zonaOf(muniNorm) { return muniNorm ? (_ZONAS_MAP[muniNorm] || 'Otro') : null; }

// Cascada de fuentes NSE (sin sustituir caps de v1):
//   1. v1 (calibraciones manuales validadas) — siempre gana
//   2. v2 (casas limpias por tipo) — para colonias sin entrada en v1
//   3. idx_valoracion tipo-específico — para colonias sin v1/v2, con NSE correcto por tipo
//   4. idx_valoracion casa como proxy — si el tipo no tiene entrada pero casa sí
function getNSE(colNorm, tipo = 'casa') {
    // Maestro: misma cascada v1 → v2 → idx[tipo] → idx[casa], leída de un solo registro
    if (_maestro) {
        const rec = _maestro[colNorm];
        if (!rec) return null;
        if (rec.nse?.v1) return rec.nse.v1;
        if (rec.nse?.v2) return rec.nse.v2;
        const t = rec.idx?.[tipo]?.global;
        if (t) return { nse: t.nse, nseIdx: t.nseIdx, medianaPm2: t.medianaPm2, fuente: 'idx-val-' + tipo };
        const c = rec.idx?.casa?.global;
        if (c) return { nse: c.nse, nseIdx: c.nseIdx, medianaPm2: c.medianaPm2, fuente: 'idx-val-casa' };
        return null;
    }
    // Legacy (sin maestro)
    if (_nse[colNorm])  return _nse[colNorm];
    if (_nse2[colNorm]) return _nse2[colNorm];
    const tipoEntry = _idxVal[colNorm]?.[tipo]?.global;
    if (tipoEntry) return { nse: tipoEntry.nse, nseIdx: tipoEntry.nseIdx, medianaPm2: tipoEntry.medianaPm2, fuente: 'idx-val-' + tipo };
    const casaEntry = _idxVal[colNorm]?.casa?.global;
    if (casaEntry) return { nse: casaEntry.nse, nseIdx: casaEntry.nseIdx, medianaPm2: casaEntry.medianaPm2, fuente: 'idx-val-casa' };
    return null;
}

// Obtiene similares con filtro de zona. El maestro ya guarda la lista priorizada (v2→sim→simIA);
// los items de fallback no traen `.zona`, así que el filtro `!s.zona || ...` los deja pasar igual que antes.
function getSimilares(colNorm, muniSujeto) {
    const zonaSujeto = muniSujeto ? _zonaOf(muniSujeto) : null;

    if (_maestro) {
        const rec = _maestro[colNorm];
        const sims = rec && rec.similares;
        if (!sims || !sims.length) return [];
        if (zonaSujeto) {
            const filtradas = sims.filter(s => !s.zona || s.zona === zonaSujeto);
            return filtradas.length ? filtradas : sims;
        }
        return sims;
    }

    // Legacy (sin maestro): v2 → _sim → _simIA
    const v2entry = _simV2[colNorm];
    if (v2entry && v2entry.similares && v2entry.similares.length) {
        const sims = v2entry.similares;
        if (zonaSujeto) {
            const filtradas = sims.filter(s => !s.zona || s.zona === zonaSujeto);
            return filtradas.length ? filtradas : sims;
        }
        return sims;
    }
    const base = _sim[colNorm];
    if (base && base.length) return base;
    const ia = _simIA[colNorm];
    if (!ia || !ia.length) return [];
    return ia.map(x => typeof x === 'string' ? { colonia: x, menciones: 1 } : x);
}

const FACTORES_CONSERVACION = {
    nuevo: 1.05, muy_bueno: 1.05, bueno: 1.00,
    regular_bueno: 0.85, regular_medio: 0.75,
    regular_malo: 0.65, malo: 0.55, muy_malo: 0.45,
    // Remodelación: mejora factorConserv Y reduce edad efectiva (INDAABIN: edad cuenta desde última remodelación)
    remodelacion_menor:      0.85, // Acabados superficiales (pintura, pisos, baño/cocina)
    remodelacion_intermedia: 1.00, // Instalaciones y acabados principales (eléctrico, hidráulico, fachada)
    remodelacion_completa:   1.05, // Remodelación total — prácticamente nueva
};

// Floor del factorEdad diferenciado por estado de conservación (pool similares/general).
// Propiedades bien conservadas resisten el tiempo — sus comps en zona son de edad similar.
// Aplicar el floor universal 0.85 a un bueno/52yr doble-descuenta vs lo que el perito observa.
const FLOOR_EDAD_SIMILARES = {
    nuevo:                  1.00,
    muy_bueno:              0.93,
    bueno:                  0.90,
    remodelacion_completa:  0.95,
    remodelacion_intermedia:0.92,
    remodelacion_menor:     0.88,
    regular_bueno:          0.87,
    regular_medio:          0.85,
    regular_malo:           0.82,
    malo:                   0.78,
    muy_malo:               0.75,
};

// Edad efectiva: remodelación reduce el reloj de depreciación (INDAABIN cuenta desde última remodelación)
function calcEdadEfectiva(edad, conservacion) {
    if (conservacion === 'remodelacion_menor')      return edad - Math.min(8, edad * 0.15);
    if (conservacion === 'remodelacion_intermedia') return Math.max(8, edad * 0.35);
    if (conservacion === 'remodelacion_completa')   return 5;
    return edad;
}

const NSE_NIVELES = [
    { idx: 0, nombre: 'economico' }, { idx: 1, nombre: 'interes-social' },
    { idx: 2, nombre: 'medio-bajo' }, { idx: 3, nombre: 'medio-medio' },
    { idx: 4, nombre: 'medio-alto' }, { idx: 5, nombre: 'lujo' }, { idx: 6, nombre: 'super-lujo' },
];

// Municipios que aparecen como nombre de colonia → colonia vaga
const NOMBRES_MUNICIPIO = new Set([
    'guadalajara','zapopan','tlaquepaque','tlajomulco','tonala','el salto',
    'chapala','ocotlan','tepatitlan','lagos de moreno','autlan'
]);

// Sufijos de municipio/estado que aparecen pegados al nombre de colonia
const SUFIJOS_GEO = [
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque','tlajomulco',
    'tlajomulco de zuniga','tonala','el salto','chapala','jalisco','jal',
    'nayarit','nay','colima','col'
];

function normCol(s) {
    if (!s) return '';
    let r = s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\bcp\s*\d{5}\b/g, '')          // quitar código postal
        .replace(/,.*$/, '')                       // cortar desde la primera coma
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    // Quitar sufijos de municipio/estado al final de la cadena
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
        .replace(/^san pedro /, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z.niga/, 'tlajomulco');
}

const TIPO_SINONIMOS = {
    'casa': ['casa', 'casas', 'residencia', 'chalet', 'villa'],
    'depto': ['departamento', 'depto', 'apartamento', 'flat', 'loft', 'penthouse', 'suite'],
    'terreno': ['terreno', 'lote', 'predio', 'solar'],
    'local': ['local comercial', 'local', 'comercial'],
    'oficina': ['oficina'], 'bodega': ['bodega', 'almacen'],
};
function normTipo(raw) {
    const r = (raw || '').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_SINONIMOS)) {
        if (sins.some(s => r.includes(s))) return canon;
    }
    return 'casa';
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function antiRemate(arr) {
    if (arr.length <= 2) return arr;
    const s = [...arr].sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)];
    const f = arr.filter(p => p >= med * 0.60 && p <= med * 1.40);
    return f.length >= 2 ? f : arr;
}

function dedup(arr) {
    return arr.filter((d, i, a) =>
        a.findIndex(x => Math.abs(x.p - d.p) / Math.max(x.p, 1) < 0.02 && x.c === d.c) === i
    );
}

// ── Fallback Gemini + Google Search ──────────────────────────────────────────

async function buscarCompsGemini(prop, similares, idxPm2c) {
    if (!_gemini) return [];
    const model = _gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} }]
    });
    const zona    = [prop.colonia, prop.municipio, 'Jalisco'].filter(Boolean).join(', ');
    const m2C     = prop.construccion || 0;
    const m2T     = prop.terreno || 0;
    const tipo    = prop.tipo || 'casa';
    const edad    = prop.edad || 0;

    // Rango de precio orientativo: pm2c del IDX o estimado por m2C
    const pm2cRef = idxPm2c || 0;
    const precioMin = pm2cRef > 0 ? Math.round(pm2cRef * m2C * 0.50 / 1000) * 1000 : 0;
    const precioMax = pm2cRef > 0 ? Math.round(pm2cRef * m2C * 1.60 / 1000) * 1000 : 0;
    const rangoHint = (precioMin > 0 && precioMax > 0)
        ? `\nRango de precio esperado para esta zona: $${(precioMin/1000).toFixed(0)}k–$${(precioMax/1000).toFixed(0)}k MXN.`
        : '';

    const simHint = (similares && similares.length)
        ? `\nSi no encuentras suficientes en la colonia principal, amplía la búsqueda a colonias vecinas: ${similares.slice(0,6).join(', ')}.`
        : '';

    const prompt = `Busca en internet ${tipo}s en venta en ${zona}. Usa portales inmobiliarios mexicanos como inmuebles24.com, propiedades.com, casasyterrenos.com o vivanuncios.com.

Sujeto de valuación: ${tipo} en ${zona}, ${m2C} m² construcción, ${m2T} m² terreno, ${edad} años antigüedad.${rangoHint}${simHint}

INSTRUCCIONES:
- Encuentra entre 5 y 10 propiedades comparables en venta con precio y m² de construcción visibles
- SOLO casas o departamentos residenciales (NO terrenos, NO locales comerciales)
- Prioriza propiedades en m² de construcción similares al sujeto (${Math.round(m2C * 0.6)}–${Math.round(m2C * 1.5)} m²)
- Descarta cualquier propiedad sin precio o sin m² de construcción explícitos
- Incluye la URL del listing si está disponible y el nombre del portal

Responde ÚNICAMENTE con JSON válido, sin explicaciones:
{"comparables":[{"colonia":"nombre_colonia","precio":1500000,"m2c":85,"m2t":120,"portal":"inmuebles24","url":"https://..."},...]}`

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const m = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!m) return [];
        const parsed = JSON.parse(m[0]);
        return (parsed.comparables || [])
            .map(c => ({
                precio:   parseFloat(String(c.precio).replace(/[^0-9.]/g, '')),
                m2c:      parseFloat(String(c.m2c).replace(/[^0-9.]/g, '')),
                m2t:      parseFloat(String(c.m2t || 0).replace(/[^0-9.]/g, '')),
                colonia:  (c.colonia || '').toLowerCase().trim(),
                municipio: (prop.municipio || '').toLowerCase().trim(),
                portal:   c.portal || 'gemini',
                url:      c.url || '',
            }))
            .filter(c => c.precio > 100000 && c.m2c >= 20 && c.m2c <= 1000);
    } catch (e) {
        return [];
    }
}

// ── Búsqueda web: Serper (Google) → DeepSeek extrae comparables ──────────────

async function buscarEnSerper(query) {
    if (!process.env.SERPER_API_KEY) return [];
    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, gl: 'mx', hl: 'es', num: 10 })
        });
        const data = await res.json();
        // Incluir link para que DeepSeek pueda extraer URL real
        return (data.organic || []).map(r => `[${r.title}]\n${r.snippet || ''}\nURL: ${r.link}`).join('\n\n---\n\n');
    } catch (e) {
        return '';
    }
}

async function buscarCompsConWeb(prop, similares) {
    if (!_deepseek || !process.env.SERPER_API_KEY) return [];

    const tipoQ  = (prop.tipo || 'casa').toLowerCase().includes('depto') ? 'departamento' : 'casa';
    const m2Min  = Math.round((prop.construccion || 60) * 0.5);
    const m2Max  = Math.round((prop.construccion || 60) * 1.5);
    const muni   = prop.municipio || '';
    const col    = prop.colonia   || muni;

    // Contexto IDX/NSE para orientar a DeepSeek sobre el rango de precios válido
    const colNormFn = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
    const muniN = normMuni(muni);
    const colN  = normCol(col);
    const nseEntry = getNSE(colN);
    const idxEntry = IDX[muniN]?.casa?.[colN];
    // Solo usar ancla si tiene datos específicos de casa — v1 sin fuente puede ser terreno/general
    const anclaValida = nseEntry?.fuente?.startsWith('idx-val') || idxEntry?.medianaPm2c > 0;
    const pm2cRef = anclaValida
        ? (nseEntry?.medianaPm2 || idxEntry?.medianaPm2c || 0)
        : (idxEntry?.medianaPm2c || 0);
    const pm2cMin  = pm2cRef ? Math.round(pm2cRef * 0.5) : 5000;
    const pm2cMax  = pm2cRef ? Math.round(pm2cRef * 1.8) : 60000;

    // Colonias similares del NSE para ampliar búsqueda si hay pocas exactas
    const simsNombres = (similares || [])
        .map(s => (typeof s === 'string' ? s : s.colonia) || '')
        .filter(Boolean).slice(0, 4);

    // Búsqueda 1: colonia exacta
    const q1 = `${tipoQ} en venta ${col} ${muni} Jalisco precio pesos m2 construccion`;
    // Búsqueda 2: colonias similares (si hay)
    const q2 = simsNombres.length
        ? `${tipoQ} en venta ${simsNombres.join(' OR ')} ${muni} Jalisco precio pesos m2`
        : null;

    const [snip1, snip2] = await Promise.all([
        buscarEnSerper(q1),
        q2 ? buscarEnSerper(q2) : Promise.resolve(''),
    ]);

    const todosSnippets = [snip1, snip2].filter(Boolean).join('\n\n═══\n\n');
    if (!todosSnippets.trim()) return [];

    const coloniasSim = simsNombres.length ? `Colonias de NSE similar donde también puedes buscar: ${simsNombres.join(', ')}.` : '';
    const anclajePrecios = pm2cRef
        ? `Referencia de mercado en la zona: ~$${pm2cRef.toLocaleString()}/m²C (rango válido $${pm2cMin.toLocaleString()}–$${pm2cMax.toLocaleString()}/m²C). Rechaza comparables fuera de ese rango.`
        : '';

    const prompt = `Eres valuador inmobiliario experto en Jalisco, México. Tu tarea es como la de un humano buscando comparables de mercado en Google.

Propiedad sujeto: ${tipoQ} de ${prop.construccion}m² construcción, ${prop.terreno || 0}m² terreno, ${prop.edad || 0} años, en ${col}, ${muni}.
Rango de m²C aceptable: ${m2Min}–${m2Max} m²C.
${anclajePrecios}
${coloniasSim}

Resultados de Google (portales inmobiliarios mexicanos):
═══
${todosSnippets.slice(0, 4000)}
═══

INSTRUCCIONES:
1. Analiza cada resultado como lo haría un valuador buscando comparables reales.
2. Extrae propiedades con precio en pesos y m²C visibles en el snippet.
3. Acepta también propiedades en colonias similares indicadas si la zona es compatible.
4. NO estimes precios. Si el snippet no dice el precio exacto, omite esa propiedad.
5. Incluye la URL exacta del listing (campo "url").
6. Si el precio/m²C cae fuera del rango válido indicado, omite esa propiedad.

Devuelve SOLO JSON:
{"comparables":[{"colonia":"...","precio":0,"m2c":0,"m2t":0,"url":"https://..."}]}`;

    try {
        const res = await _deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Eres valuador inmobiliario en Jalisco. Extrae comparables reales de snippets de Google. Responde SOLO JSON. Nunca inventes precios.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.0
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!m) return [];
        const parsed = JSON.parse(m[0]);
        const m2Min = Math.round((prop.construccion || 60) * 0.4);
        const m2Max = Math.round((prop.construccion || 60) * 1.8);
        return (parsed.comparables || [])
            .map(c => ({
                precio: parseFloat(String(c.precio).replace(/[^0-9.]/g, '')) || 0,
                m2c:    parseFloat(String(c.m2c).replace(/[^0-9.]/g, ''))   || 0,
                m2t:    parseFloat(String(c.m2t || 0).replace(/[^0-9.]/g, '')) || 0,
                url:    c.url || '',
                portal: 'serper',
            }))
            .filter(c => c.precio > 200000 && c.m2c > 15 && c.url
                      && c.m2c >= m2Min && c.m2c <= m2Max); // filtro de tamaño real
    } catch (e) {
        return [];
    }
}

async function buscarCompsDeepSeek(prop, similares, idxCtx) {
    const zona = [prop.colonia, prop.municipio, 'Jalisco'].filter(Boolean).join(', ');
    const nseSubj = prop.colonia ? getNSE(normCol(prop.colonia)) : null;
    const nseDesc = nseSubj ? ` NSE ${nseSubj.nseIdx} (${nseSubj.nse})` : '';

    // Contexto de precios de colonias similares conocidas del IDX
    let anclajeStr = '';
    if (idxCtx && idxCtx.length) {
        anclajeStr = `\nDatos reales de portales inmobiliarios en colonias cercanas (2024-2025):\n` +
            idxCtx.map(x => `  - ${x.col}: $${x.pm2c.toLocaleString()}/m² construcción (${x.n} listings)`).join('\n') +
            '\nUsa estos precios como referencia de mercado real para calibrar tu respuesta.';
    }

    const coloniasSim = similares && similares.length
        ? `Colonias de NSE similar donde buscar: ${similares.slice(0, 6).join(', ')}.`
        : '';

    const prompt = `Eres experto en mercado inmobiliario de Jalisco, México. Sólo usas pesos mexicanos (MXN).

Propiedad sujeto: ${prop.tipo || 'casa'} de ${prop.construccion} m² construcción, ${prop.terreno || 0} m² terreno, ${prop.edad || 0} años de antigüedad.
Ubicación: ${zona}${nseDesc}.
${coloniasSim}
${anclajeStr}

Estima 4 a 6 propiedades comparables en venta en la misma zona/NSE con precios realistas en MXN (no subestimes, usa los datos de referencia arriba).

Responde SOLO con JSON, sin texto adicional:
{"comparables":[{"colonia":"...","precio":0000000,"m2c":000,"m2t":000},...]}`

    try {
        const res = await _deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Eres valuador inmobiliario Jalisco. Responde SOLO con JSON válido en pesos mexicanos.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.2
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!m) return [];
        const parsed = JSON.parse(m[0]);
        return (parsed.comparables || [])
            .map(c => ({
                precio: parseFloat(String(c.precio).replace(/[^0-9.]/g, '')),
                m2c: parseFloat(String(c.m2c).replace(/[^0-9.]/g, '')),
                m2t: parseFloat(String(c.m2t || 0).replace(/[^0-9.]/g, ''))
            }))
            .filter(c => c.precio > 0 && c.m2c > 0);
    } catch (e) {
        return [];
    }
}

function remiSobreComps(comps, m2C, edad, conservacion, poolTipo) {
    const pm2c = comps.map(c => c.precio / c.m2c);
    const s = [...pm2c].sort((a,b)=>a-b);
    const med = s[Math.floor(s.length/2)];
    const pm2cFilt = pm2c.filter(p => p >= med*0.60 && p <= med*1.40);
    const compsFilt = comps.filter((_,i) => pm2cFilt.includes(pm2c[i]));
    if (!compsFilt.length) return null;
    const factorEdad  = poolTipo === 'exacta' ? 1.0 : Math.max(0.70, 1 - (edad-10)*0.01);
    const factorConserv = FACTORES_CONSERVACION[conservacion] || 1.00;
    let suma = 0;
    compsFilt.forEach(c => { suma += (c.precio/c.m2c) * Math.pow(c.m2c/m2C,1/6) * factorEdad * factorConserv; });
    const pm2cAvg = suma / compsFilt.length;
    const mean = compsFilt.reduce((a,b)=>a+b.precio/b.m2c,0)/compsFilt.length;
    const cv = mean > 0 ? Math.sqrt(compsFilt.map(c=>Math.pow(c.precio/c.m2c-mean,2)).reduce((a,b)=>a+b,0)/compsFilt.length)/mean : 1;
    return {
        valor: Math.round(pm2cAvg * m2C * 0.95),
        confianza: cv < 0.15 ? 'ALTA' : cv < 0.25 ? 'MEDIA' : 'BAJA',
        cv: +cv.toFixed(3), nComps: compsFilt.length, pm2cAvg: Math.round(pm2cAvg)
    };
}

function listingsEnMuni(muni, tipo) {
    const colonias = IDX[muni]?.[tipo] ?? {};
    const out = [];
    for (const [col, data] of Object.entries(colonias)) {
        for (const l of data.listings) out.push({ p: l.p, c: l.c, t: l.t || 0, co: col });
    }
    return out;
}

// ── Suma de Partes: terreno (IDX) + construcción depreciada INDAABIN ───────────
const INDAABIN_COSTO = { residencial_plus: 26000, residencial: 18000, media: 12000, economica: 7500 };

function getRH(edad, vida = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vida);
    return Math.max(0.20, 1 - 0.5 * (x + x * x));
}

// Límite superior de pm2T plausible para terrenos residenciales ($/m²T).
// Valores mayores indican datos contaminados con departamentos/preventa en el IDX.
const PM2T_MAX_PLAUSIBLE = 25000;

function sumaDePartes(muniNorm, colNorm, m2T, m2C, edad, conservacion, esEjidal = false) {
    // Buscar pm2T en IDX de terrenos: colonia exacta (n≥3) → zona padre → mediana municipal
    let pm2t = 0, nTerrenos = 0;
    const terrenosMuni = IDX[muniNorm]?.['terreno'] ?? {};

    // 1. Colonia exacta con n≥3 (n<3 es demasiado volátil para anclar sumaDePartes)
    const terrenosCol = terrenosMuni[colNorm];
    if (terrenosCol && terrenosCol.count >= 3 && terrenosCol.medianaPm2c > 0
        && terrenosCol.medianaPm2c <= PM2T_MAX_PLAUSIBLE) {
        pm2t = terrenosCol.medianaPm2c;
        nTerrenos = terrenosCol.count;
    }

    // 2. Zona padre: buscar colonia IDX cuyo nombre esté contenido en colNorm
    //    Ej: 'cajititlan' ⊂ 'colinas de cajititlan' → usa cajititlan (n=36)
    if (!pm2t && colNorm && colNorm.length >= 5) {
        const match = Object.entries(terrenosMuni)
            .filter(([k, d]) => k.length >= 5 && colNorm.includes(k)
                && d.count >= 5 && d.medianaPm2c > 0 && d.medianaPm2c <= PM2T_MAX_PLAUSIBLE)
            .sort((a, b) => b[1].count - a[1].count)[0]; // mayor n primero
        if (match) { pm2t = match[1].medianaPm2c; nTerrenos = match[1].count; }
    }

    // 3. Mediana municipal filtrada por pm2T plausible
    if (!pm2t) {
        const pm2ts = Object.values(terrenosMuni)
            .filter(d => d.count >= 3 && d.medianaPm2c > 100 && d.medianaPm2c <= PM2T_MAX_PLAUSIBLE)
            .map(d => d.medianaPm2c);
        if (pm2ts.length >= 3) {
            pm2t = mediana(pm2ts);
            nTerrenos = pm2ts.length;
        }
    }
    if (!pm2t) return null;

    // Factor ejidal: solo para el valor del terreno. Construcción no se descuenta.
    // esEjidal se clasifica en la ingesta (IA), no con regex — para capturar casos
    // donde "ejidal" aparece en el tipo del inmueble y no en el nombre de la colonia.
    const pm2tTerreno = esEjidal ? pm2t * 0.50 : pm2t;
    const valorTerreno = pm2tTerreno * m2T;
    const pm2cRef = pm2t * 1.8;  // nseKey usa pm2t original (estándar constructivo)
    const nseKey  = pm2cRef >= 25000 ? 'residencial_plus'
                  : pm2cRef >= 15000 ? 'residencial'
                  : pm2cRef >= 8000  ? 'media' : 'economica';
    const costo   = INDAABIN_COSTO[nseKey];
    const depre   = getRH(calcEdadEfectiva(edad, conservacion));
    const fConserv = FACTORES_CONSERVACION[conservacion] || 1.00;
    // +20% sobre costo INDAABIN para aproximar valor de mercado (costo reposición < valor mercado)
    const valorConst = m2C > 0 ? costo * 1.20 * m2C * depre * fConserv * 0.95 : 0;
    const valor = Math.round(valorTerreno + valorConst);

    return { valor, pm2t: Math.round(pm2tTerreno), nTerrenos, nseKey,
             valorTerreno: Math.round(valorTerreno), valorConst: Math.round(valorConst),
             poolTipo: 'suma_partes', nComps: nTerrenos };
}

// ── motor principal ───────────────────────────────────────────────────────────

function valuarPropiedad(prop) {
    const muniNorm = normMuni(prop.municipio || '');
    const colNorm  = normCol(prop.colonia || '');
    const tipo     = normTipo(prop.tipo || 'casa');
    const m2C      = prop.construccion || 0;
    const m2T      = prop.terreno || 0;
    // +15% para inmuebles con uso mixto residencial+comercial (con local)
    const tieneLocal = /con local/i.test(prop.tipoRaw || prop.tipo || '');
    const factorComercial = tieneLocal ? 1.15 : 1.00;

    // Suma de Partes: terreno domina (ratio > 4) y la colonia no es vaga
    const ratioTerr = m2C > 0 && m2T > 0 ? m2T / m2C : 0;
    if (ratioTerr > 4 && m2T > 200) {
        const sp = sumaDePartes(muniNorm, colNorm, m2T, m2C, prop.edad || 0, prop.estadoConservacion, prop.esEjidal || false);
        if (sp && sp.valor > 0) return { ...sp, confianza: 'MEDIA', cv: 0, pm2cAvg: Math.round(sp.valor / Math.max(m2C, 1)) };
    }

    // Suma de Partes alternativa: colonia sin datos exactos en scraper + terreno disponible
    // Se activa DESPUÉS de correr el motor (ver abajo) — marcador para post-proceso

    // Detectar colonia vaga: si la colonia normalizada coincide con el municipio
    // o está en la lista de municipios → no usar exacta, ir directamente a similares/general
    const coloniaEsVaga = !colNorm || NOMBRES_MUNICIPIO.has(colNorm) || colNorm === muniNorm;

    // Colonia vaga → usar "X centro" para lookups de NSE e IDX (evita mezclar toda la ciudad)
    const colNormEfectivo = (coloniaEsVaga && colNorm) ? colNorm + ' centro' : colNorm;

    // NSE — pasa tipo del sujeto para que idx_valoracion use la entrada correcta
    const nseSubjeto = getNSE(colNormEfectivo, tipo);
    const similaresBrutos = getSimilares(colNorm, muniNorm).slice(0, 8).map(x => normCol(x.colonia));
    const similares = nseSubjeto
        ? similaresBrutos.filter(s => {
            const ns = getNSE(s);
            if (!ns) return true; // sin NSE: mantener (puede ser válido)
            return Math.abs(ns.nseIdx - nseSubjeto.nseIdx) <= 1;
          })
        : similaresBrutos;

    // Pool base
    const todos = listingsEnMuni(muniNorm, tipo);

    // Banda de precio zona — anclada en datos locales (colonia o similares)
    const enColoniaTodos = colNorm ? todos.filter(d => {
        const dc = normCol(d.co);
        return dc.includes(colNorm) || colNorm.includes(dc);
    }) : [];
    const enNSEBrutos = similares.length ? todos.filter(d => {
        const dc = normCol(d.co);
        return similares.some(s => dc.includes(s) || s.includes(dc));
    }) : [];
    // Anti-outlier: quitar similares cuyo pm2c sea >2× la mediana del grupo
    const pm2sNSE = enNSEBrutos.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    const medNSE  = pm2sNSE.length ? mediana(pm2sNSE) : 0;
    const enNSETodos = medNSE > 0
        ? enNSEBrutos.filter(d => { const pm2 = d.p / d.c; return pm2 >= medNSE * 0.40 && pm2 <= medNSE * 2.20; })
        : enNSEBrutos;
    const fuenteBanda = enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos];
    const pm2sBanda = fuenteBanda.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    // Si hay datos locales (colonia o similares), usarlos para la banda
    // Si no, NO aplicar banda de precio (solo filtro por m²C) — evitar sesgo del promedio municipal
    const tieneAnclaje = pm2sBanda.length >= 3;
    const medRef    = tieneAnclaje ? mediana(pm2sBanda) : 0;
    const bandaMin  = tieneAnclaje ? medRef * 0.40 : 0;
    const bandaMax  = tieneAnclaje ? medRef * 1.60 : Infinity;

    // Tiers de escalafón
    const tierLo = m2C <= 62 ? 30 : m2C <= 100 ? 52 : m2C <= 145 ? 88 : m2C <= 200 ? 125 : 170;
    const tierHi = m2C <= 62 ? 72 : m2C <= 100 ? 112 : m2C <= 145 ? 162 : m2C <= 200 ? 225 : 9999;

    // Pool filtrado
    const pool = dedup(todos.filter(d => {
        if (m2C > 0 && Math.abs(d.c - m2C) / Math.max(d.c, m2C) >= 0.50) return false;
        const pm2 = d.p / d.c;
        return pm2 >= bandaMin && pm2 <= bandaMax;
    }));

    // Cascada
    const enColonia = (!coloniaEsVaga && colNorm) ? pool.filter(d => {
        const dc = normCol(d.co);
        if (!dc || dc.length < 5) return false;
        const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
        return ratio >= 0.55 && (dc.includes(colNorm) || colNorm.includes(dc));
    }) : [];

    let candidatos = enColonia;
    let poolTipo = coloniaEsVaga ? 'general' : 'exacta';

    if (candidatos.length < 3 && similares.length > 0) {
        const enSim = pool.filter(d => {
            const dc = normCol(d.co);
            if (!dc || dc.length < 4) return false;
            if (colNorm && (dc.includes(colNorm) || colNorm.includes(dc))) return false;
            return similares.some(s => s.length >= 4 && dc.includes(s));
        });
        if (enSim.length > 0) {
            candidatos = [...enColonia, ...enSim];
            poolTipo = 'similares';
        }
    }

    if (candidatos.length < 3) {
        candidatos = pool;
        poolTipo = 'general';
        if (nseSubjeto) {
            const generalNSE = candidatos.filter(d => {
                const nsd = getNSE(normCol(d.co));
                if (!nsd) return true;
                return Math.abs(nsd.nseIdx - nseSubjeto.nseIdx) <= 1;
            });
            if (generalNSE.length >= 3) candidatos = generalNSE;
        }
    }

    // Score + top-10
    const scored = candidatos.map(d => {
        const dc = normCol(d.co);
        let s = m2C > 0 ? 1 - Math.abs(d.c - m2C) / Math.max(d.c, m2C) : 0;
        if (colNorm && dc.length >= 5 && (dc.includes(colNorm) || colNorm.includes(dc))) s += 0.50;
        else if (dc.length >= 4 && similares.some(x => dc.includes(x))) s += 0.25;
        return { precio: d.p, m2_const: d.c, score: s };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    // Filtro post-scoring por escalafón
    const enTier = scored.filter(d => d.m2_const >= tierLo && d.m2_const <= tierHi);
    const comps  = enTier.length >= 3 ? enTier : scored;

    if (!comps.length) return { valor: 0, confianza: 'N/A', nComps: 0, poolTipo, error: 'sin_comps' };

    // Remi
    const pm2c     = comps.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const edad     = prop.edad || 0;
    const edadEfectiva = calcEdadEfectiva(edad, prop.estadoConservacion);
    const floorEdad  = FLOOR_EDAD_SIMILARES[prop.estadoConservacion] ?? 0.85;
    const factorEdad = poolTipo === 'exacta'   ? 1.0
                     : poolTipo === 'similares' ? Math.max(floorEdad,  1 - (edadEfectiva - 10) * 0.005)
                     :                            Math.max(0.70,       1 - (edadEfectiva - 10) * 0.01);
    const factorConserv = FACTORES_CONSERVACION[prop.estadoConservacion] || 1.00;
    const factorNeg     = 0.95;

    const compsFilt = comps.filter((c, i) => pm2cFilt.includes(pm2c[i]));
    let suma = 0;
    compsFilt.forEach(c => {
        const pu = c.precio / c.m2_const;
        suma += pu * Math.pow(c.m2_const / m2C, 1/6) * factorEdad * factorConserv;
    });
    let pm2cAvg = suma / compsFilt.length;

    // Cap: si exacta tiene datos sólidos (n≥10) y el pm2cAvg supera la mediana del IDX en >15%,
    // usar la mediana como techo. Evita que el tier filter seleccione solo los listings caros
    // ignorando los baratos de la misma colonia.
    if (poolTipo === 'exacta') {
        const exactaIDX = IDX[muniNorm]?.[tipo]?.[colNorm];
        if (exactaIDX && exactaIDX.count >= 10 && exactaIDX.medianaPm2c > 0) {
            const techo = exactaIDX.medianaPm2c * 1.05;
            if (pm2cAvg > techo) pm2cAvg = techo;
        }
    }

    // Cap NSE: para similares/general, si el sujeto tiene NSE con medianaPm2 conocida,
    // limitar pm2cAvg a medianaPm2 × 1.15. Evita que el pool general infle colonias sin IDX.
    // También aplica a exacta con muy pocos comps (< 4) — muestra demasiado pequeña para ser confiable.
    if (nseSubjeto && nseSubjeto.medianaPm2 > 0) {
        const aplicarCap = poolTipo !== 'exacta' || comps.length < 4;
        if (aplicarCap) {
            const techoNSE = nseSubjeto.medianaPm2 * 1.15;
            if (pm2cAvg > techoNSE) pm2cAvg = techoNSE;
        }
    }

    const valor   = Math.round(pm2cAvg * m2C * factorNeg * factorComercial);

    const mean   = avg(pm2cFilt);
    const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
    const cv     = mean > 0 ? stddev / mean : 1;
    const m2cZona = (enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos])
        .map(d => d.c).filter(v => v > 5 && v < 2000);

    const resultBase = {
        valor,
        confianza: cv < 0.15 ? 'ALTA' : cv < 0.25 ? 'MEDIA' : 'BAJA',
        cv:        +cv.toFixed(3),
        nComps:    compsFilt.length,
        pm2cAvg:   Math.round(pm2cAvg),
        poolTipo,
        medM2CZona: m2cZona.length >= 5 ? Math.round(mediana(m2cZona)) : 0,
        medPm2Zona: tieneAnclaje ? Math.round(medRef) : Math.round(avg(pm2cFilt)),
        _comps:    compsFilt.map(c => ({ precio: c.precio, m2c: c.m2_const })),
    };

    // ── Suma de partes como fallback cuando no hay comps residenciales propios ──
    // Condición: colonia sin datos exactos en IDX (<3 listings) Y pocos comps en pool
    // Se prefiere sobre el pool cuando la colonia carece de mercado residencial formal.
    const exactaCount = IDX[muniNorm]?.[tipo]?.[colNorm]?.count || 0;
    const sinMercadoExacto = exactaCount < 3 && compsFilt.length < 5;
    if (sinMercadoExacto && m2T > 0) {
        const sp = sumaDePartes(muniNorm, colNorm, m2T, m2C, prop.edad || 0, prop.estadoConservacion, prop.esEjidal || false);
        if (sp && sp.valor > 0) {
            // Promedio ponderado 60% suma_partes / 40% pool — si pool tiene algo útil
            // Si pool tiene nComps<3, usar 100% suma_partes
            if (compsFilt.length < 3) {
                return { ...sp, confianza: 'MEDIA', cv: 0, pm2cAvg: Math.round(sp.valor / Math.max(m2C, 1)) };
            }
            const valorMixto = Math.round(sp.valor * 0.6 + valor * 0.4);
            return { ...resultBase, valor: valorMixto, pm2cAvg: Math.round(valorMixto / Math.max(m2C, 1)),
                     poolTipo: 'suma_partes_mix', nComps: compsFilt.length,
                     pm2tRef: sp.pm2t, valorTerreno: sp.valorTerreno, valorConst: sp.valorConst };
        }
    }

    return resultBase;
}

// ── versión async con Gemini complementario (para validador y producción) ──
async function valuarPropiedadCompleto(prop) {
    const m2C = prop.construccion || 0;

    const result = valuarPropiedad(prop);

    const esUsoMixto = (prop.tipo || '').toLowerCase().includes('mixto');
    if (esUsoMixto && result.valor > 0 && result.poolTipo !== 'general') {
        result.valor       = Math.round(result.valor * 1.15);
        result.pm2cAvg     = Math.round((result.pm2cAvg || 0) * 1.15);
        result.factorMixto = 1.15;
    }

    const colNormFb  = normCol(prop.colonia || '');
    const muniNormFb = normMuni(prop.municipio || '');
    const tipoFb     = normTipo(prop.tipo || 'casa');
    const simFb      = getSimilares(colNormFb, muniNormFb).slice(0, 6).map(x => x.colonia);
    const conserv    = prop.estadoConservacion || prop.conservacion;
    const edad       = prop.edad || 0;

    // pm2c de referencia para orientar a Gemini en el rango correcto de precios
    const idxPm2c = result.medPm2Zona || IDX[muniNormFb]?.[tipoFb]?.[colNormFb]?.medianaPm2c || 0;

    // ── Modo COMPLEMENTO: caché tiene pocos comps → Serper (Google) agrega los faltantes ──
    const COMPS_MIN = 8;
    const poolNoComplementable = ['suma_partes', 'suma_partes_mix', 'atipica'];
    const necesitaComplemento = !result.error
        && result.nComps > 0 && result.nComps < COMPS_MIN
        && !poolNoComplementable.includes(result.poolTipo)
        && !!process.env.SERPER_API_KEY;

    if (necesitaComplemento) {
        const compsExtra = await buscarCompsConWeb(prop, simFb);
        if (compsExtra.length > 0) {
            const cacheComps = result._comps || [];
            const combined   = [...cacheComps, ...compsExtra].slice(0, 10);
            if (combined.length > cacheComps.length) {
                const rg = remiSobreComps(combined, m2C, edad, conserv, result.poolTipo);
                // Solo aplicar si CV mejora Y el valor no se aleja >10% del estimate original de caché
                const valorDelta = result.valor > 0 ? Math.abs(rg.valor - result.valor) / result.valor : 1;
                if (rg && rg.valor > 0 && rg.cv <= result.cv && valorDelta <= 0.10) {
                    delete result._comps;
                    return { ...result, ...rg, poolTipo: result.poolTipo + '+w', nComps: rg.nComps, geminiComps: compsExtra };
                }
            }
        }
    }

    // ── Modo FALLBACK: caché tiene 0 comps → Serper+DeepSeek primero, Gemini último recurso ──
    const necesitaFallback = result.error === 'sin_comps' || result.nComps === 0;

    if (necesitaFallback) {
        // 1. Serper (Google real) + DeepSeek extrae
        let compsIA = await buscarCompsConWeb(prop, simFb);
        let poolIA  = 'web';

        // 2. Gemini solo si Serper no encontró suficientes
        if (compsIA.length < 3 && _gemini) {
            compsIA = await buscarCompsGemini(prop, simFb, idxPm2c);
            poolIA  = 'gemini';
        }

        if (compsIA.length >= 3) {
            const rg = remiSobreComps(compsIA, m2C, edad, conserv, 'general');
            if (rg && rg.valor > 0) {
                return { ...rg, poolTipo: poolIA,
                    medM2CZona: result.medM2CZona || 0,
                    medPm2Zona: result.medPm2Zona || 0,
                    geminiComps: compsIA };
            }
        }
    }

    delete result._comps;
    return result;
}

// ── export para uso inline (validador, tests) ─────────────────────────────────
module.exports = { valuarPropiedad, valuarPropiedadCompleto, normCol, normMuni, normTipo, getSimilares };

// ── stdin/stdout ──────────────────────────────────────────────────────────────
if (require.main !== module) return; // solo corre stdin/stdout cuando es el proceso principal
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => raw += d);
process.stdin.on('end', async () => {
    try {
        const prop = JSON.parse(raw);
        const m2C  = prop.construccion || 0;

        // Usar valuarPropiedadCompleto para mantener lógica idéntica (complemento + fallback Gemini)
        const result = await valuarPropiedadCompleto(prop);
        process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
        process.stdout.write(JSON.stringify({ error: e.message, valor: 0 }) + '\n');
        process.exit(1);
    }
});

