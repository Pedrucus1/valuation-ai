/**
 * resolver_sindatos_batch.js
 * Resuelve las colonias "sin_datos" en colonias_similares.enriquecido.v2.json
 * usando DeepSeek para identificar municipio+estado.
 *
 * Genera colonias_manual_municipios.json con los resultados.
 * Luego enriquecer_full_v2.js puede usar este archivo como fallback adicional.
 */
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MANUAL_PATH = path.join(__dirname, 'colonias_manual_municipios.json');
const V2_PATH     = path.join(__dirname, 'colonias_similares.enriquecido.v2.json');

const ds = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

// ── Cargar existentes para no re-procesar ───────────────────────────────────
const manual = fs.existsSync(MANUAL_PATH)
  ? JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'))
  : {};

// ── Extraer colonias sin_datos con contexto ─────────────────────────────────
const v2 = JSON.parse(fs.readFileSync(V2_PATH, 'utf8'));
const sinDatos = {}; // colonia original → { zonas_sujetos, municipios_sujetos }

const { normCol } = require('./motor_remi_api');

const ZONAS = {
  'guadalajara':'AMG-Centro','zapopan':'AMG-NW','tlaquepaque':'AMG-SE',
  'san pedro tlaquepaque':'AMG-SE','tonalá':'AMG-E','tonala':'AMG-E',
  'tlajomulco de zúñiga':'AMG-S','tlajomulco':'AMG-S',
  'el salto':'AMG-S','juanacatlán':'AMG-S','ixtlahuacán de los membrillos':'AMG-S',
  'chapala':'Chapala','jocotepec':'Chapala','poncitlán':'Chapala','ajijic':'Chapala',
  'puerto vallarta':'Costa-Sur','bahía de banderas':'Costa-Sur','compostela':'Costa-Sur',
  'manzanillo':'Costa-Colima','armería':'Costa-Colima',
};
function zonaOf(m) { return m ? (ZONAS[m.toLowerCase()] || 'Otro') : null; }

Object.entries(v2).forEach(([, obj]) => {
  const muniSujeto = obj._sujeto.municipio;
  const zonaSujeto = obj._sujeto.zona;
  obj.similares.forEach(s => {
    if (s.fuente !== 'sin_datos') return;
    const k = normCol(s.colonia);
    if (manual[k]) return; // ya resuelto
    if (!sinDatos[s.colonia]) sinDatos[s.colonia] = { zonas: new Set(), munis: new Set() };
    if (zonaSujeto) sinDatos[s.colonia].zonas.add(zonaSujeto);
    if (muniSujeto) sinDatos[s.colonia].munis.add(muniSujeto);
  });
});

const pendientes = Object.entries(sinDatos).map(([colonia, ctx]) => ({
  colonia,
  key: normCol(colonia),
  zonas: [...ctx.zonas],
  munis: [...ctx.munis],
})).filter(e => !manual[e.key]);

console.log(`Pendientes a resolver: ${pendientes.length} colonias`);
if (pendientes.length === 0) { console.log('Nada que hacer.'); process.exit(0); }

// ── Prompt para DeepSeek ────────────────────────────────────────────────────
function buildPrompt(batch) {
  const items = batch.map((e, i) => {
    const ctx = e.munis.length ? `(aparece como similar de colonias en: ${e.munis.slice(0,3).join(', ')})` : '';
    return `${i+1}. "${e.colonia}" ${ctx}`;
  }).join('\n');

  return `Eres un experto en geografía urbana de Jalisco, México.
Para cada colonia/fraccionamiento de la lista, identifica:
- municipio: el municipio de Jalisco (o Nayarit/Colima si aplica) donde está ubicada
- estado: nombre del estado (Jalisco, Nayarit, Colima, o "otro" si está fuera de estos)

Si la colonia no existe en Jalisco/Nayarit/Colima, escribe municipio: null, estado: "otro".
Si no estás seguro, usa el contexto de con quién aparece como colonia similar.

Responde SOLO con JSON válido, array de objetos con exactamente estos campos:
[{"colonia":"nombre exacto","municipio":"municipio o null","estado":"estado o null"}]

Colonias a identificar:
${items}`;
}

// ── Procesar en batches ─────────────────────────────────────────────────────
const BATCH_SIZE = 20;
const DELAY_MS   = 1500;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processBatch(batch) {
  const prompt = buildPrompt(batch);
  try {
    const resp = await ds.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 2000,
    });
    const text = resp.choices[0].message.content.trim();
    // Extraer JSON del response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON encontrado en: ' + text.slice(0, 200));
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Error en batch:', e.message);
    return null;
  }
}

async function main() {
  let saved = 0;
  const batches = [];
  for (let i = 0; i < pendientes.length; i += BATCH_SIZE)
    batches.push(pendientes.slice(i, i + BATCH_SIZE));

  console.log(`\nProcesando ${batches.length} batches de ${BATCH_SIZE} colonias...\n`);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`Batch ${b+1}/${batches.length} (${batch.length} colonias)... `);
    const results = await processBatch(batch);

    if (results) {
      results.forEach(r => {
        const key = normCol(r.colonia || '');
        if (!key) return;
        if (r.municipio && r.estado && r.estado !== 'otro') {
          manual[key] = { municipio: r.municipio, estado: r.estado, fuente: 'deepseek' };
          saved++;
        } else {
          manual[key] = { municipio: null, estado: r.estado || null, fuente: 'deepseek-null' };
        }
      });
      fs.writeFileSync(MANUAL_PATH, JSON.stringify(manual, null, 2));
      console.log(`✓ (${results.length} resueltos, total guardado: ${Object.keys(manual).length})`);
    } else {
      console.log('✗ (error, se omite)');
    }

    if (b < batches.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✅ Done. ${saved} colonias resueltas → ${MANUAL_PATH}`);

  // Resumen
  const conMuni    = Object.values(manual).filter(v => v.municipio).length;
  const sinMuni    = Object.values(manual).filter(v => !v.municipio).length;
  const fueraJal   = Object.values(manual).filter(v => v.municipio && v.estado !== 'Jalisco').length;
  console.log(`Con municipio: ${conMuni} | Sin municipio (null): ${sinMuni} | Fuera Jalisco: ${fueraJal}`);
}

main().catch(console.error);
