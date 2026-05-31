/**
 * arreglar_colonias_cerebro.js
 * Usa Gemini para extraer colonia y municipio correctos de entradas con mal captura.
 * Lee el fileName (título del OPI) + direccion y pide a Gemini que identifique
 * la colonia real, municipio real y si está dentro del AMG.
 *
 * Uso: node arreglar_colonias_cerebro.js [--dry-run]
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { normCol } = require('./motor_remi_api');

const DRY_RUN = process.argv.includes('--dry-run');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODELS     = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function geminiCallModel(model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message));
          resolve(j.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function geminiCall(prompt) {
  for (const model of MODELS) {
    try { return await geminiCallModel(model, prompt); }
    catch(e) {
      const isLimit = /quota|429|high demand/i.test(e.message);
      if (isLimit) {
        const wait = e.message.match(/retry in (\d+)/)?.[1];
        const ms = wait ? (parseInt(wait) + 5) * 1000 : 20000;
        console.log(`  ${model}: limit, esperando ${Math.round(ms/1000)}s...`);
        await sleep(ms);
        try { return await geminiCallModel(model, prompt); } catch(e2) {
          console.log(`  ${model}: retry falló, siguiente...`);
          await sleep(3000); continue;
        }
      }
      console.log(`  ${model}: error (${e.message.slice(0, 60)}), siguiente...`);
      await sleep(2000); continue;
    }
  }
  throw new Error('Todos los modelos fallaron');
}

// Entradas a corregir: sujetoColonia con menos de 3 similares y parece basura
const BASURA_RE = /^(\d+|int\b|interior|sn\b|sin nombre|parcela|propiedad\b|bodega|local |ebano\s|c nanzal|e 17col|l26b|torrenta|haciendas de\b|jalisco\b|jalisco primera|jalisco i|primera\b|de santiago|rosalio|margarita masa|av los arcos|edificio a|esquina ignacio|secc \d|int\.|int \d|coto 18\b|jalisco tonala)/i;

async function main() {
  const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
  const sim     = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_similares.json'), 'utf8'));

  // Identificar entradas a corregir (colonia vacía o basura)
  const targets = cerebro
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => {
      const col = normCol(d.sujetoColonia || '');
      const n   = (sim[col] || []).length;
      const vacio = !d.sujetoColonia || d.sujetoColonia.trim() === '';
      return vacio || (n < 3 && (BASURA_RE.test(col) || col.length < 4));
    });

  console.log(`Entradas a corregir: ${targets.length}`);
  if (DRY_RUN) {
    targets.forEach(({ d }) => console.log(' ', d.folio || d.fileName?.slice(0, 80)));
    process.exit(0);
  }

  const BATCH = 8;
  let corregidas = 0;

  for (let bi = 0; bi < targets.length; bi += BATCH) {
    const batch = targets.slice(bi, bi + BATCH);
    console.log(`\n--- Batch ${Math.floor(bi / BATCH) + 1}/${Math.ceil(targets.length / BATCH)} ---`);

    const lineas = batch.map(({ d }, idx) => {
      const titulo  = (d.fileName || '').replace(/^OPI-[\d-]+-\w+\s*/, '').trim();
      const dir     = (d.direccion || d.sujetoDireccion || '').replace(/\n/g, ' ').trim();
      const colActual = d.sujetoColonia || '(vacía)';
      const muniActual = d.municipio || '(vacío)';
      return `${idx + 1}. Título OPI: "${titulo}"\n   Dirección: "${dir}"\n   Colonia actual (MAL): "${colActual}" | Municipio actual: "${muniActual}"`;
    }).join('\n\n');

    const prompt = `Eres experto en bienes raíces de Jalisco, México. Analiza cada propiedad y extrae la colonia y municipio correctos.

REGLAS:
- La colonia es el nombre del barrio/colonia/fraccionamiento donde está la propiedad (NO el nombre del edificio, coto, local, número de interior, ni número de parcela).
- Si la dirección menciona explícitamente "Col.", "Colonia", "Fracc." o el fraccionamiento, úsalo.
- Si no hay colonia clara (predio rústico, parcela ejidal, sin nombre), escribe "SIN_COLONIA".
- Si está fuera de Jalisco (Nayarit, Estado de México, etc.), indica el estado real.
- El municipio debe ser el nombre limpio (sin "de Zúñiga", sin estado): Zapopan, Tlajomulco, Guadalajara, Tonalá, Tlaquepaque, etc.

RESPONDE SOLO con JSON válido:
{
  "resultados": [
    {
      "num": 1,
      "colonia": "nombre exacto de la colonia",
      "municipio": "municipio limpio",
      "notas": "breve nota si hay ambigüedad"
    }
  ]
}

Propiedades a analizar:
${lineas}`;

    let resp;
    try { resp = await geminiCall(prompt); }
    catch(e) { console.error('Error Gemini:', e.message); continue; }

    let parsed;
    try {
      const clean = resp.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
    } catch(e) { console.error('Parse error:', e.message, '| raw:', resp.slice(0, 150)); continue; }

    for (const r of (parsed.resultados || [])) {
      const idx = r.num - 1;
      if (idx < 0 || idx >= batch.length) continue;
      const { d, i } = batch[idx];
      const coloniaAntes = d.sujetoColonia || '(vacía)';
      const coloniaNueva = (r.colonia || '').trim();
      const muniNuevo    = (r.municipio || '').trim();

      if (!coloniaNueva || coloniaNueva === 'SIN_COLONIA') {
        console.log(`  [${d.folio || '?'}] ${coloniaAntes} → SIN_COLONIA (${r.notas || ''})`);
        continue;
      }

      cerebro[i].sujetoColonia = coloniaNueva;
      if (muniNuevo) cerebro[i].municipio = muniNuevo;
      corregidas++;
      console.log(`  ✓ [${d.folio || '?'}] "${coloniaAntes}" → "${coloniaNueva}" | ${muniNuevo}${r.notas ? ' | ' + r.notas : ''}`);
    }

    // Guardar después de cada batch
    fs.writeFileSync(path.join(__dirname, 'cerebro_datos.json'), JSON.stringify(cerebro, null, 2), 'utf8');

    if (bi + BATCH < targets.length) { console.log('  Esperando 18s...'); await sleep(18000); }
  }

  console.log(`\n=== LISTO === Entradas corregidas: ${corregidas}/${targets.length}`);
}

main().catch(console.error);
