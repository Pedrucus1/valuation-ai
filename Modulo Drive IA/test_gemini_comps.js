/**
 * test_gemini_comps.js
 * Busca comparables via Gemini + Google Search para 3 propiedades problemáticas,
 * luego aplica Romina-Scraper y compara con el valor del perito.
 */

require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function cleanNum(s) {
    return parseFloat((s || '').toString().replace(/[^0-9.-]+/g, '')) || 0;
}

function antiRemate(precios) {
    if (!precios.length) return [];
    if (precios.length <= 2) return precios;
    const sorted = [...precios].sort((a, b) => a - b);
    const mediana = sorted[Math.floor(sorted.length / 2)];
    const f = precios.filter(p => p >= mediana * 0.60 && p <= mediana * 1.40);
    return f.length >= 2 ? f : sorted.slice(Math.floor(sorted.length / 4), Math.ceil(sorted.length * 3 / 4));
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function metodoRomina(prop, comps) {
    if (!comps || !comps.length || !prop.construccion) return 0;
    const validos = comps.filter(c => c.m2c > 0 && c.precio > 0);
    if (!validos.length) return 0;

    const pm2c = validos.map(c => c.precio / c.m2c);
    const pm2cFilt = antiRemate(pm2c);
    const compsFilt = validos.filter((c, i) => pm2cFilt.includes(pm2c[i]));

    let suma = 0;
    compsFilt.forEach(c => {
        const pu = c.precio / c.m2c;
        const factorSup  = Math.pow(c.m2c / prop.construccion, 1 / 6);
        const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);
        suma += pu * factorSup * factorEdad;
    });

    return (suma / compsFilt.length) * prop.construccion;
}

async function buscarCompsGemini(prop) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} }]
    });

    const zonaAmplia = prop.zona.replace('Colonia ', '');
    const prompt = `Busca casas en venta en ${zonaAmplia} Guadalajara Jalisco en sitios como inmuebles24.com, propiedades.com, casasyterrenos.com o vivanuncios.com.

Propiedad sujeto: casa de ${prop.construccion} m² de construcción en ${zonaAmplia}.

Encuentra entre 3 y 5 casas en venta en esa zona o colonias cercanas similares, con precio y metros cuadrados de construcción visibles.

Responde SOLO con este JSON, sin explicaciones:
{
  "comparables": [
    {"colonia": "...", "precio": 0000000, "m2c": 000, "m2t": 000, "url": "..."},
    ...
  ]
}

Reglas:
- precio: número entero en pesos MXN
- m2c: metros cuadrados de construcción (obligatorio, mayor a 0)
- m2t: metros cuadrados de terreno (0 si no se menciona)
- Si la colonia exacta no tiene oferta, usa colonias vecinas de nivel socioeconómico similar
- Omite propiedades sin m2c confirmado`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extraer JSON de la respuesta
        const jsonMatch = text.match(/\{[\s\S]*"comparables"[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('  Gemini no devolvió JSON válido. Respuesta:', text.slice(0, 500));
            return [];
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const comps = (parsed.comparables || []).map(c => ({
            direccion: c.direccion,
            colonia:   c.colonia,
            precio:    cleanNum(c.precio),
            m2c:       cleanNum(c.m2c),
            m2t:       cleanNum(c.m2t),
            url:       c.url
        })).filter(c => c.precio > 0 && c.m2c > 0);

        return comps;
    } catch (e) {
        console.error('  Error Gemini:', e.message);
        return [];
    }
}

const MXN = v => v ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v) : 'N/A';
const dif = (calc, real) => calc && real ? (((calc / real) - 1) * 100).toFixed(1) + '%' : 'N/A';

const CASOS = [
    {
        archivo: 'OPI-26-2-01-OF Rafael Zayas Enriquez 3385, Col. Miguel Hidalgo',
        tipo: 'CASA HABITACIÓN',
        zona: 'Colonia Miguel Hidalgo',
        construccion: 231.90,
        terreno: 150,
        edad: 40,
        valorReal: 3781000
    },
    {
        archivo: 'OPI-26-1-19-OF C. Nicolás Bravo 756, Las Conchas',
        tipo: 'CASA HABITACIÓN CON LOCAL',
        zona: 'Colonia Las Conchas',
        construccion: 485,
        terreno: 290,
        edad: 45,
        valorReal: 6653000
    },
    {
        archivo: 'OPI-26-1-01-OF Calle Dinar 831, Lagos de Oriente',
        tipo: 'CASA HABITACIÓN',
        zona: 'Colonia Lagos de Oriente',
        construccion: 64.07,
        terreno: 80,
        edad: 20,
        valorReal: 1212000
    }
];

// Leer m2C y edad reales del cerebro_datos
const fs = require('fs');
const cerebro = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));
CASOS.forEach(caso => {
    const d = cerebro.find(x => x.fileName && x.fileName.includes(caso.archivo.split(',')[0].split(' ').slice(-3).join(' ')));
    if (d) {
        caso.construccion = cleanNum(d.m2Construccion) || caso.construccion;
        caso.terreno      = cleanNum(d.m2Terreno)      || caso.terreno;
        caso.edad         = cleanNum(d.edad)            || caso.edad;
        caso.valorReal    = cleanNum(d.valorMercado)    || caso.valorReal;
    }
});

async function main() {
    console.log('\n=== Prueba Gemini Search para 3 casos problemáticos ===\n');

    for (const caso of CASOS) {
        console.log(`\n📍 ${caso.archivo}`);
        console.log(`   Tipo: ${caso.tipo} | m²C: ${caso.construccion} | Edad: ${caso.edad} | Perito: ${MXN(caso.valorReal)}`);
        console.log(`   Buscando comparables en Gemini...`);

        const comps = await buscarCompsGemini(caso);

        console.log(`   Comparables encontrados: ${comps.length}`);
        comps.forEach((c, i) => {
            const pm2c = c.m2c > 0 ? Math.round(c.precio / c.m2c) : 0;
            console.log(`   [${i+1}] ${c.colonia || c.direccion} | ${MXN(c.precio)} | m²C:${c.m2c} | $/m²C:${pm2c.toLocaleString()}`);
        });

        if (comps.length > 0) {
            const valorRomina = Math.round(metodoRomina(caso, comps));
            const diferencia  = dif(valorRomina, caso.valorReal);
            console.log(`\n   Perito:         ${MXN(caso.valorReal)}`);
            console.log(`   Romina-Gemini:  ${MXN(valorRomina)}  (${diferencia})`);
        } else {
            console.log('   Sin comparables — no se puede calcular.');
        }

        // Respetar rate limit de Gemini
        await new Promise(r => setTimeout(r, 4000));
    }
}

main().catch(console.error);
