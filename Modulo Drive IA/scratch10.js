const g = require('../services/googleSheetsConnector');
const fileId = '1yiUyzyecwWGH3auBSDTbI2hv1QlbZ-GGlJ4ArHFZZDQ';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Loc Com '!A35:E45"
    });
    console.log(JSON.stringify(res.data.values, null, 2));
}
run();
