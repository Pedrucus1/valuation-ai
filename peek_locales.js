const googleSheetsConnector = require('./services/googleSheetsConnector');

async function peekLocales() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        console.log('--- Peeking OPI Loc Com ---');
        const opiLoc = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Loc Com!A1:Z50');
        console.log(JSON.stringify(opiLoc, null, 2));
        
        console.log('--- Peeking Date in OPI Constr ---');
        const opiConstr = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z20');
        console.log(JSON.stringify(opiConstr, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

peekLocales();
