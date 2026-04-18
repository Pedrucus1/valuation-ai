const googleSheetsConnector = require('../services/googleSheetsConnector');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractData() {
    console.log('--- Iniciando Extracción de Conocimiento Profunda ---');
    
    const manifestPath = path.join(__dirname, 'manifiesto_avaluos.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('No se encontró el manifiesto_avaluos.json. Ejecuta escanear_avaluos.js primero.');
        return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let results = [];
    const outputPath = path.join(__dirname, 'cerebro_datos.json');
    if (fs.existsSync(outputPath)) {
        results = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        console.log(`Resumiendo desde el archivo #${results.length + 1}...`);
    }

    let count = 0;
    const totalFiles = manifest.files.length;
    for (const file of manifest.files) {
        count++;
        // Saltar si ya lo procesamos
        if (results.some(r => r.fileId === file.id)) continue;

        console.log(`[${count}/${totalFiles}] Procesando: ${file.name}...`);
        try {
            // Evitar saturar la cuota de Google (60 req/min)
            await delay(4500); 

            // Obtener datos de varias pestañas secuencialmente con reintentos
            const tabsToTry = ['OPI Constr', 'OPI Terreno', 'OPI Loc Com ', 'Mercado'];
            const tabData = {};
            
            for (const tab of tabsToTry) {
                const range = tab === 'OPI Loc Com ' ? "'OPI Loc Com '!A1:Z100" : `${tab}!A1:Z100`;
                let success = false;
                let attempts = 0;
                
                while (!success && attempts < 3) {
                    try {
                        tabData[tab] = await googleSheetsConnector.getSpreadsheetData(file.id, range);
                        success = true;
                        await delay(2000); // 2s entre pestañas
                    } catch (err) {
                        if (err.message.includes('Quota exceeded')) {
                            console.log(`Cuota excedida. Esperando 30s para reintentar tab ${tab}...`);
                            await delay(30000); // Esperar medio minuto si hay bloqueo
                            attempts++;
                        } else {
                            tabData[tab] = null;
                            success = true; // Error no recuperable o pestaña inexistente
                        }
                    }
                }
            }

            const { 'OPI Constr': opiConstr, 'OPI Terreno': opiTerreno, 'OPI Loc Com ': opiLoc, Mercado: mercado } = tabData;
            const mainSheet = opiConstr || opiLoc || opiTerreno;

            const data = {
                fileId: file.id,
                fileName: file.name,
                fecha: findValueByLabel(mercado, 'Fecha', 0) || findValueByLabel(mainSheet, 'FECHA', 1),
                direccion: findValueByLabel(mainSheet, 'UBICACIÓN:', 4),
                folio: findValueByLabel(mainSheet, 'FOLIO', 4),
                tipo: findValueByLabel(mainSheet, 'TIPO DE PROPIEDAD:', 4),
                m2Terreno: findValueByLabel(opiTerreno || opiLoc, 'SUP. TERRENO', 8),
                m2Construccion: findValueByLabel(opiConstr || opiLoc, 'SUP. CONSTRUCCIONES', 8),
                valorMercado: findValueByLabel(mainSheet, 'VALOR VENTA ESTIMADO PROMEDIO', 10),
                edad: findValueByLabel(mainSheet, 'EDAD APROX.', 8),
                comparables: extractComparables(mercado)
            };

            results.push(data);

            // Guardado incremental cada 10 archivos para no perder progreso
            if (count % 10 === 0) {
                fs.writeFileSync(path.join(__dirname, 'cerebro_datos.json'), JSON.stringify(results, null, 2));
                console.log(`--- Progreso guardado (${count}/${totalFiles}) ---`);
            }

        } catch (error) {
            console.error(`Error procesando ${file.name}:`, error.message);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Extracción completada. Datos guardados en ${outputPath}`);
    
    // Generar Informe y sugerir exportación
    generateLearningReport(results);
}

function findValueByLabel(sheetData, label, minOffset = 1) {
    if (!sheetData) return 'N/A';
    for (let r = 0; r < sheetData.length; r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
            if (sheetData[r][c] && sheetData[r][c].toString().includes(label)) {
                // Buscar el primer valor no vacío a la derecha a partir del minOffset
                for (let i = c + minOffset; i < sheetData[r].length; i++) {
                    const val = sheetData[r][i];
                    if (val !== undefined && val !== null && val.toString().trim() !== '') {
                        return val;
                    }
                }
                // Si no hay nada a la derecha, probar una fila abajo
                if (sheetData[r+1] && sheetData[r+1][c]) return sheetData[r+1][c];
                return 'No hallado';
            }
        }
    }
    return 'No hallado';
}

function extractComparables(mercadoData) {
    const comparables = [];
    if (!mercadoData || mercadoData.length < 5) return [];
    
    // Basado en el formato visto anteriormente: headers en fila 3, datos en 4
    for (let i = 3; i < mercadoData.length; i++) {
        const row = mercadoData[i];
        if (row && (row[7] || row[9])) { 
            comparables.push({
                terreno: row[7],
                precio: row[9],
                link: row[13]
            });
        }
    }
    return comparables;
}

function generateLearningReport(data) {
    let report = `# 🧠 Informe de Aprendizaje Masivo (PropValu)\n\n`;
    report += `**Fecha:** ${new Date().toLocaleDateString()}\n`;
    report += `**Opiniones de Valor (OPI) procesadas:** ${data.length}\n\n`;
    
    report += `| Folio | Ubicación | Terreno (m2) | Const (m2) | Valor Mercado | Edad |\n`;
    report += `|-------|-----------|--------------|------------|---------------|------|\n`;
    
    data.forEach(item => {
        report += `| ${item.folio} | ${item.direccion} | ${item.m2Terreno} | ${item.m2Construccion} | ${item.valorMercado} | ${item.edad} |\n`;
    });

    report += `\n## 💡 Próximo Paso\n`;
    report += `Ejecutar \`node Modulo Drive IA/exportador_resumen.js\` para generar el Google Sheet consolidado.\n`;

    const reportPath = path.join(__dirname, 'INFORME_APRENDIZAJE.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Informe generado en ${reportPath}`);
}

extractData();

