const googleSheetsConnector = require('./services/googleSheetsConnector');

async function findCoords() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        const opiTerreno = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Terreno!A1:Z100');
        const opiConstr = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z100');

        function search(data, label, sheetName) {
            for (let r = 0; r < data.length; r++) {
                for (let c = 0; c < data[r].length; c++) {
                    if (data[r][c] && data[r][c].toString().includes(label)) {
                        console.log(`${sheetName} -> Found "${label}" at R:${r + 1}, C:${c + 1} (Value: ${data[r][c]})`);
                        console.log(`  Nearby values: ${data[r].slice(c, c + 10).join(' | ')}`);
                    }
                }
            }
        }

        search(opiTerreno, 'SUP. TERRENO', 'OPI Terreno');
        search(opiTerreno, 'SUP. CONSTRUCCIONES', 'OPI Terreno');
        search(opiConstr, 'VALOR VENTA ESTIMADO PROMEDIO', 'OPI Constr');
        search(opiConstr, 'EDAD APROX.', 'OPI Constr');
        search(opiTerreno, 'VALOR ESTIMADO POR M2 TERRENO', 'OPI Terreno');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findCoords();
