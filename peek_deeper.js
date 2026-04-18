const googleSheetsConnector = require('./services/googleSheetsConnector');

async function peekMore() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        console.log('--- Peeking OPI Constr (Rows 10-100) ---');
        const opiConstr = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z100');
        console.log(JSON.stringify(opiConstr, null, 2));
        
        console.log('--- Peeking OPI Terreno (Rows 1-100) ---');
        const opiTerreno = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Terreno!A1:Z100');
        console.log(JSON.stringify(opiTerreno, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

peekMore();
