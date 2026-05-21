/**
 * deepseek_dev.js
 *
 * Interfaz de desarrollo con DeepSeek-V3 como agente principal.
 * DeepSeek lee contexto, propone código y analiza datos.
 * Claude Code revisa y aplica los cambios.
 *
 * Uso:
 *   node deepseek_dev.js "describe la tarea aquí"
 *   node deepseek_dev.js "describe la tarea" archivo1.js archivo2.js
 */

require('dotenv').config({ path: '../.env' });

const fs   = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const readline = require('readline');

const deepseek = new OpenAI({
    apiKey:  process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
});

const MAX_FILE_CHARS = 40000; // ~10k tokens por archivo

function leerArchivo(filePath) {
    const full = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    if (!fs.existsSync(full)) return `[archivo no encontrado: ${filePath}]`;
    const content = fs.readFileSync(full, 'utf8');
    if (content.length > MAX_FILE_CHARS) {
        return content.slice(0, MAX_FILE_CHARS) + `\n\n[... truncado en ${MAX_FILE_CHARS} chars]`;
    }
    return content;
}

function construirContexto(archivos) {
    if (!archivos.length) return '';
    const partes = archivos.map(f => {
        const nombre = path.basename(f);
        const contenido = leerArchivo(f);
        return `=== ${nombre} ===\n${contenido}\n`;
    });
    return '\n\nCONTEXTO DE ARCHIVOS:\n' + partes.join('\n');
}

async function preguntarDeepSeek(tarea, archivos) {
    const contexto = construirContexto(archivos);

    const systemPrompt = `Eres un asistente de desarrollo senior especializado en Node.js, JavaScript y motores de valuación inmobiliaria en México.

FUENTES DE VALORES PARAMÉTRICOS DE CONSTRUCCIÓN (consultar cuando se necesiten costos BIMSA/Varela):
- Varela Ingeniería de Costos: https://varela.com.mx/costos-parametricos-de-construccion/
- Varela PDF costos m²: https://varela.com.mx/wp-content/uploads/CostosPorMetroCuadradoDeConstruccion3.pdf
- BIMSA vía CMIC: https://www.cmic.org.mx/comisiones/Tematicas/costosyp/Costom2/Bimsa/
- INDAABIN metodología: https://www.gob.mx/cms/uploads/attachment/file/126900/73-_PROCEDIMIENTO_T_cnico_PT-IH.pdf
- Neodata paramétricos: https://neodata.mx/parametricos
- Opus Planet 2025-26: https://opus-planet.mx/blog/costo-construccion-metro-cuadrado-mexico/

Rangos paramétricos 2025-2026 (Guadalajara AMG):
- Económico/Social: $4,800-7,000/m²
- Interés social: $7,000-10,000/m²
- Medio: $12,000-15,000/m²
- Residencial premium: $16,000-20,000/m²
- Lujo: $25,000-50,000+/m²

Tu rol en este proyecto:
- Lees el código y contexto proporcionado
- Propones soluciones concretas con código listo para usar
- Explicas brevemente el razonamiento (2-3 líneas máx)
- Si hay que editar código, muestras el fragmento ANTES y DESPUÉS
- Si hay que analizar datos, devuelves el análisis estructurado

Proyecto: Motor de valuación inmobiliaria PropValu (Guadalajara, México)
Stack: Node.js, Google Sheets API, Gemini AI, DeepSeek V3, scraper de comparables
Archivos clave: comparar_metodologias.js (motor principal), cache_consolidado.json (comparables), anomalias.json (casos con error >30%)`;

    const userPrompt = `TAREA: ${tarea}${contexto}`;

    console.log(`\n🤖 DeepSeek procesando tarea...\n${'─'.repeat(60)}`);

    const stream = await deepseek.chat.completions.create({
        model:  'deepseek-chat',
        stream: true,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
        ],
        max_tokens: 4000,
    });

    let respuesta = '';
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        process.stdout.write(delta);
        respuesta += delta;
    }

    console.log(`\n${'─'.repeat(60)}\n`);
    return respuesta;
}

async function modoInteractivo() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const archivosActivos = [];

    console.log('🔧 DeepSeek Dev — modo interactivo');
    console.log('Comandos: /archivo <nombre>  /limpiar  /salir\n');

    const prompt = () => rl.question('📝 Tarea: ', async (input) => {
        input = input.trim();
        if (!input) return prompt();

        if (input === '/salir') { rl.close(); return; }
        if (input === '/limpiar') { archivosActivos.length = 0; console.log('Contexto limpiado.\n'); return prompt(); }
        if (input.startsWith('/archivo ')) {
            const archivo = input.replace('/archivo ', '').trim();
            archivosActivos.push(archivo);
            console.log(`✅ Archivo agregado: ${archivo}\n`);
            return prompt();
        }

        await preguntarDeepSeek(input, archivosActivos);
        prompt();
    });

    prompt();
}

// ── Entry point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (!args.length) {
    modoInteractivo();
} else {
    // node deepseek_dev.js "tarea" [archivo1] [archivo2] ...
    const tarea    = args[0];
    const archivos = args.slice(1);
    preguntarDeepSeek(tarea, archivos).catch(console.error);
}
