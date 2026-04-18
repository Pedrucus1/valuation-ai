const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function exportSummary() {
    console.log('--- Iniciando Exportación a Google Sheets ---');
    
    const manifestPath = path.join(__dirname, 'manifiesto_avaluos.json');
    const cerebroPath = path.join(__dirname, 'cerebro_datos.json');
    
    if (!fs.existsSync(cerebroPath)) {
        console.error('No se encontró cerebro_datos.json.');
        return;
    }

    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
    const data = JSON.parse(fs.readFileSync(cerebroPath, 'utf8'));

    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const targetSpreadsheetId = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
        console.log(`Usando Base de Datos compartida por el usuario: ${targetSpreadsheetId}`);

        // 2. Preparar los datos (Añadido: Fecha, Links)
        const rows = [
            [
                'Folio', 
                'Fecha',
                'Dirección', 
                'Tipo', 
                'm2 Terreno', 
                'm2 Const', 
                'Valor Mercado', 
                'Edad',
                'Links Comparables'
            ]
        ];

        data.forEach(item => {
            const links = item.comparables.map(c => c.link).filter(l => l && l.startsWith('http')).join(' | ');
            rows.push([
                item.folio,
                item.fecha || 'N/A',
                item.direccion,
                item.tipo,
                item.m2Terreno,
                item.m2Construccion,
                item.valorMercado,
                item.edad,
                links
            ]);
        });

        // 3. Escribir los datos
        await sheets.spreadsheets.values.update({
            spreadsheetId: targetSpreadsheetId,
            range: 'Hoja 1!A1',
            valueInputOption: 'RAW',
            resource: {
                values: rows,
            },
        });

        console.log(`Exportación exitosa: https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`);

    } catch (error) {
        console.error('Error durante la exportación:', error.message);
        // ... fallback CSV logic ...
        console.log('Generando respaldo local en CSV...');
        
        const csvContent = data.map(item => [
            item.folio,
            `"${item.direccion}"`,
            item.tipo,
            item.m2Terreno,
            item.m2Construccion,
            item.valorFisicoTerreno,
            item.valorFisicoConstruccion,
            item.valorMercado,
            item.edad
        ].join(',')).join('\n');
        
        const csvHeader = 'Folio,Direccion,Tipo,m2 Terreno,m2 Const,Valor Fisico Terreno,Valor Fisico Const,Valor Mercado,Edad\n';
        const csvPath = path.join(__dirname, 'resumen_avaluos.csv');
        fs.writeFileSync(csvPath, csvHeader + csvContent);
        console.log(`Respaldo local generado en: ${csvPath}`);
    }
}

exportSummary();
