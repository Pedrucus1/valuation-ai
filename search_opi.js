const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function searchOPI() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando archivos "OPI" ---');
        const response = await drive.files.list({
            q: "name contains 'OPI' and trashed = false",
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('No se encontraron archivos con "OPI".');
        } else {
            files.forEach(f => {
                console.log(`- Found: ${f.name} (ID: ${f.id}, MimeType: ${f.mimeType})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

searchOPI();
