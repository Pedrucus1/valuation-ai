const googleSheetsConnector = require('../services/googleSheetsConnector');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractData() {
    console.log('--- Iniciando Extracción de Conocimiento Profunda (Modo Inteligente) ---');
    
    const manifestPath = path.join(__dirname, 'manifiesto_avaluos.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('No se encontró el manifiesto_avaluos.json.');
        return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let results = [];
    const outputPath = path.join(__dirname, 'cerebro_datos.json');
    if (fs.existsSync(outputPath)) {
        results = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    }

    // REGLA DEL USUARIO: Escaneo escalonado terminado. Ahora procesaremos TODO el año 2026.
    const archivos2026 = manifest.files.filter(f => f.name.includes('-26-'));
    console.log(`Enfocándose estrictamente en procesar la totalidad de los ${archivos2026.length} avalúos de 2026 con coordenadas de precisión...`);

    let count = 0;
    const totalFiles = archivos2026.length;
    
    for (const file of archivos2026) {
        count++;
        if (results.some(r => r.fileId === file.id)) continue;

        console.log(`[${count}/${totalFiles}] Procesando: ${file.name}...`);
        try {
            await delay(4500); 

            // FETCH DYNAMIC TABS (OPTION B)
            const auth = await googleSheetsConnector.authenticate();
            const sheets = require('googleapis').google.sheets({ version: 'v4', auth });
            
            let allTabs = [];
            let metaAttempts = 0;
            while(metaAttempts < 2) {
                try {
                    const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
                    allTabs = meta.data.sheets.map(s => s.properties.title);
                    break;
                } catch(e) {
                    if(e.message.includes('Quota')) {
                        await delay(20000);
                        metaAttempts++;
                    } else {
                        break;
                    }
                }
            }

            const tabsToTry = allTabs.filter(t => t.toUpperCase().includes('MERCADO') || t.toUpperCase().startsWith('OPI')).slice(0, 8);
            
            const tabData = {};
            for (const tab of tabsToTry) {
                const range = `'${tab}'!A1:AM250`; // Ampliado para cubrir Z212 y AE39
                let success = false;
                let attempts = 0;
                
                while (!success && attempts < 2) {
                    try {
                        const data = await googleSheetsConnector.getSpreadsheetData(file.id, range);
                        if (data) tabData[tab] = data;
                        success = true;
                        await delay(1500); 
                    } catch (err) {
                        if (err.message.includes('Quota')) {
                            await delay(20000); 
                            attempts++;
                        } else {
                            success = true; 
                        }
                    }
                }
            }

            const mercado = tabData['Mercado'] || tabData['MERCADO'] || [];
            
            // FUNCIÓN HELPER: Obtener valor por coordenada (Fila, Columna) - 0-indexed
            const getCell = (sheet, r, c) => (sheet && sheet[r] && sheet[r][c]) ? sheet[r][c] : 'No hallado';
            
            // Limpiador numérico estricto
            const getCleanNum = (val) => {
                if (!val || val === 'No hallado') return 0;
                const str = val.toString();
                if (str.includes('DIV/0') || str.includes('REF')) return 0;
                const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
                return isNaN(num) ? 0 : num;
            };

            let finalData = {
                fileId: file.id,
                fileName: file.name,
                fecha: findValueByLabel(mercado, ['Fecha'], 1),
                comparables: extractComparables(mercado)
            };

            // Identificar qué pestaña base usar revisando si tiene valores en sus celdas principales
            let activeTab = null;
            let activeTabName = '';
            let maxValor = 0;

            // Mapeo de coordenadas según el experto
            // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, Q=16, W=22, Z=25, AE=30
            const coords = {
                'OPI CONSTR': {
                    folio: {r: 5, c: 4}, tipo: {r: 7, c: 4}, dir: {r: 9, c: 4},
                    valor: {r: 39, c: 3}, terr: {r: 51, c: 8}, const: {r: 53, c: 8},
                    edad: {r: 49, c: 22}, valM2: {r: 211, c: 25}
                },
                'OPI TERRENO': {
                    folio: {r: 5, c: 4}, tipo: {r: 7, c: 4}, dir: {r: 9, c: 3},
                    // Usaremos el de construccion + accesoria como maximo si existe, si no los demas
                    valPuro: {r: 38, c: 3}, valCon: {r: 38, c: 16}, valConAcc: {r: 38, c: 30},
                    terr: {r: 50, c: 8}, const: {r: 52, c: 8}, valM2Terr: {r: 57, c: 8},
                    edad: {r: 87, c: 0}
                },
                'OPI LOC COM': {
                    folio: {r: 5, c: 4}, tipo: {r: 7, c: 4}, dir: {r: 9, c: 4},
                    valor: {r: 39, c: 3}, terr: {r: 49, c: 7}, const: {r: 50, c: 7},
                    edad: {r: 48, c: 22}, niveles: {r: 47, c: 8}
                }
            };

            for (const tab of Object.keys(tabData)) {
                const upperTab = tab.toUpperCase();
                if (upperTab.includes('MERCADO')) continue;
                
                const sheet = tabData[tab];
                let currentVal = 0;
                
                if (upperTab.includes('CONSTR')) {
                    currentVal = getCleanNum(getCell(sheet, coords['OPI CONSTR'].valor.r, coords['OPI CONSTR'].valor.c));
                    if (currentVal > 1000 && currentVal > maxValor) {
                        maxValor = currentVal; activeTab = sheet; activeTabName = 'OPI CONSTR';
                    }
                } else if (upperTab.includes('TERRENO')) {
                    const v1 = getCleanNum(getCell(sheet, coords['OPI TERRENO'].valPuro.r, coords['OPI TERRENO'].valPuro.c));
                    const v2 = getCleanNum(getCell(sheet, coords['OPI TERRENO'].valCon.r, coords['OPI TERRENO'].valCon.c));
                    const v3 = getCleanNum(getCell(sheet, coords['OPI TERRENO'].valConAcc.r, coords['OPI TERRENO'].valConAcc.c));
                    currentVal = Math.max(v1, v2, v3);
                    if (currentVal > 1000 && currentVal > maxValor) {
                        maxValor = currentVal; activeTab = sheet; activeTabName = 'OPI TERRENO';
                    }
                } else if (upperTab.includes('LOC COM') || upperTab.includes('LOCAL')) {
                    currentVal = getCleanNum(getCell(sheet, coords['OPI LOC COM'].valor.r, coords['OPI LOC COM'].valor.c));
                    if (currentVal > 1000 && currentVal > maxValor) {
                        maxValor = currentVal; activeTab = sheet; activeTabName = 'OPI LOC COM';
                    }
                }
            }

            if (activeTab && activeTabName === 'OPI CONSTR') {
                const c = coords['OPI CONSTR'];
                Object.assign(finalData, {
                    folio: getCell(activeTab, c.folio.r, c.folio.c),
                    tipo: getCell(activeTab, c.tipo.r, c.tipo.c),
                    direccion: getCell(activeTab, c.dir.r, c.dir.c),
                    valorMercado: getCell(activeTab, c.valor.r, c.valor.c),
                    m2Terreno: getCell(activeTab, c.terr.r, c.terr.c),
                    m2Construccion: getCell(activeTab, c.const.r, c.const.c),
                    edad: getCell(activeTab, c.edad.r, c.edad.c),
                    valorM2Aplicable: getCell(activeTab, c.valM2.r, c.valM2.c)
                });
            } else if (activeTab && activeTabName === 'OPI TERRENO') {
                const c = coords['OPI TERRENO'];
                const v1 = getCleanNum(getCell(activeTab, c.valPuro.r, c.valPuro.c));
                const v2 = getCleanNum(getCell(activeTab, c.valCon.r, c.valCon.c));
                const v3 = getCleanNum(getCell(activeTab, c.valConAcc.r, c.valConAcc.c));
                
                // Priorizar el valor más complejo si existe
                let finalValor = getCell(activeTab, c.valPuro.r, c.valPuro.c);
                if (v3 > 0) finalValor = getCell(activeTab, c.valConAcc.r, c.valConAcc.c);
                else if (v2 > 0) finalValor = getCell(activeTab, c.valCon.r, c.valCon.c);

                Object.assign(finalData, {
                    folio: getCell(activeTab, c.folio.r, c.folio.c),
                    tipo: getCell(activeTab, c.tipo.r, c.tipo.c),
                    direccion: getCell(activeTab, c.dir.r, c.dir.c),
                    valorMercado: finalValor,
                    m2Terreno: getCell(activeTab, c.terr.r, c.terr.c),
                    m2Construccion: getCell(activeTab, c.const.r, c.const.c),
                    valorM2Terreno: getCell(activeTab, c.valM2Terr.r, c.valM2Terr.c),
                    edad: getCell(activeTab, c.edad.r, c.edad.c)
                });
            } else if (activeTab && activeTabName === 'OPI LOC COM') {
                const c = coords['OPI LOC COM'];
                Object.assign(finalData, {
                    folio: getCell(activeTab, c.folio.r, c.folio.c),
                    tipo: getCell(activeTab, c.tipo.r, c.tipo.c),
                    direccion: getCell(activeTab, c.dir.r, c.dir.c),
                    valorMercado: getCell(activeTab, c.valor.r, c.valor.c),
                    m2Terreno: getCell(activeTab, c.terr.r, c.terr.c),
                    m2Construccion: getCell(activeTab, c.const.r, c.const.c),
                    edad: getCell(activeTab, c.edad.r, c.edad.c),
                    niveles: getCell(activeTab, c.niveles.r, c.niveles.c)
                });
            } else {
                // Fallback si no fue ninguna de las 3 principales (ej. Bodega)
                finalData.folio = 'No hallado';
                finalData.valorMercado = 'No hallado';
            }

            results.push(finalData);

            if (count % 5 === 0) {
                fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
                console.log(`--- Progreso guardado ---`);
            }

        } catch (error) {
            console.error(`Error procesando ${file.name}:`, error.message);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Extracción de 2026 completada. Datos guardados en ${outputPath}`);
}

function findValueByLabel(sheetData, labels, minOffset = 1, requireNumber = false) {
    if (!sheetData) return 'No hallado';
    const labelArray = Array.isArray(labels) ? labels : [labels];
    
    for (let r = 0; r < sheetData.length; r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
            const cellValue = sheetData[r][c] ? sheetData[r][c].toString().toUpperCase() : '';
            if (labelArray.some(l => cellValue.includes(l.toUpperCase()))) {
                for (let i = c + minOffset; i < sheetData[r].length; i++) {
                    const val = sheetData[r][i];
                    if (val !== undefined && val !== null && val.toString().trim() !== '') {
                        if (requireNumber) {
                            const strVal = val.toString();
                            if (/\d/.test(strVal)) {
                                const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ""));
                                // REGLA: Ignorar 0.00 (plantilla vacía) y 2026 (año confundido con Edad)
                                if (!isNaN(num) && num > 0 && num !== 2026) {
                                    return val;
                                }
                            }
                        } else {
                            return val;
                        }
                    }
                }
            }
        }
    }
    return 'No hallado';
}

function extractComparables(mercadoData) {
    const comparables = [];
    if (!mercadoData || mercadoData.length < 5) return [];
    
    for (let i = 3; i < mercadoData.length; i++) {
        const row = mercadoData[i];
        if (row && (row[7] || row[9])) { 
            comparables.push({
                terreno: row[7],
                construccion: row[8],
                precio: row[9],
                link: row[13]
            });
        }
    }
    return comparables;
}

extractData();
