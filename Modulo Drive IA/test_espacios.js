const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const CASOS = [
    { id: '1vH86VOiw0n1bXbRBqWP7mxe_4slByGdufnDeDNfoSW4', label: 'Tabachines 4-09 (sin datos)' },
    { id: '1pHDhMoQEhLs5Q52rb6UU7XGjj5qS_miR2_g_HWA0zec', label: 'Tateposco 4-01 (4 rec / 2 baños / 1 est)' },
    { id: '1e9DIS0HPAJdR3X_Lj7jJRZ10oBY5XxuVNrMDKEH5tJE', label: 'Campestre 4-04 (3 rec / 3 baños — en Query_Formato)' },
];

function extractEspacios(constrSheet, querySheet) {
    const result = { recamaras: null, banos: null, estacionamientos: null };

    if (constrSheet) {
        for (let r = 56; r <= 70; r++) {
            const row = constrSheet[r];
            if (!row) continue;
            const label = (row[1] || '').toString().toUpperCase().trim();
            const qty   = parseFloat((row[0] || '').toString().replace(/[^0-9.]/g, ''));
            if (!isNaN(qty) && qty > 0) {
                if (label.includes('RECAMARA') || label.includes('RECÁMARA') || label.includes('DORMITORIO'))
                    result.recamaras = qty;
                else if ((label.includes('BAÑO') || label.includes('BANO') || label.includes('WC')) && !label.includes('1/2') && !label.includes('MEDIO'))
                    result.banos = qty;
                else if (label.includes('ESTACIONAMIENTO') || label.includes('GARAGE') || label.includes('GARAJE'))
                    result.estacionamientos = qty;
            }
        }
    }

    if (querySheet && (result.recamaras === null || result.banos === null)) {
        for (let r = 84; r <= 95; r++) {
            const row = querySheet[r];
            if (!row) continue;
            const label = (row[0] || '').toString().toUpperCase().trim();
            const qty   = parseFloat((row[1] || '').toString().replace(/[^0-9.]/g, ''));
            if (!isNaN(qty) && qty > 0) {
                if ((label.includes('RECAMARA') || label.includes('RECÁMARA') || label.includes('DORMITORIO')) && result.recamaras === null)
                    result.recamaras = qty;
                else if ((label.includes('BAÑO') || label.includes('BANO') || label.includes('WC')) && !label.includes('1/2') && !label.includes('MEDIO') && result.banos === null)
                    result.banos = qty;
                else if ((label.includes('ESTACIONAMIENTO') || label.includes('GARAGE') || label.includes('GARAJE')) && result.estacionamientos === null)
                    result.estacionamientos = qty;
            }
        }
    }

    return result;
}

async function main() {
    const auth = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });
    const delay = ms => new Promise(r => setTimeout(r, ms));

    for (const caso of CASOS) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: caso.id });
        const tabNames = meta.data.sheets.map(s => s.properties.title);

        const constrName = tabNames.find(t => t.toUpperCase().includes('CONSTR') && !t.toUpperCase().includes('LOC'));
        const queryName  = tabNames.find(t => t.toUpperCase().includes('QUERY'));

        const fetchTab = async (name) => {
            if (!name) return null;
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: caso.id,
                range: `'${name}'!A1:AM120`,
            });
            return res.data.values || null;
        };

        const constrSheet = await fetchTab(constrName);
        await delay(800);
        const querySheet  = await fetchTab(queryName);

        const espacios = extractEspacios(constrSheet, querySheet);
        console.log(`\n${caso.label}`);
        console.log('  recamaras:       ', espacios.recamaras);
        console.log('  banos:           ', espacios.banos);
        console.log('  estacionamientos:', espacios.estacionamientos);
        await delay(1500);
    }
}

main().catch(console.error);
