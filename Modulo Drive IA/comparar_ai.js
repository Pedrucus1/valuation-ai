/**
 * comparar_ai.js
 * Compara Gemini vs DeepSeek en las 13 propiedades problemáticas del análisis.
 * Llama ambas APIs (sin caché para obtener resultados frescos) y muestra
 * el error vs valor del perito para cada una.
 *
 * Uso: node comparar_ai.js
 */

require('dotenv').config({ path: '../.env' });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

const genAI        = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const deepseekClient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
});

function cleanNum(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.toString().replace(/[^0-9.-]+/g, '')) || 0;
}
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function antiRemate(precios) {
    const sorted = [...precios].sort((a, b) => a - b);
    const mediana = sorted[Math.floor(sorted.length / 2)];
    const f = precios.filter(p => p >= mediana * 0.60 && p <= mediana * 1.40);
    return f.length >= 2 ? f : sorted.slice(1, -1).length >= 2 ? sorted.slice(1, -1) : precios;
}
function getRH(edad, vida = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vida);
    return Math.max(0.20, 1 - 0.5 * (x + x * x));
}
const FACTORES_CONSERVACION = {
    nuevo: 1.00, muy_bueno: 1.00, bueno: 0.93, regular_bueno: 0.85,
    regular_medio: 0.78, regular_malo: 0.70, malo: 0.60, muy_malo: 0.48,
};
function metodoRomina(prop, comps) {
    if (!comps || !comps.length || !prop.construccion) return 0;
    const validos = comps.filter(c => c.m2_const > 0 && c.precio > 0);
    if (!validos.length) return 0;
    const pm2c     = validos.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));
    const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);
    const factorConservacion = FACTORES_CONSERVACION[prop.estadoConservacion] || 0.93;
    let suma = 0;
    compsFilt.forEach(c => {
        const pu = c.precio / c.m2_const;
        const factorSup = Math.pow(c.m2_const / prop.construccion, 1/6);
        suma += pu * factorSup * factorEdad * factorConservacion;
    });
    return Math.round((suma / compsFilt.length) * prop.construccion);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MXN   = v => v ? `$${v.toLocaleString('es-MX')}` : 'N/A';
const dif   = (calc, real) => calc && real ? (((calc / real) - 1) * 100).toFixed(1) + '%' : 'N/A';

function buildPromptGemini(prop, zona, similares) {
    const zonaStr = zona.colonia ? `colonia ${zona.colonia}, ${zona.municipio} Jalisco` : `${zona.municipio} Jalisco`;
    const zonasAlt = similares.length > 0 ? `Colonias de nivel similar: ${similares.join(', ')}.` : '';
    const recStr = prop.recamaras ? `${prop.recamaras} recámaras (±1 aceptable)` : 'sin restricción de recámaras';
    return `Busca casas en venta en ${zonaStr} en sitios como inmuebles24.com, propiedades.com, casasyterrenos.com.
Propiedad sujeto: casa de ${prop.construccion} m² de construcción, ${recStr}, en ${zonaStr}.
${zonasAlt}
Encuentra entre 3 y 6 casas en venta en esa zona.
Responde SOLO con este JSON:
{"comparables":[{"colonia":"...","precio":0000000,"m2c":000,"recamaras":0,"url":"..."},...]}
Reglas:
- m2c entre ${Math.round(prop.construccion * 0.6)} y ${Math.round(prop.construccion * 1.6)}
- precio en pesos MXN (entero)`;
}

function buildPromptDeepSeek(prop, zona, similares) {
    const zonaStr = zona.colonia ? `colonia ${zona.colonia}, ${zona.municipio} Jalisco` : `${zona.municipio} Jalisco`;
    const zonasAlt = similares.length > 0 ? `Colonias de NSE similar: ${similares.join(', ')}.` : '';
    const recStr = prop.recamaras ? `${prop.recamaras} recámaras (±1 aceptable)` : 'sin restricción de recámaras';
    return `Eres un valuador inmobiliario experto en el mercado de Guadalajara, Jalisco, México.
Necesito comparables reales de casas en venta en ${zonaStr} (año 2025-2026).
Propiedad sujeto: ${prop.construccion}m² de construcción, ${recStr}.
${zonasAlt}
Proporciona 3 a 6 comparables con precios representativos de la zona.
Responde SOLO con este JSON:
{"comparables":[{"colonia":"...","precio":0000000,"m2c":000,"recamaras":0},...]}
Reglas:
- precio total en pesos MXN (número entero, sin comas ni símbolos)
- m2c entre ${Math.round(prop.construccion * 0.6)} y ${Math.round(prop.construccion * 1.6)}
- Precios reales de mercado (no subestimar ni sobreestimar)`;
}

function parsearComps(text, prop) {
    const match = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    const raw = (parsed.comparables || [])
        .map(c => ({ m2_const: cleanNum(c.m2c), precio: cleanNum(c.precio), colonia: c.colonia || '' }))
        .filter(c => c.m2_const > 0 && c.precio > 100000
                  && c.m2_const >= prop.construccion * 0.5
                  && c.m2_const <= prop.construccion * 1.6);
    if (raw.length < 3) return raw;
    const pm2s = raw.map(c => c.precio / c.m2_const).sort((a, b) => a - b);
    const med  = pm2s[Math.floor(pm2s.length / 2)];
    return raw.filter(c => { const r = (c.precio / c.m2_const) / med; return r >= 0.60 && r <= 1.60; });
}

// ── Propiedades problemáticas ──────────────────────────────────────────────────
// Tomadas del cerebro_datos.json — las 13 que quedan fuera de ±20%
const PROBLEMATICAS = [
    { id: 'OPI-26-4-02', nombre: 'Santa Maria Guadalajara',       zona: { municipio: 'guadalajara',  colonia: 'santa maria'           }, m2C: 79.32,  m2T: 75.00,  edad: 30, rec: 3, conserv: 'bueno',         valorPerito: 1740000  },
    { id: 'OPI-26-4-01', nombre: 'Cantera Colorada Tlaquepaque',  zona: { municipio: 'tlaquepaque',  colonia: 'cantera colorada'      }, m2C: 137.33, m2T: 175.00, edad: 28, rec: 4, conserv: 'bueno',         valorPerito: 2615000  },
    { id: 'OPI-26-3-15', nombre: 'Noria de los Reyes Tlajomulco', zona: { municipio: 'tlajomulco',   colonia: 'la noria de los reyes' }, m2C: 141.23, m2T: 173.00, edad: 24, rec: 3, conserv: 'bueno',         valorPerito: 3884000  },
    { id: 'OPI-26-2-22', nombre: 'Camino Real Zapopan',           zona: { municipio: 'zapopan',      colonia: 'camino real'           }, m2C: 415.33, m2T: 720.00, edad: 22, rec: 5, conserv: 'bueno',         valorPerito: 8936000  },
    { id: 'OPI-26-2-19', nombre: 'Colina Central Tonalá',         zona: { municipio: 'tonala',       colonia: 'colinas del sol'       }, m2C: 108.77, m2T: 90.00,  edad: 18, rec: 3, conserv: 'bueno',         valorPerito: 1710000  },
    { id: 'OPI-26-2-15', nombre: 'Echeverría Guadalajara',        zona: { municipio: 'guadalajara',  colonia: 'echeverria'            }, m2C: 204.10, m2T: 229.00, edad: 45, rec: 4, conserv: 'bueno',         valorPerito: 2877000  },
    { id: 'OPI-26-2-06', nombre: 'Paseo del Prado Tlaquepaque',   zona: { municipio: 'tlaquepaque',  colonia: 'paseo del prado'       }, m2C: 74.67,  m2T: 65.00,  edad: 15, rec: 2, conserv: 'bueno',         valorPerito: 744000   },
    { id: 'OPI-26-2-04', nombre: 'Jardines de Guadalupe Zapopan', zona: { municipio: 'zapopan',      colonia: 'jardines de guadalupe' }, m2C: 365.74, m2T: 428.00, edad: 35, rec: 5, conserv: 'regular_medio', valorPerito: 10861000 },
    { id: 'OPI-26-2-03', nombre: 'El Campanario Tonalá',          zona: { municipio: 'tonala',       colonia: 'el campanario'         }, m2C: 59.00,  m2T: 72.00,  edad: 12, rec: 2, conserv: 'bueno',         valorPerito: 938000   },
    { id: 'OPI-26-1-14', nombre: 'San Francisco Tonalá',          zona: { municipio: 'tonala',       colonia: 'san francisco'         }, m2C: 75.25,  m2T: 86.00,  edad: 35, rec: 3, conserv: 'regular_medio', valorPerito: 1534000  },
    { id: 'OPI-26-1-11', nombre: 'Vista Hermosa Zapopan',         zona: { municipio: 'zapopan',      colonia: 'vista hermosa'         }, m2C: 225.80, m2T: 306.00, edad: 17, rec: 4, conserv: 'bueno',         valorPerito: 2761000  },
    { id: 'OPI-26-1-09', nombre: 'Bosques del Boulevard Gdl',     zona: { municipio: 'guadalajara',  colonia: 'bosques del boulevard' }, m2C: 165.81, m2T: 106.50, edad: 54, rec: 5, conserv: 'bueno',         valorPerito: 2769000  },
    { id: 'OPI-26-1-01', nombre: 'Lagos de Oriente Guadalajara',  zona: { municipio: 'guadalajara',  colonia: 'lagos de oriente'      }, m2C: 82.82,  m2T: 119.50, edad: 55, rec: 4, conserv: 'regular_medio', valorPerito: 1212000  },
];

const SIMILARES = {
    'santa maria':           ['oblatos', 'tetlan', 'rancho nuevo'],
    'cantera colorada':      ['lomas del gallo', 'el tapatío', 'san sebastianito'],
    'la noria de los reyes': ['el zapote', 'la tijera', 'las pintas'],
    'camino real':           ['ciudad granja', 'jardines vallarta', 'jocotan'],
    'colinas del sol':       ['tonalá centro', 'el verde', 'jardines de tonala'],
    'echeverria':            ['mexicaltzingo', 'moderna', 'artesanos'],
    'paseo del prado':       ['el tapatío', 'paseos del prado', 'villas san sebastian'],
    'jardines de guadalupe': ['prados de zapopan', 'ciudad granja', 'colinas de san javier'],
    'el campanario':         ['tonalá centro', 'lomas del gallo tonalá', 'jardines de tonalá'],
    'san francisco':         ['tonalá centro', 'el arenal', 'el tapatío tonalá'],
    'vista hermosa':         ['mesa colorada', 'jardines del vergel', 'colli'],
    'bosques del boulevard': ['atlas', 'olimpica', 'reforma'],
    'lagos de oriente':      ['lomas del gallo', 'san andres', 'hermosa provincia'],
};

async function llamarGemini(prop, zona, similares) {
    const prompt = buildPromptGemini(prop, zona, similares);
    const MODELOS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    for (const modelName of MODELOS) {
        try {
            const model  = genAI.getGenerativeModel({ model: modelName, tools: [{ googleSearch: {} }] });
            const result = await model.generateContent(prompt);
            const text   = result.response.text();
            return parsearComps(text, prop);
        } catch(e) {
            const is429 = e.message && (e.message.includes('429') || e.message.includes('quota'));
            console.log(`    [Gemini/${modelName}] ${is429 ? '429 rate limit' : e.message.substring(0, 60)}`);
            if (is429) await sleep(8000);
        }
    }
    return [];
}

async function llamarDeepSeek(prop, zona, similares) {
    const prompt = buildPromptDeepSeek(prop, zona, similares);
    try {
        const response = await deepseekClient.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000,
        });
        const text = response.choices[0]?.message?.content || '';
        return parsearComps(text, { construccion: prop.m2C });
    } catch(e) {
        console.log(`    [DeepSeek] Error: ${e.message}`);
        return [];
    }
}

async function main() {
    console.log('\n=== COMPARATIVA GEMINI vs DEEPSEEK — 13 propiedades problemáticas ===\n');
    console.log('ID'.padEnd(14) + 'Zona'.padEnd(30) + 'Perito'.padEnd(14) + 'Gemini'.padEnd(14) + 'DeepSeek'.padEnd(14) + 'G-err'.padEnd(9) + 'DS-err');
    console.log('─'.repeat(100));

    const resultados = [];
    let geminiCalls = 0;

    for (const p of PROBLEMATICAS) {
        const prop = {
            construccion: p.m2C,
            terreno: p.m2T,
            edad: p.edad,
            recamaras: p.rec,
            estadoConservacion: p.conserv,
            valorReal: p.valorPerito,
        };
        const similares = SIMILARES[p.zona.colonia] || [];

        process.stdout.write(`${p.id.padEnd(14)}${p.nombre.padEnd(30)}`);

        // Gemini (con rate limit control)
        if (geminiCalls > 0) await sleep(12000);
        geminiCalls++;
        const compsG = await llamarGemini(prop, p.zona, similares);
        const valorG = metodoRomina(prop, compsG);
        const errG   = valorG ? ((valorG / p.valorPerito - 1) * 100).toFixed(1) + '%' : 'N/A';
        const pm2cG  = compsG.length ? Math.round(avg(compsG.map(c => c.precio / c.m2_const))).toLocaleString() : '-';

        // DeepSeek (sin rate limit)
        const compsDS = await llamarDeepSeek(prop, p.zona, similares);
        const valorDS = metodoRomina(prop, compsDS);
        const errDS   = valorDS ? ((valorDS / p.valorPerito - 1) * 100).toFixed(1) + '%' : 'N/A';
        const pm2cDS  = compsDS.length ? Math.round(avg(compsDS.map(c => c.precio / c.m2_const))).toLocaleString() : '-';

        console.log(
            MXN(p.valorPerito).padEnd(14) +
            (valorG ? MXN(valorG) : 'N/A').padEnd(14) +
            (valorDS ? MXN(valorDS) : 'N/A').padEnd(14) +
            (errG + ' (' + (compsG.length) + 'c,$' + pm2cG + '/m²)').padEnd(25) +
            (errDS + ' (' + (compsDS.length) + 'c,$' + pm2cDS + '/m²)')
        );

        resultados.push({ id: p.id, nombre: p.nombre, valorPerito: p.valorPerito, valorG, errG, compsG: compsG.length, pm2cG, valorDS, errDS, compsDS: compsDS.length, pm2cDS });
    }

    // Resumen
    console.log('\n' + '─'.repeat(100));
    const gDentro  = resultados.filter(r => r.valorG  && Math.abs(r.valorG  / r.valorPerito - 1) <= 0.20).length;
    const dsDentro = resultados.filter(r => r.valorDS && Math.abs(r.valorDS / r.valorPerito - 1) <= 0.20).length;
    const gErrProm = resultados.filter(r => r.valorG).map(r => Math.abs(r.valorG / r.valorPerito - 1));
    const dsErrProm = resultados.filter(r => r.valorDS).map(r => Math.abs(r.valorDS / r.valorPerito - 1));
    const prom = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(1) : 'N/A';

    console.log(`\nGEMINI  : ${gDentro}/${PROBLEMATICAS.length} dentro de ±20% | Error prom: ${prom(gErrProm)}%`);
    console.log(`DEEPSEEK: ${dsDentro}/${PROBLEMATICAS.length} dentro de ±20% | Error prom: ${prom(dsErrProm)}%`);
    console.log('\nGanador por propiedad:');
    resultados.forEach(r => {
        const eG  = r.valorG  ? Math.abs(r.valorG  / r.valorPerito - 1) : Infinity;
        const eDS = r.valorDS ? Math.abs(r.valorDS / r.valorPerito - 1) : Infinity;
        const gan = eG <= eDS ? 'GEMINI  ' : 'DEEPSEEK';
        const dif = Math.abs(eG - eDS) * 100;
        console.log(`  ${gan} gana en ${r.nombre.padEnd(30)} | G:${r.errG} vs DS:${r.errDS} (Δ${dif.toFixed(1)}pp)`);
    });
}

main().catch(console.error);
