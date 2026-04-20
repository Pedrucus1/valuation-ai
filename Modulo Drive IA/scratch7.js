const g = require('../services/googleSheetsConnector');
const fileId = '1dKEscgWTp722VFQuPfXGp4n4ULP6SmEPiaEXJTPbPTI';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'Base Datos Avaluo'!A1:Z100"
    });
    console.log('--- BUSCANDO EN BASE DATOS ---');
    if (res.data.values) {
        res.data.values.forEach((r, i) => {
            const str = r.join(' | ');
            if (str.includes('$') || str.includes('VALOR') || str.includes('MERCADO')) {
                console.log(i + 1, str);
            }
        });
    }
}
run();
