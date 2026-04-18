const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function listFolders() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Listando carpetas accesibles ---');
        const response = await drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const folders = response.data.files;
        if (folders.length === 0) {
            console.log('No se encontraron carpetas.');
        } else {
            folders.forEach(f => {
                console.log(`- Folder: ${f.name} (ID: ${f.id})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listFolders();
