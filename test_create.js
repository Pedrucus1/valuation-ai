const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function testCreate() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Probando creación de archivo en Drive ---');
        const fileMetadata = {
            name: 'Test File AI',
            mimeType: 'application/vnd.google-apps.spreadsheet',
        };
        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        console.log('Archivo creado exitosamente. ID:', file.data.id);
    } catch (error) {
        console.error('Error detallado:', error.response ? error.response.data : error.message);
    }
}

testCreate();
