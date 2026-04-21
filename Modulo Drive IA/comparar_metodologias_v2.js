/**
 * comparar_metodologias_v2.js — Árbol de decisión por tipo de propiedad
 *
 * Fixes v2b:
 *   1. Confidence flag: usa CV del cluster, no ratioZona vs perito
 *   2. ChatGPT fallback: enriquecido con snippets reales via Serper API
 *   3. Municipio padre: cajititlan→tlajomulco, santa anita→tlajomulco, etc.
 */

require('dotenv').config({ path: '../.env' });

const fs      = require('fs');
const path    = require('path');
const fetch   = require('node-fetch');
const gsc     = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI  = require('openai');

const SALIDA_SHEET_ID = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
const TAB_NOMBRE      = 'Metodologias V2b — 5 nuevos';
const genAI           = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai          = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 5 nuevas propiedades ──────────────────────────────────────────────────────
const FILTRO = [
  'Paseo Los Chopos 3245A',     // casa Tabachines Tlaquepaque
  'Lázaro Cárdenas 29 Vicente', // casa Zapopan edad 35
  'Ignacio Ramires 668',        // casa Santa Teresita Guadalajara
  'José María Coss 1653',       // casa La Guadalupana Guadalajara
  'Juan XXIII 20',              // terreno urbano Santa Anita Tlajomulco
];

// ── helpers ───────────────────────────────────────────────────────────────────
function cleanNum(s) {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  return parseFloat(s.toString().replace(/[^0-9.-]+/g, '')) || 0;
}

function antiRemate(arr) {
  if (arr.length <= 2) return arr;
  const s = [...arr].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)];
  const f = arr.filter(p => p >= med * 0.60 && p <= med * 1.60);
  return f.length >= 2 ? f : s.slice(1, -1).length >= 2 ? s.slice(1, -1) : arr;
}

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

function getRH(edad, vida = 70) {
  if (edad <= 0) return 1.0;
  const x = Math.min(1, edad / vida);
  return Math.max(0.20, 1 - 0.5 * (x + x * x));
}

const MXN  = v  => v ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v) : 'N/A';
const dif  = (c, r) => c && r ? (((c / r) - 1) * 100).toFixed(1) + '%' : 'N/A';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Tipo normalizado ──────────────────────────────────────────────────────────
const TIPO_SINONIMOS = {
  casa:         ['casa', 'casas', 'residencia', 'chalet', 'villa', 'campestre'],
  departamento: ['departamento', 'depto', 'apartamento', 'flat', 'loft', 'penthouse'],
  terreno:      ['terreno', 'lote', 'predio', 'solar'],
  local:        ['local comercial', 'local', 'comercial'],
  oficina:      ['oficina'],
  bodega:       ['bodega', 'almacen'],
};

function normalizaTipo(raw) {
  const r = (raw || '').toLowerCase();
  for (const [k, sins] of Object.entries(TIPO_SINONIMOS))
    if (sins.some(s => r.includes(s))) return k;
  return 'casa';
}

// ── Clasificación → ruta metodológica ────────────────────────────────────────
function clasificar(prop, tipoStr) {
  const t = (tipoStr || '').toLowerCase();
  if (t.includes('local') || t.includes('bodega') || t.includes('oficina') || t.includes('edificio'))
    return 'comercial';
  if (prop.construccion < 10 && prop.terreno > 0)
    return 'terreno_puro';
  // Terreno domina: campestre, hacienda, predio con construcciones
  if (prop.terreno > 0 && prop.construccion > 0 && prop.terreno / prop.construccion > 4)
    return 'suma_partes';
  return 'casa';
}

// ── Extracción de zona del filename ──────────────────────────────────────────
const MUNICIPIOS = [
  'zapopan', 'guadalajara', 'tlajomulco', 'tonalá', 'tonala',
  'tlaquepaque', 'puerto vallarta', 'bahía de banderas', 'bahia de banderas',
  'tepic', 'chapala', 'ajijic', 'cajititlan', 'cajititlán', 'las pintas',
];

// Colonia/localidad → municipio real cuando no aparece explícito en el filename
const MUNICIPIO_PADRE = {
  'cajititlan': 'tlajomulco', 'cajititlán': 'tlajomulco',
  'las pintas': 'tlajomulco', 'santa anita': 'tlajomulco',
  'hacienda santa fe': 'tlajomulco', 'noria de los reyes': 'tlajomulco',
  'residencial vista sur': 'tlajomulco',
  'cruz de huanacaxtle': 'bahia de banderas', 'huanacaxtle': 'bahia de banderas',
  'campanario': 'zapopan', 'santa lucia': 'zapopan',
  'tabachines': 'zapopan', 'mariano otero': 'zapopan', 'cuarzo': 'zapopan',
  'santa teresita': 'guadalajara', 'santa maria': 'guadalajara',
  'guadalupana': 'guadalajara', 'jardines de san jose': 'guadalajara',
  'artesanos': 'tlaquepaque', 'cantera colorada': 'tlaquepaque',
};

function extraerZona(fileName) {
  const lower = fileName.toLowerCase();
  let municipio = '';
  for (const m of MUNICIPIOS) {
    if (lower.includes(m)) { municipio = m; break; }
  }
  // Fallback: buscar en MUNICIPIO_PADRE por palabras clave del filename
  if (!municipio) {
    for (const [key, mun] of Object.entries(MUNICIPIO_PADRE)) {
      if (lower.includes(key)) { municipio = mun; break; }
    }
  }
  // Fallbacks adicionales
  if (!municipio) {
    if (lower.includes('maestranza') || lower.includes('centro') || lower.includes('san gaspar')) municipio = 'guadalajara';
    else if (lower.includes('jardines de la esperanza') || lower.includes('plan de guadalupe')) municipio = 'guadalajara';
    else if (lower.includes('vicente guerrero') || lower.includes('lázaro cárdenas') || lower.includes('lazaro cardenas')) municipio = 'zapopan';
  }

  let colonia = '';
  const mCol = lower.match(/\bcol(?:onia)?\.\s*([a-záéíóúñ][a-záéíóúñ\s]{2,40})(?=[\.,]|\s+cp\b|\s+c\.p\.|\s*$)/i);
  if (mCol) {
    colonia = mCol[1].trim();
  } else {
    const partes = fileName.split(',');
    for (const p of partes) {
      const t = p.trim().toLowerCase();
      if (/\d/.test(t) || t.length < 3 || MUNICIPIOS.includes(t)) continue;
      let limpio = t;
      for (const m of MUNICIPIOS) limpio = limpio.replace(m, '').trim();
      limpio = limpio.replace(/\b(jalisco|jal\.?|nayarit|nay\.?)\b/gi, '').trim().replace(/\s+/g, ' ');
      if (limpio.length >= 3) { colonia = limpio; break; }
    }
  }
  return { municipio, colonia };
}

// ── Cache local ───────────────────────────────────────────────────────────────
const CACHE_PATH = path.join(__dirname, 'cache_consolidado.json');
let _cache = null;

function cargarCache() {
  if (_cache) return _cache;
  if (!fs.existsSync(CACHE_PATH)) {
    console.log('  [Cache] No encontrado. Correr: node actualizar_cache_consolidado.js');
    return [];
  }
  const { meta, datos } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  console.log(`  [Cache] ${datos.length.toLocaleString()} comps (${meta.fecha_actualizacion.slice(0, 10)})`);
  _cache = datos;
  return datos;
}

// ── Buscar comps residenciales ($/m²C) ───────────────────────────────────────
function buscarCompsResidencial(zona, prop) {
  const datos   = cargarCache();
  const tipoN   = normalizaTipo(prop.tipo);
  const areaRef = prop.construccion || prop.terreno;
  const todos   = [];

  for (const d of datos) {
    if (!d.mu.includes(zona.municipio)) continue;
    if (normalizaTipo(d.tp) !== tipoN) continue;
    if (d.c <= 0 || d.p <= 0) continue;
    if (areaRef > 0 && (d.c < areaRef * 0.50 || d.c > areaRef * 1.50)) continue;
    if (prop.construccion > 0 && prop.terreno > 0 && d.t > 0) {
      const cusS = prop.construccion / prop.terreno;
      const cusC = d.c / d.t;
      if (Math.abs(cusC - cusS) / Math.max(cusS, 0.01) > 0.35) continue;
    }
    let score = areaRef > 0 ? 1 - Math.abs(d.c - areaRef) / Math.max(d.c, areaRef) : 0;
    if (zona.colonia && d.co) {
      if (d.co.includes(zona.colonia)) score += 0.5;
      else if (zona.colonia.includes(d.co)) score += 0.3;
    }
    todos.push({ precio: d.p, m2_const: d.c, m2_terreno: d.t, colonia: d.co, score });
  }

  todos.sort((a, b) => b.score - a.score);

  // Dedup: mismo precio + m²C ±2%
  const dedup = [];
  for (const c of todos) {
    const dup = dedup.some(d =>
      Math.abs(d.precio - c.precio) / Math.max(d.precio, 1) < 0.02 &&
      Math.abs(d.m2_const - c.m2_const) / Math.max(d.m2_const, 1) < 0.02
    );
    if (!dup) dedup.push(c);
  }
  return dedup.slice(0, 10);
}

// ── Buscar comps comerciales ($/m²C local/bodega) ────────────────────────────
function buscarCompsComercial(zona, prop) {
  const datos   = cargarCache();
  const tipoN   = normalizaTipo(prop.tipo);
  const areaRef = prop.construccion || prop.terreno;
  const todos   = [];

  for (const d of datos) {
    if (!d.mu.includes(zona.municipio)) continue;
    const tp = normalizaTipo(d.tp);
    if (tp !== tipoN && tp !== 'local' && tp !== 'bodega' && tp !== 'oficina') continue;
    if (d.c <= 0 || d.p <= 0) continue;
    if (areaRef > 0 && (d.c < areaRef * 0.35 || d.c > areaRef * 2.5)) continue;
    let score = areaRef > 0 ? 1 - Math.abs(d.c - areaRef) / Math.max(d.c, areaRef) : 0;
    if (zona.colonia && d.co && d.co.includes(zona.colonia)) score += 0.5;
    todos.push({ precio: d.p, m2_const: d.c, score });
  }

  todos.sort((a, b) => b.score - a.score);
  const dedup = [];
  for (const c of todos) {
    const dup = dedup.some(d =>
      Math.abs(d.precio - c.precio) / Math.max(d.precio, 1) < 0.02 &&
      Math.abs(d.m2_const - c.m2_const) / Math.max(d.m2_const, 1) < 0.02
    );
    if (!dup) dedup.push(c);
  }
  return dedup.slice(0, 10);
}

// ── Buscar $/m²T de terrenos en zona (para Suma de Partes y Terreno Puro) ────
function buscarPm2TZona(zona) {
  const datos = cargarCache();
  const comps = [];

  for (const d of datos) {
    if (!zona.municipio || !d.mu.includes(zona.municipio)) continue;
    const tp = (d.tp || '').toLowerCase();
    if (!tp.includes('terreno') && !tp.includes('lote') && !tp.includes('predio')) continue;
    if (d.t <= 0 || d.p <= 0) continue;
    const pm2t = d.p / d.t;
    if (pm2t < 500 || pm2t > 400000) continue;
    let score = 0;
    if (zona.colonia && d.co && d.co.includes(zona.colonia)) score += 1;
    comps.push({ pm2t, score });
  }

  if (!comps.length) return { pm2t: 0, n: 0 };
  comps.sort((a, b) => b.score - a.score);
  const vals = comps.slice(0, 20).map(c => c.pm2t);
  return { pm2t: avg(antiRemate(vals)), n: vals.length };
}

// ── Metodo Romina (homologación $/m²C) ───────────────────────────────────────
function metodoRomina(prop, comps) {
  if (!comps || !comps.length || !prop.construccion)
    return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };

  const validos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
  if (!validos.length) return { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };

  const pm2c     = validos.map(c => c.precio / c.m2_const);
  const pm2cFilt = antiRemate(pm2c);
  const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));

  const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);

  let suma = 0;
  compsFilt.forEach(c => {
    const pu        = c.precio / c.m2_const;
    const factorSup = Math.pow(c.m2_const / prop.construccion, 1 / 6);
    suma += pu * factorSup * factorEdad;
  });

  const pm2cAvg   = suma / compsFilt.length;
  const FACTOR_NEG = 0.95; // descuento oferta→cierre (listings vs precio real de venta)
  const valor      = Math.round(pm2cAvg * prop.construccion * FACTOR_NEG);

  const mean   = avg(pm2cFilt);
  const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
  const cv     = mean > 0 ? stddev / mean : 1;

  // Confianza basada en dispersión del cluster (CV), no en comparación con perito
  // CV < 0.20 → cluster apretado → ALTA
  // CV 0.20-0.35 → MEDIA
  // CV > 0.35 o < 3 comps → BAJA
  const confianza = compsFilt.length < 3 || cv > 0.35 ? 'BAJA'
                  : cv > 0.20 ? 'MEDIA' : 'ALTA';

  return { valor, confianza, cv: cv.toFixed(2), nComps: compsFilt.length, pm2cAvg: Math.round(mean) };
}

// ── Metodo Suma de Partes (terreno + reposición INDAABIN depreciada) ──────────
const INDAABIN = { residencial_plus: 26000, residencial: 18000, media: 12000, economica: 7500 };

function inferirNSE(pm2c) {
  if (pm2c >= 25000) return 'residencial_plus';
  if (pm2c >= 15000) return 'residencial';
  if (pm2c >= 8000)  return 'media';
  return 'economica';
}

function metodoSumaDePartes(prop, pm2tInfo) {
  const { pm2t, n } = pm2tInfo;
  if (!pm2t || !prop.terreno) return { valor: 0, pm2t: 0, nse: 'N/A', nTerrenos: 0, detalle: 'sin $/m²T zona' };

  const valorTerreno = pm2t * prop.terreno;

  // NSE: estimar desde valorReal si existe, si no desde pm2T como proxy
  const pm2cRef = prop.valorReal > 0 && prop.construccion > 0
    ? prop.valorReal / prop.construccion
    : pm2t * 1.8; // heuristic: construcción ≈ 1.8× valor terreno por m²
  const nse   = inferirNSE(pm2cRef);
  const costo = INDAABIN[nse];
  const depre = getRH(prop.edad);

  const valorConst = prop.construccion > 0 ? costo * prop.construccion * depre * 0.95 : 0;

  return {
    valor:         Math.round(valorTerreno + valorConst),
    pm2t:          Math.round(pm2t),
    nTerrenos:     n,
    nse,
    costoIndaabin: costo,
    depreciacion:  depre.toFixed(2),
    valorTerreno:  Math.round(valorTerreno),
    valorConst:    Math.round(valorConst),
  };
}

// ── Metodo $/m²T Directo (terrenos puros) ────────────────────────────────────
function metodoPm2TDirecto(prop, pm2tInfo) {
  const { pm2t, n } = pm2tInfo;
  if (!pm2t || !prop.terreno) return { valor: 0, pm2t: 0, n: 0 };
  return { valor: Math.round(pm2t * prop.terreno), pm2t: Math.round(pm2t), n };
}

// ── Serper: búsqueda web real de listados inmobiliarios ──────────────────────
async function buscarSnippetsSerper(prop, zona) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return '';
  const zonaStr = zona.colonia ? `${zona.colonia} ${zona.municipio}` : zona.municipio;
  const query   = `${prop.tipo} venta ${zonaStr} m2 precio site:inmuebles24.com OR site:propiedades.com OR site:casasyterrenos.com`;
  try {
    const res  = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q: query, gl: 'mx', hl: 'es', num: 8 }),
    });
    const data = await res.json();
    const snippets = (data.organic || [])
      .map(r => `${r.title} | ${r.snippet}`)
      .join('\n');
    return snippets;
  } catch (e) {
    console.log(`  [Serper] Error: ${e.message}`);
    return '';
  }
}

// ── Prompt de comparables (compartido entre proveedores) ─────────────────────
function buildPrompt(prop, zona) {
  const zonaStr = zona.colonia
    ? `colonia ${zona.colonia}, ${zona.municipio}`
    : zona.municipio;
  return {
    zonaStr,
    text: `Busca ${prop.tipo.toLowerCase()} en venta en ${zonaStr} en inmuebles24.com, propiedades.com, casasyterrenos.com o vivanuncios.com.
Propiedad sujeto: ${prop.construccion} m² construcción, ${prop.terreno} m² terreno, en ${zonaStr}.
Encuentra 3-6 propiedades similares con precio y m² de construcción confirmados.
Responde SOLO con JSON sin markdown:
{"comparables":[{"colonia":"...","precio":0,"m2c":0,"url":"..."}]}
Reglas: precio en MXN entero, m2c obligatorio mayor a 0, entre ${Math.round(prop.construccion * 0.6)} y ${Math.round(prop.construccion * 1.6)} m²C, sin repetidos.`,
  };
}

function parsearComps(text, prop) {
  const match = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
  if (!match) return [];
  const parsed = JSON.parse(match[0]);
  const raw = (parsed.comparables || [])
    .map(c => ({ m2_const: cleanNum(c.m2c), precio: cleanNum(c.precio), colonia: c.colonia || '' }))
    .filter(c => c.m2_const > 0 && c.precio > 100000
              && c.m2_const >= prop.construccion * 0.5
              && c.m2_const <= prop.construccion * 1.6);
  if (raw.length < 2) return raw;
  const pm2s = raw.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
  const med  = pm2s[Math.floor(pm2s.length / 2)];
  return raw.filter(c => { const r = (c.precio / c.m2_const) / med; return r >= 0.60 && r <= 1.60; });
}

// ── Fallback chain: Gemini → ChatGPT (con web search via serper si disponible) ─
async function buscarCompsIA(prop, zona) {
  const { text: promptText, zonaStr } = buildPrompt(prop, zona);

  // 1. Gemini con Google Search integrado
  const GEMINI_MODELOS = ['gemini-2.5-flash', 'gemini-2.5-flash-preview-04-17'];
  for (const modelName of GEMINI_MODELOS) {
    try {
      const model  = genAI.getGenerativeModel({ model: modelName, tools: [{ googleSearch: {} }] });
      const result = await model.generateContent(promptText);
      const comps  = parsearComps(result.response.text(), prop);
      if (comps.length > 0) {
        console.log(`  [Gemini/${modelName}] ${comps.length} comps ✓`);
        return { comps, fuente: 'GEMINI' };
      }
    } catch (e) {
      const msg = e.message || '';
      const es503 = msg.includes('503');
      const es429 = msg.includes('429');
      console.log(`  [Gemini/${modelName}] ${es503 ? '503 saturado' : es429 ? '429 cuota' : msg.slice(0, 80)}`);
      if (es503 || es429) await sleep(5000);
    }
  }

  // 2. ChatGPT + Serper (snippets reales de portales inmobiliarios)
  console.log(`  [ChatGPT+Serper] Activando fallback...`);
  try {
    const snippets  = await buscarSnippetsSerper(prop, zona);
    const contexto  = snippets
      ? `\n\nResultados reales de búsqueda web (extraer precio y m²C de estos):\n${snippets}`
      : '';
    const systemMsg = `Eres un valuador inmobiliario experto en México. Extrae datos de propiedades en venta de los snippets proporcionados. Si no hay snippets, usa tu conocimiento del mercado. Zona: ${zonaStr}.`;
    const resp = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      max_tokens:  800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user',   content: promptText + contexto },
      ],
    });
    const text  = resp.choices[0]?.message?.content || '';
    const comps = parsearComps(text, prop);
    if (comps.length > 0) {
      const tag = snippets ? 'CHATGPT+SERPER' : 'CHATGPT';
      console.log(`  [${tag}] ${comps.length} comps ✓`);
      return { comps, fuente: tag };
    }
    console.log(`  [ChatGPT+Serper] Sin comps válidos en respuesta`);
  } catch (e) {
    console.log(`  [ChatGPT] Error: ${(e.message || '').slice(0, 100)}`);
  }

  return { comps: [], fuente: 'N/A' };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

  // Filtrar las 10 propiedades (con valor y datos válidos, sin ejidales)
  const validos = cerebro.filter(d => {
    if (!d.fileName || !d.valorMercado || d.valorMercado === 'No hallado') return false;
    if (cleanNum(d.valorMercado) <= 0) return false;
    if ((d.tipo || '').toUpperCase().includes('EJIDAL')) return false;
    return FILTRO.some(k => (d.fileName || '').includes(k));
  });

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  Metodologías V2 — Árbol de Decisión — ${validos.length} propiedades`);
  console.log(`${'═'.repeat(72)}\n`);

  const auth   = await gsc.authenticate();
  const sheets = google.sheets({ version: 'v4', auth });

  const cabecera = [
    'Archivo', 'Tipo', 'Ruta', 'M2C', 'M2T', 'Ratio T/C', 'Edad', 'Perito',
    // Casa: Romina Scraper
    'Romina-Scraper', 'Dif%', 'Confianza', 'N', '$/m²C',
    // Casa: Romina Gemini
    'Romina-Gemini', 'Dif%', 'N Gemini',
    // Suma de Partes
    'SumaPartes', 'Dif%', 'NSE', '$/m²T', 'N-Terrenos', 'Depr',
    // Terreno puro / Comercial
    'Alternativo', 'Dif% Alt',
    // FINAL
    'FINAL', 'Dif% FINAL', 'Fuente',
  ];
  const rows = [cabecera];

  let geminiCalls = 0;

  for (const d of validos) {
    const edad = cleanNum(d.edad) || 10;
    const prop = {
      tipo:         d.tipo || 'CASA HABITACIÓN',
      terreno:      cleanNum(d.m2Terreno),
      construccion: cleanNum(d.m2Construccion),
      valorReal:    cleanNum(d.valorMercado),
      edad,
    };
    const ratioTC = prop.terreno > 0 && prop.construccion > 0
      ? (prop.terreno / prop.construccion).toFixed(1) : 'N/A';

    const zona  = extraerZona(d.fileName);
    const ruta  = clasificar(prop, prop.tipo);

    console.log(`\n📍 ${d.fileName.slice(0, 65)}`);
    console.log(`   ${prop.tipo} | Ruta: ${ruta.toUpperCase()} | T/C ratio: ${ratioTC}`);
    console.log(`   m²C:${prop.construccion}  m²T:${prop.terreno}  Edad:${edad}  Perito:${MXN(prop.valorReal)}`);
    console.log(`   Zona: "${zona.municipio}" / "${zona.colonia}"`);

    // ── Valores por metodología ──────────────────────────────────────────────
    let rominaScraper  = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
    let rominaGemini   = { valor: 0, confianza: 'N/A', cv: 'N/A', nComps: 0, pm2cAvg: 0 };
    let sumaPartes     = { valor: 0, pm2t: 0, nse: 'N/A', nTerrenos: 0, depreciacion: 'N/A' };
    let alternativo    = { valor: 0, detalle: '' };
    let final          = { valor: 0, fuente: '' };

    // Siempre calcular $/m²T de zona (útil para Suma de Partes y Terreno Puro)
    const pm2tInfo = buscarPm2TZona(zona);

    if (ruta === 'terreno_puro') {
      // ── Ruta: Terreno Puro ────────────────────────────────────────────────
      const res = metodoPm2TDirecto(prop, pm2tInfo);
      alternativo = { valor: res.valor, detalle: `$/m²T=${MXN(res.pm2t)} × ${res.n}terrenos` };
      final = { valor: res.valor, fuente: `$/m²T_DIRECTO (n=${res.n})` };
      console.log(`   [$/m²T] ${MXN(res.pm2t)}/m²T × ${prop.terreno}m²T = ${MXN(res.valor)} (${dif(res.valor, prop.valorReal)})  n=${res.n}`);

    } else if (ruta === 'suma_partes') {
      // ── Ruta: Suma de Partes ─────────────────────────────────────────────
      sumaPartes = metodoSumaDePartes(prop, pm2tInfo);
      // También correr Romina como referencia si hay comps
      const compsR = buscarCompsResidencial(zona, prop);
      rominaScraper = metodoRomina(prop, compsR);
      final = { valor: sumaPartes.valor, fuente: 'SUMA_PARTES' };
      console.log(`   [SumaPartes] Terreno:${MXN(sumaPartes.valorTerreno)} + Constr:${MXN(sumaPartes.valorConst)} = ${MXN(sumaPartes.valor)} (${dif(sumaPartes.valor, prop.valorReal)})`);
      console.log(`   [SumaPartes] $/m²T=${MXN(sumaPartes.pm2t)} | NSE:${sumaPartes.nse} | INDAABIN:$${(sumaPartes.costoIndaabin||0).toLocaleString()}/m²C | Depr:${sumaPartes.depreciacion}`);
      if (rominaScraper.nComps > 0)
        console.log(`   [Romina ref] ${rominaScraper.nComps} comps → ${MXN(rominaScraper.valor)} (${dif(rominaScraper.valor, prop.valorReal)})`);

    } else if (ruta === 'comercial') {
      // ── Ruta: Comercial $/m²C ────────────────────────────────────────────
      const compsC = buscarCompsComercial(zona, prop);
      rominaScraper = metodoRomina(prop, compsC);
      // Suma de Partes como referencia cruzada
      sumaPartes = metodoSumaDePartes(prop, pm2tInfo);
      alternativo = { valor: sumaPartes.valor, detalle: 'Suma de Partes ref' };
      final = {
        valor:  rominaScraper.nComps >= 3 ? rominaScraper.valor : sumaPartes.valor,
        fuente: rominaScraper.nComps >= 3 ? `ROMINA_COM (n=${rominaScraper.nComps})` : 'SUMA_PARTES_ref',
      };
      console.log(`   [Comercial] ${rominaScraper.nComps} comps → Romina:${MXN(rominaScraper.valor)} (${dif(rominaScraper.valor, prop.valorReal)})`);
      console.log(`   [SumaPartes ref] ${MXN(sumaPartes.valor)} (${dif(sumaPartes.valor, prop.valorReal)})`);

    } else {
      // ── Ruta: Casa / Depto (Romina + Gemini fallback) ────────────────────
      const compsR = buscarCompsResidencial(zona, prop);
      rominaScraper = metodoRomina(prop, compsR);
      console.log(`   [Scraper] ${rominaScraper.nComps} comps | ${MXN(rominaScraper.valor)} (${dif(rominaScraper.valor, prop.valorReal)}) | ${rominaScraper.confianza}`);

      // Suma de Partes siempre como referencia cruzada en casas
      sumaPartes = metodoSumaDePartes(prop, pm2tInfo);
      if (sumaPartes.valor > 0)
        console.log(`   [SumaPartes ref] ${MXN(sumaPartes.valor)} (${dif(sumaPartes.valor, prop.valorReal)}) | $/m²T=${MXN(sumaPartes.pm2t)}`);

      const necesitaIA = rominaScraper.confianza === 'BAJA' || rominaScraper.nComps < 3;
      let fuenteIA = 'N/A';
      if (necesitaIA) {
        if (geminiCalls > 0) await sleep(8000);
        geminiCalls++;
        const { comps: compsG, fuente: fIA } = await buscarCompsIA(prop, zona);
        fuenteIA    = fIA;
        rominaGemini = metodoRomina(prop, compsG);
        console.log(`   [${fIA}] ${rominaGemini.nComps} comps | ${MXN(rominaGemini.valor)} (${dif(rominaGemini.valor, prop.valorReal)})`);
      }

      // Elegir mejor fuente para FINAL
      if (!necesitaIA) {
        final = { valor: rominaScraper.valor, fuente: 'SCRAPER' };
      } else if (rominaGemini.nComps >= 3) {
        final = { valor: rominaGemini.valor, fuente: fuenteIA };
      } else if (sumaPartes.valor > 0) {
        final = { valor: sumaPartes.valor, fuente: 'SUMA_PARTES_fallback' };
      } else {
        final = { valor: 0, fuente: 'REVISAR' };
      }
    }

    console.log(`   ▶ FINAL: ${MXN(final.valor)} (${dif(final.valor, prop.valorReal)}) ← ${final.fuente}`);

    rows.push([
      d.fileName.slice(0, 60),
      prop.tipo,
      ruta,
      prop.construccion,
      prop.terreno,
      ratioTC,
      edad,
      prop.valorReal,
      // Romina Scraper
      rominaScraper.valor || '',
      dif(rominaScraper.valor, prop.valorReal),
      rominaScraper.confianza,
      rominaScraper.nComps || '',
      rominaScraper.pm2cAvg || '',
      // Romina Gemini
      rominaGemini.valor || '',
      dif(rominaGemini.valor, prop.valorReal),
      rominaGemini.nComps || '',
      // Suma de Partes
      sumaPartes.valor || '',
      dif(sumaPartes.valor, prop.valorReal),
      sumaPartes.nse || '',
      sumaPartes.pm2t || '',
      sumaPartes.nTerrenos || '',
      sumaPartes.depreciacion || '',
      // Alternativo
      alternativo.valor || '',
      dif(alternativo.valor, prop.valorReal),
      // FINAL
      final.valor || '',
      dif(final.valor, prop.valorReal),
      final.fuente,
    ]);
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(72)}`);
  const resultados  = rows.slice(1);
  const evaluables  = resultados.filter(r => r[25] && r[25] !== '' && !String(r[26]).includes('REVISAR'));
  const dentro20    = evaluables.filter(r => Math.abs(parseFloat(String(r[25]).replace('%', ''))) <= 20);
  const errs        = evaluables.map(r => Math.abs(parseFloat(String(r[25]).replace('%', '')))).filter(x => !isNaN(x));
  const errorProm   = errs.length ? (errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1) : 'N/A';
  console.log(`  Dentro ±20%: ${dentro20.length}/${evaluables.length}`);
  console.log(`  Error promedio: ${errorProm}%`);
  console.log(`  Fuentes: ${[...new Set(resultados.map(r => r[26]))].join(' | ')}`);
  console.log(`${'═'.repeat(72)}\n`);

  // ── Exportar a Sheets ─────────────────────────────────────────────────────
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SALIDA_SHEET_ID });
    if (!meta.data.sheets.some(s => s.properties.title === TAB_NOMBRE)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SALIDA_SHEET_ID,
        resource: { requests: [{ addSheet: { properties: { title: TAB_NOMBRE } } }] },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SALIDA_SHEET_ID,
      range: `${TAB_NOMBRE}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows },
    });
    console.log(`Exportado → https://docs.google.com/spreadsheets/d/${SALIDA_SHEET_ID}`);
  } catch (e) {
    console.error('Error exportando a Sheets:', e.message);
  }
}

main().catch(console.error);
