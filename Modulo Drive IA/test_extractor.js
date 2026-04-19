const googleSheetsConnector = require('../services/googleSheetsConnector');

function findValueByLabel(sheetData, labels, minOffset = 1, requireNumber = false) {
    if (!sheetData) return 'No hallado';
    const labelArray = Array.isArray(labels) ? labels : [labels];
    
    for (let r = 0; r < sheetData.length; r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
            const cellValue = sheetData[r][c] ? sheetData[r][c].toString().toUpperCase() : '';
            if (labelArray.some(l => cellValue.includes(l.toUpperCase()))) {
                for (let i = c + minOffset; i < sheetData[r].length; i++) {
                    const val = sheetData[r][i];
                    if (val !== undefined && val !== null && val.toString().trim() !== '') {
                        if (requireNumber) {
                            const strVal = val.toString();
                            if (/\d/.test(strVal)) {
                                const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ""));
                                if (!isNaN(num) && num > 0 && num !== 2026) {
                                    return val;
                                }
                            }
                        } else {
                            return val;
                        }
                    }
                }
            }
        }
    }
    return 'No hallado';
}

async function run() {
    const fileId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4'; // OPI-26-4-09-AV
    
    const auth = await googleSheetsConnector.authenticate();
    const sheets = require('googleapis').google.sheets({ version: 'v4', auth });
    
    const meta = await sheets.spreadsheets.get({ spreadsheetId: fileId });
    const allTabs = meta.data.sheets.map(s => s.properties.title);
    
    const tabsToTry = allTabs.filter(t => t.toUpperCase().includes('MERCADO') || t.toUpperCase().startsWith('OPI')).slice(0, 8);
    
    const tabData = {};
    for (const tab of tabsToTry) {
        tabData[tab] = await googleSheetsConnector.getSpreadsheetData(fileId, `'${tab}'!A1:Z100`);
    }

    let mainSheet = null;
    let maxValor = 0;
    
    for (const tab of Object.keys(tabData)) {
        if (tab.toUpperCase().includes('MERCADO')) continue;
        
        const v = findValueByLabel(tabData[tab], ['VALOR VENTA ESTIMADO', 'VALOR COMERCIAL', 'VALOR CONCLUIDO', 'VALOR ESTIMADO'], 1, true);
        
        console.log(`Pestaña: ${tab} | Valor Estimado Crudo:`, v);
        
        if (v !== 'No hallado' && !v.toString().includes('DIV/0') && !v.toString().includes('REF')) {
             const num = parseFloat(v.toString().replace(/[^0-9.-]+/g, ""));
             if (!isNaN(num) && num > 1000) {
                  if (num > maxValor) {
                       maxValor = num;
                       mainSheet = tabData[tab];
                       console.log(`  -> ¡Es una pestaña válida! Valor numérico: $${num}`);
                  }
             }
        }
    }

    if (!mainSheet) {
        console.log("NO SE ENCONTRÓ NINGUNA PESTAÑA CON VALOR > 1000. MERGEANDO TODAS.");
        mainSheet = [].concat(...Object.values(tabData).filter(d => d !== tabData['Mercado']));
    }

    console.log("\n--- EXTRACCIÓN FINAL ---");
    console.log("Terreno:", findValueByLabel(mainSheet, ['SUP. TERRENO', 'SUPERFICIE DE TERRENO', 'TERRENO M2'], 1, true));
    console.log("Construccion:", findValueByLabel(mainSheet, ['SUP. CONSTRUCCIONES', 'SUPERFICIE CONSTRUIDA', 'CONSTRUCCION M2'], 1, true));
    console.log("Edad:", findValueByLabel(mainSheet, ['EDAD APROX', 'EDAD', 'ANTIGÜEDAD'], 1, true));
}

run().catch(console.error);
