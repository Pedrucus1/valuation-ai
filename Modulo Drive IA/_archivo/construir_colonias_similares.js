/**
 * construir_colonias_similares.js
 *
 * Lee los ~900 avalúos OPI y extrae:
 *   sujeto_colonia → colonias usadas por el perito como comparables
 *
 * Esa relación implica equivalencia NSE: si el perito usó Colonia X como comp
 * para una propiedad en Colonia Y, son de nivel socioeconómico similar.
 *
 * Salida: colonias_similares.json
 *   { "lomas de tabachines": ["tabachines", "colli urbano", ...], ... }
 */

const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const MANIFIESTO_PATH = path.join(__dirname, 'manifiesto_avaluos.json');
const OUTPUT_PATH     = path.join(__dirname, 'colonias_similares.json');
const PROGRESS_PATH   = path.join(__dirname, 'colonias_progress.json');

const delay = ms => new Promise(r => setTimeout(r, ms));

// Extrae colonia del nombre del archivo OPI
// "OPI-26-4-09-AV Huejotes 5, Lomas de Tabachines, 45185 Zapopan, Jal."
//  → "lomas de tabachines"
function extraerColoniaSujeto(fileName) {
    // Quitar prefijo OPI-XX-X-XX-XX
    const sinPrefijo = fileName.replace(/^OPI-\d+-\d+-\d+-\w+\s+/, '').trim();
    const partes = sinPrefijo.split(',');
    if (partes.length >= 2) {
        const col = partes[1].trim().replace(/\d{5}/g, '').trim();
        if (col.length > 2) return col.toLowerCase();
    }
    return null;
}

// Normaliza nombre de colonia para comparación
function normalizar(s) {
    if (!s) return '';
    return s.toString()
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function main() {
    const manifiesto = JSON.parse(fs.readFileSync(MANIFIESTO_PATH, 'utf8'));
    const archivos = manifiesto.files;
    console.log(`Total archivos: ${archivos.length}`);

    // Cargar progreso previo si existe
    let grafo = {};  // { colonia_sujeto: { colonia_comp: count } }
    let procesados = new Set();

    if (fs.existsSync(PROGRESS_PATH)) {
        const prev = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
        grafo = prev.grafo || {};
        procesados = new Set(prev.procesados || []);
        console.log(`Retomando: ${procesados.size} archivos ya procesados`);
    }

    const auth = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    let count = 0;
    let errores = 0;

    for (const archivo of archivos) {
        count++;
        if (procesados.has(archivo.id)) continue;

        if (count % 50 === 0) {
            console.log(`[${count}/${archivos.length}] procesados:${procesados.size} pares_únicos:${Object.keys(grafo).length}`);
        }

        try {
            await delay(2000);

            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: archivo.id,
                range: "'Mercado'!A1:O60",
            });
            const rows = res.data.values || [];

            const coloniasSujeto = [
                extraerColoniaSujeto(archivo.name),
            ].filter(Boolean);

            // Recorrer todas las filas buscando comparables de VENTA con colonia
            for (const row of rows) {
                const status = (row[1] || '').toString().toUpperCase();
                const tipo   = (row[2] || '').toString().toUpperCase();
                const colComp = (row[4] || '').toString().trim();
                const precio = (row[9] || '').toString();

                if (status !== 'VENTA') continue;
                if (!tipo.includes('CASA') && !tipo.includes('DEPARTAMENTO') && !tipo.includes('CONDOMINIO')) continue;
                if (!colComp || colComp.length < 3) continue;

                const colCompNorm = normalizar(colComp);
                if (!colCompNorm) continue;

                // Agregar relación para cada colonia del sujeto
                for (const colSuj of coloniasSujeto) {
                    const colSujNorm = normalizar(colSuj);
                    if (!colSujNorm || colSujNorm === colCompNorm) continue;

                    if (!grafo[colSujNorm]) grafo[colSujNorm] = {};
                    grafo[colSujNorm][colCompNorm] = (grafo[colSujNorm][colCompNorm] || 0) + 1;

                    // Relación inversa: si A usó B como comp, B también puede usar A
                    if (!grafo[colCompNorm]) grafo[colCompNorm] = {};
                    grafo[colCompNorm][colSujNorm] = (grafo[colCompNorm][colSujNorm] || 0) + 1;
                }
            }

            procesados.add(archivo.id);

        } catch (e) {
            errores++;
            if (e.message.includes('Quota')) {
                console.log(`  [QUOTA] Esperando 30s...`);
                await delay(30000);
            }
        }

        // Guardar progreso cada 25 archivos
        if (procesados.size % 25 === 0) {
            fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ grafo, procesados: [...procesados] }));
        }
    }

    // Convertir grafo a formato final: solo colonias con ≥2 menciones del perito
    const resultado = {};
    for (const [suj, comps] of Object.entries(grafo)) {
        const similares = Object.entries(comps)
            .filter(([, count]) => count >= 1)
            .sort((a, b) => b[1] - a[1])
            .map(([col, count]) => ({ colonia: col, menciones: count }));
        if (similares.length > 0) {
            resultado[suj] = similares;
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(resultado, null, 2));
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ grafo, procesados: [...procesados] }));

    const totalPares = Object.values(resultado).reduce((s, v) => s + v.length, 0);
    console.log(`\nListo. ${procesados.size} archivos procesados, ${errores} errores`);
    console.log(`Colonias mapeadas: ${Object.keys(resultado).length}`);
    console.log(`Total pares de similitud: ${totalPares}`);
    console.log(`Guardado en: colonias_similares.json`);
}

main().catch(console.error);
