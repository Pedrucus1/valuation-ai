/**
 * completar_campos.js
 * Pasada única por archivo para completar campos faltantes:
 *   - tipo (busca "Tipo de Propiedad" por contexto)
 *   - municipio (busca en dirección del sheet si no está en cerebro)
 *   - direccion (si está vacía)
 *
 * Abre cada archivo UNA sola vez y sale.
 */

require('dotenv').config({ path: '../.env' });

const fs   = require('fs');
const path = require('path');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

const CEREBRO_PATH = path.join(__dirname, 'cerebro_datos.json');
const delay = ms => new Promise(r => setTimeout(r, ms));

function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT')), ms))]);
}

// Buscar etiqueta en sheet y devolver celda adyacente (derecha o fila siguiente)
function buscarPorEtiqueta(sheet, etiquetas) {
    if (!sheet) return null;
    const tags = etiquetas.map(e => e.toLowerCase());
    for (let r = 0; r < Math.min(sheet.length, 150); r++) {
        const row = sheet[r];
        if (!row) continue;
        for (let c = 0; c < Math.min(row.length, 40); c++) {
            const cell = String(row[c] || '').toLowerCase().trim();
            if (tags.some(t => cell.includes(t))) {
                // Buscar a la derecha
                for (let dc = 1; dc <= 6; dc++) {
                    const v = String(row[c + dc] || '').trim();
                    if (v && v.length > 1) return v;
                }
                // Buscar en fila siguiente misma columna
                const nextRow = sheet[r + 1];
                if (nextRow) {
                    for (let dc = 0; dc <= 3; dc++) {
                        const v = String(nextRow[c + dc] || '').trim();
                        if (v && v.length > 1) return v;
                    }
                }
            }
        }
    }
    return null;
}

function normalizarTipo(raw) {
    if (!raw) return null;
    const s = raw.toString().trim().toUpperCase();
    if (!s || s.length < 3) return null;
    // Excluir valores que son claramente no-tipo
    if (/^\d/.test(s) || s.includes('$') || s.includes('%')) return null;
    return s;
}

function extraerMunicipioDeDir(dir) {
    if (!dir || dir === 'No hallado') return '';
    const m1 = dir.match(/\d{5}\s+([A-Za-záéíóúÁÉÍÓÚñÑ\s]+?)(?:,|\.|\s*$)/);
    if (m1) return m1[1].trim().replace(/\s+de\s+Zu[nñ]iga/i, '').trim();
    const m2 = dir.match(/,\s*([^,]+?)\s*,\s*(?:Jal|Nayarit|Colima|Jalisco)/i);
    if (m2) return m2[1].trim().replace(/^\d{5}\s*/, '').replace(/\s+de\s+Zu[nñ]iga/i, '').trim();
    return '';
}

async function main() {
    const cerebro = JSON.parse(fs.readFileSync(CEREBRO_PATH, 'utf8'));

    // Solo procesar los que les falta tipo O municipio Y tienen valorMercado
    const pendientes = cerebro.filter(x =>
        x.fileId &&
        x.valorMercado && x.valorMercado !== 'No hallado' &&
        (!x.tipo || x.tipo === 'No hallado' || x.tipo === 'SIN_TIPO' || !x.municipio)
    );

    console.log(`Total cerebro: ${cerebro.length} | Pendientes completar: ${pendientes.length}`);

    const auth   = await withTimeout(googleSheetsConnector.authenticate(), 15000);
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Auth OK\n');

    let tipoFixed = 0, munFixed = 0, errors = 0;

    for (let i = 0; i < pendientes.length; i++) {
        const d = pendientes[i];
        console.log(`[${i+1}/${pendientes.length}] ${d.fileName.slice(0, 65)}...`);

        await delay(800);

        try {
            // Detectar tab principal
            const meta = await withTimeout(
                sheets.spreadsheets.get({ spreadsheetId: d.fileId }),
                12000
            );
            const allTabs = meta.data.sheets.map(s => s.properties.title);
            const mainTab = allTabs.find(t => {
                const u = t.toUpperCase();
                return u.includes('CONSTR') || u.includes('TERRENO') || u.includes('LOC COM') || u.includes('LOCAL');
            }) || allTabs.find(t => t.toUpperCase().startsWith('OPI'));

            if (!mainTab) { console.log('  Sin tab OPI'); continue; }

            // Leer área amplia de una sola vez
            const res = await withTimeout(
                sheets.spreadsheets.values.get({
                    spreadsheetId: d.fileId,
                    range: `'${mainTab}'!A1:AM150`
                }),
                12000
            );
            const sheet = res.data.values || [];

            // --- TIPO ---
            if (!d.tipo || d.tipo === 'No hallado' || d.tipo === 'SIN_TIPO') {
                const tipo = normalizarTipo(buscarPorEtiqueta(sheet, ['tipo de propiedad', 'tipo inmueble', 'tipo de inmueble']));
                if (tipo) {
                    d.tipo = tipo;
                    tipoFixed++;
                    console.log(`  ✓ tipo: ${tipo}`);
                }
            }

            // --- MUNICIPIO ---
            if (!d.municipio) {
                // 1. Intentar desde direccion ya guardada
                let mun = extraerMunicipioDeDir(d.direccion || '');
                // 2. Buscar dirección en el sheet si no la tenemos
                if (!mun) {
                    const dirSheet = buscarPorEtiqueta(sheet, ['dirección', 'direccion', 'domicilio', 'ubicación']);
                    if (dirSheet) mun = extraerMunicipioDeDir(dirSheet);
                }
                if (mun) {
                    d.municipio = mun;
                    munFixed++;
                    console.log(`  ✓ municipio: ${mun}`);
                }
            }

        } catch(e) {
            if (!e.message.includes('TIMEOUT')) {
                console.log(`  ✗ ${e.message.slice(0, 60)}`);
            } else {
                console.log('  ✗ Timeout');
            }
            errors++;
        }

        // Guardar cada 10
        if ((i + 1) % 10 === 0) {
            fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
            console.log(`  --- Guardado [${i+1}/${pendientes.length}] tipo:${tipoFixed} municipio:${munFixed} ---`);
        }
    }

    fs.writeFileSync(CEREBRO_PATH, JSON.stringify(cerebro, null, 2));
    console.log(`\n=== COMPLETADO === tipo:${tipoFixed} | municipio:${munFixed} | errores:${errors}`);
}

main().catch(console.error);
