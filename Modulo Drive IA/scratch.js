const g = require('../services/googleSheetsConnector');
const fileId = '1E3EiNLz__LOtJcYyG34hqWxmnm1CgFXiXr80OCznLxQ';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.get({spreadsheetId: fileId});
    const sheetNames = res.data.sheets.map(s => s.properties.title);
    console.log('Hojas:', sheetNames);
    
    const tab = sheetNames.find(s => s.toUpperCase().includes('CONSTR')) || sheetNames.find(s => s.toUpperCase().includes('LOC COM'));
    
    const data = await sheets.spreadsheets.values.get({spreadsheetId: fileId, range: `'${tab}'!A180:AG230`});
    console.log('Homologacion (filas 180-230):');
    data.data.values.forEach((row, i) => console.log(i+180, row.join(' | ')));
}

run();
