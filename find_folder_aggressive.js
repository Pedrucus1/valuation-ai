const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function findFolderAggressive() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando carpeta "avaluos" de forma agresiva ---');
        
        // Probar diferentes variaciones de nombre y flags
        const queries = [
            "name contains 'avaluo' and mimeType = 'application/vnd.google-apps.folder'",
            "name contains 'Avaluos' and mimeType = 'application/vnd.google-apps.folder'",
            "mimeType = 'application/vnd.google-apps.folder'"
        ];

        for (const q of queries) {
            console.log(`Query: ${q}`);
            const response = await drive.files.list({
                q: q,
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            
            if (response.data.files.length > 0) {
                console.log(`¡Encontrado con query "${q}"!`);
                response.data.files.forEach(f => console.log(`- ${f.name} (ID: ${f.id})`));
            } else {
                console.log('No se encontraron resultados.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findFolderAggressive();
