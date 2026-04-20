const g = require('../services/googleSheetsConnector');
const fileId = '1dKEscgWTp722VFQuPfXGp4n4ULP6SmEPiaEXJTPbPTI';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Constr'!A1:Z60"
    });
    console.log('--- BUSCANDO VALOR EN OPI CONSTR ---');
    res.data.values.forEach((r, i) => {
        const str = r.join(' | ');
        if (str.includes('$') || str.includes('VALOR')) {
            console.log(i + 1, str);
        }
    });
}
run();
