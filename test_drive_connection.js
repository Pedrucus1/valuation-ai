const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function testConnectionFinal() {
    console.log('--- Listando archivos compartidos directamente ---');
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        const response = await drive.files.list({
            pageSize: 20,
            fields: 'files(id, name, mimeType)',
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('Sigue sin aparecer nada. Por favor verifica que el correo sea exacto: propvalu-drive-bot@propvalu-mexico.iam.gserviceaccount.com');
        } else {
            console.log(`¡Éxito! Archivos encontrados:`);
            files.forEach(f => {
                console.log(`- [${f.mimeType}] ${f.name} (ID: ${f.id})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testConnectionFinal();
