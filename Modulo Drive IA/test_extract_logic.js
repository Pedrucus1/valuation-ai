const googleSheetsConnector = require('../services/googleSheetsConnector');

function findValueByLabel(sheetData, labels, minOffset = 1) {
    if (!sheetData) return 'N/A';
    const labelArray = Array.isArray(labels) ? labels : [labels];
    
    for (let r = 0; r < sheetData.length; r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
            const cellValue = sheetData[r][c] ? sheetData[r][c].toString().toUpperCase().trim() : '';
            if (labelArray.some(l => cellValue === l.toUpperCase() || cellValue.includes(l.toUpperCase()))) {
                console.log(`Matched label: "${cellValue}" at Row ${r+1}, Col ${c}`);
                // Buscar el primer valor no vacío a la derecha a partir del minOffset
                for (let i = c + minOffset; i < sheetData[r].length; i++) {
                    const val = sheetData[r][i];
                    if (val !== undefined && val !== null && val.toString().trim() !== '') {
                        console.log(`Found value: "${val}" at Row ${r+1}, Col ${i}`);
                        return val;
                    }
                }
                if (sheetData[r+1] && sheetData[r+1][c]) {
                    console.log(`Found value below: "${sheetData[r+1][c]}"`);
                    return sheetData[r+1][c];
                }
                console.log("No value found near the label.");
                return 'No hallado';
            }
        }
    }
    return 'No hallado';
}

async function run() {
    const fileId = '1pHDhMoQEhLs5Q52rb6UU7XGjj5qS_miR2_g_HWA0zec';
    const data = await googleSheetsConnector.getSpreadsheetData(fileId, 'OPI Constr!A1:Z50');
    
    console.log("== TERRENO ==");
    console.log(findValueByLabel(data, ['SUP. TERRENO', 'SUPERFICIE DE TERRENO', 'TERRENO M2'], 1));
    
    console.log("== CONSTRUCCION ==");
    console.log(findValueByLabel(data, ['SUP. CONSTRUCCIONES', 'SUPERFICIE CONSTRUIDA', 'CONSTRUCCION M2'], 1));
    
    console.log("== VALOR MERCADO ==");
    console.log(findValueByLabel(data, ['VALOR VENTA ESTIMADO', 'VALOR COMERCIAL', 'VALOR CONCLUIDO', 'VALOR ESTIMADO'], 1));
}

run();
