const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function listTabs() {
    const spreadsheetId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';

    console.log(`--- Listando pestañas de: ${spreadsheetId} ---`);
    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const tabs = response.data.sheets;
        console.log(`¡Se encontraron ${tabs.length} pestañas!`);
        tabs.forEach(tab => {
            console.log(`- ${tab.properties.title}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listTabs();
