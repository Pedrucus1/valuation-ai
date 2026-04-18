const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function listEverything() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Listando todos los archivos y carpetas ---');
        const response = await drive.files.list({
            pageSize: 100,
            fields: 'files(id, name, mimeType, parents)',
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('No se encontraron archivos.');
        } else {
            files.forEach(f => {
                console.log(`- [${f.mimeType}] ${f.name} (ID: ${f.id}, Parents: ${f.parents})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listEverything();
