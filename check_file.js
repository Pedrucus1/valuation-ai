const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function getFileMetadata() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        const fileId = '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4';
        
        console.log(`--- Obteniendo metadatos del archivo ${fileId} ---`);
        const response = await drive.files.get({
            fileId: fileId,
            fields: 'id, name, parents, owners, permissions',
            supportsAllDrives: true,
        });

        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

getFileMetadata();
