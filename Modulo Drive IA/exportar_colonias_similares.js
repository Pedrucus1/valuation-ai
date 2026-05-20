/**
 * exportar_colonias_similares.js
 * Exporta colonias_similares.json a Google Sheets como respaldo/revisión manual.
 * Formato: una fila por par (colonia_sujeto | colonia_similar | menciones)
 */

require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const path = require('path');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const SALIDA_SHEET_ID = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
const TAB_NAME        = 'Colonias Similares NSE';
const INPUT_PATH      = path.join(__dirname, 'colonias_similares.json');

async function main() {
    const datos = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    const colonias = Object.keys(datos).sort();

    // Construir filas: header + un par por fila
    const rows = [['Colonia Sujeto', 'Colonia Similar', 'Menciones (perito)']];

    for (const suj of colonias) {
        for (const { colonia, menciones } of datos[suj]) {
            rows.push([suj, colonia, menciones]);
        }
    }

    console.log(`Total filas: ${rows.length - 1} pares de ${colonias.length} colonias`);

    const auth   = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    // Crear pestaña si no existe
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SALIDA_SHEET_ID });
    const tabExiste = meta.data.sheets.some(s => s.properties.title === TAB_NAME);
    if (!tabExiste) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SALIDA_SHEET_ID,
            resource: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] }
        });
        console.log(`Pestaña "${TAB_NAME}" creada.`);
    }

    // Escribir datos
    await sheets.spreadsheets.values.update({
        spreadsheetId: SALIDA_SHEET_ID,
        range: `'${TAB_NAME}'!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });

    console.log(`Exportado: https://docs.google.com/spreadsheets/d/${SALIDA_SHEET_ID}`);
    console.log(`Pestaña: "${TAB_NAME}"`);
}

main().catch(console.error);
