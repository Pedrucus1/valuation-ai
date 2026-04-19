const fs = require('fs');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

function cleanNumberString(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    const cleanStr = str.toString().replace(/[^0-9.-]+/g, "");
    return parseFloat(cleanStr) || 0;
}

function metodoNuevoEstricto(prop) {
    const factorNegociacion = 0.95; 
    let sumaValoresHomologados = 0;
    
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    prop.comparables.forEach(c => {
        let precio = cleanNumberString(c.precio);
        let constrComp = cleanNumberString(c.terreno); // El bot guarda la constr en 'terreno' 
        if (constrComp === 0) return;

        const precioUnitario = precio / constrComp;
        let factorSuperficie = Math.pow(constrComp / prop.construccion, 1/6); 
        let factorEdad = 1; 
        
        const precioHomologadoM2 = precioUnitario * factorNegociacion * factorSuperficie * factorEdad;
        sumaValoresHomologados += (precioHomologadoM2 * prop.construccion);
    });

    return sumaValoresHomologados / prop.comparables.length;
}

async function runValidation() {
    console.log("Cargando cerebro_datos.json...");
    const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));
    
    const validos = data.filter(d => 
        d.fileName && d.fileName.includes('-26-') && 
        d.valorMercado && d.valorMercado !== 'No hallado' &&
        cleanNumberString(d.valorMercado) > 0 &&
        cleanNumberString(d.m2Construccion) > 0 &&
        d.comparables && d.comparables.length >= 3
    );

    console.log(`Generando reporte para ${validos.length} avalúos válidos...`);
    
    const rows = [
        ['Archivo (Sujeto)', 'M2 Const', 'Valor Real Perito', 'Valor Nuevo Motor (100% Merc)', 'Diferencia %', '# Comparables']
    ];

    validos.forEach(d => {
        const prop = {
            construccion: cleanNumberString(d.m2Construccion),
            valorReal: cleanNumberString(d.valorMercado),
            comparables: d.comparables
        };
        
        const valorNuevo = Math.round(metodoNuevoEstricto(prop));
        if (valorNuevo > 0) {
            const diffPorcentaje = (((valorNuevo / prop.valorReal) - 1) * 100).toFixed(2) + '%';
            rows.push([
                d.fileName,
                prop.construccion,
                prop.valorReal,
                valorNuevo,
                diffPorcentaje,
                prop.comparables.length
            ]);
        }
    });

    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const targetSpreadsheetId = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
        
        console.log("Enviando resultados a Google Sheets...");
        
        // Asumiendo que usaremos la Hoja 2 para no borrar la Hoja 1
        await sheets.spreadsheets.values.update({
            spreadsheetId: targetSpreadsheetId,
            range: 'Hoja 2!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows },
        });
        
        console.log(`¡Exportación exitosa! Revisa la 'Hoja 2' en: https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`);
    } catch (err) {
        console.error("Error conectando a Sheets (Asegúrate de que la 'Hoja 2' exista):", err.message);
    }
}

runValidation();
