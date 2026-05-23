/**
 * enriquecer_colonias_ia.js
 *
 * Usa DeepSeek (primero) + Gemini (validación/complemento) para agrupar colonias
 * del Sepomex por similitud NSE y generar pares colonia → colonias_similares[].
 *
 * Criterios de similitud:
 * - CP proximity (mismo prefijo de 3 dígitos = misma zona geográfica)
 * - Tipo Sepomex: Fraccionamiento/Colonia = medio; Ejido/Rancho/Pueblo = popular;
 *   Condominio/Unidad habitacional = varía; Zona industrial = no residencial
 * - Nombre pattern: "Residencial/Privada/Villas" = medio-alto; "Ejidal/Pueblo/Rancho" = popular
 * - Conocimiento de mercado inmobiliario mexicano (DeepSeek/Gemini lo infieren)
 *
 * Uso: node enriquecer_colonias_ia.js [--municipio Guadalajara] [--dry-run]
 */

require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const deepseek = new OpenAI({
    apiKey: 'sk-002d18925d514fa7997b0b35718efd82',
    baseURL: 'https://api.deepseek.com/v1'
});

const geminiClient = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const SEP_PATH  = path.join(__dirname, 'sepomex_jalisco.json');
const SIM_PATH  = path.join(__dirname, 'colonias_similares.json');
const OUT_PATH  = path.join(__dirname, 'colonias_similares_enriquecido.json');

const TIPOS_NO_RESIDENCIAL = new Set(['Zona industrial','Aeropuerto','Zona naval','Zona federal','Granja','Campamento','Equipamiento','Zona comercial']);

const CHUNK_SIZE = 40;    // colonias por llamada a DeepSeek
const DELAY_MS   = 1500;  // pausa entre llamadas

const args = process.argv.slice(2);
const muniArg = args.includes('--municipio') ? args[args.indexOf('--municipio') + 1] : null;
const dryRun  = args.includes('--dry-run');

// ── municipios AMG prioritarios ───────────────────────────────────────────────
const MUNIS_AMG = [
    'Guadalajara','Zapopan','Tlaquepaque','San Pedro Tlaquepaque',
    'Tlajomulco de Zúñiga','Tonalá','El Salto'
];

function norm(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Prompt para DeepSeek ──────────────────────────────────────────────────────
function buildPrompt(municipio, colonias) {
    const lista = colonias.map(c =>
        `${c.nombre}|CP:${c.cp}|${c.tipo}`
    ).join('\n');

    return `Eres experto en mercado inmobiliario mexicano, especialmente en el AMG (Área Metropolitana de Guadalajara) y Jalisco.

Municipio: ${municipio}
Lista de colonias (nombre|CP|tipo):
${lista}

TAREA: Para cada colonia, identifica cuáles otras colonias de esta lista son comparables en términos de:
1. Nivel socioeconómico (NSE) inferido del CP, tipo y nombre
2. Tipo de comprador (INFONAVIT/popular, clase media, residencial, etc.)
3. Tipología inmobiliaria (autoconstrucción, desarrolladora, residencial cerrado, etc.)

Reglas de inferencia NSE:
- Tipo "Ejido/Rancho/Pueblo/Ranchería" → popular/rural
- Tipo "Zona industrial" → excluir (no residencial)
- Nombre con "Residencial/Privada/Villas del/Los Pinos" → medio-alto
- Nombre con "Ejidal/Pueblo/Rancho" → popular
- Nombre con "Fraccionamiento" → varía por CP
- CP mismo prefijo de 3 dígitos → misma zona geográfica, probablemente mismo NSE
- CPs altos en Guadalajara (448xx-449xx) → Guadalajara norte/oriente popular
- CPs bajos en Guadalajara (441xx-443xx) → centro/poniente, NSE mixto-alto

Responde SOLO con JSON válido, sin explicaciones, sin markdown:
{
  "similares": {
    "nombre_colonia_1": ["nombre_similar_1", "nombre_similar_2", ...],
    "nombre_colonia_2": ["nombre_similar_1", ...],
    ...
  }
}

Reglas de output:
- Solo incluir colonias con al menos 2 similares
- Máximo 8 similares por colonia
- No incluir la colonia misma en su lista
- Solo incluir colonias de esta misma lista
- Excluir colonias tipo Zona industrial, Aeropuerto, Equipamiento`;
}

// ── Llamada a DeepSeek ────────────────────────────────────────────────────────
async function deepseekChunk(municipio, colonias, retry = false) {
    const prompt = buildPrompt(municipio, colonias);
    try {
        const res = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Eres experto en mercado inmobiliario mexicano. Responde SOLO con JSON válido, sin explicaciones ni bloques markdown.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 8000,
            temperature: 0.2
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsed = JSON.parse(text);
        return parsed.similares || {};
    } catch (e) {
        if (!retry && e.message.includes('Unterminated')) {
            // JSON truncado: dividir chunk a la mitad y reintentar
            const mid = Math.floor(colonias.length / 2);
            const [a, b] = [colonias.slice(0, mid), colonias.slice(mid)];
            await sleep(1000);
            const [ra, rb] = await Promise.all([
                deepseekChunk(municipio, a, true),
                deepseekChunk(municipio, b, true)
            ]);
            return { ...ra, ...rb };
        }
        console.error('  DeepSeek error:', e.message.slice(0, 100));
        return {};
    }
}

// ── Validación/enriquecimiento con Gemini ─────────────────────────────────────
async function geminiValidar(municipio, colonias, deepseekResult) {
    if (!geminiClient) return deepseekResult;
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const preview = JSON.stringify(deepseekResult, null, 2).slice(0, 1000);
    const prompt = `Revisa y complementa este mapa de colonias similares para ${municipio}, Jalisco, generado por otro modelo IA.

Colonias disponibles: ${colonias.map(c=>`${c.nombre}(${c.cp})`).join(', ')}

Resultado actual (parcial):
${preview}

Agrega colonias similares que hayan quedado sin pares y corrige agrupaciones claramente incorrectas. Mantén los criterios: mismo NSE, mismo tipo de comprador, mismo segmento de mercado.

Responde SOLO con el JSON completo actualizado:
{"similares": {...}}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = text.match(/\{[\s\S]*"similares"[\s\S]*\}/);
        if (!m) return deepseekResult;
        const parsed = JSON.parse(m[0]);
        // Merge: Gemini completa lo que DeepSeek no cubrió
        const merged = { ...deepseekResult };
        for (const [col, sims] of Object.entries(parsed.similares || {})) {
            if (!merged[col] || merged[col].length < (sims||[]).length) {
                merged[col] = sims;
            }
        }
        return merged;
    } catch (e) {
        console.error('  Gemini error:', e.message.slice(0, 100));
        return deepseekResult;
    }
}

// ── Proceso principal ─────────────────────────────────────────────────────────
async function main() {
    const sep = JSON.parse(fs.readFileSync(SEP_PATH, 'utf8'));
    const simExistente = JSON.parse(fs.readFileSync(SIM_PATH, 'utf8'));

    // Filtrar colonias residenciales
    const todas = Object.values(sep).filter(c => !TIPOS_NO_RESIDENCIAL.has(c.tipo));

    // Municipios a procesar
    const munis = muniArg
        ? [muniArg]
        : MUNIS_AMG;

    const resultado = { ...simExistente };
    let totalNuevos = 0;

    for (const muni of munis) {
        const coloniasMuni = todas.filter(c =>
            norm(c.municipio) === norm(muni) ||
            c.municipio.toLowerCase().includes(norm(muni))
        );
        if (!coloniasMuni.length) { console.log(`\n[${muni}] Sin colonias en Sepomex`); continue; }

        console.log(`\n[${muni}] ${coloniasMuni.length} colonias residenciales`);

        // Ordenar por CP para que chunks sean geográficamente coherentes
        coloniasMuni.sort((a, b) => a.cp.localeCompare(b.cp));

        // Procesar en chunks
        for (let i = 0; i < coloniasMuni.length; i += CHUNK_SIZE) {
            const chunk = coloniasMuni.slice(i, i + CHUNK_SIZE);
            const chunkNum = Math.floor(i/CHUNK_SIZE)+1;
            const totalChunks = Math.ceil(coloniasMuni.length/CHUNK_SIZE);
            process.stdout.write(`  Chunk ${chunkNum}/${totalChunks} (CP ${chunk[0].cp}–${chunk[chunk.length-1].cp})... `);

            if (dryRun) { console.log('DRY-RUN skip'); continue; }

            // DeepSeek
            const dsResult = await deepseekChunk(muni, chunk);
            process.stdout.write(`DS:${Object.keys(dsResult).length} pares `);

            await sleep(DELAY_MS);

            // Gemini valida cada 2 chunks (rate limit)
            let finalResult = dsResult;
            if (chunkNum % 2 === 0 && geminiClient) {
                finalResult = await geminiValidar(muni, chunk, dsResult);
                process.stdout.write(`G:${Object.keys(finalResult).length} pares `);
                await sleep(2000);
            }

            // Merge al resultado global
            for (const [colRaw, simsRaw] of Object.entries(finalResult)) {
                const colNorm = norm(colRaw);
                if (!colNorm || !(simsRaw||[]).length) continue;
                const simsNorm = simsRaw
                    .map(s => norm(s))
                    .filter(s => s && s !== colNorm);
                if (!simsNorm.length) continue;

                const existing = resultado[colNorm] || [];
                const existingNames = new Set(existing.map(x => x.colonia));
                const nuevos = simsNorm.filter(s => !existingNames.has(s));

                resultado[colNorm] = [
                    ...existing,
                    ...nuevos.map(s => ({ colonia: s, menciones: 1, fuente: 'ia-sepomex' }))
                ];
                totalNuevos += nuevos.length;
            }
            console.log('✓');
            await sleep(DELAY_MS);
        }
    }

    if (!dryRun) {
        fs.writeFileSync(OUT_PATH, JSON.stringify(resultado, null, 2));
        console.log(`\n✅ Guardado en ${path.basename(OUT_PATH)}`);
        console.log(`   Colonias con similares: ${Object.keys(resultado).length}`);
        console.log(`   Pares nuevos agregados: ${totalNuevos}`);
        console.log(`\nPara aplicar: rename colonias_similares.json → .bak y renombrar el _enriquecido`);
    } else {
        console.log('\n[DRY-RUN] No se escribió nada. Quita --dry-run para ejecutar.');
    }
}

main().catch(console.error);
