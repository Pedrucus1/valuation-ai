/**
 * corregir_colonias_ia.js
 *
 * Usa DeepSeek para inferir la colonia del sujeto en OPIs donde sujetoColonia
 * quedó vacío porque el regex del extractor no pudo parsear el nombre/dirección.
 *
 * Uso:
 *   node corregir_colonias_ia.js --dry-run   → muestra propuestas sin guardar
 *   node corregir_colonias_ia.js --apply     → guarda en cerebro_datos.json
 *   node corregir_colonias_ia.js --folio OPI-26-2-10-OF   → solo ese OPI
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
});

const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY   = process.argv.includes('--apply');
const folioIdx = process.argv.indexOf('--folio');
const FOLIO   = folioIdx !== -1 ? process.argv[folioIdx + 1] : null;
const BATCH   = 10; // OPIs por llamada a DS

async function inferirColonias(opis) {
    // Armar lista para el prompt
    const lista = opis.map((o, i) =>
        `${i + 1}. folio:${o.folio} | municipio:${o.municipio} | fileName:"${o.fileName}" | direccion:"${o.direccion || ''}"`
    ).join('\n');

    const prompt = `Eres experto en direcciones de Jalisco, México.
Para cada OPI extrae la colonia (fraccionamiento, residencial, unidad habitacional, etc.) del sujeto.
Usa el fileName y la dirección. Si no hay colonia clara devuelve "".

${lista}

Responde SOLO con JSON (array en el mismo orden):
[{"folio":"OPI-...","colonia":"nombre de colonia"},...] `;

    try {
        const res = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Extrae colonias de direcciones mexicanas. Responde SOLO con JSON válido.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.0
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = text.match(/\[[\s\S]*\]/);
        if (!m) { console.error('DS: sin JSON array'); return []; }
        return JSON.parse(m[0]);
    } catch (e) {
        console.error('DS error:', e.message);
        return [];
    }
}

async function main() {
    const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));

    let candidatos = cerebro.filter(o => !o.sujetoColonia || o.sujetoColonia.trim() === '');
    if (FOLIO) candidatos = candidatos.filter(o => o.folio === FOLIO);

    console.log(`\nOPIs sin colonia: ${candidatos.length}\n`);
    if (!candidatos.length) { console.log('Nada que corregir.'); return; }

    const cambios = {};

    // Procesar en batches
    for (let i = 0; i < candidatos.length; i += BATCH) {
        const batch = candidatos.slice(i, i + BATCH);
        console.log(`Batch ${Math.floor(i/BATCH)+1}: OPIs ${i+1}–${i+batch.length}`);
        const resultados = await inferirColonias(batch);

        for (const r of resultados) {
            if (!r.colonia || r.colonia.trim() === '') {
                console.log(`  ⚠️  ${r.folio} → sin colonia inferida`);
                continue;
            }
            cambios[r.folio] = r.colonia.trim();
            console.log(`  ✅ ${r.folio} → "${r.colonia}"`);
        }
    }

    console.log(`\n─── Resumen: ${Object.keys(cambios).length} colonias inferidas ───`);

    if (!APPLY && !DRY_RUN) {
        console.log('\nUsa --apply para guardar o --dry-run para solo ver.');
        return;
    }

    if (APPLY) {
        let n = 0;
        cerebro.forEach(o => {
            if (cambios[o.folio]) { o.sujetoColonia = cambios[o.folio]; n++; }
        });
        fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
        console.log(`\n✅ cerebro_datos.json actualizado (${n} OPIs corregidos)`);
    } else {
        console.log('\nPropuestas (--apply para guardar):');
        Object.entries(cambios).forEach(([f, c]) => console.log(`  ${f}: "${c}"`));
    }
}

main().catch(console.error);
