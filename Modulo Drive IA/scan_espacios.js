// Escanea varios OPIs y encuentra en qué fila/col aparecen recámaras, baños, estacionamientos
// para entender todos los formatos distintos que usa el perito.
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const KEYWORDS = ['RECAMARA', 'RECÁMARA', 'DORMITORIO', 'HABITACION', 'BAÑO', 'BANO', 'WC', 'ESTACIONAMIENTO', 'GARAGE', 'GARAJE', 'CAJÓN', 'CAJON'];

async function main() {
    const fs = require('fs');
    const cerebro = JSON.parse(fs.readFileSync(__dirname + '/cerebro_datos.json', 'utf8'));

    // Tomar una muestra variada: casas con datos + algunos sin datos de espacios
    const muestra = cerebro
        .filter(d => d.tipo && d.valorMercado !== 'No hallado')
        .slice(0, 15);

    const auth = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });
    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (const caso of muestra) {
        console.log('\n' + '='.repeat(70));
        console.log(`FOLIO: ${caso.folio || caso.fileName}`);
        console.log(`TIPO:  ${caso.tipo}`);

        try {
            const meta = await sheets.spreadsheets.get({ spreadsheetId: caso.fileId });
            const tabNames = meta.data.sheets.map(s => s.properties.title);
            const constrTab = tabNames.find(t => t.toUpperCase().includes('CONSTR'));
            if (!constrTab) { console.log('  [sin tab CONSTR]'); await delay(2000); continue; }

            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: caso.fileId,
                range: `'${constrTab}'!A1:AM150`,
            });
            const sheet = res.data.values || [];

            let encontro = false;
            sheet.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (!cell) return;
                    const upper = cell.toString().toUpperCase();
                    if (KEYWORDS.some(k => upper.includes(k))) {
                        // Mostrar la fila completa con contexto: celda anterior y siguiente
                        const prev = row[c - 1] ? `[col${c-1}]="${row[c-1]}" ` : '';
                        const next = row[c + 1] ? ` [col${c+1}]="${row[c+1]}"` : '';
                        console.log(`  F${r+1} col${c}: ${prev}"${cell}"${next}`);
                        encontro = true;
                    }
                });
            });
            if (!encontro) console.log('  [no encontró keywords de espacios]');

        } catch (e) {
            console.log('  ERROR:', e.message);
        }
        await delay(2500);
    }
    console.log('\nScan terminado.');
}

main().catch(console.error);
