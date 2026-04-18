const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function searchValu() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando carpetas con "valu" ---');
        const response = await drive.files.list({
            q: "name contains 'valu' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const folders = response.data.files;
        if (folders.length === 0) {
            console.log('No se encontraron carpetas con "valu".');
        } else {
            folders.forEach(f => {
                console.log(`- Folder: ${f.name} (ID: ${f.id})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

searchValu();
