const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function analyzeFormulas() {
    const fileId = '1YjZkKBxJOjXQZLuYQtPKyRznyoNufw-7_9AcdsoDtI4'; 
    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.get({
            spreadsheetId: fileId,
            includeGridData: true,
            ranges: ['Mercado!A1:Z50', 'OPI Terreno!A1:Z60', 'OPI Constr!A1:Z60']
        });

        const spreadsheet = response.data;
        
        spreadsheet.sheets.forEach(sheet => {
            console.log(`\n=== ANALIZANDO PESTAÑA: ${sheet.properties.title} ===`);
            const data = sheet.data[0].rowData;
            
            data.forEach((row, rIdx) => {
                if (!row.values) return;
                row.values.forEach((cell, cIdx) => {
                    const val = cell.userEnteredValue;
                    const displayVal = cell.formattedValue;
                    
                    if (val && (val.formulaValue || (displayVal && (displayVal.includes('Factor') || displayVal.includes('Homolog'))))) {
                        const formula = val.formulaValue || 'N/A';
                        console.log(`[Celda ${String.fromCharCode(65 + cIdx)}${rIdx + 1}] Texto: "${displayVal}" | Fórmula: ${formula}`);
                    }
                });
            });
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

analyzeFormulas();
