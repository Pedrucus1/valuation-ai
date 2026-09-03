/**
 * actualizar_indices_motor.js — Reconstruye la cadena de índices del motor canónico
 * DESDE MONGO (mercado_props), sin tocar la capa "ganada" (nse.v1, calibración del
 * perito — ver ARQUITECTURA_DATOS.md). Plantilla de orden tomada de actualizar_todo.js,
 * pero ese usa Sheets (descontinuado); este solo Mongo.
 *
 * Orden (cada paso solo escribe su propia capa derivada):
 *   1. actualizar_cache_consolidado_mongo.py  Mongo → cache_consolidado.json
 *   2. build_cache_index.js                   → cache_index.json
 *   3. construir_idx_valoracion.js             → idx_valoracion.json
 *   4. construir_nse_v2.js                     → colonias_nse_v2.json (capa derivada)
 *   5. generar_similares_sepomex.js            → colonias_similares_enriquecido.json
 *   6. build_pm2t_semilla.py                   → pm2t_semilla.json (semilla terreno)
 *   7. construir_maestro.js                    → colonias_maestro.json (el ÚNICO archivo
 *      que lee el motor; merge seguro ganada+derivada, nunca sobreescribe nse.v1)
 *
 * Uso: node actualizar_indices_motor.js
 */
const { execSync } = require('child_process');
const path = require('path');

const DIR = __dirname;
const PY = 'C:\\Users\\pedru\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe';

function run(cmd, args, desc) {
    console.log(`\n${'─'.repeat(55)}\n▶  ${desc}\n${'─'.repeat(55)}`);
    try {
        execSync(`"${cmd}" ${args.map(a => `"${a}"`).join(' ')}`, { stdio: 'inherit', cwd: DIR });
        console.log(`OK  ${desc}`);
    } catch (e) {
        console.error(`FALLO  ${desc} — abortando para no propagar datos inconsistentes.`);
        process.exit(1);
    }
}

const t0 = Date.now();
console.log(`\nActualización de índices del motor — ${new Date().toLocaleString('es-MX')}`);

run(PY, ['actualizar_cache_consolidado_mongo.py'], '1/7  Mongo -> cache_consolidado.json');
run('node', ['build_cache_index.js'], '2/7  cache_index.json');
run('node', ['construir_idx_valoracion.js'], '3/7  idx_valoracion.json');
run('node', ['construir_nse_v2.js'], '4/7  colonias_nse_v2.json (derivada)');
run('node', ['generar_similares_sepomex.js'], '5/7  colonias_similares_enriquecido.json');
run(PY, ['build_pm2t_semilla.py'], '6/7  pm2t_semilla.json');
run('node', ['construir_maestro.js'], '7/7  colonias_maestro.json (merge final)');

console.log(`\nTodos los índices actualizados — ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
