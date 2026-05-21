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

    // Procesar TODOS los años del manifiesto (2022-2026)
    const todosLosArchivos = manifest.files;
    console.log(`Procesando ${todosLosArchivos.length} avalúos de todos los años...`);
    const force = process.argv.includes('--force');
    if (force) { results = []; console.log('  --force: limpiando cerebro_datos.json'); }

    const procesados = new Set(results.map(r => r.fileId));
    let count = 0;
    const totalFiles = todosLosArchivos.length;

    for (const file of todosLosArchivos) {
        count++;
        if (procesados.has(file.id)) continue;

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

            const tabsToTry = allTabs.filter(t => t.toUpperCase().includes('MERCADO') || t.toUpperCase().startsWith('OPI') || t.toUpperCase().includes('QUERY')).slice(0, 9);
            
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
                sujetoColonia: extraerColoniaDeNombre(file.name),
                municipio: extraerMunicipioDeNombre(file.name),
                comparables: extractComparables(mercado)
            };

            // Identificar qué pestaña base usar revisando si tiene valores en sus celdas principales
            let activeTab = null;
            let activeTabName = '';
            let maxValor = 0;
            let firstOpiTab = null; // fallback: primer tab OPI que no sea MERCADO/QUERY

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

                // Guardar primer tab OPI no-mercado como fallback
                if (upperTab.startsWith('OPI') && !upperTab.includes('QUERY') && !firstOpiTab) {
                    firstOpiTab = { sheet, name: tab };
                }

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
                const queryTab = tabData[Object.keys(tabData).find(t => t.toUpperCase().includes('QUERY')) || ''] || null;
                const espacios = extractEspacios(activeTab, queryTab);
                Object.assign(finalData, {
                    folio: getCell(activeTab, c.folio.r, c.folio.c),
                    tipo: getCell(activeTab, c.tipo.r, c.tipo.c),
                    direccion: getCell(activeTab, c.dir.r, c.dir.c),
                    valorMercado: getCell(activeTab, c.valor.r, c.valor.c),
                    m2Terreno: getCell(activeTab, c.terr.r, c.terr.c),
                    m2Construccion: getCell(activeTab, c.const.r, c.const.c),
                    edad: getCell(activeTab, c.edad.r, c.edad.c),
                    valorM2Aplicable: getCell(activeTab, c.valM2.r, c.valM2.c),
                    recamaras: espacios.recamaras,
                    banos: espacios.banos,
                    estacionamientos: espacios.estacionamientos
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
            } else if (firstOpiTab) {
                // Fallback: OPI con tab de nombre no estándar — tratar como CONSTR
                const c = coords['OPI CONSTR'];
                const sheet = firstOpiTab.sheet;
                const queryTab = tabData[Object.keys(tabData).find(t => t.toUpperCase().includes('QUERY')) || ''] || null;
                const espacios = extractEspacios(sheet, queryTab);
                Object.assign(finalData, {
                    folio:            getCell(sheet, c.folio.r, c.folio.c),
                    tipo:             getCell(sheet, c.tipo.r, c.tipo.c),
                    direccion:        getCell(sheet, c.dir.r, c.dir.c),
                    valorMercado:     getCell(sheet, c.valor.r, c.valor.c),
                    m2Terreno:        getCell(sheet, c.terr.r, c.terr.c),
                    m2Construccion:   getCell(sheet, c.const.r, c.const.c),
                    edad:             getCell(sheet, c.edad.r, c.edad.c),
                    valorM2Aplicable: getCell(sheet, c.valM2.r, c.valM2.c),
                    recamaras:        espacios.recamaras,
                    banos:            espacios.banos,
                    estacionamientos: espacios.estacionamientos,
                    _tabFallback:     firstOpiTab.name,
                });
            } else {
                // Sin ningún tab OPI reconocible
                finalData.folio = 'No hallado';
                finalData.valorMercado = 'No hallado';
            }

            // Normalizar tipo a mayúsculas para comparaciones consistentes
            if (finalData.tipo && finalData.tipo !== 'No hallado') {
                finalData.tipo = finalData.tipo.toString().toUpperCase().trim();
            }

            // Extraer estado de conservación inline (evita correr extraer_conservacion.js aparte)
            finalData.estadoConservacion = extraerConservacionDeSheet(activeTab || (firstOpiTab?.sheet), finalData.tipo);

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

// Extrae recámaras, baños y estacionamientos del sujeto usando dos estrategias:
// 1. OPI Constr: col0=cantidad, col1=label (filas 56-70)
// 2. Query_Formato: col0=label, col1=cantidad (filas 85-95) — fallback cuando OPI Constr no tiene número
function extractEspacios(constrSheet, querySheet) {
    const result = { recamaras: null, banos: null, estacionamientos: null };

    // Estrategia 1: OPI Constr — cantidad en col0, label en col1
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

    // Estrategia 2: Query_Formato — label en col0, cantidad en col1 (filas 85-95)
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

// Extrae municipio del nombre del archivo OPI
// Formato: "OPI-26-4-09-AV Calle 5, Colonia, 45185 Municipio, Jal."  → "Municipio"
function extraerMunicipioDeNombre(fileName) {
    // Eliminar estado al final: ", Jal." / ", Jalisco" / ", Nayarit" etc.
    const sinEstado = fileName.replace(/,\s*(?:Jal\.?|Jalisco|Nayarit|Colima|Michoacán?)\s*\.?\s*$/i, '').trim();
    // Último segmento separado por coma, sin CP
    const partes = sinEstado.split(',');
    if (partes.length < 2) return '';
    const raw = partes[partes.length - 1].trim().replace(/^\d{5}\s*/, '');
    // Limpiar sufijos comunes de municipios largos
    return raw.replace(/\s+de\s+Zu[nñ]iga/i, '')
              .replace(/\s+de\s+Morelos/i, '')
              .trim();
}

// Extrae estado de conservación directamente de la hoja activa
// Celdas: OPI Constr X48:AA48, fallback W86:Z86
function extraerConservacionDeSheet(sheet, tipo) {
    if (!sheet) return null;
    const tipoUp = (tipo || '').toUpperCase();
    const isTerreno = tipoUp.includes('TERRENO') || tipoUp.includes('LOTE');

    // Rangos de filas/cols a revisar (0-indexed)
    const rangos = isTerreno
        ? [[87, 21, 24], [47, 23, 27]]   // V88:X88 / X48:AA48
        : [[47, 23, 27], [85, 22, 26]];  // X48:AA48 / W86:Z86

    for (const [row, cStart, cEnd] of rangos) {
        const r = sheet[row];
        if (!r) continue;
        for (let c = cStart; c <= cEnd; c++) {
            const estado = normalizarEstadoConservacion(r[c]);
            if (estado) return estado;
        }
    }
    return null;
}

function normalizarEstadoConservacion(raw) {
    if (!raw) return null;
    const s = raw.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').trim();
    if (s.includes('nuevo') || s.includes('excelente'))    return 'nuevo';
    if (s.includes('muy bueno') || s.includes('muybueno')) return 'muy_bueno';
    if (s.includes('regular') && s.includes('bueno'))      return 'regular_bueno';
    if (s.includes('regular') && s.includes('malo'))       return 'regular_malo';
    if (s.includes('regular'))                             return 'regular_medio';
    if (s.includes('bueno'))                               return 'bueno';
    if (s.includes('muy malo'))                            return 'muy_malo';
    if (s.includes('malo') || s.includes('deteriorad'))    return 'malo';
    return null;
}

// Extrae colonia del nombre del archivo OPI
// Formato: "OPI-26-4-09-AV Calle 5, Colonia Nombre, 45185 Municipio, Jal."
function extraerColoniaDeNombre(fileName) {
    const partes = fileName.split(',');
    if (partes.length < 2) return '';
    const raw = partes[1].trim()
        .replace(/^\d{5}\s*/, '')            // quitar CP si está primero
        .replace(/^col\.\s*/i, '')           // quitar "Col." (con punto, no "Colon")
        .replace(/^fracc\.\s*/i, '')         // quitar "Fracc."
        .replace(/^residencial\s+/i, '');
    return raw.trim();
}

// Extrae colonia de URL de portal inmobiliario
function extraerColoniaDeURL(url) {
    if (!url || !url.startsWith('http')) return '';
    try {
        // casasyterrenos.com: .../tipo-venta-calle-colonia-COLONIA-municipio-jal-id
        const m1 = url.match(/colonia-([a-z0-9-]+?)-(?:[a-z]+-){0,2}jal/i);
        if (m1) return m1[1].replace(/-/g, ' ').trim();
        // inmuebles24: .../propiedades/tipo-en-COLONIA-municipio
        const m2 = url.match(/propiedades\/[^/]+-en-([a-z0-9-]+?)(?:-zapopan|-guadalajara|-tlaquepaque|-tlajomulco|-tonala|-jalisco)/i);
        if (m2) return m2[1].replace(/-/g, ' ').trim();
        // vivanuncios/lamudi: /estado/municipio/colonia/
        const m3 = url.match(/jalisco\/[^/]+\/([^/]+)\/(?:casas|departamentos|terrenos)/i);
        if (m3) return m3[1].replace(/-/g, ' ').trim();
    } catch(e) {}
    return '';
}

function extractComparables(mercadoData) {
    const comparables = [];
    if (!mercadoData || mercadoData.length < 5) return [];

    for (let i = 3; i < mercadoData.length; i++) {
        const row = mercadoData[i];
        if (!row) continue;

        // precio (col J = índice 9) debe ser número > 10,000
        const precioRaw = String(row[9] || '').replace(/[^0-9.-]/g, '');
        const precio = parseFloat(precioRaw);
        if (!precio || precio < 10000) continue;

        const terreno     = parseFloat(String(row[7] || '').replace(/[^0-9.-]/g, '')) || 0;
        const construccion = parseFloat(String(row[8] || '').replace(/[^0-9.-]/g, '')) || 0;
        const link        = String(row[13] || '').trim();

        // Colonia: intentar columna G (índice 6), luego URL
        const coloniaCol = String(row[6] || '').trim()
            .replace(/^col\.?\s*/i, '').replace(/^fracc\.?\s*/i, '');
        const colonia = (coloniaCol.length > 3 && !/^\d/.test(coloniaCol))
            ? coloniaCol
            : extraerColoniaDeURL(link);

        comparables.push({ terreno, construccion, precio, colonia, link });
    }
    return comparables;
}

extractData();
