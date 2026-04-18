const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function testFolderDirect() {
    const folderId = '1MSqdSduhmzgwqTYrQYkZ-lOsezYmmqjz';
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log(`--- Intentando entrar a la carpeta ${folderId} ---`);
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files;
        if (files.length === 0) {
            console.log('Carpeta vacía o sin permisos.');
        } else {
            console.log(`¡Éxito! Encontrados ${files.length} archivos.`);
            files.forEach(f => console.log(`- ${f.name} (${f.mimeType})`));
        }
    } catch (error) {
        console.error('Error Directo:', error.message);
    }
}

testFolderDirect();
