require('dotenv').config({ path: '../.env' });
const OpenAI = require('openai');
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
});

const prompt = `Escribe una funcion JavaScript llamada extraerColoniaDeURL(url) para portales inmobiliarios mexicanos.

casasyterrenos.com formato /propiedad/tipo-venta-CALLE-COLONIA-municipio-jal-ID:
- con "colonia-" explicito: extraer lo que sigue hasta el municipio
  terreno-venta-paseo-colonia-lomas-de-tabachines-zapopan-jal-ID → "lomas de tabachines"
- sin "colonia-": la colonia son las ultimas 1-4 palabras antes del municipio (CALLE va antes)
  terreno-venta-rizo-ayala-tabachines-zapopan-jal-ID → "tabachines"
  terreno-venta-miguel-topete-el-carmen-guadalajara-jal-ID → "el carmen"
  terreno-venta-avenida-tepeyac-mariano-otero-zapopan-jal-ID → "mariano otero"
  terreno-venta-monte-aconcagua-lomas-de-independencia-guadalajara-jal-ID → "lomas de independencia"
  terreno-venta-lucero-colinas-de-la-primavera-zapopan-jal-ID → "colinas de la primavera"
  terreno-venta-lagunitas-tonallan-tonala-jal-ID → "lagunitas tonallan"
  terreno-venta-calle-madero-2-pueblo-cajititlan-tlajomulco-de-zuniga-jal-ID → "cajititlan"
  terreno-venta-otilio-montano-nuevo-corral-del-risco-bahia-de-banderas-nay-ID → "nuevo corral del risco"

inmuebles24.com /clasificado/vecltein-DESC-en-COLONIA-ID.html:
  La colonia aparece despues del ultimo "-en-" antes del ID numerico
  vecltein-terreno-en-venta-en-lomas-de-zapopan-143742038 → "lomas de zapopan"
  vecltein-terreno-en-venta-en-tateposco-a-unos-metros-148666695 → "tateposco"
  vecltein-terreno-residencial-en-venta-en-las-canadas-147091585 → "las canadas"
  vecltein-venta-de-terreno-en-nuevo-vallarta-nayarit-145300242 → "nuevo vallarta"
  vecltein-se-vende-terreno-en-lago-148828816 → "" (muy vago)

propiedades.com extraer de hash #area=COLONIA-municipio (primera parte antes del municipio):
  area=cajititlan-tlajomulco-de-zuniga → "cajititlan"
  area=cruz-de-huanacaxtle-bahia-de-banderas → "cruz de huanacaxtle"

Otros portales (flexmls, bienesonline, etc.) → devolver ""

Municipios delimitadores: zapopan, guadalajara, tlaquepaque, tlajomulco, tlajomulco-de-zuniga, tonala, el-salto, chapala, bahia-de-banderas, nayarit, jalisco

Reglas:
- Devolver string en minusculas con espacios (no guiones)
- Si no se puede determinar con confianza → devolver ""
- NO devolver nombres de municipio solos como colonia
- NO devolver: "jalisco", "nayarit", "jal", "nay", "venta", "renta", "terreno", "casa"
- Exportar la funcion: module.exports = { extraerColoniaDeURL };`;

async function run() {
  const res = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'Eres experto en JavaScript. Responde SOLO con codigo JavaScript puro, sin explicaciones ni bloques markdown.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 2000
  });
  console.log(res.choices[0].message.content);
}
run().catch(console.error);
