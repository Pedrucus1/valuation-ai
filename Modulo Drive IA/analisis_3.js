const g = require('../services/googleSheetsConnector');

async function run(){
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));
    const target = data.find(d => d.fileName.includes('OPI-26-2-04-OF'));
    
    if (!target) {
        console.log('No se encontró OPI-26-2-04-OF');
        return;
    }
    
    const fId = target.fileId;
    console.log('Analizando:', target.fileName, 'ID:', fId);
    
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.get({spreadsheetId: fId});
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    
    // Al ser Casa Habitación, la pestaña principal DEBE ser OPI CONSTR
    const tab = 'OPI Constr';
    
    const vals = await sheets.spreadsheets.values.get({
        spreadsheetId: fId,
        range: `'${tab}'!A1:Z60`
    });
    
    console.log('--- CABECERA OPI CONSTR ---');
    vals.data.values.forEach((r, i) => {
        const str = r.join('').toUpperCase();
        if (str.includes('VALOR') || str.includes('MERCADO') || str.includes('CONSTR') || str.includes('UNITARIO')) {
            console.log(i + 1, r.join(' | '));
        }
    });
    
    // También extraemos el mercado para ver si promediaste $/m2 de construcción
    const merc = await sheets.spreadsheets.values.get({
        spreadsheetId: fId,
        range: `'Mercado'!A1:P20`
    });
    console.log('\n--- MERCADO (Primeras filas) ---');
    if (merc.data.values) {
        merc.data.values.forEach((r, i) => console.log(i+1, r.join(' | ')));
    }
}
run();
