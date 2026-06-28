/**
 * scan_junio.js — Escanea la carpeta de junio 2026 y captura
 * TODAS las hojas de cálculo dentro de carpetas OPI-26-6-XX.
 * Agrega los resultados al manifiesto existente.
 */
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const MANIFIESTO = path.join(__dirname, 'manifiesto_avaluos.json');

async function getSheets(drive, folderId, folderName) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const sheets = res.data.files.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');
  return sheets.map(s => ({ ...s, _parentFolder: folderName }));
}

async function scanJunio() {
  const auth = await googleSheetsConnector.authenticate();
  const drive = google.drive({ version: 'v3', auth });

  // Buscar carpeta "2026 - 6" dentro del root
  const rootId = '1MSqdSduhmzgwqTYrQYkZ-lOsezYmmqjz';
  const rootRes = await drive.files.list({
    q: `'${rootId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const junFolder = rootRes.data.files.find(f => f.name.includes('6') && f.name.includes('2026') || f.name.match(/jun/i));
  if (!junFolder) { console.log('Carpetas:', rootRes.data.files.map(f=>f.name)); throw new Error('No encontré carpeta de junio'); }
  console.log('Carpeta junio:', junFolder.name, junFolder.id);

  // Listar subcarpetas OPI dentro de junio
  const junRes = await drive.files.list({
    q: `'${junFolder.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const opifolders = junRes.data.files.filter(f => f.name.toUpperCase().startsWith('OPI'));
  console.log(`Carpetas OPI en junio: ${opifolders.length}`);
  opifolders.forEach(f => console.log(' -', f.name));

  // Para cada carpeta OPI, buscar spreadsheets
  const found = [];
  for (const folder of opifolders) {
    const sheets = await getSheets(drive, folder.id, folder.name);
    if (sheets.length) {
      console.log(`  ${folder.name}: ${sheets.length} hoja(s) → ${sheets.map(s=>s.name).join(', ')}`);
      // Use folder name as canonical name if sheet name is generic
      sheets.forEach(s => {
        if (!s.name.toUpperCase().startsWith('OPI')) s.name = folder.name;
        found.push(s);
      });
    } else {
      console.log(`  ${folder.name}: sin hojas`);
    }
  }

  console.log(`\nTotal nuevas hojas encontradas: ${found.length}`);

  // Merge into manifiesto
  const manifest = JSON.parse(fs.readFileSync(MANIFIESTO, 'utf8'));
  const existingIds = new Set(manifest.files.map(f => f.id));
  let added = 0;
  for (const f of found) {
    if (!existingIds.has(f.id)) {
      manifest.files.push(f);
      added++;
      console.log('+ Agregado:', f.name);
    } else {
      console.log('= Ya existe:', f.name);
    }
  }
  manifest.scanDate = new Date().toISOString();
  fs.writeFileSync(MANIFIESTO, JSON.stringify(manifest, null, 2));
  console.log(`\nManifiesto actualizado: +${added} nuevas | total: ${manifest.files.length}`);
}

scanJunio().catch(e => console.error('ERROR:', e.message));
