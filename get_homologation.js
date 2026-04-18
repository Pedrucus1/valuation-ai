const googleSheetsConnector = require('./services/googleSheetsConnector');

async function getHomologationTable() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    
    console.log('--- Extrayendo TABLA DE HOMOLOGACIÓN (Fila 191+) ---');

    try {
        // Leemos de la 191 a la 230 para capturar la tabla completa
        const data = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A191:Z230');
        
        if (data) {
            data.forEach((row, index) => {
                if (row.length > 0) {
                    console.log(`Fila ${191 + index}:`, row.join(' | '));
                }
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

getHomologationTable();
