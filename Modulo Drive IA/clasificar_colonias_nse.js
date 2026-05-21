/**
 * clasificar_colonias_nse.js
 * Deriva la categoría NSE de cada colonia a partir del $/m²C mediano
 * del cache_consolidado.json.
 *
 * Salida: colonias_nse.json
 *   { "lomas de tabachines": { nse: "medio-medio", nseIdx: 3, medianaPm2: 28500 }, ... }
 */

const fs   = require('fs');
const path = require('path');

const CACHE_PATH  = path.join(__dirname, 'cache_consolidado.json');
const OUTPUT_PATH = path.join(__dirname, 'colonias_nse.json');

// Categorías NSE ordenadas de menor a mayor (índice = nivel)
const NSE_CATEGORIAS = [
    { idx: 0, nombre: 'economico',      min: 0,      max: 9000  },
    { idx: 1, nombre: 'interes-social', min: 9000,   max: 14000 },
    { idx: 2, nombre: 'medio-bajo',     min: 14000,  max: 21000 },
    { idx: 3, nombre: 'medio-medio',    min: 21000,  max: 33000 },
    { idx: 4, nombre: 'medio-alto',     min: 33000,  max: 52000 },
    { idx: 5, nombre: 'lujo',           min: 52000,  max: 85000 },
    { idx: 6, nombre: 'super-lujo',     min: 85000,  max: Infinity },
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

function normalizarColonia(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function main() {
    const { datos } = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    console.log(`Cache: ${datos.length.toLocaleString()} comps`);

    // Agrupar $/m²C por colonia normalizada
    const porColonia = {};
    for (const d of datos) {
        if (!d.co || !d.p || !d.c || d.c <= 0) continue;
        const col = normalizarColonia(d.co);
        if (!col || col.length < 3) continue;
        const pm2 = d.p / d.c;
        if (pm2 <= 0 || pm2 > 500000) continue; // ignorar outliers extremos
        if (!porColonia[col]) porColonia[col] = [];
        porColonia[col].push(pm2);
    }

    const resultado = {};
    const conteo = {};

    for (const [col, pm2s] of Object.entries(porColonia)) {
        if (pm2s.length < 3) continue; // necesitar al menos 3 listings para clasificar

        // Eliminar outliers extremos antes de calcular mediana (p10–p90)
        const sorted = [...pm2s].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(sorted.length * 0.10)];
        const p90 = sorted[Math.floor(sorted.length * 0.90)];
        const filtrados = pm2s.filter(v => v >= p10 && v <= p90);

        const med = mediana(filtrados.length >= 3 ? filtrados : pm2s);
        const cat = clasificarNSE(med);

        resultado[col] = {
            nse:       cat.nombre,
            nseIdx:    cat.idx,
            medianaPm2: Math.round(med),
            nListings: pm2s.length,
        };

        conteo[cat.nombre] = (conteo[cat.nombre] || 0) + 1;
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(resultado, null, 2));

    console.log(`\nCategorías NSE derivadas de ${Object.keys(resultado).length} colonias:`);
    NSE_CATEGORIAS.forEach(c => {
        console.log(`  ${c.nombre.padEnd(14)}: ${conteo[c.nombre] || 0} colonias`);
    });
    console.log(`\nGuardado en colonias_nse.json`);
}

main();
