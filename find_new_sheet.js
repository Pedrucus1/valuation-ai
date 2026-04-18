const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function findTargetSheet() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando la hoja recién creada ---');
        const response = await drive.files.list({
            orderBy: 'modifiedTime desc',
            pageSize: 20,
            fields: 'files(id, name, mimeType, modifiedTime)',
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('No se encontraron hojas de cálculo.');
        } else {
            files.forEach(f => {
                console.log(`- ${f.name} (ID: ${f.id}) - Modificado: ${f.modifiedTime}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findTargetSheet();
