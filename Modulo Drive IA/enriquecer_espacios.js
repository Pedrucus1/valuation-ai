// Enriquece cerebro_datos.json existente agregando recamaras/banos/estacionamientos
// sin reprocesar todo desde cero — solo actualiza registros de tipo CASA.
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));

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
    const outputPath = path.join(__dirname, 'cerebro_datos.json');
    const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

    // Solo procesar registros con tipo CASA que no tienen aún los campos
    const pendientes = data.filter(d =>
        d.tipo && d.tipo.toUpperCase().includes('CASA') &&
        d.valorMercado !== 'No hallado' &&
        d.recamaras === undefined
    );

    console.log(`Total en cerebro: ${data.length} | Casas a enriquecer: ${pendientes.length}`);

    const auth = await googleSheetsConnector.authenticate();
    const sheets = google.sheets({ version: 'v4', auth });

    let actualizados = 0;
    for (let i = 0; i < pendientes.length; i++) {
        const item = pendientes[i];
        console.log(`[${i+1}/${pendientes.length}] ${item.folio || item.fileName}`);

        try {
            await delay(3000);
            const meta = await sheets.spreadsheets.get({ spreadsheetId: item.fileId });
            const tabNames = meta.data.sheets.map(s => s.properties.title);

            const constrName = tabNames.find(t => t.toUpperCase().includes('CONSTR') && !t.toUpperCase().includes('LOC'));
            const queryName  = tabNames.find(t => t.toUpperCase().includes('QUERY'));

            const fetchTab = async (name) => {
                if (!name) return null;
                await delay(1000);
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: item.fileId,
                    range: `'${name}'!A1:AM120`,
                });
                return res.data.values || null;
            };

            const constrSheet = await fetchTab(constrName);
            const querySheet  = await fetchTab(queryName);
            const espacios    = extractEspacios(constrSheet, querySheet);

            // Actualizar en el array original
            const idx = data.findIndex(d => d.fileId === item.fileId);
            if (idx !== -1) {
                data[idx].recamaras       = espacios.recamaras;
                data[idx].banos           = espacios.banos;
                data[idx].estacionamientos = espacios.estacionamientos;
                actualizados++;
                console.log(`  → rec:${espacios.recamaras} baños:${espacios.banos} est:${espacios.estacionamientos}`);
            }

            // Guardar progreso cada 5
            if (actualizados % 5 === 0) {
                fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
                console.log('  [progreso guardado]');
            }

        } catch (e) {
            console.log(`  ERROR: ${e.message}`);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\nListo. ${actualizados} registros actualizados.`);
}

main().catch(console.error);
