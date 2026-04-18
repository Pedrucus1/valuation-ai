const googleSheetsConnector = require('./services/googleSheetsConnector');

async function peekData() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        console.log('--- Peeking Mercado ---');
        const mercado = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'Mercado!A1:Z10');
        console.log(JSON.stringify(mercado, null, 2));
        
        console.log('--- Peeking OPI Constr ---');
        const opi = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z10');
        console.log(JSON.stringify(opi, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

peekData();
