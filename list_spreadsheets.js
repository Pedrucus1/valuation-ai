const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function listAllSpreadsheets() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Listando todas las hojas de cálculo accesibles ---');
        const response = await drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
            fields: 'files(id, name, parents)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('No se encontraron hojas de cálculo.');
        } else {
            files.forEach(f => {
                console.log(`- ${f.name} (ID: ${f.id}, Parents: ${f.parents})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listAllSpreadsheets();
