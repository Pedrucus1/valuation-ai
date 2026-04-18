const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function diagnostic() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Diagnóstico de Acceso a Drive ---');
        
        // 1. Buscar el archivo conocido
        const searchFile = await drive.files.list({
            q: "name contains 'OPI-26-4-09-AV Huejotes 5'",
            fields: 'files(id, name, parents, owners)',
        });
        
        if (searchFile.data.files.length > 0) {
            const file = searchFile.data.files[0];
            console.log(`Archivo encontrado: ${file.name}`);
            console.log(`ID: ${file.id}`);
            console.log(`Padres: ${JSON.stringify(file.parents)}`);
            
            if (file.parents && file.parents.length > 0) {
                for (const parentId of file.parents) {
                    const parent = await drive.files.get({
                        fileId: parentId,
                        fields: 'id, name, mimeType',
                        supportsAllDrives: true,
                    });
                    console.log(`Padre encontrado: ${parent.data.name} (ID: ${parent.data.id}, MimeType: ${parent.data.mimeType})`);
                }
            }
        } else {
            console.log('No se encontró el archivo OPI-26-4-09-AV Huejotes 5');
        }

        // 2. Buscar carpetas con nombre similar a 'avaluos'
        const searchFolder = await drive.files.list({
            q: "name contains 'avaluo' and mimeType = 'application/vnd.google-apps.folder'",
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        
        console.log(`Carpetas con 'avaluo' encontradas: ${searchFolder.data.files.length}`);
        searchFolder.data.files.forEach(f => {
            console.log(`- ${f.name} (ID: ${f.id})`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

diagnostic();
