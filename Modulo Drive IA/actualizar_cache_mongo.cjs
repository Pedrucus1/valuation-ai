/**
 * actualizar_cache_mongo.cjs
 * Reemplazo de actualizar_cache_consolidado.js que lee DIRECTO de MongoDB
 * (mercado_props) en vez del Sheet CONSOLIDADO. Mongo es la fuente oficial;
 * Sheets queda deprecado (límites de celdas + errores de guardado).
 *
 * Mantiene EXACTAMENTE el mismo esquema de salida (cache_consolidado.json) y la
 * misma lógica (filtro venta + m2c>0 + precio>=100k, corrección terreno c→t,
 * dedup colonia|área|precio). Además excluye es_duplicado_secundario (dedup
 * cross-portal preciso de fusionar_duplicados.py).
 *
 *   node actualizar_cache_mongo.cjs
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const CACHE_PATH = path.join(__dirname, 'cache_consolidado.json');
// Node no resuelve el SRV de Atlas en este entorno (querySrv ECONNREFUSED) →
// preferir MONGO_URL_DIRECT (URI mongodb:// con hosts explícitos, sin +srv).
const MONGO_URL = process.env.MONGO_URL_DIRECT || process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'propvalu';

const cleanNum = v => { const n = parseFloat((v ?? '').toString().replace(/[$,\s]/g, '')); return isNaN(n) ? 0 : n; };
const normStr = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

async function main() {
    if (!MONGO_URL) { console.error('Falta MONGO_URL en ../.env'); process.exit(1); }
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const col = client.db(DB_NAME).collection('mercado_props');

    console.log('Leyendo mercado_props (activos, no-secundarios)...');
    const proj = { _id: 0, precio: 1, m2_construccion: 1, m2_terreno: 1, tipo_propiedad: 1,
        colonia: 1, municipio: 1, recamaras: 1, banos: 1, estacionamientos: 1,
        fecha_scraping: 1, anio_construccion: 1, tipo_operacion: 1 };
    // Excluir secundarios cross-portal (fusionar_duplicados.py); el maestro representa al grupo.
    const q = { activo: { $ne: false }, es_duplicado_secundario: { $ne: true } };
    const docs = await col.find(q, { projection: proj }).toArray();
    await client.close();
    console.log(`${docs.length.toLocaleString()} docs recibidos. Filtrando...`);

    const raw = docs
        .filter(d => {
            const m2c = cleanNum(d.m2_construccion);
            const precio = cleanNum(d.precio);
            const tipoOp = (d.tipo_operacion || '').toLowerCase();
            return m2c > 0 && precio >= 100000 && tipoOp.includes('venta');
        })
        .map(d => ({
            p:  Math.round(cleanNum(d.precio)),
            c:  Math.round(cleanNum(d.m2_construccion)),
            t:  Math.round(cleanNum(d.m2_terreno)) || 0,
            tp: (d.tipo_propiedad || '').toLowerCase(),
            co: (d.colonia   || '').toLowerCase(),
            mu: (d.municipio || '').toLowerCase(),
            re: cleanNum(d.recamaras)  || null,
            ba: cleanNum(d.banos)  || null,
            es: cleanNum(d.estacionamientos) || null,
            fs: (d.fecha_scraping || '').toString().slice(0, 10) || null,
            an: cleanNum(d.anio_construccion) || null,
        }));

    // Corrección terreno c→t (idéntica al script de Sheets)
    const TIPOS_TERRENO = ['terreno', 'lote', 'predio', 'solar'];
    let corregidos = 0;
    for (const d of raw) {
        if (TIPOS_TERRENO.some(tt => d.tp.includes(tt)) && d.t === 0 && d.c > 0) {
            d.t = d.c; d.c = 0; corregidos++;
        }
    }
    if (corregidos > 0) console.log(`Corrección terreno c→t: ${corregidos.toLocaleString()} listings`);

    // Dedup colonia|área|precio(±1%) — idéntico al script de Sheets
    const seen = new Set();
    const compacto = raw.filter(d => {
        const col2 = normStr(d.co);
        const pKey = Math.round(d.p / (Math.max(d.p, 1) * 0.01));
        const area = d.c > 0 ? d.c : d.t;
        const key = `${col2}|${area}|${pKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const nDups = raw.length - compacto.length;
    if (nDups > 0) console.log(`Duplicados eliminados (seen): ${nDups.toLocaleString()} (${Math.round(nDups / raw.length * 100)}%)`);

    const meta = {
        fecha_actualizacion: new Date().toISOString(),
        fuente: 'mongodb:mercado_props',
        total_original: docs.length,
        total_cache: compacto.length,
    };
    writeOut(meta, compacto);
}

function writeOut(meta, compacto) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ meta, datos: compacto }));
    console.log(`Cache guardada: ${compacto.length.toLocaleString()} comps → cache_consolidado.json (fuente: Mongo)`);
    const conFecha = compacto.filter(d => d.fs).length;
    const conAnio = compacto.filter(d => d.an).length;
    console.log(`  con fecha_scraping: ${conFecha.toLocaleString()} | con año: ${conAnio.toLocaleString()}`);
}

main().catch(e => { console.error(e); process.exit(1); });
