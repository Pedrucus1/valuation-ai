const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const https = require("https");
const http = require("http");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Patrones de URLs que son páginas de categoría/listado, no anuncios individuales
// ---------------------------------------------------------------------------
const CATEGORY_URL_PATTERNS = [
    /\/for-sale\/?(\?.*)?$/i,
    /\/en-venta\/?(\?.*)?$/i,
    /\/venta\/?(\?.*)?$/i,
    /\/renta\/?(\?.*)?$/i,
    /[?&]page=\d+/i,
    /\/search\b/i,
    /\/buscar\b/i,
    /\/resultados\b/i,
    /\/propiedades\/?(\?.*)?$/i,
    /\/departamentos\/?(\?.*)?$/i,
    /\/casas\/?(\?.*)?$/i,
    /\/inmuebles\/?(\?.*)?$/i,
    /\/explorar\//i,          // propiedades.com/explorar/... → páginas de colonia
];

function isCategoryUrl(url) {
    if (!url) return true;
    return CATEGORY_URL_PATTERNS.some(p => p.test(url));
}

// ---------------------------------------------------------------------------
// Fetch HTML de una URL con timeout — extrae JSON-LD, meta tags y texto clave
// ---------------------------------------------------------------------------
function fetchPageText(url, timeoutMs = 8000) {
    return new Promise((resolve) => {
        try {
            const lib = url.startsWith("https") ? https : http;
            const req = lib.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "es-MX,es;q=0.9"
                },
                timeout: timeoutMs
            }, (res) => {
                // Seguir redireccionamientos simples
                if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                    return fetchPageText(res.headers.location, timeoutMs).then(resolve).catch(() => resolve(null));
                }
                if (res.statusCode !== 200) return resolve(null);

                let data = "";
                res.on("data", chunk => {
                    data += chunk;
                    if (data.length > 150000) { req.destroy(); resolve(data); }
                });
                res.on("end", () => resolve(data));
            });
            req.on("error", () => resolve(null));
            req.on("timeout", () => { req.destroy(); resolve(null); });
        } catch (e) {
            resolve(null);
        }
    });
}

function extractRelevantText(html) {
    if (!html) return null;

    const parts = [];

    // 1. JSON-LD (datos estructurados — lo más confiable)
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) parts.push(m[1].trim());

    // 2. Meta tags relevantes
    const metaMatches = html.matchAll(/<meta[^>]+(name|property)="[^"]*(?:description|title|price|area|m2|superficie)[^"]*"[^>]*content="([^"]+)"/gi);
    for (const m of metaMatches) parts.push(m[2]);

    // 3. Primeros 4000 chars del body (donde suele estar el precio y m²)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,4000})/i);
    if (bodyMatch) {
        // Quitar tags HTML, dejar solo texto
        const text = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
        parts.push(text.substring(0, 3000));
    }

    return parts.join("\n\n").substring(0, 8000) || null;
}

// ---------------------------------------------------------------------------
// Enriquece comparables con datos faltantes desde las páginas de detalle
// ---------------------------------------------------------------------------
async function enrichComparablesFromDetailPages(comparables, genAI) {
    const needsEnrich = comparables.filter(c =>
        !isCategoryUrl(c.source_url) &&
        (!c.construction_area || !c.land_area || c.age === null || c.age === undefined)
    );

    if (needsEnrich.length === 0) return comparables;

    console.log(`Enriqueciendo ${needsEnrich.length} comparables desde páginas de detalle...`);

    const fetches = await Promise.allSettled(
        needsEnrich.map(c => fetchPageText(c.source_url))
    );

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const enrichPromises = needsEnrich.map(async (comp, i) => {
        const fetchResult = fetches[i];
        if (fetchResult.status !== "fulfilled" || !fetchResult.value) return { id: comp.comparable_id, data: null };

        const pageText = extractRelevantText(fetchResult.value);
        if (!pageText) return { id: comp.comparable_id, data: null };

        const prompt = `Eres un extractor de datos de anuncios inmobiliarios en México.
Del siguiente texto extraído de la página del anuncio, extrae ÚNICAMENTE los datos que puedas confirmar con certeza.
Si un dato no aparece claramente en el texto, devuelve null — nunca adivines.

TEXTO DE LA PÁGINA:
${pageText}

Devuelve ÚNICAMENTE este JSON (sin markdown):
{
  "construction_area": número_en_m2_o_null,
  "land_area": número_en_m2_o_null,
  "age": número_de_años_o_null,
  "price": número_en_pesos_o_null,
  "bedrooms": número_o_null,
  "bathrooms": número_o_null,
  "parking": número_o_null
}`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const parsed = JSON.parse(text);
            return { id: comp.comparable_id, data: parsed };
        } catch (e) {
            return { id: comp.comparable_id, data: null };
        }
    });

    const enrichResults = await Promise.allSettled(enrichPromises);
    const enrichMap = {};
    for (const r of enrichResults) {
        if (r.status === "fulfilled" && r.value?.data) {
            // Solo sobreescribir campos que antes eran null/undefined
            const data = {};
            for (const [k, v] of Object.entries(r.value.data)) {
                if (v !== null && v !== undefined) data[k] = v;
            }
            enrichMap[r.value.id] = data;
        }
    }

    const enriched = comparables.map(c => {
        const extra = enrichMap[c.comparable_id];
        if (!extra) return c;
        // No pisar datos que ya venían del snippet
        const merged = { ...extra, ...c };
        // Para campos que venían null, sí usar los del detalle
        for (const [k, v] of Object.entries(extra)) {
            if (c[k] === null || c[k] === undefined) merged[k] = v;
        }
        return merged;
    });

    const enrichedCount = Object.keys(enrichMap).length;
    console.log(`Detalle: ${enrichedCount}/${needsEnrich.length} comparables enriquecidos.`);
    return enriched;
}

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

// Construye queries que maximizan listings individuales con datos completos
function buildQueries(propertyData) {
    const { neighborhood, municipality, property_type, construction_area } = propertyData;
    const esDep = ["Departamento", "Oficina", "Local comercial"].includes(property_type);
    const tipo = property_type === "Casa" ? "casa"
               : property_type === "Departamento" ? "departamento"
               : property_type === "Local comercial" ? "local comercial"
               : property_type === "Oficina" ? "oficina"
               : "inmueble";
    const zona = `${neighborhood} ${municipality}`;
    const areaStr = construction_area ? `${Math.round(construction_area)} m²` : null;

    if (esDep) {
        // Para departamentos: sin "m² de terreno", con área específica si disponible
        return [
            `${tipo} venta ${zona} "m²" "$ " site:inmuebles24.com`,
            `${tipo} venta ${zona} "m²" precio site:casasyterrenos.com`,
            `${tipo} venta ${zona} "m²" precio site:vivanuncios.com.mx`,
            `${tipo} venta ${zona} "m²" "$ " site:propiedades.com`,
            `${tipo} venta ${zona} "m²" precio site:lamudi.com.mx`,
            ...(areaStr ? [
                `${tipo} venta ${zona} "${areaStr}" precio site:inmuebles24.com`,
                `${tipo} venta ${zona} "${areaStr}" precio site:casasyterrenos.com`,
                `${tipo} venta ${zona} "${areaStr}" precio site:propiedades.com`,
            ] : [
                `${tipo} venta ${zona} "m²" recámaras site:inmuebles24.com`,
                `${tipo} venta ${zona} "m²" recámaras site:casasyterrenos.com`,
                `${tipo} venta ${zona} "m²" recámaras site:propiedades.com`,
            ]),
        ];
    }

    // Casa / otros — queries con terreno y recámaras
    return [
        `${tipo} venta ${zona} "m²" "$ " recámaras site:inmuebles24.com`,
        `${tipo} venta ${zona} "m²" precio recámaras site:casasyterrenos.com`,
        `${tipo} venta ${zona} "m²" "MXN" recámaras site:vivanuncios.com.mx`,
        `${tipo} venta ${zona} "m²" recámaras baños site:propiedades.com`,
        `${tipo} venta ${zona} "m²" precio recámaras site:lamudi.com.mx`,
        `${tipo} venta ${zona} "m²" precio recámaras site:pincali.com OR site:mitula.mx`,
        `${tipo} venta ${zona} "m² de terreno" "m² de construcción" precio site:inmuebles24.com`,
        `${tipo} venta ${zona} "m² de terreno" "m² de construcción" precio site:propiedades.com`,
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

    // Consolidar resultados únicos por URL (normalizada) — pre-filtrar categorías en JS
    const seen = new Set();
    const items = [];
    for (const r of results) {
        if (r.status === "fulfilled") {
            for (const item of r.value) {
                const urlKey = item.url.replace(/\/$/, "").toLowerCase();
                if (!seen.has(urlKey) && !isCategoryUrl(item.url)) {
                    seen.add(urlKey);
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
1. FILTRA PÁGINAS DE CATEGORÍA — descarta si cumple CUALQUIERA de estas condiciones:
   a) El título empieza con un número seguido de "casas", "departamentos" o "propiedades" (ej. "33 Casas en venta en...").
   b) La URL termina en /for-sale/, /en-venta/, /venta/, /renta/, /departamentos/, /casas/, /inmuebles/ (con o sin slash final).
   c) La URL contiene ?page=, /search, /buscar, /resultados.
   d) La URL es una página de listado de portal sin dirección específica (ej. lamudi.com.mx/jalisco/ciudad/colonia/tipo/for-sale/).
2. Un anuncio individual DEBE tener en el snippet: precio específico en pesos (ej. $3,500,000). Si no hay precio, descártalo.
3. Si un dato no está en el snippet, devuelve null — NUNCA adivines. EXCEPCIÓN IMPORTANTE: para tipos Departamento, Oficina o Local comercial, si el snippet menciona m² de construcción pero NO m² de terreno, pon en "land_area" el mismo valor que "construction_area" (en estos inmuebles el terreno proporcional equivale al área construida del anuncio).
4. Excluye remates bancarios, adjudicaciones o ventas forzosas.
5. ${propertyData.land_regime !== 'EJIDAL' ? 'Excluye propiedades ejidales.' : 'Puedes incluir ejidales.'}
6. Usa la URL real del anuncio tal como aparece arriba.
7. Devuelve máximo ${count} comparables. Si hay menos anuncios individuales útiles, devuelve los que haya.
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

    // Filtrar comparables sin precio y sin área de construcción (sin datos útiles)
    const conPrecio = parsed.filter(c => c.price && c.price > 0);
    const conDatos  = conPrecio.filter(c => c.construction_area && c.construction_area > 0);
    // Si hay al menos 3 con datos completos úsalos; si no, acepta cualquiera con precio
    const final = conDatos.length >= 3 ? conDatos : conPrecio;

    // Dedup post-Gemini por URL normalizada
    // Siempre partir de `final` o al menos de `conPrecio` — nunca de `parsed` sin filtro
    const urlsSeen = new Set();
    const deduped = [];
    for (const c of (final.length > 0 ? final : conPrecio)) {
        const key = (c.source_url || "").replace(/\/$/, "").toLowerCase();
        if (!urlsSeen.has(key)) {
            urlsSeen.add(key);
            deduped.push(c);
        }
    }

    // ── Post-proceso: land_area para departamentos/oficinas/locales ──
    // Solo rellenar land_area cuando ya existe construction_area real (no inventar datos)
    const esDep = ["Departamento", "Oficina", "Local comercial"].includes(propertyData.property_type);
    for (const c of deduped) {
        if (!c.land_area && c.construction_area) {
            c.land_area = esDep ? c.construction_area : c.construction_area;
        }
    }

    console.log(`CSE+Gemini: ${parsed.length} raw → ${deduped.length} únicos con datos.`);

    // Fallback: si hay menos de 6 comparables, ampliar búsqueda al municipio completo
    if (deduped.length < 6) {
        console.log(`Solo ${deduped.length} comparables en colonia — ampliando búsqueda a ${propertyData.municipality}...`);
        const esFallbackDep = ["Departamento", "Oficina", "Local comercial"].includes(propertyData.property_type);
        const tipo = propertyData.property_type === "Casa" ? "casa"
                   : propertyData.property_type === "Departamento" ? "departamento"
                   : propertyData.property_type === "Local comercial" ? "local comercial"
                   : propertyData.property_type === "Oficina" ? "oficina" : "inmueble";
        const mun = propertyData.municipality;
        const areaFb = propertyData.construction_area ? `${Math.round(propertyData.construction_area)} m²` : null;
        const fallbackQueries = esFallbackDep ? [
            `${tipo} venta ${mun} "m²" "$ " site:inmuebles24.com`,
            `${tipo} venta ${mun} "m²" precio site:casasyterrenos.com`,
            ...(areaFb ? [`${tipo} venta ${mun} "${areaFb}" precio site:inmuebles24.com`] : [`${tipo} venta ${mun} "m²" site:propiedades.com`]),
        ] : [
            `${tipo} venta ${mun} Jalisco "m²" "$ " recámaras site:inmuebles24.com`,
            `${tipo} venta ${mun} Jalisco "m²" precio recámaras site:casasyterrenos.com`,
            `${tipo} venta ${mun} Jalisco "m²" recámaras baños site:propiedades.com`,
        ];
        const fbResults = await Promise.allSettled(fallbackQueries.map(q => serperSearch(q)));
        const fbItems = [];
        for (const r of fbResults) {
            if (r.status === "fulfilled") {
                for (const item of r.value) {
                    const urlKey = item.url.replace(/\/$/, "").toLowerCase();
                    if (!seen.has(urlKey) && !isCategoryUrl(item.url)) {
                        seen.add(urlKey);
                        fbItems.push(item);
                    }
                }
            }
        }
        console.log(`Fallback municipio: ${fbItems.length} resultados adicionales.`);
        if (fbItems.length > 0) {
            const fbSnippets = fbItems.map((it, i) =>
                `[${i+1}] TÍTULO: ${it.title}\nURL: ${it.url}\nSNIPPET: ${it.snippet}`
            ).join("\n\n");
            const fbPrompt = prompt.replace(
                `${items.length} anuncios REALES`,
                `${fbItems.length} anuncios REALES`
            ).replace(`ANUNCIOS REALES:\n${snippetsText}`, `ANUNCIOS REALES:\n${fbSnippets}`);
            try {
                const fbResult = await model.generateContent(fbPrompt);
                const fbText = fbResult.response.text();
                let fbParsed;
                try { fbParsed = JSON.parse(fbText); }
                catch (e) { const m = fbText.match(/\[[\s\S]*\]/); fbParsed = m ? JSON.parse(m[0]) : []; }
                const fbValid = (fbParsed || []).filter(c => c.price && c.price > 0);
                for (const c of fbValid) {
                    // Mismo post-proceso de land_area para los del fallback
                    if (!c.land_area && c.construction_area) {
                        c.land_area = esFallbackDep ? c.construction_area : c.construction_area;
                    }
                    if (!c.construction_area && propertyData.construction_area) {
                        c.construction_area = propertyData.construction_area;
                        if (!c.land_area) c.land_area = esFallbackDep ? propertyData.construction_area : propertyData.land_area;
                        if (c.price) c.price_per_sqm = parseFloat((c.price / c.construction_area).toFixed(2));
                    }
                    const key = (c.source_url || "").replace(/\/$/, "").toLowerCase();
                    if (!urlsSeen.has(key)) { urlsSeen.add(key); deduped.push(c); }
                }
                console.log(`Fallback añadió ${fbValid.length} comparables → total: ${deduped.length}`);
            } catch (e) {
                console.warn("Fallback municipio falló:", e.message);
            }
        }
    }

    return deduped;
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
        const prompt = `Actúa como un experto valuador inmobiliario senior en México con 20 años de experiencia. Analiza estratégicamente la siguiente propiedad:

PROPIEDAD SUJETO: ${JSON.stringify(propertyData)}
COMPARABLES SELECCIONADOS: ${JSON.stringify(comparables.slice(0, 5))}

Genera un análisis profesional detallado siguiendo EXACTAMENTE estas instrucciones:

1. CONCLUSIONS (1 párrafo de 40-60 palabras): Análisis del mercado local en ${propertyData.neighborhood}. Compara la edad y estado del sujeto vs la oferta. Incluye contexto de oferta/demanda y tiempo estimado de absorción.

2. VENTAJAS (exactamente 3 ítems, cada uno de 20-35 palabras): Ventajas competitivas específicas y concretas. Considera: tipo de calle (${propertyData.street_type}), pavimento (${propertyData.pavement_type}), nivel (${propertyData.property_level}), características especiales, superficie, ubicación. Cada ventaja debe explicar POR QUÉ es relevante para el comprador.

3. DESVENTAJAS (exactamente 2 ítems, cada uno de 15-25 palabras): Áreas de oportunidad reales y accionables. ${propertyData.property_level === 'PB' ? 'NO menciones falta de elevador ni escaleras.' : ''} Incluye cómo mitigar cada desventaja.

4. ESTRATEGIA DE VENTA (exactamente 4 ítems, cada uno de 25-40 palabras): Recomendaciones concretas de comercialización: canales digitales específicos, perfil del comprador ideal, precio de lista vs negociación, y tip de home staging relevante para este inmueble.

5. TOTAL ACTIVE LISTINGS: Estima el número total de propiedades similares activas en radio de 1.5km.

REGLAS: No repitas datos numéricos que ya están en el reporte. Sé específico con la colonia y municipio. Usa lenguaje profesional pero accesible.

Responde SOLO con este JSON (sin bloques de código, sin texto adicional):
{"conclusions":["párrafo de análisis de mercado aquí"],"recommendations":["recomendación concreta aquí"],"ventajas":["ventaja 1 con explicación detallada","ventaja 2 con explicación detallada","ventaja 3 con explicación detallada"],"desventajas":["desventaja 1 con cómo mitigarla","desventaja 2 con cómo mitigarla"],"estrategia_venta":["estrategia canal digital específico","estrategia perfil comprador ideal","estrategia precio y negociación","estrategia home staging específico"],"total_active_listings":45}`;

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
