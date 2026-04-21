/**
 * actualizar_cache_consolidado.js
 * Descarga CONSOLIDADO de Sheets y guarda solo las columnas necesarias
 * para valuación en cache_consolidado.json (lectura local, sin API).
 *
 * Correr manualmente cuando termine un ciclo de scraping:
 *   node actualizar_cache_consolidado.js
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDS_PATH     = path.join(__dirname, 'credentials.json');
const CACHE_PATH     = path.join(__dirname, 'cache_consolidado.json');
const SHEET_ID       = '1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE';

// Índices de columnas en CONSOLIDADO (0-based, fila de datos)
// id(0) titulo(1) precio(2) moneda(3) tipo_op(4) tipo_prop(5)
// colonia(6) municipio(7) estado(8) rec(9) ban(10)
// m2c(11) m2t(12) estac(13) año(14) desc(15) url(16)
// agente(17) fecha_pub(18) portal(19) fecha_scrap(20) activo(21)
const COL = { precio:2, tipo_op:4, tipo_prop:5, colonia:6, municipio:7, m2c:11, m2t:12, activo:21 };

async function main() {
    const creds = JSON.parse(readFileSync(CREDS_PATH, 'utf8'));
    const auth  = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    console.log('Descargando CONSOLIDADO...');
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'CONSOLIDADO!A2:V300000',
    });

    const rows = res.data.values || [];
    console.log(`${rows.length.toLocaleString()} filas recibidas. Filtrando...`);

    const cleanNum = v => { const n = parseFloat((v||'').toString().replace(/[$,\s]/g,'')); return isNaN(n) ? 0 : n; };

    const compacto = rows
        .filter(r => {
            const activo = (r[COL.activo] || '').toLowerCase();
            if (activo === 'false' || activo === '0') return false;
            const m2c = cleanNum(r[COL.m2c]);
            const precio = cleanNum(r[COL.precio]);
            const tipoOp = (r[COL.tipo_op] || '').toLowerCase();
            return m2c > 0 && precio >= 100000 && tipoOp.includes('venta');
        })
        .map(r => ({
            p:  Math.round(cleanNum(r[COL.precio])),      // precio
            c:  Math.round(cleanNum(r[COL.m2c])),         // m2_const
            t:  Math.round(cleanNum(r[COL.m2t])) || 0,   // m2_terreno
            tp: (r[COL.tipo_prop] || '').toLowerCase(),   // tipo_propiedad
            co: (r[COL.colonia]   || '').toLowerCase(),   // colonia
            mu: (r[COL.municipio] || '').toLowerCase(),   // municipio
        }));

    const meta = {
        fecha_actualizacion: new Date().toISOString(),
        total_original: rows.length,
        total_cache: compacto.length,
    };

    writeFileSync(CACHE_PATH, JSON.stringify({ meta, datos: compacto }));
    console.log(`Cache guardada: ${compacto.length.toLocaleString()} comps válidos → cache_consolidado.json`);
    console.log(`Reducción: ${rows.length.toLocaleString()} filas × 22 cols → ${compacto.length.toLocaleString()} × 7 campos`);
    const kb = Math.round(Buffer.byteLength(JSON.stringify({ meta, datos: compacto })) / 1024);
    console.log(`Tamaño del cache: ~${kb} KB`);
}

main().catch(console.error);
