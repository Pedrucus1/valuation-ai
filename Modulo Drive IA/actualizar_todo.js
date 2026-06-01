/**
 * actualizar_todo.js
 *
 * Actualiza toda la cadena de datos en orden correcto.
 * Correr después de cada ciclo de scraping.
 *
 * Uso:
 *   node actualizar_todo.js           (completo: descarga + reconstruye todo)
 *   node actualizar_todo.js --skip-sheets  (solo reconstruye índices, sin descargar Sheets)
 */

const { execSync } = require('child_process');
const path = require('path');

const DIR = __dirname;
const skipSheets = process.argv.includes('--skip-sheets');

function run(script, desc) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`▶  ${desc}`);
    console.log('─'.repeat(55));
    try {
        execSync(`node "${path.join(DIR, script)}"`, { stdio: 'inherit', cwd: DIR });
        console.log(`✅ ${desc} — OK`);
    } catch (e) {
        console.error(`❌ ${desc} — FALLÓ`);
        console.error('   Abortando para no propagar datos inconsistentes.');
        process.exit(1);
    }
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  ACTUALIZACIÓN COMPLETA DE ÍNDICES DE VALUACIÓN');
console.log(`  ${new Date().toLocaleString('es-MX')}`);
console.log('══════════════════════════════════════════════════════');

if (!skipSheets) {
    run('actualizar_cache_consolidado.js', '1/4  Descargar CONSOLIDADO de Sheets → cache_consolidado.json');
} else {
    console.log('\n⏭  Saltando descarga de Sheets (--skip-sheets)');
}

run('build_cache_index.js',          `${skipSheets ? '1' : '2'}/4  Construir índice por municipio/tipo/colonia → cache_index.json`);
run('construir_nse_v2.js',           `${skipSheets ? '2' : '3'}/4  Calcular NSE por colonia (solo casas) → colonias_nse_v2.json`);
run('construir_idx_valoracion.js',   `${skipSheets ? '3' : '4'}/4  Construir índice multidimensional → idx_valoracion.json`);

console.log('\n══════════════════════════════════════════════════════');
console.log('  ✅ TODOS LOS ÍNDICES ACTUALIZADOS Y SINCRONIZADOS');
console.log('══════════════════════════════════════════════════════\n');
