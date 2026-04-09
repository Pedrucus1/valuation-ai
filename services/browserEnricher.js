const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

puppeteerExtra.use(StealthPlugin());

// ---------------------------------------------------------------------------
// Browser singleton — lanzado una vez, reutilizado para todas las páginas
// ---------------------------------------------------------------------------
let _browser = null;

async function getBrowser() {
    if (_browser && _browser.isConnected()) return _browser;
    _browser = await puppeteerExtra.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1280,800"
        ]
    });
    _browser.on("disconnected", () => { _browser = null; });
    return _browser;
}

// ---------------------------------------------------------------------------
// Fetch de una URL con Puppeteer — retorna HTML o null si falla/timeout
// ---------------------------------------------------------------------------
async function fetchWithBrowser(url, timeoutMs = 15000) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // Bloquear recursos innecesarios (imágenes, fuentes, media) para acelerar
        await page.setRequestInterception(true);
        page.on("request", req => {
            const type = req.resourceType();
            if (["image", "media", "font", "stylesheet"].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });
        await page.setExtraHTTPHeaders({ "Accept-Language": "es-MX,es;q=0.9" });

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

        // Esperar a que el contenido principal cargue (CSR portals)
        await page.waitForFunction(
            () => document.body && document.body.innerText.length > 500,
            { timeout: 8000 }
        ).catch(() => {}); // ignorar timeout — tomamos lo que hay

        const html = await page.content();
        return html;
    } catch (e) {
        return null;
    } finally {
        if (page) await page.close().catch(() => {});
    }
}

// ---------------------------------------------------------------------------
// Extrae texto relevante del HTML para mandarlo a Gemini
// ---------------------------------------------------------------------------
function extractRelevantText(html) {
    if (!html) return null;

    const parts = [];

    // JSON-LD (datos estructurados)
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of jsonLdMatches) {
        try {
            const obj = JSON.parse(m[1]);
            parts.push(JSON.stringify(obj));
        } catch {
            parts.push(m[1].substring(0, 500));
        }
    }

    // Meta description y og:description
    const metaMatches = [...html.matchAll(/<meta[^>]*(?:name|property)="[^"]*(?:description|price|area)[^"]*"[^>]*content="([^"]+)"/gi)];
    for (const m of metaMatches) parts.push(m[1]);

    // Texto del body (sin HTML)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        const text = bodyMatch[1]
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
        parts.push(text.substring(0, 5000));
    }

    return parts.join("\n\n").substring(0, 9000) || null;
}

// ---------------------------------------------------------------------------
// Usa Gemini para extraer datos inmobiliarios del texto de la página
// ---------------------------------------------------------------------------
async function extractDataWithGemini(pageText, url) {
    if (!pageText || !process.env.GEMINI_API_KEY) return null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Eres un extractor de datos de anuncios inmobiliarios en México.
Del siguiente texto de la página del anuncio (${url}), extrae los datos del inmueble.
Si un dato no aparece claramente, devuelve null. NUNCA adivines.

TEXTO:
${pageText}

JSON exacto (sin markdown):
{
  "construction_area": número_m2_o_null,
  "land_area": número_m2_o_null,
  "age": número_años_o_null,
  "price": número_pesos_o_null,
  "bedrooms": número_o_null,
  "bathrooms": número_o_null,
  "parking": número_o_null
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const m = text.match(/\{[\s\S]*\}/);
            return m ? JSON.parse(m[0]) : null;
        } catch {
            return null;
        }
    }
}

// ---------------------------------------------------------------------------
// Enriquece un solo comparable desde su página de detalle
// Retorna objeto con campos actualizados (solo los que no eran null antes)
// ---------------------------------------------------------------------------
async function enrichOneComparable(comparable) {
    const url = comparable.source_url;
    if (!url) return null;

    const html = await fetchWithBrowser(url);
    if (!html) return null;

    const pageText = extractRelevantText(html);
    if (!pageText) return null;

    const extracted = await extractDataWithGemini(pageText, url);
    if (!extracted) return null;

    // Solo rellenar campos que estaban vacíos en el comparable
    const updates = {};
    const fields = ["construction_area", "land_area", "age", "bedrooms", "bathrooms", "parking"];
    for (const field of fields) {
        if ((comparable[field] === null || comparable[field] === undefined) && extracted[field] != null) {
            updates[field] = extracted[field];
        }
    }
    // Precio: solo actualizar si el comparable tiene null (caso raro)
    if (!comparable.price && extracted.price) updates.price = extracted.price;

    return Object.keys(updates).length > 0 ? updates : null;
}

// ---------------------------------------------------------------------------
// Cierra el browser al apagar el servidor
// ---------------------------------------------------------------------------
async function closeBrowser() {
    if (_browser) {
        await _browser.close().catch(() => {});
        _browser = null;
    }
}

module.exports = { enrichOneComparable, closeBrowser };
