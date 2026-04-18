const googleSheetsConnector = require('./services/googleSheetsConnector');

async function findFactorsTable() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    
    console.log('--- Buscando Tabla de Factores en OPI Constr ---');

    try {
        const data = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z200');
        
        // Buscar filas que contengan palabras clave
        data.forEach((row, index) => {
            const rowText = row.join(' ').toUpperCase();
            if (rowText.includes('FACTOR') || rowText.includes('HOMOLOGA') || rowText.includes('ZONA') || rowText.includes('UBICACION')) {
                console.log(`Posible tabla encontrada en Fila ${index + 1}:`, row.join(' | '));
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findFactorsTable();
