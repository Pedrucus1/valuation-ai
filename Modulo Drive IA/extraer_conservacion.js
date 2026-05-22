/**
 * extraer_conservacion.js
 * Lee estado de conservación de cada OPI y lo agrega a cerebro_datos.json
 *
 * Celdas según tipo de inmueble:
 *   OPI Constr (casa/depto): X48:AA48  o fallback W86:Z86
 *   OPI Terreno:             V88:X88
 *   OPI Loc Com:             V87:X87   o fallback X48:AA48
 */

require('dotenv').config({ path: '../.env' });

const fs   = require('fs');
const path = require('path');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');
const delay = ms => new Promise(r => setTimeout(r, ms));

// Normaliza el texto de la celda a una clave estándar
function normalizarEstado(raw) {
    if (!raw) return null;
    const s = raw.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').trim();

    if (s.includes('nuevo') || s.includes('excelente'))    return 'nuevo';
    if (s.includes('muy bueno') || s.includes('muybueno')) return 'muy_bueno';
    if (s.includes('regular') && s.includes('bueno'))      return 'regular_bueno';
    if (s.includes('regular') && s.includes('malo'))       return 'regular_malo';
    if (s.includes('regular'))                             return 'regular_medio';
    if (s.includes('bueno'))                               return 'bueno';
    if (s.includes('muy malo') || s.includes('muymal'))    return 'muy_malo';
    if (s.includes('malo') || s.includes('deteriorad'))    return 'malo';
    return null;
}

// Factor de depreciación por estado de conservación
const FACTORES_CONSERVACION = {
    nuevo:        1.00,
    muy_bueno:    1.00,
    bueno:        0.93,
    regular_bueno:0.85,
    regular_medio:0.78,
    regular_malo: 0.70,
    malo:         0.60,
    muy_malo:     0.48,
};

async function extractEstadoConservacion(sheets, fileId, tipo) {
    const tipoLow = (tipo || '').toLowerCase();
    const isTerreno = tipoLow.includes('terreno') || tipoLow.includes('lote');
    const isLocal   = tipoLow.includes('local') || tipoLow.includes('comercial');

    // Estrategia 1: celdas fijas conocidas (formato 2026)
    const rangosFijos = isTerreno
        ? ["'OPI Terreno'!V88:X88", "'OPI Terreno'!X48:AA48"]
        : isLocal
        ? ["'OPI Loc Com'!V87:X87", "'OPI Loc Com'!X48:AA48"]
        : ["'OPI Constr'!X48:AA48", "'OPI Constr'!W86:Z86"];

    for (const rango of rangosFijos) {
        try {
            const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range: rango });
            const rows = res.data.values || [];
            for (const row of rows) {
                for (const cell of row) {
                    const estado = normalizarEstado(cell);
                    if (estado) return estado;
                }
            }
        } catch (_) {}
    }

    // Estrategia 2: búsqueda por contexto — leer área amplia y buscar label "conservaci"
    // Cubre formatos 2022-2025 con celdas distintas
    const tabsAProbar = isTerreno
        ? ["'OPI Terreno'!A30:AM120"]
        : isLocal
        ? ["'OPI Loc Com'!A30:AM120"]
        : ["'OPI Constr'!A30:AM120"];

    for (const rango of tabsAProbar) {
        try {
            const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range: rango });
            const sheet = res.data.values || [];
            for (let r = 0; r < sheet.length; r++) {
                const row = sheet[r];
                if (!row) continue;
                for (let c = 0; c < row.length; c++) {
                    if (String(row[c] || '').toLowerCase().includes('conservaci')) {
                        for (let dc = 1; dc <= 8; dc++) {
                            const estado = normalizarEstado(row[c + dc]);
                            if (estado) return estado;
                        }
                        const nextRow = sheet[r + 1];
                        if (nextRow) {
                            for (let dc = 0; dc <= 8; dc++) {
                                const estado = normalizarEstado(nextRow[c + dc]);
                                if (estado) return estado;
                            }
                        }
                    }
                }
            }
        } catch (_) {}
    }

    return null;
}

async function main() {
    const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
    const sinEstado = cerebro.filter(d => !d.estadoConservacion && d.fileId);

    console.log(`Total: ${cerebro.length} | Sin estado de conservación: ${sinEstado.length}`);

    const auth   = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    let actualizados = 0;
    let errores = 0;

    for (const d of sinEstado) {
        await delay(1500);
        try {
            const estado = await extractEstadoConservacion(sheets, d.fileId, d.tipo);
            if (estado) {
                d.estadoConservacion = estado;
                d.factorConservacion = FACTORES_CONSERVACION[estado];
                actualizados++;
                console.log(`✓ ${estado} (${FACTORES_CONSERVACION[estado]}) | ${d.fileName.slice(0,60)}`);
            } else {
                d.estadoConservacion = 'bueno'; // default si no se encuentra
                d.factorConservacion = 0.93;
                console.log(`? default:bueno | ${d.fileName.slice(0,60)}`);
            }
        } catch (e) {
            errores++;
            console.log(`✗ Error: ${e.message.slice(0,60)}`);
        }
    }

    fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
    console.log(`\nActualizados: ${actualizados} | Errores: ${errores}`);
    console.log('cerebro_datos.json actualizado.');
}

main().catch(console.error);
