/**
 * test_comparar_buscadores.js
 * Compara DeepSeek vs Gemini vs GPT-4o como extractores de comparables
 * usando Serper (Google Search real) como fuente de snippets.
 *
 * Uso: node test_comparar_buscadores.js
 */

require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const cerebro = require('./cerebro_datos.json');

const _deepseek = new OpenAI({ apiKey: 'sk-002d18925d514fa7997b0b35718efd82', baseURL: 'https://api.deepseek.com/v1' });
const _gemini   = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const _openai   = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// OPIs con pocos comparables en caché — casos de prueba
const FOLIOS_PRUEBA = [
    'OPI-26-2-07-OF',  // jardines de la calera, 48m²C, Tlajomulco
    'OPI-26-4-02-OF',  // santa maria, 99m²C, Guadalajara
    'OPI-26-4-01-OF',  // cantera colorada, 140m²C, Tlaquepaque
];

const nse  = JSON.parse(require('fs').readFileSync('./colonias_nse.json','utf8'));
const sim  = JSON.parse(require('fs').readFileSync('./colonias_similares.json','utf8'));
const idx  = JSON.parse(require('fs').readFileSync('./cache_index.json','utf8'));

function normCol(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\b(col\.|colonia|fracc\.?|fraccionamiento|residencial)\b/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); }
function normMuni(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim().replace(/tlajomulco de z.niga/,'tlajomulco').replace(/^san pedro /,'tlaquepaque'); }

async function buscarEnSerper(query) {
    if (!process.env.SERPER_API_KEY) return '';
    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, gl: 'mx', hl: 'es', num: 10 })
    });
    const data = await res.json();
    return (data.organic || []).map(r => `[${r.title}]\n${r.snippet || ''}\nURL: ${r.link}`).join('\n\n---\n\n');
}

function buildPrompt(prop, snippets, zona, simsNombres, pm2cRef) {
    const m2Min = Math.round(prop.m2c * 0.5);
    const m2Max = Math.round(prop.m2c * 1.5);
    const pm2cMin = pm2cRef ? Math.round(pm2cRef * 0.5) : 5000;
    const pm2cMax = pm2cRef ? Math.round(pm2cRef * 1.8) : 60000;
    const ancla = pm2cRef ? `Referencia de mercado en zona: ~$${pm2cRef.toLocaleString()}/m²C (válido $${pm2cMin.toLocaleString()}–$${pm2cMax.toLocaleString()}/m²C). Rechaza fuera de ese rango.` : '';
    const simStr = simsNombres.length ? `Colonias de NSE similar aceptables: ${simsNombres.join(', ')}.` : '';
    return `Eres valuador inmobiliario experto en Jalisco. Analiza resultados de Google como un humano buscando comparables.

Propiedad sujeto: casa de ${prop.m2c}m² construcción, ${prop.m2t}m² terreno, en ${zona}.
Rango m²C aceptable: ${m2Min}–${m2Max}.
${ancla}
${simStr}

Resultados de Google:
═══
${snippets.slice(0, 4000)}
═══

INSTRUCCIONES: Extrae propiedades con precio en pesos y m²C visibles. NO estimes. Incluye URL. Rechaza si pm2c fuera del rango válido.
JSON: {"comparables":[{"colonia":"...","precio":0,"m2c":0,"m2t":0,"url":"https://..."}]}`;
}

async function extraerConDeepSeek(prompt) {
    const res = await _deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: 'Extrae comparables inmobiliarios. Responde SOLO con JSON válido. Nunca estimes precios.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 1200, temperature: 0.0
    });
    return parsearJSON(res.choices[0].message.content);
}

async function extraerConGPT4o(prompt) {
    if (!_openai) return { error: 'Sin OPENAI_API_KEY' };
    const res = await _openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'Extrae comparables inmobiliarios. Responde SOLO con JSON válido. Nunca estimes precios.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 1200, temperature: 0.0
    });
    return parsearJSON(res.choices[0].message.content);
}

async function extraerConGemini(prop, zona) {
    if (!_gemini) return { error: 'Sin GEMINI_API_KEY' };
    const model = _gemini.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [{ googleSearch: {} }] });
    const prompt = `Busca en internet ${prop.m2c} m² construcción casa en venta en ${zona}, Jalisco México.
Da comparables reales de portales (inmuebles24, casasyterrenos, vivanuncios) con precio en pesos, m²C, y URL.
Solo propiedades entre ${Math.round(prop.m2c*0.5)}–${Math.round(prop.m2c*1.5)} m²C.
Responde SOLO con JSON: {"comparables":[{"colonia":"...","precio":0,"m2c":0,"url":"https://..."}]}`;
    const result = await model.generateContent(prompt);
    return parsearJSON(result.response.text());
}

function parsearJSON(text) {
    try {
        const clean = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = clean.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!m) return { error: 'No JSON', raw: text.slice(0, 200) };
        const parsed = JSON.parse(m[0]);
        return parsed.comparables || [];
    } catch(e) {
        return { error: e.message, raw: text.slice(0, 200) };
    }
}

function resumenComps(comps, valorPerito, m2c) {
    if (!Array.isArray(comps)) return comps; // error obj
    // Filtrar basura: precio=0, m²C=0/null, y fuera de rango ±60%
    const m2Min = m2c * 0.4, m2Max = m2c * 1.8;
    comps = comps.filter(c => c.precio > 0 && c.m2c > 0 && c.m2c >= m2Min && c.m2c <= m2Max);
    if (!comps.length) return '(sin resultados válidos)';
    const pm2cs = comps.map(c => c.precio / c.m2c);
    const medPm2c = pm2cs.length ? Math.round(pm2cs.sort((a,b)=>a-b)[Math.floor(pm2cs.length/2)]) : 0;
    const valorEst = medPm2c * m2c;
    const dif = valorPerito ? Math.round((valorEst - valorPerito) / valorPerito * 100) : null;
    const conURL = comps.filter(c => c.url && c.url.startsWith('http')).length;
    return {
        n: comps.length,
        conURL,
        medPm2c: `$${medPm2c.toLocaleString()}/m²C`,
        valorEst: `$${Math.round(valorEst/1000)}k`,
        difPerito: dif !== null ? `${dif > 0 ? '+' : ''}${dif}%` : 'N/A',
        comps: comps.map(c => `  $${Math.round(c.precio/1000)}k | ${c.m2c}m²C | ${(c.url||'sin URL').slice(0,60)}`).join('\n')
    };
}

async function probarOPI(folio) {
    const opi = cerebro.find(p => p.folio === folio);
    if (!opi) { console.log(`${folio}: no encontrado`); return; }

    const m2c = parseFloat((opi.m2Construccion||'').replace(/[^0-9.]/g,''));
    const m2t = parseFloat((opi.m2Terreno||'').replace(/[^0-9.]/g,''));
    const valorPerito = parseFloat((opi.valorMercado||'').replace(/[^0-9.]/g,''));
    const col   = opi.sujetoColonia || '';
    const muni  = opi.municipio || '';
    const zona  = `${col}, ${muni}`;
    const colN  = normCol(col);
    const muniN = normMuni(muni);
    const prop  = { m2c, m2t };

    // Contexto NSE/IDX para anclar precios
    const nseEntry = nse[colN];
    const idxEntry = idx[muniN]?.casa?.[colN];
    const anclaValida = nseEntry?.fuente?.startsWith('idx-val') || idxEntry?.medianaPm2c > 0;
    const pm2cRef = anclaValida ? (nseEntry?.medianaPm2 || idxEntry?.medianaPm2c || 0) : 0;
    const simsRaw  = sim[colN] || [];
    const simsNombres = simsRaw.map(s => typeof s === 'string' ? s : s.colonia).filter(Boolean).slice(0,4);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`OPI: ${folio} | ${zona} | ${m2c}m²C | Perito: $${Math.round(valorPerito/1000)}k`);
    console.log(`NSE ref: ${nseEntry?.nse || 'sin datos'} | pm2cRef: $${pm2cRef.toLocaleString()}/m²C`);
    console.log(`Similares: ${simsNombres.join(', ') || 'ninguna'}`);
    console.log(`${'═'.repeat(70)}`);

    // 2 búsquedas como haría un humano
    const q1 = `casa en venta ${col} ${muni} Jalisco precio pesos m2 construccion`;
    const q2 = simsNombres.length ? `casa en venta ${simsNombres.join(' OR ')} ${muni} Jalisco precio pesos m2` : null;

    console.log(`\nQuery 1 (exacta): ${q1}`);
    if (q2) console.log(`Query 2 (similares): ${q2}`);

    const [snip1, snip2] = await Promise.all([buscarEnSerper(q1), q2 ? buscarEnSerper(q2) : Promise.resolve('')]);
    const snippets = [snip1, snip2].filter(Boolean).join('\n\n═══\n\n');
    const nSnippets = (snippets.match(/URL:/g)||[]).length;
    console.log(`Total snippets: ${nSnippets}`);

    const prompt = buildPrompt(prop, snippets, zona, simsNombres, pm2cRef);

    console.log('\n── DeepSeek-V3 (Serper + NSE) ───────────────────────────────');
    try {
        const r = await extraerConDeepSeek(prompt);
        const s = resumenComps(r, valorPerito, m2c);
        if (typeof s === 'string') { console.log(s); }
        else { console.log(`n:${s.n} | conURL:${s.conURL} | medPm2c:${s.medPm2c} | est:${s.valorEst} | dif perito:${s.difPerito}`); console.log(s.comps); }
    } catch(e) { console.log('Error:', e.message); }

    console.log('\n── GPT-4o (Serper + NSE) ─────────────────────────────────────');
    try {
        const r = await extraerConGPT4o(prompt);
        const s = resumenComps(r, valorPerito, m2c);
        if (typeof s === 'string') { console.log(s); }
        else { console.log(`n:${s.n} | conURL:${s.conURL} | medPm2c:${s.medPm2c} | est:${s.valorEst} | dif perito:${s.difPerito}`); console.log(s.comps); }
    } catch(e) { console.log('Error:', e.message); }

    console.log('\n── Gemini 2.5 Flash (Google Search nativo) ──────────────────');
    try {
        const r = await extraerConGemini(prop, zona);
        const s = resumenComps(r, valorPerito, m2c);
        if (typeof s === 'string') { console.log(s); }
        else { console.log(`n:${s.n} | conURL:${s.conURL} | medPm2c:${s.medPm2c} | est:${s.valorEst} | dif perito:${s.difPerito}`); console.log(s.comps); }
    } catch(e) { console.log('Error:', e.message); }
}

(async () => {
    for (const folio of FOLIOS_PRUEBA) {
        await probarOPI(folio);
        // Pausa entre OPIs para evitar rate limits
        await new Promise(r => setTimeout(r, 3000));
    }
})();
