const googleSheetsConnector = require('./services/googleSheetsConnector');

async function extractLogic() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    
    console.log('--- INICIANDO EXTRACCIÓN DE ADN DE VALUACIÓN ---');

    try {
        // 1. Leer Mercado (Comparables)
        console.log('\n>> Extrayendo datos de la pestaña "Mercado"...');
        const mercadoData = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'Mercado!A1:S30');
        
        // 2. Leer OPI Constr (Cálculos y Homologación)
        console.log('\n>> Extrayendo datos de la pestaña "OPI Constr"...');
        const opiConstrData = await googleSheetsConnector.getSpreadsheetData(spreadsheetId, 'OPI Constr!A1:Z100');

        console.log('\n--- RESUMEN DE DATOS ---');
        
        if (mercadoData) {
            console.log(`Pestaña Mercado: ${mercadoData.length} filas extraídas.`);
            // Mostrar cabeceras y primera fila de datos
            console.log('Muestra Mercado:', mercadoData.slice(0, 5).map(r => r.join(' | ')));
        }

        if (opiConstrData) {
            console.log(`Pestaña OPI Constr: ${opiConstrData.length} filas extraídas.`);
            // Buscar donde suelen estar los factores (usualmente a partir de la fila 20-30)
            console.log('Muestra OPI Constr (Filas 25-35):', opiConstrData.slice(25, 35).map(r => r.join(' | ')));
        }

    } catch (error) {
        console.error('Error durante la extracción:', error.message);
    }
}

extractLogic();
