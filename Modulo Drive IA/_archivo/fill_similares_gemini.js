/**
 * fill_similares_gemini.js
 * Llena colonias_similares.json para colonias del cerebro_datos que tienen 0-2 similares.
 * Usa Gemini para generar sugerencias con contexto NSE, luego valida.
 *
 * Uso: node fill_similares_gemini.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { normCol, normMuni } = require('./motor_remi_api');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SIM_PATH = path.join(__dirname, 'colonias_similares.json');
const NSE_PATH = path.join(__dirname, 'colonias_nse.json');
const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');

const MUNICIPIOS_INVALIDOS = new Set([
  'zapopan','guadalajara','tlaquepaque','tonala','tlajomulco',
  'zapopan centro','guadalajara centro','tonala centro','tlaquepaque centro',
  'san pedro tlaquepaque','san pedro','el salto','juanacatlan',
  'ixtlahuacan de los membrillos','la barca','ocotlan','zapotlanejo'
]);

// Nombres que claramente NO son colonias
const INVALIDOS_REGEX = /^(int|sn|sin nombre|parcela|propiedad \d|int \d|#\d|\d+\s*y\s*\d+|int\.\s*\d+|l\d+[a-z]|coto \d+|interior \d+|edificio|local \d+|torre|jalisco\s*i+\s*$|jalisco$|jal\.|secc?\s*\d+|12122|av\s+|entre\s+|esquina\s+|rosalio|de santiago|puerto yavaros|mayora)/i;

const NSE_RANGES = [
  [0,5000],[5000,8000],[8000,11000],[11000,16000],[16000,25000],[25000,40000],[40000,Infinity]
];
const NSE_LABELS = ['muy bajo (<5k)','bajo (5-8k)','medio-bajo (8-11k)','medio (11-16k)','medio-alto (16-25k)','alto (25-40k)','lujo (>40k)'];

function cleanNum(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,\s]/g,'').replace(/\s*m2.*/i,'')) || 0;
}

function estimarNse(pm2t) {
  for (let i=0; i<NSE_RANGES.length; i++)
    if (pm2t >= NSE_RANGES[i][0] && pm2t < NSE_RANGES[i][1]) return i;
  return 3;
}

function getColName(e) {
  return typeof e === 'string' ? e : (e && e.colonia ? e.colonia : null);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

function geminiCallModel(model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message));
          const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function geminiCall(prompt) {
  for (const model of MODELS) {
    try {
      const result = await geminiCallModel(model, prompt);
      return result;
    } catch(e) {
      const isOverload = e.message.includes('high demand') || e.message.includes('overloaded');
      const isQuota = e.message.includes('429') || e.message.includes('quota') || e.message.includes('Quota');
      if (isQuota) {
        // Extraer tiempo de espera del mensaje si lo incluye
        const wait = e.message.match(/retry in (\d+)/)?.[1];
        const ms = wait ? (parseInt(wait)+5)*1000 : 15000;
        console.log(`  ${model}: quota, esperando ${Math.round(ms/1000)}s...`);
        await sleep(ms);
        // Reintentar el mismo modelo una vez
        try { return await geminiCallModel(model, prompt); } catch(e2) {
          console.log(`  ${model}: fallo retry, probando siguiente modelo...`);
          await sleep(3000);
          continue;
        }
      }
      if (isOverload) {
        console.log(`  ${model}: alta demanda, probando siguiente...`);
        await sleep(5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Todos los modelos Gemini fallaron');
}

async function main() {
  const sim = JSON.parse(fs.readFileSync(SIM_PATH, 'utf8'));
  const nse = JSON.parse(fs.readFileSync(NSE_PATH, 'utf8'));
  const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));

  // NSE map normalizado
  const nseMap = {};
  for (const [k,v] of Object.entries(nse)) nseMap[normCol(k)] = v.nseIdx;

  // Extraer colonias válidas del cerebro con sus datos
  const coloniasCerebro = {};
  for (const d of cerebro) {
    const colRaw = d.sujetoColonia || '';
    const muniRaw = d.municipio || '';
    const col = normCol(colRaw);
    const muni = normMuni(muniRaw);
    if (!col || col.length < 4) continue;
    if (INVALIDOS_REGEX.test(col)) continue;
    if (MUNICIPIOS_INVALIDOS.has(col)) continue;
    if (!coloniasCerebro[col]) coloniasCerebro[col] = { muni, colRaw: colRaw.trim(), precios: [] };
    const vm = cleanNum(d.valorMercado);
    const m2t = cleanNum(d.m2Terreno);
    if (vm > 0 && m2t > 0) coloniasCerebro[col].precios.push(vm / m2t);
  }

  // Identificar las que necesitan fill (< 3 similares reales)
  const necesitan = [];
  for (const [col, data] of Object.entries(coloniasCerebro)) {
    const arr = sim[col] || [];
    const reales = arr.filter(e => {
      const n = getColName(e);
      return n && !MUNICIPIOS_INVALIDOS.has(normCol(n));
    });
    if (reales.length >= 4) continue; // ya tiene suficientes

    const pm2tAvg = data.precios.length > 0
      ? data.precios.reduce((a,b)=>a+b,0) / data.precios.length : 0;
    const nseEstimado = pm2tAvg > 0 ? estimarNse(pm2tAvg) : (nseMap[col] ?? null);

    necesitan.push({
      col,
      muni: data.muni,
      colRaw: data.colRaw,
      pm2t: Math.round(pm2tAvg),
      nse: nseEstimado,
      simActuales: reales.length,
      simArr: reales
    });
  }

  console.log(`Colonias a llenar: ${necesitan.length}`);

  // Filtrar fuera de AMG (pueblos lejanos sin mercado comparable)
  const AMG_MUNIS = new Set(['zapopan','guadalajara','tlaquepaque','tonala','tlajomulco',
    'el salto','juanacatlan','ixtlahuacan de los membrillos','zapotlanejo','acatlan de juarez',
    'san pedro tlaquepaque']);

  const paraGemini = necesitan.filter(x => AMG_MUNIS.has(x.muni) || x.nse !== null);
  console.log(`En AMG o con NSE conocido: ${paraGemini.length}`);

  // Agrupar en batches de 12
  const BATCH_SIZE = 12;
  const batches = [];
  for (let i=0; i<paraGemini.length; i+=BATCH_SIZE)
    batches.push(paraGemini.slice(i, i+BATCH_SIZE));

  console.log(`Batches: ${batches.length}\n`);

  let actualizadas = 0;

  for (let bi=0; bi<batches.length; bi++) {
    const batch = batches[bi];
    console.log(`--- Batch ${bi+1}/${batches.length} (${batch.length} colonias) ---`);

    const lineas = batch.map(x => {
      const nseLabel = x.nse !== null ? `NSE ${x.nse} — ${NSE_LABELS[x.nse]}` : 'NSE desconocido';
      const pm2tStr = x.pm2t > 0 ? `, $/m²T aprox $${x.pm2t.toLocaleString()}` : '';
      const actuales = x.simArr.map(e => getColName(e)).filter(Boolean).join(', ');
      const actualesStr = actuales ? ` (ya tiene: ${actuales})` : '';
      return `- "${x.colRaw}" en ${x.muni} — ${nseLabel}${pm2tStr}${actualesStr}`;
    }).join('\n');

    const prompt = `Eres un experto en mercado inmobiliario del Área Metropolitana de Guadalajara (AMG), Jalisco, México.

Para cada colonia listada, sugiere 5-6 colonias similares en términos de:
- Nivel socioeconómico (NSE) muy similar — NO subir ni bajar más de 1 nivel
- Mismo mercado inmobiliario (compradores del mismo perfil)
- Cercanía geográfica o acceso similar

REGLAS CRÍTICAS:
- Solo nombres de colonias reales del AMG o la misma zona
- No incluir nombres de municipios completos (zapopan, guadalajara, tonala, tlaquepaque, tlajomulco)
- No repetir las colonias que "ya tiene"
- Si ya tiene algunas, complementa para llegar a 6 total
- Responde SOLO con JSON válido, sin explicaciones

Formato de respuesta:
{
  "resultados": [
    { "colonia": "nombre tal como aparece en la lista", "similares": ["col1","col2","col3","col4","col5"] },
    ...
  ]
}

Colonias a procesar:
${lineas}`;

    let resp;
    try {
      resp = await geminiCall(prompt);
    } catch(e) {
      console.error('Error Gemini (todos los modelos):', e.message);
      continue;
    }

    // Parsear respuesta (puede venir en bloque ```json ... ```)
    let parsed;
    try {
      const clean = resp.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON encontrado');
      parsed = JSON.parse(jsonMatch[0]);
    } catch(e) {
      console.error('Error parseando respuesta:', e.message);
      console.error('Respuesta raw:', resp.slice(0,200));
      continue;
    }

    // Aplicar resultados
    for (const r of (parsed.resultados || [])) {
      // Encontrar la colonia correspondiente
      const found = batch.find(x =>
        normCol(r.colonia) === x.col ||
        r.colonia.toLowerCase().trim() === x.colRaw.toLowerCase().trim()
      );
      if (!found) { console.log(`  ⚠ No encontré: ${r.colonia}`); continue; }

      // Filtrar sugerencias inválidas
      const sugsLimpias = (r.similares || [])
        .filter(s => typeof s === 'string' && s.length > 3)
        .filter(s => !MUNICIPIOS_INVALIDOS.has(normCol(s)))
        .filter(s => normCol(s) !== found.col)
        .slice(0, 6);

      if (sugsLimpias.length === 0) { console.log(`  ⚠ Sin sugerencias válidas para ${found.col}`); continue; }

      // Validar NSE (permitir diff <= 1)
      const sugsValidadas = sugsLimpias.filter(s => {
        const snse = nseMap[normCol(s)];
        if (snse === undefined) return true; // sin datos = aceptar
        if (found.nse === null) return true;
        return Math.abs(snse - found.nse) <= 1;
      });

      // Construir array final: mantener existentes + agregar nuevas como objetos
      const existentesNorm = new Set((found.simArr).map(e => normCol(getColName(e))));
      const nuevasEntradas = sugsValidadas
        .filter(s => !existentesNorm.has(normCol(s)))
        .map(s => ({ colonia: normCol(s), menciones: 10 }));

      const arrayFinal = [...(sim[found.col] || []), ...nuevasEntradas];
      sim[found.col] = arrayFinal;

      console.log(`  ✓ ${found.col}: +${nuevasEntradas.length} similares (total=${arrayFinal.length})`);
      actualizadas++;
    }

    // Guardar después de cada batch
    fs.writeFileSync(SIM_PATH, JSON.stringify(sim, null, 2), 'utf8');
    console.log(`  Guardado. Colonias actualizadas hasta ahora: ${actualizadas}`);

    if (bi < batches.length - 1) {
      console.log('  Esperando 15s (rate limit 5 req/min)...');
      await sleep(15000);
    }
  }

  console.log(`\n=== LISTO ===`);
  console.log(`Colonias actualizadas: ${actualizadas}`);
}

main().catch(console.error);
