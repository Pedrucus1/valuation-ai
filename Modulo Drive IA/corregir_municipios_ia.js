/**
 * corregir_municipios_ia.js
 * Usa DeepSeek para inferir el municipio correcto de cada OPI
 * cuyos datos de municipio son inválidos (colonia, dirección parcial, etc.)
 *
 * Uso: node corregir_municipios_ia.js [--dry-run]
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
});

const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');
const dryRun = process.argv.includes('--dry-run');

const MUNIS_VALIDOS = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco de zuniga','tlajomulco','tonala','el salto','chapala',
    'ocotlan','tepatitlan','lagos de moreno','autlan','puerto vallarta',
    'tala','ameca','la huerta','cihuatlan','cabo corrientes',
    'tesistan','nextipac','cocula','zacoalco de torres','jocotepec',
    'ixtlahuacan de los membrillos','juanacatlan','el arenal','tequila',
    'magdalena','etzatlan','ahualulco de mercado','san cristobal de la barranca'
]);

function normMuni(s) {
    return (s||'').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[^a-z\s]/g,'').trim();
}

function muniEsValido(m) {
    const n = normMuni(m);
    return MUNIS_VALIDOS.has(n);
}

const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));

// Detectar OPIs con municipio inválido
const aCorregir = cerebro.filter(o => !muniEsValido(o.municipio));
console.log(`\nOPIs con municipio inválido: ${aCorregir.length} de ${cerebro.length}`);

if (!aCorregir.length) {
    console.log('Nada que corregir.');
    process.exit(0);
}

async function inferirMunicipios(batch) {
    const lista = batch.map((o, i) =>
        `${i+1}. "${o.fileName || o.folio || '?'}" (municipio actual: "${o.municipio}")`
    ).join('\n');

    const prompt = `Eres experto en geografía de Jalisco y Nayarit, México.

Tengo una lista de avalúos inmobiliarios. Cada uno tiene el nombre del archivo (que es la dirección de la propiedad) y el municipio que fue extraído incorrectamente por un sistema automático.

Tu tarea: para cada avalúo, identifica el municipio correcto de Jalisco/Nayarit basándote en la dirección.

Avalúos:
${lista}

Responde SOLO con JSON:
{
  "municipios": ["municipio1", "municipio2", ...]
}

Reglas:
- Devuelve exactamente ${batch.length} municipios, uno por línea de la lista
- Si la dirección menciona colonia de Zapopan (Chapalita, Providencia, Colinas del Rey, etc.) → "Zapopan"
- Si menciona colonia de Guadalajara → "Guadalajara"
- Si menciona Tlajomulco, Santa Anita, Hacienda Santa Fe, San Agustín → "Tlajomulco de Zúñiga"
- Si menciona Tlaquepaque → "Tlaquepaque"
- Si menciona Tonalá → "Tonalá"
- Si menciona El Salto, Las Pintitas, El Castillo → "El Salto"
- Si no puedes determinar con certeza → devuelve ""`;

    try {
        const res = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Eres experto en geografía de Jalisco. Responde SOLO con JSON válido.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 2000,
            temperature: 0
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsed = JSON.parse(text);
        return parsed.municipios || [];
    } catch (e) {
        console.error('  DeepSeek error:', e.message.slice(0, 100));
        return batch.map(() => '');
    }
}

async function main() {
    const BATCH = 40;
    let corregidos = 0;
    let fallidos = 0;

    for (let i = 0; i < aCorregir.length; i += BATCH) {
        const batch = aCorregir.slice(i, i + BATCH);
        process.stdout.write(`Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(aCorregir.length/BATCH)} (${batch.length} OPIs)... `);

        const municipios = await inferirMunicipios(batch);

        for (let j = 0; j < batch.length; j++) {
            const muni = (municipios[j] || '').trim();
            const opi  = batch[j];
            if (muni && muni !== opi.municipio) {
                if (!dryRun) {
                    // Actualizar en el array original
                    const idx = cerebro.findIndex(o => o.fileId === opi.fileId || o.folio === opi.folio);
                    if (idx >= 0) {
                        cerebro[idx].municipio = muni;
                        corregidos++;
                    }
                } else {
                    console.log(`  [DRY] "${(opi.fileName||'').slice(0,50)}" → "${opi.municipio}" → "${muni}"`);
                    corregidos++;
                }
            } else {
                fallidos++;
            }
        }
        console.log(`✓ (${corregidos} corregidos hasta ahora)`);
        if (i + BATCH < aCorregir.length) await new Promise(r => setTimeout(r, 1000));
    }

    if (!dryRun) {
        // Backup antes de guardar
        fs.copyFileSync(CEREBRO_PATH, CEREBRO_PATH.replace('.json', '_pre_fix_municipios.json'));
        fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
        console.log(`\n✅ cerebro_datos.json actualizado`);
        console.log(`   Corregidos: ${corregidos} | Sin resolver: ${fallidos}`);
    } else {
        console.log(`\n[DRY-RUN] ${corregidos} serían corregidos, ${fallidos} sin resolver`);
    }
}

main().catch(console.error);
