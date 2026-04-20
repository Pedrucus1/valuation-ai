const g = require('../services/googleSheetsConnector');
const fileId = '1E3EiNLz__LOtJcYyG34hqWxmnm1CgFXiXr80OCznLxQ';

async function run(){
    const auth = await g.authenticate();
    const {google} = require('googleapis');
    const sheets = google.sheets({version:'v4', auth});
    
    // Buscamos la tabla de homologación en OPI Terreno u OPI Constr
    // Generalmente está entre las filas 45 y 70 o 180 y 210 dependiendo del formato
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "'OPI Terreno'!A40:Z80"
    });
    
    console.log('--- TABLA DE HOMOLOGACIÓN (OPI Terreno) ---');
    if (res.data.values) {
        res.data.values.forEach((row, i) => {
            console.log(i + 40, row.join(' | '));
        });
    } else {
        console.log('No se encontró la tabla en el rango A40:Z80 de OPI Terreno');
    }
}
run();
