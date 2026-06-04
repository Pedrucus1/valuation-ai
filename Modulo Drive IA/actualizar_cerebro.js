/**
 * actualizar_cerebro.js
 * Actualización incremental mensual del cerebro_datos.json.
 *
 * Flujo:
 *   1. Detecta las 3 carpetas más recientes (mes actual + 2 anteriores)
 *   2. Escanea solo esas carpetas en Drive
 *   3. Corre el extractor solo sobre los archivos nuevos
 *   4. Reporta cuántos se agregaron
 *
 * Uso:
 *   node actualizar_cerebro.js          — escanea + extrae nuevos
 *   node actualizar_cerebro.js --solo-scan  — solo actualiza manifiesto, sin extraer
 *   node actualizar_cerebro.js --meses 6    — escanea últimos N meses (default: 3)
 */

require('dotenv').config({ path: '../.env' });

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const MANIFIESTO_PATH = path.join(__dirname, 'manifiesto_avaluos.json');
const CEREBRO_PATH    = path.join(__dirname, 'cerebro_datos.json');
const ROOT_FOLDER_ID  = '1MSqdSduhmzgwqTYrQYkZ-lOsezYmmqjz';

const soloScan = process.argv.includes('--solo-scan');
const mesesArg = process.argv.indexOf('--meses');
const MESES_A_ESCANEAR = mesesArg >= 0 ? parseInt(process.argv[mesesArg + 1], 10) || 3 : 3;

// Genera los combos año-mes de los últimos N meses (más reciente primero)
function ultimosMeses(n) {
    const combos = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        combos.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return combos;
}

// Verifica si un nombre de carpeta corresponde a un año-mes dado
// Formato esperado: "YYYY - M - nombreMes" (ej. "2026 - 5 - mayo")
function carpetaCoincide(folderName, year, month) {
    const pattern = new RegExp(`^${year}\\s*-\\s*${month}\\s*-`, 'i');
    return pattern.test(folderName.trim());
}

// Lista hojas OPI de una carpeta de mes. Soporta DOS estructuras:
//   (a) Vieja: hojas OPI sueltas directamente en la carpeta del mes.
//   (b) Nueva (desde ~abril 2026): cada avalúo es una subcarpeta `OPI-XX-YY/`
//       con la hoja adentro (+ PDFs, Fotos App, Pagos, etc.).
async function listarOpisEnCarpeta(drive, folderId) {
    const out = [];

    // (a) Hojas OPI directas (estructura plana)
    const planas = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    for (const f of planas.data.files.filter(f => f.name.toUpperCase().startsWith('OPI-'))) {
        out.push({ id: f.id, name: f.name });
    }

    // (b) Subcarpetas OPI-XX → buscar la hoja del avalúo dentro
    const subs = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    for (const sub of subs.data.files.filter(f => f.name.toUpperCase().startsWith('OPI-'))) {
        const inside = await drive.files.list({
            q: `'${sub.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        // La hoja suele llamarse igual que la subcarpeta (empieza con OPI); si no, tomar la 1ª hoja.
        const hoja = inside.data.files.find(f => f.name.toUpperCase().startsWith('OPI')) || inside.data.files[0];
        if (hoja) out.push({ id: hoja.id, name: hoja.name });
    }

    return out;
}

async function main() {
    console.log('=== Actualización Cerebro OPI ===');
    console.log('Fecha:', new Date().toLocaleString('es-MX'));
    console.log(`Escaneando últimos ${MESES_A_ESCANEAR} meses`);

    // 1. Auth
    const auth  = await googleSheetsConnector.authenticate();
    const drive = google.drive({ version: 'v3', auth });
    console.log('Auth OK');

    // 2. Obtener carpetas del root y filtrar por últimos N meses
    const meses = ultimosMeses(MESES_A_ESCANEAR);
    console.log('\nMeses a escanear:', meses.map(m => `${m.year}-${m.month}`).join(', '));

    const rootRes = await drive.files.list({
        q: `'${ROOT_FOLDER_ID}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    const carpetasTarget = rootRes.data.files.filter(folder =>
        meses.some(m => carpetaCoincide(folder.name, m.year, m.month))
    );

    if (carpetasTarget.length === 0) {
        console.log('⚠ No se encontraron carpetas para los meses seleccionados.');
        console.log('Carpetas disponibles:', rootRes.data.files.map(f => f.name).join(', '));
        return;
    }
    console.log('Carpetas encontradas:', carpetasTarget.map(f => f.name).join(', '));

    // 3. Listar OPIs en esas carpetas
    console.log('\nEscaneando archivos OPI...');
    let archivosEnDrive = [];
    for (const carpeta of carpetasTarget) {
        const opis = await listarOpisEnCarpeta(drive, carpeta.id);
        console.log(`  ${carpeta.name}: ${opis.length} OPIs`);
        archivosEnDrive = archivosEnDrive.concat(opis);
    }
    console.log(`Total archivos OPI encontrados: ${archivosEnDrive.length}`);

    // 3. Cargar manifiesto anterior y cerebro
    const manifestoAnterior = fs.existsSync(MANIFIESTO_PATH)
        ? JSON.parse(fs.readFileSync(MANIFIESTO_PATH, 'utf8'))
        : { files: [] };
    const idsAnteriores = new Set(manifestoAnterior.files.map(f => f.id));

    const cerebro = fs.existsSync(CEREBRO_PATH)
        ? JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'))
        : [];
    const idsProcesados = new Set(cerebro.map(r => r.fileId));

    // 4. Detectar nuevos
    const nuevos = archivosEnDrive.filter(f => !idsAnteriores.has(f.id));
    console.log(`\nArchivos nuevos vs manifiesto anterior: ${nuevos.length}`);
    if (nuevos.length > 0) {
        nuevos.forEach(f => console.log('  +', f.name.slice(0, 70)));
    }

    // 5. Actualizar manifiesto — merge con anteriores para no perder historial
    const todosLosIds = new Set(manifestoAnterior.files.map(f => f.id));
    const realesNuevos = archivosEnDrive.filter(f => !todosLosIds.has(f.id));
    const manifestoNuevo = {
        scanDate: new Date().toISOString(),
        rootFolderId: ROOT_FOLDER_ID,
        mesesEscaneados: meses,
        files: [...manifestoAnterior.files, ...realesNuevos]
    };
    fs.writeFileSync(MANIFIESTO_PATH, JSON.stringify(manifestoNuevo, null, 2));
    console.log(`Manifiesto actualizado: ${manifestoNuevo.files.length} archivos totales (+${realesNuevos.length} nuevos)`);

    if (soloScan) {
        console.log('\n--solo-scan: sin extracción. Listo.');
        return;
    }

    // 6. Extraer solo los que no están en el cerebro
    const porExtraer = archivosEnDrive.filter(f => !idsProcesados.has(f.id));
    console.log(`\nPor extraer (no en cerebro): ${porExtraer.length}`);

    if (porExtraer.length === 0) {
        console.log('El cerebro ya está al día. Sin cambios.');
        return;
    }

    console.log('\nIniciando extractor...');
    try {
        execSync('node extractor_masivo.js', {
            cwd: __dirname,
            stdio: 'inherit',
            timeout: 60 * 60 * 1000 // 1 hora max
        });
    } catch (e) {
        console.error('Error en extractor:', e.message);
    }

    // 7. Reporte final
    const cerebroFinal = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));
    const agregados = cerebroFinal.length - cerebro.length;
    console.log(`\n=== COMPLETADO ===`);
    console.log(`Cerebro: ${cerebro.length} → ${cerebroFinal.length} (+${agregados} nuevos)`);
    console.log(`Fecha próxima actualización sugerida: ${proximoMes()}`);
}

function proximoMes() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

main().catch(console.error);
