const googleSheetsConnector = require('../services/googleSheetsConnector');

async function debugSheet() {
    const fileId = '1pHDhMoQEhLs5Q52rb6UU7XGjj5qS_miR2_g_HWA0zec';
    
    try {
        console.log("Fetching tabs...");
        const tabs = ['OPI Constr', 'OPI Terreno', 'OPI Loc Com ', 'Mercado', 'OPI OF'];
        
        for (const tab of tabs) {
            try {
                const range = `${tab}!A1:Z50`;
                const data = await googleSheetsConnector.getSpreadsheetData(fileId, range);
                console.log(`\n--- TAB: ${tab} ---`);
                
                if (!data || data.length === 0) {
                    console.log("Empty or not found");
                    continue;
                }
                
                // Let's find some important rows to see their layout
                data.forEach((row, rowIndex) => {
                    if (row.some(cell => cell && cell.toString().toUpperCase().includes('TERRENO') || 
                                         cell && cell.toString().toUpperCase().includes('CONSTRUCCION') ||
                                         cell && cell.toString().toUpperCase().includes('VALOR') ||
                                         cell && cell.toString().toUpperCase().includes('EDAD'))) {
                        console.log(`Row ${rowIndex + 1}: ${JSON.stringify(row)}`);
                    }
                });
            } catch (err) {
                console.log(`\n--- TAB: ${tab} ---`);
                console.log(`Error: ${err.message}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

debugSheet();
