const googleSheetsConnector = require('./services/googleSheetsConnector');

async function finalDeepDive() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    
    try {
        console.log('--- Extrayendo Factores Específicos (Filas 191-213) ---');
        const homologacion = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A191:N213');
        if (homologacion) {
            homologacion.forEach((row, index) => console.log(`Fila ${191 + index}:`, row.join(' | ')));
        }

        console.log('\n--- Analizando Lógica de Ross-Heideke ---');
        const rh = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'Ross Heideke!A1:H20');
        if (rh) {
            rh.forEach((row, index) => console.log(`RH Fila ${index + 1}:`, row.join(' | ')));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

finalDeepDive();
