const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function listTabs() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });
        
        console.log(`--- Tabs en ${response.data.properties.title} ---`);
        response.data.sheets.forEach(s => {
            console.log(`- ${s.properties.title}`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listTabs();
