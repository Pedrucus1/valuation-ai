/**
 * recalcular_nse_desde_cache.js
 * Recomputa medianaPm2 en colonias_nse.json desde cache_consolidado.json LIMPIO.
 * Solo actualiza colonias con n>=5 en el caché. Colonias con n<5 quedan sin tocar.
 *
 * Uso: node recalcular_nse_desde_cache.js [--dry-run]
 *   --dry-run: muestra cambios sin escribir el archivo
 */

const fs   = require('fs');
const path = require('path');

const CACHE_PATH  = path.join(__dirname, 'cache_consolidado.json');
const NSE_PATH    = path.join(__dirname, 'colonias_nse.json');
const BAK_PATH    = path.join(__dirname, 'colonias_nse.json.bak');

const DRY_RUN = process.argv.includes('--dry-run');
const N_MIN   = 5;   // mínimo de comps para recomputar

// Categorías NSE — mismas que clasificar_colonias_nse.js
const NSE_CATEGORIAS = [
    { idx: 0, nombre: 'economico',      min: 0,      max: 9000      },
    { idx: 1, nombre: 'interes-social', min: 9000,   max: 14000     },
    { idx: 2, nombre: 'medio-bajo',     min: 14000,  max: 21000     },
    { idx: 3, nombre: 'medio-medio',    min: 21000,  max: 33000     },
    { idx: 4, nombre: 'medio-alto',     min: 33000,  max: 52000     },
    { idx: 5, nombre: 'lujo',           min: 52000,  max: 85000     },
    { idx: 6, nombre: 'super-lujo',     min: 85000,  max: Infinity  },
];

function clasificarNSE(medianaPm2) {
    return NSE_CATEGORIAS.find(c => medianaPm2 >= c.min && medianaPm2 < c.max)
        || NSE_CATEGORIAS[NSE_CATEGORIAS.length - 1];
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Normalización idéntica a clasificar_colonias_nse.js
function normalizarColonia(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function main() {
    // 1. Cargar caché y NSE actuales
    const { datos } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    const nseActual = JSON.parse(fs.readFileSync(NSE_PATH, 'utf8'));
    console.log(`Caché: ${datos.length.toLocaleString()} comps | NSE: ${Object.keys(nseActual).length} colonias`);

    // 2. Agrupar $/m²C por colonia normalizada
    const porColonia = {};
    let omitidos = 0;
    for (const d of datos) {
        if (!d.colonia || !d.precio || !d.m2c || d.m2c <= 0) { omitidos++; continue; }
        const pm2 = d.precio / d.m2c;
        if (pm2 <= 0 || pm2 > 300000) { omitidos++; continue; }  // outliers extremos
        const col = normalizarColonia(d.colonia);
        if (!col || col.length < 3) { omitidos++; continue; }
        if (!porColonia[col]) porColonia[col] = [];
        porColonia[col].push(pm2);
    }
    console.log(`Comps omitidos (sin colonia/precio/m2c): ${omitidos}`);
    console.log(`Colonias únicas en caché (normalizadas): ${Object.keys(porColonia).length}`);

    // 3. Para cada colonia en NSE, si n>=5 en caché → recomputar
    const nseNuevo = { ...nseActual };
    const cambios = [];
    let actualizadas = 0, sin_cambio = 0, sin_datos = 0;

    for (const [col, entryActual] of Object.entries(nseActual)) {
        const pm2s = porColonia[col];
        if (!pm2s || pm2s.length < N_MIN) {
            sin_datos++;
            continue;
        }

        // Eliminar outliers p10-p90 antes de calcular mediana
        const sorted = [...pm2s].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(sorted.length * 0.10)];
        const p90 = sorted[Math.floor(sorted.length * 0.90)];
        const filtrados = sorted.filter(v => v >= p10 && v <= p90);
        const pm2sLimpios = filtrados.length >= N_MIN ? filtrados : sorted;

        const med = Math.round(mediana(pm2sLimpios));
        const cat = clasificarNSE(med);

        const anteriorMed = entryActual.medianaPm2;
        const anteriorNse = entryActual.nse;
        const anteriorN   = entryActual.nListings;

        // Solo registrar si hay cambio significativo (>5% en mediana o cambio de categoría)
        const cambioPct = Math.abs(med - anteriorMed) / anteriorMed * 100;
        if (cambioPct < 1 && cat.nombre === anteriorNse) { sin_cambio++; continue; }

        nseNuevo[col] = {
            nse:        cat.nombre,
            nseIdx:     cat.idx,
            medianaPm2: med,
            nListings:  pm2s.length,
        };

        cambios.push({
            col, anteriorMed, anteriorN, anteriorNse,
            nuevaMed: med, nuevaN: pm2s.length, nuevaNse: cat.nombre,
            cambioPct: cambioPct.toFixed(1),
            nseFlip: cat.nombre !== anteriorNse,
        });
        actualizadas++;
    }

    console.log(`\nResumen:`);
    console.log(`  Actualizadas (n>=${N_MIN}, cambio>1%): ${actualizadas}`);
    console.log(`  Sin cambio significativo:              ${sin_cambio}`);
    console.log(`  Sin datos (n<${N_MIN}):                 ${sin_datos}`);

    // Ordenar cambios por |cambioPct| descendente
    cambios.sort((a, b) => parseFloat(b.cambioPct) - parseFloat(a.cambioPct));

    console.log(`\nCambios más significativos (top 20):`);
    cambios.slice(0, 20).forEach(c => {
        const flip = c.nseFlip ? ` ★NSE ${c.anteriorNse}→${c.nuevaNse}` : '';
        console.log(`  ${c.col.padEnd(30)} ${c.anteriorMed.toLocaleString().padStart(7)} → ${c.nuevaMed.toLocaleString().padStart(7)}  (${c.cambioPct}% | n:${c.anteriorN}→${c.nuevaN})${flip}`);
    });

    const nseFlips = cambios.filter(c => c.nseFlip);
    if (nseFlips.length > 0) {
        console.log(`\nColonias con cambio de categoría NSE (${nseFlips.length}):`);
        nseFlips.forEach(c => {
            console.log(`  ${c.col}: ${c.anteriorNse} (${c.anteriorMed}) → ${c.nuevaNse} (${c.nuevaMed})`);
        });
    }

    if (DRY_RUN) {
        console.log('\n[DRY RUN] No se escribió ningún archivo.');
        return;
    }

    // 4. Backup y escribir
    fs.writeFileSync(BAK_PATH, JSON.stringify(nseActual, null, 2));
    console.log(`\nBackup guardado: colonias_nse.json.bak`);

    fs.writeFileSync(NSE_PATH, JSON.stringify(nseNuevo, null, 2));
    console.log(`colonias_nse.json actualizado (${actualizadas} colonias recomputadas).`);
    console.log('\nSiguiente paso: node construir_maestro.js');
}

main();
