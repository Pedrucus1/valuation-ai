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
const { spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const _gemini = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const _deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
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

const { coloniasCercanas } = require('./_geo/proximidad.cjs');

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
        if (rec.nse?.v1)     return rec.nse.v1;       // calibración histórica (gana siempre)
        if (rec.nse?.perito) return rec.nse.perito;   // flywheel: avalúo real verificado (llena huecos sobre scraper)
        if (rec.nse?.v2)     return rec.nse.v2;
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
        .replace(/san pedro tlaquepaque/, 'tlaquepaque')  // nombre oficial de Tlaquepaque (antes duplicaba → "tlaquepaquetlaquepaque")
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z.niga/, 'tlajomulco')
        .replace(/(\b\w+)\1\b/, '$1');  // colapsa nombre duplicado por bugs previos (xx→x)
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
        a.findIndex(x => Math.abs(x.precio - d.precio) / Math.max(x.precio, 1) < 0.02 && x.m2c === d.m2c) === i
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

// Enriquece los comps web (URLs reales de Serper) abriendo el listing con el
// extractor Python (enrich_urls.py): agrega edad (an) y mejora m²C/m²T, y los
// guarda en mercado_props (flywheel). Nunca rompe la valuación: ante error/timeout
// devuelve los comps tal cual. Desactivable con MOTOR_NO_ENRIQUECER_WEB=1.
async function enriquecerCompsWeb(comps, prop) {
    if (process.env.MOTOR_NO_ENRIQUECER_WEB === '1') return comps;
    const conUrl = (comps || []).filter(c => c && c.url && /^https?:\/\//.test(c.url));
    if (!conUrl.length) return comps;
    const py = process.env.SCRAPER_PYTHON || 'python';
    const dir = path.join(__dirname, '..', 'scraper-inmuebles');
    const payload = JSON.stringify(conUrl.map(c => ({
        url: c.url, precio: c.precio, colonia: prop.colonia || '',
        municipio: prop.municipio || '', tipo: (prop.tipo || 'casa'),
        portal: c.portal || 'serper',
    })));
    try {
        const enriched = await new Promise((resolve) => {
            const ps = spawn(py, ['enrich_urls.py', '--save', '--deadline', '20'], { cwd: dir });
            let out = '';
            const killer = setTimeout(() => { try { ps.kill(); } catch (e) {} resolve({}); }, 32000);
            ps.stdout.on('data', d => { out += d; });
            ps.on('close', () => { clearTimeout(killer); try { resolve(JSON.parse(out || '{}')); } catch (e) { resolve({}); } });
            ps.on('error', () => { clearTimeout(killer); resolve({}); });
            try { ps.stdin.write(payload); ps.stdin.end(); } catch (e) {}
        });
        comps.forEach(c => {
            const ed = enriched[c.url];
            if (!ed) return;
            if (ed.anio_construccion) c.anio = ed.anio_construccion;   // edad real del listing
            if ((!c.m2c || c.m2c <= 0) && ed.m2_construccion) c.m2c = ed.m2_construccion;
            if ((!c.m2t || c.m2t <= 0) && ed.m2_terreno) c.m2t = ed.m2_terreno;
            c.enriquecido = true;
        });
    } catch (e) { /* nunca romper la valuación por el enriquecimiento */ }
    return comps;
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
        const compsWeb = (parsed.comparables || [])
            .map(c => ({
                precio: parseFloat(String(c.precio).replace(/[^0-9.]/g, '')) || 0,
                m2c:    parseFloat(String(c.m2c).replace(/[^0-9.]/g, ''))   || 0,
                m2t:    parseFloat(String(c.m2t || 0).replace(/[^0-9.]/g, '')) || 0,
                url:    c.url || '',
                portal: 'serper',
            }))
            .filter(c => c.precio > 200000 && c.m2c > 15 && c.url
                      && c.m2c >= m2Min && c.m2c <= m2Max); // filtro de tamaño real
        // Enriquecer abriendo el listing real (edad + m² de detalle) y guardar (flywheel)
        return await enriquecerCompsWeb(compsWeb, prop);
    } catch (e) {
        return [];
    }
}

// ── Acumulación de comparables reales (3a) ───────────────────────────────────
// Cada comp con URL real hallado en la búsqueda web se guarda en un log NDJSON
// (append-only, una línea por comp → seguro ante avalúos concurrentes).
// Hace crecer la base de comps útiles del motor. NO altera la valuación.
// Desactivar con MOTOR_NO_ACUMULAR=1. Consolidar/dedup con: node consolidar_comps_acumulados.js
const COMPS_ACUM_PATH = path.join(__dirname, 'comps_acumulados.ndjson');
function acumularComps(comps, prop, origen) {
    if (process.env.MOTOR_NO_ACUMULAR === '1') return;
    if (!Array.isArray(comps) || !comps.length) return;
    try {
        const fecha = new Date().toISOString().slice(0, 10);
        const lineas = comps
            .filter(c => c && c.url && c.precio > 0 && c.m2c > 0)   // solo listings reales (con URL)
            .map(c => JSON.stringify({
                url: c.url, precio: c.precio, m2c: c.m2c, m2t: c.m2t || 0,
                portal: c.portal || 'web',
                colonia: prop.colonia || '', municipio: prop.municipio || '',
                tipo: prop.tipo || 'casa', fecha, origen,
            }))
            .join('\n');
        if (lineas) fs.appendFileSync(COMPS_ACUM_PATH, lineas + '\n');
    } catch (e) { /* nunca romper la valuación por el log */ }
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
        for (const l of data.listings) out.push({ precio: l.precio, m2c: l.m2c, m2t: l.m2t || 0, colonia: col, anio: l.anio || null,
            recamaras: l.recamaras || 0, banos: l.banos || 0, estac: l.estac || 0 });  // #121 DV
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

// Tope de comparables por avalúo (3b), diferenciado por calidad de la pool:
// - exacta/similares (hay ancla de colonia): más comps ayudan → 15
// - general (sin ancla de colonia): más comps = más ruido de zona → se mantiene apretado en 10
// Hallazgo medido 01-Jun: cap 15 plano mejora ±10/±15 pero empeora ±20 en pools general.
const COMP_CAP = 15;
const COMP_CAP_GENERAL = 10;

function sumaDePartes(muniNorm, colNorm, m2T, m2C, edad, conservacion, esEjidal = false, pm2tOverride = 0) {
    // Buscar pm2T en IDX de terrenos: colonia exacta (n≥3) → zona padre → similares residencial → municipal
    let pm2t = pm2tOverride || 0, nTerrenos = pm2tOverride ? 1 : 0;
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

    // 3. Colonias similares: pm2T residual de casas — solo cuando terreno domina (ratio>2)
    const ratioCheck = m2C > 0 ? m2T / m2C : 0;
    if (!pm2t && colNorm && ratioCheck > 2) {
        const simCols = getSimilares(colNorm, muniNorm).map(s => normCol(s.colonia));
        const casasMuni = IDX[muniNorm]?.['casa'] ?? {};
        const pm2tsSim = [];
        for (const sim of simCols) {
            const cell = casasMuni[sim];
            if (!cell || !cell.listings) continue;
            for (const l of cell.listings) {
                if (!l.m2t || l.m2t < 50 || !l.m2c || l.m2c < 30 || !l.precio) continue;
                const costoConst = 12000 * 1.20 * l.m2c * 0.85; // media NSE, dep ~15%
                const residual = (l.precio - costoConst) / l.m2t;
                if (residual > 500 && residual <= PM2T_MAX_PLAUSIBLE) pm2tsSim.push(residual);
            }
        }
        if (pm2tsSim.length >= 3) {
            pm2t = Math.round(mediana(pm2tsSim));
            nTerrenos = pm2tsSim.length;
        }
    }

    // 4. Mediana municipal de terrenos (fallback amplio)
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

// ── Gate LOTE GRANDE (CUS<0.40): homologación CUS del perito ──────────────────
// Casa chica en lote grande: el flujo m²C subvalúa (ignora el terreno de más). Se valúa
// homologando comps por superficie/CUS + valor de suelo (semilla pm2T). VÍA APARTE — no toca
// el flujo normal (CUS≥0.40), 0 riesgo de regresión. Validado: OPI-26-5-16 −1.3% (Remi daba −52%).
const PM2T_SEMILLA = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'pm2t_semilla.json'), 'utf8')).zonas || {}; } catch { return {}; } })();
const CAL_CONSERV_LG = { bueno: 0.95, regular_bueno: 0.92, regular_medio: 0.89, regular: 0.89, regular_bajo: 0.86, malo: 0.82, remodelado: 0.90, remodelada: 0.90 };
function pm2tSemilla(muniNorm, colNorm, sims) {
    if (PM2T_SEMILLA[`${muniNorm}|${colNorm}`]) return PM2T_SEMILLA[`${muniNorm}|${colNorm}`].pm2T;
    for (const s of (sims || [])) if (PM2T_SEMILLA[`${muniNorm}|${s}`]) return PM2T_SEMILLA[`${muniNorm}|${s}`].pm2T;
    return 0;
}
function valuarLoteGrandeCUS(prop, muniNorm, colNorm, tipo, m2C, m2T) {
    const cusSuj = m2C / m2T;
    const sims = getSimilares(colNorm, muniNorm).slice(0, 6).map(x => normCol(x.colonia));
    const todos = listingsEnMuni(muniNorm, tipo).filter(d => d.m2t > 0 && d.m2c > 0 && d.precio > 0);
    const esCol = d => { const dc = normCol(d.colonia); return dc && dc.length >= 4 && (dc.includes(colNorm) || colNorm.includes(dc)); };
    const esSim = d => { const dc = normCol(d.colonia); return dc && dc.length >= 4 && sims.some(s => s.length >= 4 && (dc.includes(s) || s.includes(dc))); };
    // Priorizar colonia EXACTA (como el perito); ampliar a similares solo si hay <3.
    const exact = todos.filter(esCol);
    const casa  = exact.length >= 3 ? exact : [...exact, ...todos.filter(esSim)];
    if (casa.length < 3) return null;
    const pm2T = pm2tSemilla(muniNorm, colNorm, sims);
    if (!pm2T) return null;  // sin valor de suelo confiable → caer al flujo normal
    const K = 0.8;  // descuento del terreno excedente (rendimiento decreciente del lote grande)
    const pus = casa.slice(0, 15).map(d => {
        const cusC = d.m2c / d.m2t;
        const pu = d.precio / d.m2c + K * pm2T * (1 / cusSuj - 1 / cusC);
        return pu * Math.pow(cusSuj / cusC, 1 / 6) * Math.pow(m2T / d.m2t, 1 / 6);
    });
    const puAvg = pus.reduce((a, b) => a + b, 0) / pus.length;
    const cal = CAL_CONSERV_LG[(prop.estadoConservacion || '').toLowerCase()] || 0.89;
    let valor = puAvg * m2C * cal;
    // Tope sobre el valor TOTAL, anclado al nivel de la colonia EN SU MUNICIPIO. El cache (IDX)
    // está indexado por muni→tipo→colonia → SIN colisión de nombres (Nueva Santa María Tlaquepaque
    // ≠ Guadalajara). Fallback al NSE por nombre solo si la colonia no tiene celda en el cache.
    const cellTope = IDX[muniNorm]?.[tipo]?.[colNorm];
    const techoPm2 = (cellTope && cellTope.medianaPm2c > 0) ? cellTope.medianaPm2c : (getNSE(colNorm, tipo)?.medianaPm2 || 0);
    if (techoPm2 > 0) valor = Math.min(valor, techoPm2 * 1.30 * m2C);
    if (!(valor > 0)) return null;
    return { valor: Math.round(valor), confianza: casa.length >= 5 ? 'MEDIA' : 'BAJA', cv: 0,
             nComps: casa.length, poolTipo: 'lote_grande_cus', pm2cAvg: Math.round(valor / Math.max(m2C, 1)) };
}

function valuarPropiedad(prop) {
    const muniNorm = normMuni(prop.municipio || '');
    const colNorm  = normCol(prop.colonia || '');
    const tipo     = normTipo(prop.tipo || 'casa');
    const m2C      = prop.construccion || 0;
    const m2T      = prop.terreno || 0;
    // +15% para inmuebles con uso mixto residencial+comercial (con local)
    const tieneLocal = /con local/i.test(prop.tipoRaw || prop.tipo || '');
    const factorComercial = tieneLocal ? 1.15 : 1.00;

    // ── Routing Y: ratio > 4 → Motor 2 directo (terreno domina fuertemente) ──
    // ratio ≤ 4 → Motor 1 primero; suma_partes como fallback post-Motor-1
    const ratioTerr = m2C > 0 && m2T > 0 ? m2T / m2C : 0;
    if (ratioTerr > 4 && m2T > 200) {
        const sp = sumaDePartes(muniNorm, colNorm, m2T, m2C, prop.edad || 0, prop.estadoConservacion, prop.esEjidal || false);
        if (sp && sp.valor > 0) return { ...sp, confianza: 'MEDIA', cv: 0, pm2cAvg: Math.round(sp.valor / Math.max(m2C, 1)) };
    }

    // Gate LOTE GRANDE: CUS<0.50 (ratioTerr>2.0) → homologación CUS si hay comps + semilla pm2T.
    // Umbral validado 30-jun: 0.50 mejor que 0.40 (band 0.40-0.50 mejoró sin romper; err 16.7→16.2).
    // Si no hay datos, retorna null y sigue el flujo normal (no empeora nada).
    if (ratioTerr > 2.0 && m2C >= 40 && m2T > 0) {
        const lg = valuarLoteGrandeCUS(prop, muniNorm, colNorm, tipo, m2C, m2T);
        if (lg) return lg;
    }

    // Suma de Partes alternativa: colonia sin datos exactos en scraper + terreno disponible
    // Se activa DESPUÉS de correr el motor (ver abajo) — marcador para post-proceso

    // Detectar colonia vaga: si la colonia normalizada coincide con el municipio
    // o está en la lista de municipios → no usar exacta, ir directamente a similares/general
    const coloniaEsVaga = !colNorm || NOMBRES_MUNICIPIO.has(colNorm) || colNorm === muniNorm;

    // Colonia vaga → usar "X centro" para lookups de NSE e IDX (evita mezclar toda la ciudad)
    const colNormEfectivo = (coloniaEsVaga && colNorm) ? colNorm + ' centro' : colNorm;

    // NSE — pasa tipo del sujeto para que idx_valoracion use la entrada correcta
    let nseSubjeto = getNSE(colNormEfectivo, tipo);
    // Anti-colisión de nombres: si el NSE hallado es de OTRO municipio (misma colonia, distinto
    // lugar — ej. Nueva Santa María Guadalajara vs Tlaquepaque), usar el nivel de la colonia EN SU
    // municipio (cache, indexado por muni → sin colisión). Solo afecta colonias colisionadas.
    const _maeMuni = _maestro && _maestro[colNormEfectivo] && _maestro[colNormEfectivo].municipio;
    if (nseSubjeto && _maeMuni && normMuni(_maeMuni) !== muniNorm) {
        const cellSuj = IDX[muniNorm]?.[tipo]?.[colNorm];
        nseSubjeto = (cellSuj && cellSuj.medianaPm2c > 0)
            ? { ...nseSubjeto, medianaPm2: cellSuj.medianaPm2c, fuente: 'cache-muni' }
            : null;  // sin dato muni-correcto → no aplicar el tope de otra zona
    }
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
        const dc = normCol(d.colonia);
        return dc.includes(colNorm) || colNorm.includes(dc);
    }) : [];
    const enNSEBrutos = similares.length ? todos.filter(d => {
        const dc = normCol(d.colonia);
        return similares.some(s => dc.includes(s) || s.includes(dc));
    }) : [];
    // Anti-outlier: quitar similares cuyo pm2c sea >2× la mediana del grupo
    const pm2sNSE = enNSEBrutos.map(d => d.precio / d.m2c).filter(v => v > 0 && isFinite(v));
    const medNSE  = pm2sNSE.length ? mediana(pm2sNSE) : 0;
    const enNSETodos = medNSE > 0
        ? enNSEBrutos.filter(d => { const pm2 = d.precio / d.m2c; return pm2 >= medNSE * 0.40 && pm2 <= medNSE * 2.20; })
        : enNSEBrutos;
    const fuenteBanda = enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos];
    const pm2sBanda = fuenteBanda.map(d => d.precio / d.m2c).filter(v => v > 0 && isFinite(v));
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
        if (m2C > 0 && Math.abs(d.m2c - m2C) / Math.max(d.m2c, m2C) >= 0.50) return false;
        const pm2 = d.precio / d.m2c;
        return pm2 >= bandaMin && pm2 <= bandaMax;
    }));

    // Cascada
    const enColonia = (!coloniaEsVaga && colNorm) ? pool.filter(d => {
        const dc = normCol(d.colonia);
        if (!dc || dc.length < 5) return false;
        const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
        return ratio >= 0.55 && (dc.includes(colNorm) || colNorm.includes(dc));
    }) : [];

    let candidatos = enColonia;
    let poolTipo = coloniaEsVaga ? 'general' : 'exacta';

    if (candidatos.length < 3 && similares.length > 0) {
        const enSim = pool.filter(d => {
            const dc = normCol(d.colonia);
            if (!dc || dc.length < 4) return false;
            if (colNorm && (dc.includes(colNorm) || colNorm.includes(dc))) return false;
            return similares.some(s => s.length >= 4 && dc.includes(s));
        });
        if (enSim.length > 0) {
            candidatos = [...enColonia, ...enSim];
            poolTipo = 'similares';
        }
    }

    if (candidatos.length < 3 && !coloniaEsVaga) {
        const cercanas = coloniasCercanas(colNorm, muniNorm, 2.5);
        const yaIncluidas = new Set([colNorm, ...similares.map(s => normCol(s))]);
        let agregadosPorCP = false;
        
        for (const c of cercanas) {
            if (yaIncluidas.has(c.colonia)) continue;
            
            const listingsCercana = listingsEnMuni(normMuni(c.municipio), tipo)
                .filter(d => normCol(d.colonia) === c.colonia);
                
            const filtrados = listingsCercana.filter(d => {
                if (m2C > 0 && Math.abs(d.m2c - m2C) / Math.max(d.m2c, m2C) >= 0.50) return false;
                const pm2 = d.precio / d.m2c;
                return pm2 >= bandaMin && pm2 <= bandaMax;
            });
            
            // Aplicar el mismo filtro NSE que similares (±1)
            const filtradosNSE = nseSubjeto ? filtrados.filter(d => {
                const nsd = getNSE(c.colonia);
                if (!nsd) return true; // sin NSE: mantener (asumimos válido por proximidad)
                return Math.abs(nsd.nseIdx - nseSubjeto.nseIdx) <= 1;
            }) : filtrados;

            if (filtradosNSE.length > 0) {
                candidatos.push(...filtradosNSE);
                yaIncluidas.add(c.colonia);
                agregadosPorCP = true;
                if (candidatos.length >= 5) break; // cap de refuerzo
            }
        }
        if (agregadosPorCP) poolTipo = poolTipo === 'exacta' ? 'similares+cp' : poolTipo + '+cp';
    }

    if (candidatos.length < 3) {
        candidatos = pool;
        poolTipo = 'general';
        if (nseSubjeto) {
            const generalNSE = candidatos.filter(d => {
                const nsd = getNSE(normCol(d.colonia));
                if (!nsd) return true;
                return Math.abs(nsd.nseIdx - nseSubjeto.nseIdx) <= 1;
            });
            if (generalNSE.length >= 3) candidatos = generalNSE;
        }
    }

    // Score + top-N (3b-A: COMP_CAP 10→15 para no conformarse con pocos comps)
    const scored = candidatos.map(d => {
        const dc = normCol(d.colonia);
        let s = m2C > 0 ? 1 - Math.abs(d.m2c - m2C) / Math.max(d.m2c, m2C) : 0;
        if (colNorm && dc.length >= 5 && (dc.includes(colNorm) || colNorm.includes(dc))) s += 0.50;
        else if (dc.length >= 4 && similares.some(x => dc.includes(x))) s += 0.25;
        return { precio: d.precio, m2_const: d.m2c, score: s, an: d.anio || null,
                 m2t: d.m2t || 0, rec: d.recamaras || 0, ban: d.banos || 0 };  // #121 DV
    }).sort((a, b) => b.score - a.score).slice(0, poolTipo === 'general' ? COMP_CAP_GENERAL : COMP_CAP);

    // Filtro post-scoring por escalafón
    const enTier = scored.filter(d => d.m2_const >= tierLo && d.m2_const <= tierHi);
    let comps  = enTier.length >= 3 ? enTier : scored;

    // Filtro de SEGMENTO de precio (como el perito: no mezclar segmentos). Si el sujeto tiene
    // nivel NSE conocido (muni-correcto), descartar comps cuyo $/m²C esté fuera de [0.55,1.55]×
    // la mediana de la zona. Conservador: solo si hay ≥5 comps y quedan ≥3 tras filtrar.
    if (nseSubjeto && nseSubjeto.medianaPm2 > 0 && comps.length >= 5) {
        const lo = nseSubjeto.medianaPm2 * 0.55, hi = nseSubjeto.medianaPm2 * 1.55;
        const seg = comps.filter(c => { const pu = c.precio / c.m2_const; return pu >= lo && pu <= hi; });
        if (seg.length >= 3) comps = seg;
    }

    if (!comps.length) return { valor: 0, confianza: 'N/A', nComps: 0, poolTipo, error: 'sin_comps' };

    // Remi
    const pm2c     = comps.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const edad     = prop.edad || 0;
    const edadEfectiva = calcEdadEfectiva(edad, prop.estadoConservacion);
    const floorEdad  = FLOOR_EDAD_SIMILARES[prop.estadoConservacion] ?? 0.85;
    // #90 (opción 2) — ancla de edad relativa a la zona: si la colonia del sujeto tiene edadMedianaZona,
    // el descuento se mide contra la edad típica de la zona (no contra un fijo 10). Un sujeto tan viejo
    // como su zona ya no se sobre-deprecia. Fallback a 10 cuando no hay dato → comportamiento idéntico.
    const _cellEdad = IDX[muniNorm]?.[tipo]?.[colNorm];
    const anclaEdad = (_cellEdad && _cellEdad.edadMedianaZona != null) ? _cellEdad.edadMedianaZona : 10;
    const factorEdad = poolTipo === 'exacta'   ? 1.0
                     : poolTipo === 'similares' ? Math.max(floorEdad,  1 - (edadEfectiva - anclaEdad) * 0.005)
                     :                            Math.max(0.70,       1 - (edadEfectiva - anclaEdad) * 0.01);
    const factorConserv = FACTORES_CONSERVACION[prop.estadoConservacion] || 1.00;
    const factorNeg     = 0.95;

    const compsFilt = comps.filter((c, i) => pm2cFilt.includes(pm2c[i]));

    // #121 — Ponderación por similitud (DV). En vez de promediar los comps parejo, se pesa cada uno
    // INVERSO a su distancia al sujeto sobre {m²C, m²T, recámaras, baños, año} estandarizados, y se
    // queda con los 8 más parecidos. Variable faltante (comp o sujeto = 0) no penaliza. Conserva los
    // ajustes de tamaño/edad/conservación. Validado en 103 OPIs (2025-2026): ±15 +2.9pp, ±20 +4.9pp,
    // 0 regresiones (rescata errores grandes; no afina lo que ya estaba en ±10). Ver reference_avm_metodologia.
    const DV_NMAX = 8, DV_EPS = 1.0, _curY = new Date().getFullYear();
    const _subj = { m2c: m2C, m2t: m2T || 0, rec: prop.recamaras || 0, ban: prop.banos || 0,
                    anio: edad > 0 ? _curY - edad : 0 };
    const _cv = (c, v) => v==='m2c' ? c.m2_const : v==='m2t' ? (c.m2t||0) : v==='rec' ? (c.rec||0)
                        : v==='ban' ? (c.ban||0) : (c.an||0);
    const _VARS = ['m2c','m2t','rec','ban','anio'];
    const _std = {};
    for (const v of _VARS) {
        const vals = compsFilt.map(c => _cv(c,v)).filter(x => x > 0);
        if (vals.length > 1) { const mu = vals.reduce((a,b)=>a+b,0)/vals.length;
            _std[v] = Math.sqrt(vals.map(x=>(x-mu)**2).reduce((a,b)=>a+b,0)/vals.length) || 1; }
        else _std[v] = 1;
    }
    const _DV = (c) => {
        let s=0, k=0;
        for (const v of _VARS) { const cv=_cv(c,v), sv=_subj[v];
            if (cv>0 && sv>0) { const d=(cv-sv)/_std[v]; s+=d*d; k++; } }
        return k ? Math.sqrt(s/k) : 1;   // RMS normalizado por #vars usadas
    };
    const _sel = compsFilt.map(c => ({
        adj: (c.precio/c.m2_const) * Math.pow(c.m2_const/m2C, 1/6) * factorEdad * factorConserv,
        dv:  _DV(c)
    })).sort((a,b) => a.dv - b.dv).slice(0, DV_NMAX);
    let _w=0, _vv=0;
    _sel.forEach(({adj,dv}) => { const wt = 1/(dv+DV_EPS); _vv += adj*wt; _w += wt; });
    let pm2cAvg = _w > 0 ? _vv/_w
        : (compsFilt.reduce((a,c)=>a+(c.precio/c.m2_const)*Math.pow(c.m2_const/m2C,1/6)*factorEdad*factorConserv,0)/compsFilt.length);

    // #121b-ANCHOR: reconciliación robusta anclada al NSE limpio (patrón jerárquico/multi-escala).
    // El pool puede estar envenenado por precios corruptos (MITULA/NOCNOK truncados) que arrastran la
    // mediana muy por debajo del valor real. La calibración NSE (medianaPm2) es un ancla LIMPIA de
    // colonia/zona. Filtramos comps implausibles vs el ancla; si quedan pocos → confiamos el ancla
    // (shrinkage bayesiano/jerárquico). Colapsa a no-op cuando el pool ya concuerda con el ancla.
    if (process.env.LAB_ANCHOR === '1' && nseSubjeto && nseSubjeto.medianaPm2 > 0) {
        const anchor = nseSubjeto.medianaPm2;
        const limpios = compsFilt.filter(c => { const pu = c.precio/c.m2_const; return pu >= 0.5*anchor && pu <= 2.0*anchor; });
        if (limpios.length >= 3) {
            let w2=0, v2=0;
            limpios.forEach(c => { const adj=(c.precio/c.m2_const)*Math.pow(c.m2_const/m2C,1/6)*factorEdad*factorConserv;
                const wt=1/(_DV(c)+DV_EPS); v2+=adj*wt; w2+=wt; });
            if (w2>0) pm2cAvg = v2/w2;
        } else {
            pm2cAvg = anchor * factorEdad * factorConserv;   // pool garbage-dominado → ancla limpia
        }
    }

    // #121b-A CAPS SIZE-AWARE: los caps se anclaban a la mediana de zona (dominada por casas
    // grandes), aplastando el $/m²C legítimo de casas chicas céntricas (premium por economía de
    // escala + suelo). Multiplicador que ELEVA el techo solo cuando el sujeto es más chico que su
    // zona; colapsa a 1.0 para sujetos de tamaño típico → CERO regresión en los que ya aciertan.
    const _mZona = (enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos])
        .map(d => d.m2c).filter(v => v > 5 && v < 2000);
    const _medM2CZona = _mZona.length >= 5 ? mediana(_mZona) : 0;
    const sizeAdj = (process.env.LAB_SIZECAP === '1' && _medM2CZona > 0 && m2C > 0 && m2C < 0.80 * _medM2CZona)
        ? Math.min(2.0, Math.pow(_medM2CZona / m2C, 1/3)) : 1.0;

    if (poolTipo === 'exacta') {
        const exactaIDX = IDX[muniNorm]?.[tipo]?.[colNorm];
        if (exactaIDX && exactaIDX.count >= 10 && exactaIDX.medianaPm2c > 0) {
            const techo = exactaIDX.medianaPm2c * 1.05 * sizeAdj;
            if (pm2cAvg > techo) pm2cAvg = techo;
        }
    }

    if (nseSubjeto && nseSubjeto.medianaPm2 > 0) {
        const aplicarCap = poolTipo !== 'exacta' || comps.length < 4;
        if (aplicarCap) {
            const techoNSE = nseSubjeto.medianaPm2 * 1.15 * sizeAdj;
            if (pm2cAvg > techoNSE) pm2cAvg = techoNSE;
        }
    }

    if (process.env.LAB_DEBUG && colNorm && colNorm.includes(process.env.LAB_DEBUG)) {
        console.error(`[DBG ${colNorm}] subjM2C=${m2C} pool=${poolTipo} nComps=${compsFilt.length} medM2CZona=${Math.round(_medM2CZona||0)} sizeAdj=${(sizeAdj||1).toFixed(2)} pm2cAvg=${Math.round(pm2cAvg)}`);
        console.error('  comps(m²@$/m²C): ' + compsFilt.map(c=>`${Math.round(c.m2_const)}@${Math.round(c.precio/c.m2_const)}`).join('  '));
    }
    const valor   = Math.round(pm2cAvg * m2C * factorNeg * factorComercial);

    const mean   = avg(pm2cFilt);
    const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
    const cv     = mean > 0 ? stddev / mean : 1;
    const m2cZona = (enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos])
        .map(d => d.m2c).filter(v => v > 5 && v < 2000);

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
    // Conteo de mercado de la colonia: usar los matches FUZZY (enColonia), no la clave EXACTA del
    // IDX — esta subcuenta cuando los listings están bajo nombres ligeramente distintos (ej.
    // "cortijo san agustin" vs "el cortijo san agustin"), y mandaba a suma_partes_mix colonias que
    // SÍ tienen comps reales (sobrevaluándolas). Fix 01-Jun-2026.
    const exactaCount = enColonia.length || (IDX[muniNorm]?.[tipo]?.[colNorm]?.count || 0);
    const sinMercadoExacto = exactaCount < 3 && compsFilt.length < 5;
    if (sinMercadoExacto && m2T > 0) {
        const sp = sumaDePartes(muniNorm, colNorm, m2T, m2C, prop.edad || 0, prop.estadoConservacion, prop.esEjidal || false);
        if (sp && sp.valor > 0) {
            // Promedio ponderado 60% suma_partes / 40% pool. Si pool tiene nComps<3, 100% suma_partes.
            if (compsFilt.length < 3) {
                return { ...sp, confianza: 'MEDIA', cv: 0, pm2cAvg: Math.round(sp.valor / Math.max(m2C, 1)) };
            }
            let valorMixto = Math.round(sp.valor * 0.6 + valor * 0.4);
            // #102: en lotes terreno-pesados sumaDePartes sobrevalúa fuerte (Emiliano Zapata, La
            // Experiencia, Albaterra). Cuando hay comps reales (3-4), el pool es señal de mercado:
            // si el mix la supera por >25%, recortar a pool×1.25. Asimétrico — NO toca el subvalúo
            // (donde suma_partes legítimamente sostiene comps baratos tipo remate). (Fix #102, 03-Jun)
            if (valor > 0 && valorMixto > valor * 1.25) valorMixto = Math.round(valor * 1.25);
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

    // ── Suma de Partes vía web: ratio > 2.5 pero sin pm2T en IDX ni similares ──
    // Busca terrenos en Google para estimar pm2T, luego corre sumaDePartes con ese valor.
    const ratioTerrWeb = (prop.terreno || 0) / Math.max(prop.construccion || 1, 1);
    const necesitaSumaPartesWeb = ratioTerrWeb > 2.5
        && (prop.terreno || 0) > 200
        && !['suma_partes', 'suma_partes_mix'].includes(result.poolTipo)
        && !!process.env.SERPER_API_KEY;

    if (necesitaSumaPartesWeb) {
        const propTerreno = { ...prop, tipo: 'terreno', tipoRaw: 'terreno en venta' };
        const compsTerreno = await buscarCompsConWeb(propTerreno, simFb);
        acumularComps(compsTerreno, prop, 'suma_partes_web');
        const pm2tVals = compsTerreno
            .filter(c => c.m2t > 50 && c.precio > 0)
            .map(c => c.precio / c.m2t)
            .filter(v => v > 500 && v <= PM2T_MAX_PLAUSIBLE);
        if (pm2tVals.length >= 2) {
            const pm2tWeb = Math.round(mediana(pm2tVals));
            const spWeb = sumaDePartes(muniNormFb, colNormFb, prop.terreno, m2C,
                                       edad, conserv, prop.esEjidal || false, pm2tWeb);
            if (spWeb && spWeb.valor > 0) {
                delete result._comps;
                return { ...spWeb, poolTipo: 'suma_partes_web', confianza: 'MEDIA',
                         pm2cAvg: Math.round(spWeb.valor / Math.max(m2C, 1)),
                         cv: 0, geminiComps: compsTerreno };
            }
        }
    }

    // ── Modo COMPLEMENTO: caché tiene pocos comps → Serper (Google) agrega los faltantes ──
    const COMPS_MIN = 8;
    const poolNoComplementable = ['suma_partes', 'suma_partes_mix', 'atipica'];
    const necesitaComplemento = !result.error
        && result.nComps > 0 && result.nComps < COMPS_MIN
        && !poolNoComplementable.includes(result.poolTipo)
        && !!process.env.SERPER_API_KEY;

    if (necesitaComplemento) {
        const compsExtra = await buscarCompsConWeb(prop, simFb);
        acumularComps(compsExtra, prop, 'complemento');   // guardar aunque luego se descarten
        if (compsExtra.length > 0) {
            const cacheComps = result._comps || [];
            const combined   = [...cacheComps, ...compsExtra].slice(0, COMP_CAP);
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
        acumularComps(compsIA, prop, 'fallback');   // guardar comps web reales (Gemini no trae URL → se ignora)
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

