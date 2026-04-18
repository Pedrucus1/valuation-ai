const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function checkSheetNames() {
    const spreadsheetId = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });
        
        console.log(`--- Tabs en ${response.data.properties.title} ---`);
        response.data.sheets.forEach(s => {
            console.log(`- "${s.properties.title}"`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSheetNames();
