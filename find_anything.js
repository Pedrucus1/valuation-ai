const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function findAnything() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando TODO lo visible ---');
        const response = await drive.files.list({
            pageSize: 100,
            fields: 'files(id, name, mimeType, parents)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files;
        console.log(`Total: ${files.length}`);
        files.forEach(f => {
            console.log(`- [${f.mimeType}] ${f.name} (Parents: ${f.parents ? f.parents.join(',') : 'None'})`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findAnything();
