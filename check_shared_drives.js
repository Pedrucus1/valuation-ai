const googleSheetsConnector = require('./services/googleSheetsConnector');
const { google } = require('googleapis');

async function checkSharedDrives() {
    try {
        const auth = await googleSheetsConnector.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        
        console.log('--- Buscando Unidades Compartidas (Shared Drives) ---');
        const response = await drive.drives.list();

        const drives = response.data.drives;
        if (!drives || drives.length === 0) {
            console.log('No se encontraron Unidades Compartidas.');
        } else {
            drives.forEach(d => {
                console.log(`- Shared Drive: ${d.name} (ID: ${d.id})`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSharedDrives();
