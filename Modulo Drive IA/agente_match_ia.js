const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuración
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'propvalu';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Forzar el uso del cliente de MongoDB de forma compatible
const client = new MongoClient(MONGO_URL);

async function runMatch(subjectProperty) {
    console.log(`\n=== INICIANDO MATCH INTELIGENTE IA ===`);
    console.log(`Sujeto: ${subjectProperty.direccion} | ${subjectProperty.m2Terreno}m2 T | ${subjectProperty.m2Construccion}m2 C`);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const colMercado = db.collection('mercado_props');

        // 1. Cargar Conocimiento Histórico (Los 919)
        const cerebroPath = path.join(__dirname, 'cerebro_datos.json');
        const historial = JSON.parse(fs.readFileSync(cerebroPath, 'utf8'));
        
        // Buscar avalúos previos en la misma colonia para contexto
        const contextoHistorico = historial
            .filter(h => h.direccion.toLowerCase().includes(subjectProperty.colonia.toLowerCase()))
            .slice(0, 5);

        console.log(`- Encontrados ${contextoHistorico.length} avalúos históricos en la zona para referencia.`);

        // 2. Buscar Candidatos en MongoDB (Scraper)
        // Filtro básico inicial: Municipio + Rango de m2 (+- 30%)
        const query = {
            municipio: subjectProperty.municipio,
            m2_construccion: { 
                $gte: subjectProperty.m2Construccion * 0.7, 
                $lte: subjectProperty.m2Construccion * 1.3 
            },
            activo: "TRUE"
        };

        const candidatos = await colMercado.find(query).limit(10).toArray();
        console.log(`- Encontrados ${candidatos.length} candidatos frescos del scraper.`);

        if (candidatos.length === 0) {
            console.log("No se encontraron candidatos suficientes en el mercado actual.");
            return;
        }

        // 3. Análisis con Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
        Actúa como un Perito Valuador experto en el mercado inmobiliario de México.
        
        OBJETIVO: Seleccionar los 3 mejores comparables de mercado para una propiedad sujeto.
        
        PROPIEDAD SUJETO:
        - Dirección: ${subjectProperty.direccion}
        - Superficie Terreno: ${subjectProperty.m2Terreno} m2
        - Superficie Construcción: ${subjectProperty.m2Construccion} m2
        - Colonia: ${subjectProperty.colonia}
        
        CONTEXTO HISTÓRICO (Avalúos previos que tú mismo has hecho en esta zona):
        ${JSON.stringify(contextoHistorico)}
        
        CANDIDATOS DEL SCRAPER (Mercado Actual):
        ${JSON.stringify(candidatos)}
        
        TAREA:
        1. Analiza cada candidato basándote en la ubicación, metros y descripción.
        2. Elige los 3 que mejor se adapten como comparables directos.
        3. Para cada uno, da una breve justificación técnica de por qué lo elegiste (menciona si viste algo en la descripción o si coincide con tu historial).
        4. Devuelve el resultado en formato JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("\n--- RESULTADO DEL ANÁLISIS IA ---\n");
        console.log(response.text());

    } catch (error) {
        console.error("Error en el Agente de Match:", error);
    } finally {
        await client.close();
    }
}

// Ejemplo de prueba con una de tus zonas calientes
const sujetoPrueba = {
    direccion: "Calle Victoria 2614, Zapopan",
    colonia: "Victoria",
    municipio: "Zapopan",
    m2Terreno: 250,
    m2Construccion: 220
};

runMatch(sujetoPrueba);
