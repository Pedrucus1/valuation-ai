/**
 * verificar_esquema.cjs — Chequeo VISIBLE del esquema de campos (NO modifica nada).
 *
 * Imprime, por cada capa del caché, cuántos registros tienen cada dato con el
 * NOMBRE CANÓNICO de ESQUEMA_CAMPOS.md. Si una capa muestra 0% en un campo que
 * debería estar lleno, hay un desajuste de nombre → revisar ESQUEMA_CAMPOS.md.
 *
 * Uso:  node verificar_esquema.cjs
 */
const fs = require('fs');
const path = require('path');

const CAMPOS = ['precio', 'm2c', 'm2t', 'tipo', 'colonia', 'muni', 'fecha', 'anio'];
const ANIO_ACTUAL = new Date().getFullYear();

function pct(n, t) { return t ? `${Math.round(100 * n / t)}%` : '—'; }

function reporta(nombre, listings) {
    console.log(`\n=== ${nombre} (${listings.length.toLocaleString()} listings) ===`);
    for (const campo of CAMPOS) {
        if (listings.length && listings[0][campo] === undefined && !listings.some(l => l[campo] !== undefined)) continue;
        const con = listings.filter(l => l[campo] !== null && l[campo] !== undefined && l[campo] !== '' && l[campo] !== 0).length;
        let extra = '';
        if (campo === 'anio') {
            const real = listings.filter(l => l.anio > 1900 && l.anio <= ANIO_ACTUAL).length;
            extra = ` (años reales 1900-${ANIO_ACTUAL}: ${real.toLocaleString()} = ${pct(real, listings.length)})`;
        }
        console.log(`  ${campo.padEnd(9)} ${con.toLocaleString().padStart(7)} / ${listings.length.toLocaleString()}  = ${pct(con, listings.length).padStart(4)}${extra}`);
    }
}

// 1) cache_consolidado.json
const consP = path.join(__dirname, 'cache_consolidado.json');
if (fs.existsSync(consP)) reporta('cache_consolidado.json', JSON.parse(fs.readFileSync(consP, 'utf8')).datos || []);

// 2) cache_index.json — aplanar listings + contar colonias con edadMedianaZona
const idxP = path.join(__dirname, 'cache_index.json');
if (fs.existsSync(idxP)) {
    const idx = JSON.parse(fs.readFileSync(idxP, 'utf8'));
    const flat = []; let cols = 0, colsEdad = 0;
    for (const muni of Object.keys(idx)) { if (muni === '_meta') continue;
        for (const tipo of Object.keys(idx[muni])) {
            for (const col of Object.keys(idx[muni][tipo])) {
                const cell = idx[muni][tipo][col];
                cols++;
                if (cell.edadMedianaZona != null) colsEdad++;
                if (Array.isArray(cell.listings)) flat.push(...cell.listings);
            }
        }
    }
    reporta('cache_index.json', flat);
    console.log(`  colonias con edadMedianaZona (#90 activo): ${colsEdad.toLocaleString()} / ${cols.toLocaleString()} = ${pct(colsEdad, cols)}`);
}

console.log('\nReferencia de nombres: ESQUEMA_CAMPOS.md');
