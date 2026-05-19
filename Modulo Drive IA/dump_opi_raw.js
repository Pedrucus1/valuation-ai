const googleSheetsConnector = require('../services/googleSheetsConnector');

// OPI CONSTR conocido: Lomas de Tabachines (CASA HABITACIÓN, bien poblado)
const FILE_ID = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
const TAB = 'OPI CONSTR'; // ajustar si el nombre es diferente

async function main() {
    const auth = await googleSheetsConnector.authenticate();
    const { google } = require('googleapis');
    const sheets = google.sheets({ version: 'v4', auth });

    // Primero listar tabs para ver el nombre exacto
    const meta = await sheets.spreadsheets.get({ spreadsheetId: FILE_ID });
    const tabNames = meta.data.sheets.map(s => s.properties.title);
    console.log('Tabs disponibles:', tabNames);

    // Leer la pestaña OPI CONSTR (o la que corresponda)
    const targetTab = tabNames.find(t => t.toUpperCase().includes('CONSTR')) || tabNames[0];
    console.log('Leyendo tab:', targetTab);

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: FILE_ID,
        range: `'${targetTab}'!A1:Z120`,
    });

    const rows = res.data.values || [];
    console.log(`\nTotal filas: ${rows.length}`);
    console.log('='.repeat(80));

    rows.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell && cell.toString().trim() !== '') {
                // Mostrar solo celdas con contenido no vacío
                const col = String.fromCharCode(65 + c); // A, B, C...
                console.log(`[F${r+1} C${col}(${c})] ${cell}`);
            }
        });
    });
}

main().catch(console.error);
