const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function listFilesRecursive(drive, folderId, folderName = 'Raíz') {
    let results = [];
    console.log(`Explorando: ${folderName}...`);
    const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    for (const file of response.data.files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            const subFolderFiles = await listFilesRecursive(drive, file.id, file.name);
            results = results.concat(subFolderFiles);
        } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet' && file.name.startsWith('OPI')) {
            results.push(file);
        }
    }
    return results;
}

async function scanAvaluosFolder() {
    const rootFolderId = '1MSqdSduhmzgwqTYrQYkZ-lOsezYmmqjz';
    console.log(`--- Iniciando Escaneo Masivo Recursivo en Carpeta ID: ${rootFolderId} ---`);
    
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        const allFiles = await listFilesRecursive(drive, rootFolderId);
        console.log(`Se encontraron ${allFiles.length} archivos "OPI" para procesar.`);

        const manifest = {
            scanDate: new Date().toISOString(),
            rootFolderId,
            files: allFiles
        };
        
        fs.writeFileSync(path.join(__dirname, 'manifiesto_avaluos.json'), JSON.stringify(manifest, null, 2));
        console.log('Lista de archivos guardada en manifiesto_avaluos.json');

        allFiles.forEach(f => {
            console.log(`- ${f.name} (ID: ${f.id})`);
        });

    } catch (error) {
        console.error('Error durante el escaneo:', error.message);
    }
}

scanAvaluosFolder();
