/**
 * construir_nse_v2.js
 * Construye colonias_nse_v2.json usando IDX[muni]['casa'] en lugar de
 * cache_consolidado (que mezcla todos los tipos).
 *
 * Mejoras vs v1:
 *  - Solo usa listings de tipo='casa' → evita contaminación de terrenos/bodegas
 *  - Filtra m²C > 300 (ninguna casa residencial lo supera; elimina industriales
 *    mal etiquetados como 'casa' en el scraper)
 *  - Fallback: colonias con <3 casas quedan sin entrada → motor usa v1
 *
 * Salida: colonias_nse_v2.json
 *   { "jardines de la calera": { nse, nseIdx, medianaPm2, nListings, fuente:'idx-casa' }, ... }
 */

const fs   = require('fs');
const path = require('path');

const IDX_PATH    = path.join(__dirname, 'cache_index.json');
const NSE_V1_PATH = path.join(__dirname, 'colonias_nse.json');
const OUT_PATH    = path.join(__dirname, 'colonias_nse_v2.json');

const M2C_MAX_RESIDENCIAL = 300; // m²C máximo para una casa residencial
const MIN_LISTINGS        = 3;   // mínimo para calcular mediana confiable
const VENTANA_MESES       = 18;  // ventana deslizante: solo listings de los últimos N meses

const NSE_CATEGORIAS = [
    { idx: 0, nombre: 'economico',      min: 0,      max: 9000     },
    { idx: 1, nombre: 'interes-social', min: 9000,   max: 14000    },
    { idx: 2, nombre: 'medio-bajo',     min: 14000,  max: 21000    },
    { idx: 3, nombre: 'medio-medio',    min: 21000,  max: 33000    },
    { idx: 4, nombre: 'medio-alto',     min: 33000,  max: 52000    },
    { idx: 5, nombre: 'lujo',           min: 52000,  max: 85000    },
    { idx: 6, nombre: 'super-lujo',     min: 85000,  max: Infinity },
];

function clasificarNSE(pm2) {
    return NSE_CATEGORIAS.find(c => pm2 >= c.min && pm2 < c.max)
        || NSE_CATEGORIAS[NSE_CATEGORIAS.length - 1];
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Devuelve true si el listing está dentro de la ventana temporal.
// Listings sin fecha (fs=null) se incluyen como fallback si no hay suficientes recientes.
function dentroDeVentana(fs) {
    if (!fs) return false;
    const mesesAtras = (Date.now() - new Date(fs).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return mesesAtras <= VENTANA_MESES;
}

function main() {
    const idx  = JSON.parse(fs.readFileSync(IDX_PATH,    'utf8'));
    const nseV1 = JSON.parse(fs.readFileSync(NSE_V1_PATH, 'utf8'));

    const resultado = {};
    let totalCols = 0, totalListings = 0, descartados = 0;
    let usandoVentana = 0, usandoFallback = 0;

    // Recorrer IDX[muni]['casa'] solamente
    for (const [muni, tipos] of Object.entries(idx)) {
        if (muni === '_meta') continue;
        const casas = tipos['casa'];
        if (!casas) continue;

        for (const [col, data] of Object.entries(casas)) {
            if (!col || col.length < 3) continue;
            if (!data.listings || !data.listings.length) continue;

            // Filtrar listings residenciales (m²C plausible para casa)
            const residenciales = data.listings.filter(l =>
                l.c > 0 && l.c <= M2C_MAX_RESIDENCIAL && l.p > 0
            );
            descartados += data.listings.length - residenciales.length;

            // Intentar usar solo la ventana temporal; si no hay suficientes, usar todos
            const enVentana = residenciales.filter(l => dentroDeVentana(l.fs));
            const base = enVentana.length >= MIN_LISTINGS ? enVentana : residenciales;
            const esTemporal = enVentana.length >= MIN_LISTINGS;
            if (esTemporal) usandoVentana++; else usandoFallback++;

            if (base.length < MIN_LISTINGS) continue;

            const pm2s = base.map(l => l.p / l.c).filter(v => v > 100 && v < 500000);
            if (pm2s.length < MIN_LISTINGS) continue;

            // Eliminar outliers p10-p90
            const sorted = [...pm2s].sort((a, b) => a - b);
            const p10 = sorted[Math.floor(sorted.length * 0.10)];
            const p90 = sorted[Math.floor(sorted.length * 0.90)];
            const filtrados = pm2s.filter(v => v >= p10 && v <= p90);
            const med = mediana(filtrados.length >= MIN_LISTINGS ? filtrados : pm2s);

            const cat = clasificarNSE(med);
            resultado[col] = {
                nse:        cat.nombre,
                nseIdx:     cat.idx,
                medianaPm2: Math.round(med),
                nListings:  base.length,
                fuente:     esTemporal ? `idx-casa-${VENTANA_MESES}m` : 'idx-casa',
                ventana:    esTemporal ? `últimos ${VENTANA_MESES} meses` : 'sin-fecha',
            };
            totalCols++;
            totalListings += residenciales.length;
        }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(resultado, null, 2));

    // Comparativa con v1
    const v1Keys   = new Set(Object.keys(nseV1));
    const v2Keys   = new Set(Object.keys(resultado));
    const soloV1   = [...v1Keys].filter(k => !v2Keys.has(k));
    const soloV2   = [...v2Keys].filter(k => !v1Keys.has(k));
    const enAmbos  = [...v1Keys].filter(k => v2Keys.has(k));
    const subieron = enAmbos.filter(k => resultado[k].nseIdx > nseV1[k].nseIdx);
    const bajaron  = enAmbos.filter(k => resultado[k].nseIdx < nseV1[k].nseIdx);
    const igual    = enAmbos.filter(k => resultado[k].nseIdx === nseV1[k].nseIdx);

    console.log('\n=== colonias_nse_v2.json ===');
    console.log('Colonias con NSE v2:', totalCols);
    console.log('Listings residenciales usados:', totalListings);
    console.log('Listings descartados (m²C>300 o tipo no-residencial):', descartados);
    console.log(`Colonias con ventana temporal (${VENTANA_MESES}m):`, usandoVentana);
    console.log('Colonias sin fecha (fallback a todos):', usandoFallback);

    console.log('\n── Comparativa v1 vs v2 ──');
    console.log('En ambas versiones:', enAmbos.length);
    console.log('  NSE subió (v2 > v1):', subieron.length);
    console.log('  NSE bajó  (v2 < v1):', bajaron.length);
    console.log('  NSE igual:', igual.length);
    console.log('Solo en v1 (sin casas en IDX):', soloV1.length);
    console.log('Solo en v2 (nuevas con IDX):', soloV2.length);

    if (subieron.length > 0) {
        console.log('\nMuestra NSE subió (primeros 20):');
        subieron.slice(0, 20).forEach(k => {
            const v1 = nseV1[k];
            const v2 = resultado[k];
            console.log(`  ${k.padEnd(32)} v1:${v1.nse}(${v1.nseIdx}) → v2:${v2.nse}(${v2.nseIdx}) [n:${v2.nListings}]`);
        });
    }

    if (bajaron.length > 0) {
        console.log('\nMuestra NSE bajó (primeros 10):');
        bajaron.slice(0, 10).forEach(k => {
            const v1 = nseV1[k];
            const v2 = resultado[k];
            console.log(`  ${k.padEnd(32)} v1:${v1.nse}(${v1.nseIdx}) → v2:${v2.nse}(${v2.nseIdx}) [n:${v2.nListings}]`);
        });
    }

    // Verificar los casos fallidos que nos importan
    const CASOS_CLAVE = [
        'jardines de la calera',
        'miguel hidalgo',
        'heliodoro hernandez loza',
        'colli urbano',
        'naturezza',
        'loma bonita ejidal',
        'tinajitas',
    ];
    console.log('\n── Casos fallidos del validador ──');
    CASOS_CLAVE.forEach(k => {
        const v1 = nseV1[k];
        const v2 = resultado[k];
        const v1str = v1 ? `${v1.nse}(${v1.nseIdx}) pm2:${v1.medianaPm2}` : 'AUSENTE';
        const v2str = v2 ? `${v2.nse}(${v2.nseIdx}) pm2:${v2.medianaPm2} n:${v2.nListings}` : 'AUSENTE';
        console.log(`  ${k.padEnd(32)} v1:${v1str}  →  v2:${v2str}`);
    });

    console.log('\nGuardado en colonias_nse_v2.json');
}

main();
