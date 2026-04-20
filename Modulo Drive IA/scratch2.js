const g = require('../services/googleSheetsConnector');
const fileId = '1E3EiNLz__LOtJcYyG34hqWxmnm1CgFXiXr80OCznLxQ';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    const res = await sheets.spreadsheets.get({spreadsheetId: fileId});
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    
    // First let's check OPI CONSTR or OPI TERRENO
    const tab = sheetNames.find(s => s.toUpperCase().includes('TERRENO')) || sheetNames.find(s => s.toUpperCase().includes('CONSTR'));
    
    const data = await sheets.spreadsheets.values.get({spreadsheetId: fileId, range: `'${tab}'!A1:Z250`});
    console.log('Tab:', tab);
    data.data.values.forEach((r, i) => { 
        const str = r.join('').toUpperCase();
        if (str.includes('MERCADO') || str.includes('UNITARIO') || str.includes('APLICABLE') || str.includes('VALOR DE TERRENO') || str.includes('CONSTRUCCION')) {
            console.log(i+1, r.join(' | '));
        }
    });
}
run();
