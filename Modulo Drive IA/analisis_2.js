const g = require('../services/googleSheetsConnector');
const fileId = '1E3_U_M9Nn_6Y_F_f_f_f_f_f_f_f_f_f_f'; // Necesito el FileID real de OPI-26-1-16-OF

async function run(){
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));
    const target = data.find(d => d.fileName.includes('OPI-26-1-16-OF'));
    
    if (!target) {
        console.log('No se encontró OPI-26-1-16-OF');
        return;
    }
    
    const fId = target.fileId;
    console.log('Analizando:', target.fileName, 'ID:', fId);
    
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.get({spreadsheetId: fId});
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    console.log('Hojas:', sheetNames);
    
    // Verificamos si hay OPI LOC COM
    const tab = sheetNames.find(s => s.toUpperCase().includes('LOC COM')) || sheetNames.find(s => s.toUpperCase().includes('CONSTR'));
    const vals = await sheets.spreadsheets.values.get({
        spreadsheetId: fId,
        range: `'${tab}'!A30:Z100`
    });
    
    vals.data.values.forEach((r, i) => {
        const str = r.join('').toUpperCase();
        if (str.includes('MERCADO') || str.includes('UNITARIO') || str.includes('CONSTR')) {
            console.log(i + 30, r.join(' | '));
        }
    });
}
run();
