/**
 * validar_similares_gemini.js
 * Verifica con Gemini si las colonias similares son correctas para cada colonia base.
 * Proporciona contexto: municipio, NSE, precio/m²T para que Gemini evalúe con precisión.
 *
 * Uso: node validar_similares_gemini.js [--solo-noverif] [--dry-run]
 *   --solo-noverif  Solo revisar colonias cuyas similares no están en IDX
 *   --dry-run       Mostrar qué se enviaría sin modificar el archivo
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { normCol, normMuni } = require('./motor_remi_api');

const SOLO_NOVERIF = process.argv.includes('--solo-noverif');
const DRY_RUN      = process.argv.includes('--dry-run');

async function main() {

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODELS     = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

const SIM_PATH = path.join(__dirname, 'colonias_similares.json');
const sim    = JSON.parse(fs.readFileSync(SIM_PATH, 'utf8'));
const nse    = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_nse.json'), 'utf8'));
const idx    = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

// Construir sets de datos reales
const realesIDX = new Set();
for (const [m,tipos] of Object.entries(idx))
  for (const [t,cols] of Object.entries(tipos))
    for (const col of Object.keys(cols)) realesIDX.add(normCol(col));
const realesCerebro = new Set();
for (const d of cerebro) { const c=normCol(d.sujetoColonia||''); if(c.length>=3) realesCerebro.add(c); }

// NSE map con precio
const nseMap = {};
for (const [k,v] of Object.entries(nse)) nseMap[normCol(k)] = { nse: v.nseIdx, pm2: Math.round(v.medianaPm2||0) };

const NSE_LABEL = ['muy bajo (<$5k/m²T)','bajo ($5-8k)','medio-bajo ($8-11k)','medio ($11-16k)',
                   'medio-alto ($16-25k)','alto ($25-40k)','lujo (>$40k)'];

// Precio estimado del cerebro por colonia
const pm2tCerebro = {};
for (const d of cerebro) {
  const col = normCol(d.sujetoColonia||'');
  const vm  = parseFloat(String(d.valorMercado||'').replace(/[$,\s]/g,''))||0;
  const m2t = parseFloat(String(d.m2Terreno||'').replace(/[^0-9.]/g,''))||0;
  if (vm>0 && m2t>0) {
    if (!pm2tCerebro[col]) pm2tCerebro[col] = [];
    pm2tCerebro[col].push(vm/m2t);
  }
}

function getColName(e) { return typeof e==='string'?e:(e&&e.colonia?e.colonia:null); }
const MUNIS_INVALIDOS = new Set(['zapopan','guadalajara','tlaquepaque','tonala','tlajomulco',
  'san pedro','san pedro tlaquepaque','el salto','ocotlan','la barca','zapotlanejo']);
const INVALIDOS_RE = /^(int|sn|sin nombre|parcela|propiedad|jalisco$|jal\.|av\s)/i;

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

function geminiCallModel(model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1,maxOutputTokens:3000} });
    const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const req  = https.request(url, {method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
      let data=''; res.on('data',c=>data+=c);
      res.on('end',()=>{
        try {
          const j=JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message));
          resolve(j.candidates?.[0]?.content?.parts?.[0]?.text||'');
        } catch(e){reject(e);}
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

async function geminiCall(prompt) {
  for (const model of MODELS) {
    try { return await geminiCallModel(model, prompt); }
    catch(e) {
      const isLimit = e.message.includes('quota')||e.message.includes('Quota')||e.message.includes('429')||e.message.includes('high demand');
      if (isLimit) {
        const wait = e.message.match(/retry in (\d+)/)?.[1];
        const ms   = wait ? (parseInt(wait)+5)*1000 : 16000;
        console.log(`  ${model}: limit, esperando ${Math.round(ms/1000)}s...`);
        await sleep(ms);
        try { return await geminiCallModel(model, prompt); } catch(e2) {
          console.log(`  ${model}: retry falló, siguiente modelo...`);
          await sleep(3000); continue;
        }
      }
      console.log(`  ${model}: error (${e.message.slice(0,60)}), siguiente...`);
      await sleep(2000); continue;
    }
  }
  throw new Error('Todos los modelos fallaron');
}

// ── Construir lista de colonias a validar ────────────────────────────────────
const INVALIDOS_COL = /^(int|sn|sin nombre|parcela|propiedad|jalisco$|jal\.|av\s)/i;
const colsCerebro = [...new Set(cerebro.map(d=>normCol(d.sujetoColonia||'')).filter(c=>c.length>=4&&!INVALIDOS_COL.test(c)&&!MUNIS_INVALIDOS.has(c)))];

const aValidar = [];
for (const col of colsCerebro) {
  const arr = (sim[col]||[]).filter(e=>{const n=getColName(e);return n&&!MUNIS_INVALIDOS.has(normCol(n));});
  if (arr.length===0) continue;

  // Separar verificadas y no verificadas
  const noVerif = arr.filter(e=>{
    const n=normCol(getColName(e)||'');
    return !realesIDX.has(n) && !realesCerebro.has(n);
  });

  if (SOLO_NOVERIF && noVerif.length===0) continue;

  // Datos de la colonia base
  const nseData = nseMap[col];
  const pm2ts   = pm2tCerebro[col]||[];
  const pm2tAvg = pm2ts.length>0 ? Math.round(pm2ts.reduce((a,b)=>a+b,0)/pm2ts.length) : (nseData?.pm2||0);
  const nseIdx  = nseData?.nse ?? (pm2tAvg>0 ? [5000,8000,11000,16000,25000,40000].findIndex(v=>pm2tAvg<v) : null);

  // Municipio del cerebro
  const muniEntry = cerebro.find(d=>normCol(d.sujetoColonia||'')===col);
  const muni = normMuni(muniEntry?.municipio||'');

  const similares = SOLO_NOVERIF ? noVerif.map(e=>getColName(e)) : arr.map(e=>getColName(e));

  aValidar.push({ col, muni, nseIdx, pm2t: pm2tAvg, similares, todosArr: arr });
}

console.log(`Colonias a validar: ${aValidar.length} (modo: ${SOLO_NOVERIF?'solo-no-verificadas':'todas'})`);
console.log(`Batches de 10: ${Math.ceil(aValidar.length/10)}`);
if (DRY_RUN) { aValidar.slice(0,5).forEach(x=>console.log(' ',x.col,'->',x.similares.join(', '))); process.exit(0); }

// ── Procesar en batches ──────────────────────────────────────────────────────
const BATCH = 10;
let removidas = 0;

for (let bi=0; bi<aValidar.length; bi+=BATCH) {
  const batch = aValidar.slice(bi, bi+BATCH);
  console.log(`\n--- Batch ${Math.floor(bi/BATCH)+1}/${Math.ceil(aValidar.length/BATCH)} ---`);

  const lineas = batch.map(x => {
    const nseStr = x.nseIdx!==null ? `NSE ${x.nseIdx} — ${NSE_LABEL[x.nseIdx]}` : 'NSE desconocido';
    const pm2Str = x.pm2t>0 ? `, precio ~$${x.pm2t.toLocaleString('en')}/m²T` : '';
    return `- Colonia: "${x.col}" | Municipio: ${x.muni||'?'} | ${nseStr}${pm2Str}\n  Similares a verificar: ${x.similares.join(', ')}`;
  }).join('\n');

  const prompt = `Eres experto en mercado inmobiliario del Área Metropolitana de Guadalajara (AMG), Jalisco, México.

Para cada colonia base, evalúa si las colonias similares propuestas son correctas.
Una similar es válida si: mismo municipio o zona geográfica cercana, mismo nivel socioeconómico (NSE), mismo tipo de comprador.

RESPONDE SOLO con JSON válido:
{
  "resultados": [
    {
      "colonia": "nombre exacto de la colonia base",
      "validas": ["col1","col2"],
      "invalidas": ["col3"],
      "razon_invalidas": "breve explicación"
    }
  ]
}

Colonias a evaluar:
${lineas}`;

  let resp;
  try { resp = await geminiCall(prompt); }
  catch(e) { console.error('Error:', e.message); continue; }

  // Parsear respuesta
  let parsed;
  try {
    const clean = resp.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
    parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
  } catch(e) { console.error('Parse error:', e.message, '| Raw:', resp.slice(0,100)); continue; }

  // Aplicar correcciones
  for (const r of (parsed.resultados||[])) {
    const found = batch.find(x => normCol(r.colonia)===x.col || r.colonia.toLowerCase().trim()===x.col);
    if (!found) { console.log(`  ⚠ No encontré: ${r.colonia}`); continue; }

    const invalidas = new Set((r.invalidas||[]).map(s=>normCol(s)));
    if (invalidas.size===0) { console.log(`  ✓ ${found.col}: todas OK`); continue; }

    const antes = found.todosArr.length;
    const despues = found.todosArr.filter(e=>{
      const n=normCol(getColName(e)||'');
      return !invalidas.has(n);
    });

    const quitadas = antes - despues.length;
    if (quitadas > 0) {
      sim[found.col] = despues;
      removidas += quitadas;
      console.log(`  ✗ ${found.col}: -${quitadas} inválidas (${[...invalidas].join(', ')}) | razón: ${r.razon_invalidas||''}`);
    } else {
      console.log(`  ✓ ${found.col}: todas OK (${r.invalidas?.join(', ')||''} no coincidieron)`);
    }
  }

  // Guardar después de cada batch
  if (!DRY_RUN) fs.writeFileSync(SIM_PATH, JSON.stringify(sim, null, 2), 'utf8');

  if (bi+BATCH < aValidar.length) { console.log('  Esperando 16s...'); await sleep(16000); }
}

console.log(`\n=== LISTO === Entradas removidas: ${removidas}`);
}

main().catch(console.error);
