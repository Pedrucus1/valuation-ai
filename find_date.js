const googleSheetsConnector = require('./services/googleSheetsConnector');

async function findDateAndLocales() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        const opiConstr = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z50');
        
        console.log('--- Buscando FECHA en OPI Constr ---');
        for (let r = 0; r < opiConstr.length; r++) {
            for (let c = 0; c < opiConstr[r].length; c++) {
                if (opiConstr[r][c] && opiConstr[r][c].toString().toUpperCase().includes('FECHA')) {
                    console.log(`Encontrado "FECHA" en R:${r+1}, C:${c+1}: ${opiConstr[r][c]}`);
                    console.log(`Valores cercanos: ${opiConstr[r].slice(c, c+10).join(' | ')}`);
                }
            }
        }

        // Probar OPI Loc Com con espacio
        console.log('--- Probando OPI Loc Com ---');
        const opiLoc = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, "'OPI Loc Com '!A1:Z50");
        console.log('Conexión exitosa a OPI Loc Com !');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findDateAndLocales();
