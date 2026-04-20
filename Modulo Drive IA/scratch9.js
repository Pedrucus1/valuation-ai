const g = require('../services/googleSheetsConnector');
const fileId = '1FL-Sil67X2pRzdyW-jZkSyo2aQ1HOiHmJPEmT1-3ZD4';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Constr'!A36:Z42"
    });
    console.log(JSON.stringify(res.data.values, null, 2));
}
run();
