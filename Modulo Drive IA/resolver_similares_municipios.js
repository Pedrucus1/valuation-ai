/**
 * resolver_similares_municipios.js
 * Resuelve el MUNICIPIO (+estado+zona) de las colonias similares que SEPOMEX no conoce
 * (cotos/fraccionamientos nuevos). Usa Gemini con el mismo patrón de rate-limit del proyecto.
 *
 * Entrada:  _worklist_restantes.json  (lista de nombres de colonia tal cual en colonias_similares.json)
 * Salida:   similares_municipios.json (override: normCol -> { municipio, estado, zona })
 *
 * NO modifica colonias_similares.json ni el motor. El override lo consume enriquecer_full_v2.js.
 * Rate limit: 1 batch a la vez, 15s entre batches (Gemini 5 req/min). Checkpoint por batch.
 *
 * Uso: node resolver_similares_municipios.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { normCol } = require('./motor_remi_api');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IN_PATH = path.join(__dirname, '_worklist_restantes.json');
const OUT_PATH = path.join(__dirname, 'similares_municipios.json');

// Mismo mapa zona del enriquecer_full_v2.js (mantener idéntico)
const ZONAS = {
  'guadalajara':'AMG-Centro','zapopan':'AMG-NW','tlaquepaque':'AMG-SE','san pedro tlaquepaque':'AMG-SE',
  'tonalá':'AMG-E','tonala':'AMG-E','tlajomulco de zúñiga':'AMG-S','tlajomulco':'AMG-S',
  'el salto':'AMG-S','juanacatlán':'AMG-S','ixtlahuacán de los membrillos':'AMG-S',
  'chapala':'Chapala','jocotepec':'Chapala','poncitlán':'Chapala','ajijic':'Chapala',
  'puerto vallarta':'Costa-Sur','bahía de banderas':'Costa-Sur','compostela':'Costa-Sur',
  'manzanillo':'Costa-Colima','armería':'Costa-Colima',
};
function zonaOf(m) { return m ? (ZONAS[m.toLowerCase().trim()] || 'Otro') : null; }

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
const MODELS = ['gemini-2.5-flash','gemini-2.0-flash','gemini-2.0-flash-lite'];

function geminiCallModel(model, prompt){
  return new Promise((resolve,reject)=>{
    const body = JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1,maxOutputTokens:2048} });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const req = https.request(url,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
      let data=''; res.on('data',c=>data+=c);
      res.on('end',()=>{ try{ const j=JSON.parse(data); if(j.error) return reject(new Error(j.error.message)); resolve(j.candidates?.[0]?.content?.parts?.[0]?.text||''); }catch(e){reject(e);} });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
async function geminiCall(prompt){
  for(const model of MODELS){
    try{ return await geminiCallModel(model,prompt); }
    catch(e){
      const isQuota = /429|quota/i.test(e.message);
      const isOver = /high demand|overloaded/i.test(e.message);
      if(isQuota){ const w=e.message.match(/retry in (\d+)/)?.[1]; const ms=w?(parseInt(w)+5)*1000:20000; console.log(`  ${model}: quota, esperando ${Math.round(ms/1000)}s...`); await sleep(ms); try{return await geminiCallModel(model,prompt);}catch{ await sleep(3000); continue; } }
      if(isOver){ console.log(`  ${model}: alta demanda, siguiente...`); await sleep(5000); continue; }
      throw e;
    }
  }
  throw new Error('Todos los modelos Gemini fallaron');
}

async function main(){
  const lista = JSON.parse(fs.readFileSync(IN_PATH,'utf8'));
  const out = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH,'utf8')) : {};

  // Saltar las que ya estén resueltas (checkpoint reanudable)
  const pendientes = lista.filter(c => out[normCol(c)] === undefined);
  console.log(`Total: ${lista.length} | Ya resueltas: ${lista.length-pendientes.length} | Pendientes: ${pendientes.length}`);

  const BATCH = 12;
  const batches = [];
  for(let i=0;i<pendientes.length;i+=BATCH) batches.push(pendientes.slice(i,i+BATCH));
  console.log(`Batches: ${batches.length}\n`);

  let resueltas=0, desconocidas=0;
  for(let bi=0; bi<batches.length; bi++){
    const batch = batches[bi];
    console.log(`--- Batch ${bi+1}/${batches.length} (${batch.length}) ---`);
    const lineas = batch.map((c,i)=>`${i+1}. "${c}"`).join('\n');
    const prompt = `Eres un experto en geografía urbana de Jalisco, Nayarit y Colima, México (incluye el Área Metropolitana de Guadalajara y la zona Chapala/Ribera y costa Puerto Vallarta/Bahía de Banderas).

Para cada colonia, fraccionamiento o coto listado, indica en qué MUNICIPIO y ESTADO se ubica. Muchos son cotos o fraccionamientos NUEVOS que no están en bases oficiales todavía.

REGLAS:
- municipio: nombre oficial del municipio (ej. "Zapopan", "Guadalajara", "San Pedro Tlaquepaque", "Tlajomulco de Zúñiga", "Tonalá", "El Salto", "Chapala", "Puerto Vallarta", "Bahía de Banderas").
- estado: "Jalisco", "Nayarit" o "Colima".
- Si NO reconoces el lugar con razonable certeza, usa municipio "DESCONOCIDO".
- NO inventes. Es preferible "DESCONOCIDO" a una adivinanza.
- Responde SOLO JSON válido, sin explicaciones.

Formato:
{ "resultados": [ { "n": 1, "municipio": "...", "estado": "..." }, ... ] }

Colonias:
${lineas}`;

    let resp;
    try { resp = await geminiCall(prompt); }
    catch(e){ console.error('  Error Gemini:', e.message); continue; }

    let parsed;
    try {
      const clean = resp.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
      const m = clean.match(/\{[\s\S]*\}/); if(!m) throw new Error('sin JSON');
      parsed = JSON.parse(m[0]);
    } catch(e){ console.error('  Parse error:', e.message, '|', resp.slice(0,120)); continue; }

    for(const r of (parsed.resultados||[])){
      const idx = (r.n|0)-1;
      const nombre = batch[idx];
      if(nombre===undefined) continue;
      const muni = (r.municipio||'').trim();
      const key = normCol(nombre);
      if(!muni || /desconocido/i.test(muni)){ out[key] = null; desconocidas++; continue; } // null = procesada pero sin dato
      const estado = (r.estado||'Jalisco').trim();
      out[key] = { municipio: muni, estado, zona: zonaOf(muni) };
      resueltas++;
    }
    fs.writeFileSync(OUT_PATH, JSON.stringify(out,null,1));
    console.log(`  Guardado. Resueltas acumuladas: ${resueltas}, desconocidas: ${desconocidas}`);
    if(bi < batches.length-1){ console.log('  Esperando 15s (rate limit)...'); await sleep(15000); }
  }
  console.log(`\n=== LISTO === resueltas: ${resueltas} | desconocidas: ${desconocidas}`);
}
main().catch(console.error);
