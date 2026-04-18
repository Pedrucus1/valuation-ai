/**
 * SCRIPT DE MANTENIMIENTO SEMANAL - PROPVALU IA
 * 
 * Instrucciones:
 * 1. Abre tu Google Sheet "Base Datos Avaluos con IA".
 * 2. Ve a Extensiones > Apps Script.
 * 3. Borra todo y pega este código.
 * 4. Haz clic en el icono del reloj (Activadores) a la izquierda.
 * 5. Añade un activador: "syncWeekly", "Basado en el tiempo", "Temporizador semanal", "Cada lunes".
 */

function syncWeekly() {
  const FOLDER_ID = '1MSqdSduhmzgwqTYrQYkZ-lOsezYmmqjz';
  const folder = DriveApp.getFolderById(FOLDER_ID);
  
  // Buscar archivos modificados en los últimos 8 días (para cubrir la semana)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 8);
  
  console.log("Buscando archivos nuevos desde: " + lastWeek.toLocaleDateString());
  
  const files = listFilesRecursive(folder, lastWeek);
  console.log("Archivos detectados: " + files.length);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; // La primera hoja
  
  const existingFolios = sheet.getRange("B:B").getValues().flat();
  
  files.forEach(file => {
    try {
      const doc = SpreadsheetApp.openById(file.getId());
      const data = extractDataFromDoc(doc);
      
      if (!existingFolios.includes(data.folio)) {
        sheet.appendRow([
          data.fecha,
          data.folio,
          data.direccion,
          data.tipo,
          data.m2Terreno,
          data.m2Construccion,
          data.valorMercado,
          data.edad,
          file.getUrl()
        ]);
        console.log("Añadido: " + data.folio);
      } else {
        console.log("Saltado (Ya existe): " + data.folio);
      }
    } catch (e) {
      console.error("Error en " + file.getName() + ": " + e.message);
    }
  });
}

function listFilesRecursive(folder, sinceDate) {
  let results = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith("OPI") && file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      if (file.getLastUpdated() > sinceDate) {
        results.push(file);
      }
    }
  }
  
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    results = results.concat(listFilesRecursive(subfolders.next(), sinceDate));
  }
  return results;
}

function extractDataFromDoc(ss) {
  // Intentar obtener de varias pestañas como en el bot local
  const opiConstr = ss.getSheetByName("OPI Constr");
  const opiLoc = ss.getSheetByName("OPI Loc Com ");
  const opiTerreno = ss.getSheetByName("OPI Terreno");
  const mercado = ss.getSheetByName("Mercado");
  
  const mainSheet = opiConstr || opiLoc || opiTerreno;
  if (!mainSheet) throw new Error("No se encontró pestaña de datos");

  const data = {
    fecha: getValueByLabel(mercado, "Fecha") || getValueByLabel(mainSheet, "FECHA"),
    folio: getValueByLabel(mainSheet, "FOLIO"),
    direccion: getValueByLabel(mainSheet, "UBICACIÓN:"),
    tipo: getValueByLabel(mainSheet, "TIPO DE PROPIEDAD:"),
    m2Terreno: getValueByLabel(opiTerreno || opiLoc, "SUP. TERRENO"),
    m2Construccion: getValueByLabel(opiConstr || opiLoc, "SUP. CONSTRUCCIONES"),
    valorMercado: getValueByLabel(mainSheet, "VALOR VENTA ESTIMADO PROMEDIO"),
    edad: getValueByLabel(mainSheet, "EDAD APROX.")
  };
  
  return data;
}

function getValueByLabel(sheet, label) {
  if (!sheet) return "";
  const values = sheet.getDataRange().getValues();
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (values[r][c] && values[r][c].toString().includes(label)) {
        // Buscar a la derecha
        for (let i = c + 1; i < values[r].length; i++) {
          if (values[r][i] && values[r][i].toString().trim() !== "") return values[r][i];
        }
      }
    }
  }
  return "";
}
