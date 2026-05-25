/**
 * test_ias_comparacion.js
 * Compara DeepSeek, Gemini y ChatGPT en el diagnóstico de 3 OPIs fallidos.
 * También hace A/B: motor con pool=general vs sin pool=general.
 *
 * Uso: node test_ias_comparacion.js
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { valuarPropiedadCompleto, normTipo, normCol } = require('./motor_romina_api');
const IDX     = require('./cache_index.json');
const NSE     = require('./colonias_nse.json');
const SIM     = require('./colonias_similares.json');
const cerebro = require('./cerebro_datos.json');

const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' });
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genai    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    return m ? parseFloat(m[0].replace(/,/g,'')) : 0;
}

function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
}

// ── Datos de los 3 OPIs de prueba ──────────────────────────────────────────
const FOLIOS = [
    'OPI-25-9-01-OF',  // Emiliano Zapata Zapopan -22.7% general
    'OPI-25-8-16-LM',  // "Guadalajara" colonia vaga -46.6% similares
    'OPI-25-9-03-OF',  // San Andres GDL +12.5% similares
    'OPI-25-8-17-LM',  // Real Valdepeñas Zapopan +13.5% similares
];

async function getOPIDetail(folio) {
    const o = cerebro.find(x => x.folio === folio);
    const m2C = parsePesos(o.m2Construccion);
    const m2T = parsePesos(o.m2Terreno) || 0;
    const valorPerito = parsePesos(o.valorMercado);
    const prop = {
        tipo: normTipo(o.tipo||'casa'), construccion: m2C, terreno: m2T,
        edad: parsePesos(o.edad)||0, estadoConservacion: o.estadoConservacion||'bueno',
        municipio: o.municipio||'', colonia: o.sujetoColonia||'', esEjidal: o.esEjidal||false
    };
    const r = await valuarPropiedadCompleto(prop);
    const colNorm   = normCol(o.sujetoColonia||'');
    const muniNorm  = normSimple(o.municipio||'');
    const tipoNorm  = normTipo(o.tipo||'casa');
    const pm2cObj   = Math.round(valorPerito / (m2C * 0.95));

    const idxMuni = IDX[muniNorm]?.[tipoNorm] || {};
    const coloniasIDX = Object.entries(idxMuni)
        .map(([col,d]) => ({ col, pm2c: Math.round(d.medianaPm2c), n: d.count, nse: (NSE[col]||{}).nseIdx }))
        .filter(x => x.pm2c > 5000 && x.pm2c < 80000 && x.n >= 3)
        .sort((a,b) => b.n - a.n).slice(0, 20);

    return { folio, municipio: o.municipio, colonia: o.sujetoColonia, colNorm, tipo: o.tipo,
             m2C, m2T, edad: parsePesos(o.edad)||0, conserv: o.estadoConservacion,
             valorPerito, pm2cObjetivo: pm2cObj,
             motorValor: r.valor, motorPool: r.poolTipo, motorPm2c: r.pm2cAvg, motorN: r.nComps,
             diff: ((r.valor - valorPerito) / valorPerito * 100).toFixed(1),
             nseEntry: NSE[colNorm] || null, similares: SIM[colNorm] || null, coloniasIDX };
}

// ── Prompt compartido ──────────────────────────────────────────────────────
function buildPrompt(datos) {
    const casos = datos.map((d, i) => `
CASO ${i+1}: ${d.folio}
  Colonia: ${d.colonia} | Municipio: ${d.municipio}
  Tipo: ${d.tipo} | m²C: ${d.m2C} | m²T: ${d.m2T} | Edad: ${d.edad} años | Conservación: ${d.conserv}
  Valor perito: $${Math.round(d.valorPerito/1000)}k | pm2c objetivo: $${d.pm2cObjetivo}/m²
  Motor actual: $${Math.round(d.motorValor/1000)}k | pool: ${d.motorPool} | pm2cAvg: $${d.motorPm2c}/m² | diff: ${d.diff}%
  NSE actual en colonias_nse.json: ${JSON.stringify(d.nseEntry || 'NO EXISTE')}
  Similares actuales en colonias_similares.json: ${JSON.stringify(d.similares || 'NO EXISTE')}
  Colonias disponibles en IDX ${d.municipio} (n≥3, ordenadas por volumen):
${d.coloniasIDX.map(c => `    ${c.col.padEnd(36)} pm2c:$${String(c.pm2c).padStart(7)}/m²  n:${c.n}  NSE:${c.nse||'?'}`).join('\n')}
`).join('\n');

    return `Eres experto en valuación inmobiliaria residencial en Jalisco, México (AMG: Guadalajara, Zapopan, Tlaquepaque, Tlajomulco, Tonalá, El Salto).

NOTA TEMPORAL: Los OPIs son de 2025 (Nov-Dic). El IDX de comparables es de 2025-2026. Es normal que exista una brecha de ~5-10% por inflación de precios de lista vs cierre. Considera esto en tu diagnóstico antes de proponer fixes agresivos.

=== METODOLOGÍA DEL MOTOR ===
El motor calcula valor = pm2cAvg × m²C × 0.95 donde pm2cAvg viene de:
1. Pool EXACTA: listings de la misma colonia en el IDX del scraper
2. Pool SIMILARES: colonias definidas en colonias_similares.json (comparable por NSE y zona)
3. Pool GENERAL: todos los listings del municipio filtrados por NSE ±1 (fallback amplio, poco preciso)
4. SumaDePartes: terreno (IDX pm2T) + construcción depreciada INDAABIN × 1.20

NSE cap: si la colonia tiene entry en colonias_nse.json con medianaPm2, el pm2cAvg se limita a medianaPm2 × 1.15.
El pool GENERAL es el menos preciso — cuando falla indica que falta calibrar similares o NSE cap.

=== CASOS A DIAGNOSTICAR ===
${casos}

=== TU TAREA ===
Para cada caso:
1. Diagnostica por qué falla (pool incorrecto, similares incorrectas, NSE cap faltante o incorrecto, colonia vaga)
2. Propón el fix: qué colonias similares del IDX disponible usar (nombre exacto como aparece en la lista), o qué NSE cap aplicar
3. Estima el pm2c resultante con tu fix

Responde SOLO con JSON válido, sin texto adicional:
[
  {
    "folio": "OPI-...",
    "diagnostico": "explicación corta",
    "fix_tipo": "similares|nse_cap|ambos",
    "similares_propuestas": ["colonia1","colonia2"],
    "nse_cap_medianaPm2": 0,
    "pm2c_estimado": 0,
    "confianza": "alta|media|baja"
  }
]`;
}

// ── Llamadas a cada IA ─────────────────────────────────────────────────────
async function callDeepSeek(prompt) {
    const res = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: 'Eres valuador inmobiliario Jalisco. Responde SOLO con JSON válido.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 2000, temperature: 0.1
    });
    return res.choices[0].message.content.trim().replace(/^```json\n?/,'').replace(/\n?```$/,'');
}

async function callGemini(prompt) {
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const res = await model.generateContent(prompt + '\n\nResponde SOLO con JSON válido, sin texto adicional ni markdown.');
    return res.response.text().trim().replace(/^```json\n?/,'').replace(/\n?```$/,'');
}

async function callChatGPT(prompt) {
    const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'Eres valuador inmobiliario Jalisco. Responde SOLO con JSON válido.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 2000, temperature: 0.1
    });
    return res.choices[0].message.content.trim().replace(/^```json\n?/,'').replace(/\n?```$/,'');
}

// ── A/B: con general vs sin general ───────────────────────────────────────
async function runAB(datos) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         A/B: CON pool=general vs SIN pool=general        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    for (const d of datos) {
        const sinGeneral_pm2c = d.motorPool === 'general' ? 'cae a sumaDePartes/IA' : `$${d.motorPm2c} (${d.motorPool})`;
        console.log(`${d.folio} | ${d.colonia}`);
        console.log(`  CON general:  pool=${d.motorPool}  pm2c=$${d.motorPm2c}  valor=$${Math.round(d.motorValor/1000)}k  diff:${d.diff}%`);
        console.log(`  SIN general:  ${sinGeneral_pm2c}`);
        console.log(`  Objetivo:     pm2c=$${d.pm2cObjetivo}  valor=$${Math.round(d.valorPerito/1000)}k`);
        console.log('');
    }
}

// ── Evaluación de respuesta IA ─────────────────────────────────────────────
function evaluarRespuesta(nombre, respuesta, datos) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`RESULTADO ${nombre}`);
    console.log('─'.repeat(60));
    try {
        const m = respuesta.match(/\[[\s\S]*\]/);
        if (!m) { console.log('ERROR: no encontró JSON array'); return; }
        const fixes = JSON.parse(m[0]);
        fixes.forEach((fix, i) => {
            const d = datos[i];
            const diff_estimado = d ? ((fix.pm2c_estimado - d.pm2cObjetivo) / d.pm2cObjetivo * 100).toFixed(1) : '?';
            console.log(`\n${fix.folio}`);
            console.log(`  Diagnóstico: ${fix.diagnostico}`);
            console.log(`  Fix: ${fix.fix_tipo} | Confianza: ${fix.confianza}`);
            if (fix.similares_propuestas?.length) console.log(`  Similares: ${fix.similares_propuestas.join(', ')}`);
            if (fix.nse_cap_medianaPm2) console.log(`  NSE cap medianaPm2: $${fix.nse_cap_medianaPm2}`);
            console.log(`  pm2c estimado: $${fix.pm2c_estimado} vs objetivo: $${d?.pm2cObjetivo} → diff estimado: ${diff_estimado}%`);
        });
    } catch(e) {
        console.log('ERROR parseando JSON:', e.message);
        console.log('Respuesta raw:', respuesta.slice(0, 500));
    }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('Cargando datos de los 3 OPIs...');
    const datos = [];
    for (const f of FOLIOS) datos.push(await getOPIDetail(f));

    await runAB(datos);

    const prompt = buildPrompt(datos);
    fs.writeFileSync('prompt_ia_test.txt', prompt);
    console.log(`\nPrompt generado: ${prompt.length} chars → prompt_ia_test.txt`);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              COMPARACIÓN DE LAS 3 IAs                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log('\nLlamando a Gemini 2.5 Flash...');
    const gmResp = await callGemini(prompt);

    evaluarRespuesta('GEMINI 2.5 FLASH', gmResp, datos);

    fs.writeFileSync('resultados_ia_test.json', JSON.stringify({
        gemini: gmResp, datos
    }, null, 2));
    console.log('\n\nResultados guardados en resultados_ia_test.json');
}

main().catch(console.error);
