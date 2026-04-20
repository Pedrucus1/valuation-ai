const g = require('../services/googleSheetsConnector');
const fileId = '1FL-Sil67X2pRzdyW-jZkSyo2aQ1HOiHmJPEmT1-3ZD4';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Constr'!A1:Z60"
    });
    console.log('--- BUSCANDO VALOR EN OPI CONSTR (Héctor Hernández) ---');
    if (res.data.values) {
        res.data.values.forEach((r, i) => {
            const str = r.join(' | ');
            if (str.includes('$') || str.includes('VALOR')) {
                console.log(i + 1, str);
            }
        });
    }
}
run();
