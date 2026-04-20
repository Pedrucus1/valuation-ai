const g = require('../services/googleSheetsConnector');
const fileId = '1Z4A1e_IaYew0gL5ANlsgVI8qCTPYGFBovnadcYsL7W4';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Loc Com '!A35:E55"
    });
    console.log(JSON.stringify(res.data.values, null, 2));
}
run();
