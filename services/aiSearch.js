const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const https = require("https");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Serper.dev — Google Search API
// ---------------------------------------------------------------------------
function serperSearch(query) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SERPER_API_KEY;

        if (!apiKey) {
            return reject(new Error("Falta SERPER_API_KEY en .env"));
        }

        const body = JSON.stringify({ q: query, num: 10, gl: "mx", hl: "es" });

        const options = {
            hostname: "google.serper.dev",
            path: "/search",
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(`Serper error: ${json.error}`));
                    const items = (json.organic || []).map(i => ({
                        title:   i.title,
                        url:     i.link,
                        snippet: i.snippet || ""
                    }));
                    resolve(items);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Construye queries que maximizan listings individuales
function buildQueries(propertyData) {
    const { neighborhood, municipality, property_type, construction_area } = propertyData;
    const tipo = property_type === "Casa" ? "casa" : "departamento";
    const zona = `${neighborhood} ${municipality}`;
    // Rango de m² ±40% para atrapar listings con área en el snippet
    const m2low  = construction_area ? Math.round(construction_area * 0.6) : 80;
    const m2high = construction_area ? Math.round(construction_area * 1.4) : 300;

    return [
        // "m²" y precio fuerzan snippets de listings individuales en inmuebles24
        `${tipo} venta ${zona} "m²" "$ " recámaras site:inmuebles24.com`,
        // casasyterrenos con precio explícito
        `${tipo} venta ${zona} "m²" precio recámaras site:casasyterrenos.com`,
        // vivanuncios
        `${tipo} venta ${zona} "m²" "MXN" recámaras site:vivanuncios.com.mx`,
        // propiedades.com
        `${tipo} venta ${zona} "m²" recámaras baños site:propiedades.com`
    ];
}

// ---------------------------------------------------------------------------
// Búsqueda principal: CSE → snippets → Gemini estructura
// ---------------------------------------------------------------------------
async function searchComparablesWithAI(propertyData, count = 10) {
    const { neighborhood, municipality, state, land_area, construction_area, property_type } = propertyData;

    const cusSujeto = (construction_area && land_area) ? (construction_area / land_area) : 1.0;
    propertyData._cusSujeto = cusSujeto;
    propertyData._cusMin    = cusSujeto * 0.4;
    propertyData._cusMax    = cusSujeto * 1.6;

    console.log(`Buscando comparables para ${neighborhood} vía CSE+Gemini... (CUS: ${cusSujeto.toFixed(4)})`);

    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error("No se configuró API_KEY de Gemini u OpenAI.");
    }

    // ¿Tenemos Serper configurado?
    const cseDisponible = !!process.env.SERPER_API_KEY;

    try {
        if (cseDisponible) {
            return await searchWithCSEAndGemini(propertyData, count);
        } else if (process.env.GEMINI_API_KEY) {
            console.warn("CSE no configurado, usando Gemini grounding como respaldo.");
            return await searchWithGeminiGrounding(propertyData, count);
        } else {
            return await searchWithOpenAI(propertyData, count);
        }
    } catch (error) {
        console.error("Error en búsqueda principal:", error.message);

        // Fallback: Gemini grounding si CSE falló
        if (cseDisponible && process.env.GEMINI_API_KEY) {
            console.log("CSE falló, intentando Gemini grounding...");
            try { return await searchWithGeminiGrounding(propertyData, count); } catch (e2) {
                console.error("Gemini grounding también falló:", e2.message);
            }
        }

        // Fallback final: OpenAI
        if (process.env.OPENAI_API_KEY) {
            console.log("Intentando respaldo con OpenAI...");
            return await searchWithOpenAI(propertyData, count);
        }

        throw new Error("Todos los motores de búsqueda están fuera de línea. Inténtalo más tarde.");
    }
}

// ---------------------------------------------------------------------------
// Flujo nuevo: CSE obtiene URLs reales → Gemini extrae datos de snippets
// ---------------------------------------------------------------------------
async function searchWithCSEAndGemini(propertyData, count) {
    const queries = buildQueries(propertyData);

    // Lanzar las 3 queries en paralelo
    const results = await Promise.allSettled(queries.map(q => serperSearch(q)));

    // Consolidar resultados únicos por URL
    const seen = new Set();
    const items = [];
    for (const r of results) {
        if (r.status === "fulfilled") {
            for (const item of r.value) {
                if (!seen.has(item.url)) {
                    seen.add(item.url);
                    items.push(item);
                }
            }
        }
    }

    console.log(`CSE devolvió ${items.length} resultados únicos.`);

    if (items.length === 0) {
        throw new Error("Serper no devolvió resultados. Verifica SERPER_API_KEY en .env.");
    }

    // Pasar snippets a Gemini para estructurar como comparables
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const cusSujeto = propertyData._cusSujeto;
    const snippetsText = items.map((it, i) =>
        `[${i+1}] TÍTULO: ${it.title}\nURL: ${it.url}\nSNIPPET: ${it.snippet}`
    ).join("\n\n");

    const prompt = `Eres un experto valuador inmobiliario en México.
A continuación tienes ${items.length} anuncios REALES de inmuebles en venta obtenidos de Google Search.
Tu tarea es extraer los datos de cada anuncio y devolverlos estructurados.

PROPIEDAD SUJETO:
- Ubicación: ${propertyData.neighborhood}, ${propertyData.municipality}, ${propertyData.state}
- Tipo: ${propertyData.property_type}
- Construcción: ${propertyData.construction_area} m²  |  Terreno: ${propertyData.land_area} m²
- CUS sujeto: ${cusSujeto.toFixed(4)}
- Régimen: ${propertyData.land_regime || 'URBANO'}

ANUNCIOS REALES:
${snippetsText}

REGLAS:
1. FILTRA PÁGINAS DE CATEGORÍA: Descarta cualquier resultado cuyo título diga "X casas en venta en..." o "X propiedades en..." — esos son listados de búsqueda, no anuncios individuales. Solo incluye anuncios de UNA propiedad específica.
2. Un anuncio individual tiene en el snippet: precio específico (ej. $3,500,000), m² específicos, número de recámaras. Si el snippet no tiene al menos precio O m², descártalo.
3. Si un dato no está en el snippet (ej. edad), devuelve null — NUNCA adivines.
4. Excluye remates bancarios, adjudicaciones o ventas forzosas.
5. ${propertyData.land_regime !== 'EJIDAL' ? 'Excluye propiedades ejidales.' : 'Puedes incluir ejidales.'}
6. Usa la URL real del anuncio tal como aparece arriba.
7. Devuelve máximo ${count} comparables. Si hay menos anuncios individuales útiles, devuelve los que haya (puede ser menos de ${count}).
8. El valuador homologará diferencias de tamaño — incluye aunque sea más grande o pequeño.

Devuelve ÚNICAMENTE un JSON array con este formato exacto:
[
  {
    "comparable_id": "cse_1",
    "title": "título del anuncio",
    "price": número_o_null,
    "price_per_sqm": número_o_null,
    "neighborhood": "colonia extraída o '${propertyData.neighborhood}'",
    "source": "nombre del portal (Inmuebles24 / Casas y Terrenos / etc.)",
    "source_url": "url_real_del_anuncio",
    "construction_area": número_o_null,
    "land_area": número_o_null,
    "age": número_o_null,
    "condition": "Excelente|Bueno|Regular|Malo",
    "quality": "Lujo|Superior|Medio Alto|Medio Medio|Medio Bajo|Económico|Interés Social",
    "frontage_type": "medianero|esquina|multiple_frentes",
    "street_name": "N/A",
    "street_type": "local|barrial|distrital|regional",
    "bedrooms": número_o_null,
    "bathrooms": número_o_null,
    "parking": número_o_null
  }
]`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        const m = text.match(/\[[\s\S]*\]/);
        if (!m) throw new Error("Gemini no devolvió JSON válido al procesar snippets CSE.");
        parsed = JSON.parse(m[0]);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Gemini no pudo extraer comparables de los snippets de CSE.");
    }

    console.log(`CSE+Gemini estructuró ${parsed.length} comparables.`);
    return parsed;
}

// ---------------------------------------------------------------------------
// Respaldo A: Gemini con grounding (comportamiento anterior)
// ---------------------------------------------------------------------------
async function searchWithGeminiGrounding(propertyData, count) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }]
    });

    const cusSujeto = propertyData._cusSujeto || (propertyData.construction_area / propertyData.land_area);
    const cusMin    = propertyData._cusMin    || (cusSujeto * 0.4);
    const cusMax    = propertyData._cusMax    || (cusSujeto * 1.6);

    const prompt = `Actúa como un experto valuador inmobiliario en México.
USA TU HERRAMIENTA DE BÚSQUEDA WEB para encontrar propiedades REALES Y VIGENTES DE LOS ÚLTIMOS 3 MESES en venta similares a:
- Ubicación: ${propertyData.neighborhood}, ${propertyData.municipality}, ${propertyData.state}
- Tipo: ${propertyData.property_type}
- M²: ${propertyData.construction_area} m² constr, ${propertyData.land_area} m² terreno
- CUS: ${cusSujeto.toFixed(4)} (rango: ${cusMin.toFixed(2)}-${cusMax.toFixed(2)})
- Edad: ${propertyData.estimated_age || 'No especificada'} años
- Calidad: ${propertyData.construction_quality || 'Media'}
- Régimen: ${propertyData.land_regime || 'URBANO'}

REGLAS: Excluye remates. ${propertyData.land_regime !== 'EJIDAL' ? 'Excluye ejidales.' : ''} Si no encuentras edad, devuelve null. No inventes. Trae ${count} comparables de Inmuebles24, Casasyterrenos, Propiedades.com.

Devuelve EXCLUSIVAMENTE JSON array:
[{"comparable_id":"","title":"","price":0,"price_per_sqm":0,"neighborhood":"","source":"","source_url":"","construction_area":0,"land_area":0,"age":null,"condition":"Bueno","quality":"Medio Medio","frontage_type":"medianero","street_name":"N/A","street_type":"local","bedrooms":null,"bathrooms":null,"parking":null}]
Solo JSON puro, sin markdown.`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text();
    const m      = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("No se pudo parsear la respuesta de Gemini grounding.");
    const parsed = JSON.parse(m[0]);
    if (parsed.length === 0) throw new Error("Gemini grounding devolvió array vacío.");
    return parsed;
}

// ---------------------------------------------------------------------------
// Respaldo B: OpenAI
// ---------------------------------------------------------------------------
async function searchWithOpenAI(propertyData, count) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Eres un buscador de bienes raíces experto en México." },
            { role: "user",   content: `Busca ${count} comparables para ${JSON.stringify(propertyData)}. Devuelve JSON array.` }
        ]
    });
    const text = response.choices[0].message.content;
    const m    = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("OpenAI no regresó JSON válido");
    const parsed = JSON.parse(m[0]);
    if (parsed.length === 0) throw new Error("OpenAI regresó array vacío.");
    return parsed;
}

// ---------------------------------------------------------------------------
// Insights de valuación (sin cambios)
// ---------------------------------------------------------------------------
async function generateValuationInsights(propertyData, comparables) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return {
            conclusions: ["Mercado local en consolidación con precios estables."],
            recommendations: ["Invertir en mantenimiento preventivo para acelerar el tiempo de cierre."],
            ventajas: ["Ubicación estratégica", "Superficie competitiva", "Plusvalía en la zona"],
            desventajas: ["Antigüedad perceptible", "Necesita actualizaciones menores"],
            estrategia_venta: ["Home staging básico", "Fotografía profesional", "Publicación en portales premium"],
            total_active_listings: 45
        };
    }

    try {
        const prompt = `Actúa como un experto valuador inmobiliario senior en México. Analiza estratégicamente:
PROPIEDAD SUJETO: ${JSON.stringify(propertyData)}
COMPARABLES SELECCIONADOS: ${JSON.stringify(comparables.slice(0, 5))}

Genera análisis profesional:
1. Análisis del mercado local en ${propertyData.neighborhood}. Compara edad y estado del sujeto frente a la oferta.
2. 3 Ventajas Competitivas. Considera tipo de calle (${propertyData.street_type}), pavimento (${propertyData.pavement_type}), nivel (${propertyData.property_level}).
3. 2 Desventajas. Si nivel es "PB" NO menciones falta de elevador o escaleras.
4. Estrategia de Venta: canales, perfil del comprador, tips de marketing.
5. Estima número total de propiedades similares activas en radio de 1.5km.

No repitas datos que ya están en el reporte. Enfócate en ESTRATEGIA y POSICIONAMIENTO.

JSON exacto:
{"conclusions":[""],"recommendations":[""],"ventajas":["","",""],"desventajas":["",""],"estrategia_venta":["","",""],"total_active_listings":45}`;

        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt + "\nIMPORTANTE: Solo JSON, sin bloques de código.");
            const text = result.response.text();
            try { return JSON.parse(text); }
            catch (e) { return JSON.parse(text.match(/\{[\s\S]*\}/)[0]); }
        } else {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(response.choices[0].message.content);
        }
    } catch (error) {
        console.error("Error generating AI insights:", error);
        return {
            conclusions: ["Error al generar análisis avanzado."],
            recommendations: ["Consultar con un broker local calificado."],
            ventajas: ["Ubicación estratégica", "Superficie competitiva", "Plusvalía en la zona"],
            desventajas: ["Antigüedad perceptible", "Necesita actualizaciones menores"],
            estrategia_venta: ["Home staging básico", "Fotografía profesional", "Publicación en portales premium"],
            total_active_listings: 45
        };
    }
}

module.exports = { searchComparablesWithAI, generateValuationInsights };
