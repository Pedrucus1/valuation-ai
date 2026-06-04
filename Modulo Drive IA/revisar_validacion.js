/**
 * revisar_validacion.js
 * Paso 3 del job mensual: lee el reporte del validador (logs/ultima_validacion.txt),
 * lo compara con el mes anterior y escribe logs/REVISAR.txt con un veredicto:
 *   - ⚠️ REVISAR  si el benchmark ±20% bajó ≥2 pp  o  aparecieron OPIs nuevos fuera de ±20%
 *   - ✅ OK       si todo se mantiene
 * Guarda el historial en logs/validacion_historico.json para la comparación del próximo mes.
 *
 * "Diferencia mayor" = OPI fuera de ±20% (el motor difiere >20% del perito) que NO estaba
 * fuera el mes pasado, o una caída del % global. Eso es lo que amerita revisión humana.
 */
const fs = require('fs');
const path = require('path');

const LOGS = path.join(__dirname, 'logs');
const REPORTE = path.join(LOGS, 'ultima_validacion.txt');
const HIST = path.join(LOGS, 'validacion_historico.json');
const SALIDA = path.join(LOGS, 'REVISAR.txt');
const UMBRAL_CAIDA_PP = 2.0; // caída en puntos porcentuales que dispara revisión

if (!fs.existsSync(REPORTE)) { console.error('No existe', REPORTE); process.exit(1); }
const txt = fs.readFileSync(REPORTE, 'utf8');

// % global ±20% (primer bloque GLOBAL)
const m20 = txt.match(/±20%:\s*\d+\/\d+\s*\(([\d.]+)%\)/);
const pct20 = m20 ? parseFloat(m20[1]) : null;
const mErr = txt.match(/error abs:\s*([\d.]+)%/);
const errAbs = mErr ? parseFloat(mErr[1]) : null;

// OPIs fuera de ±20% (líneas marcadas FALLA) → folio + diff
const outliers = [];
for (const line of txt.split('\n')) {
    if (!/FALLA|❌/.test(line)) continue;
    const mf = line.match(/(OPI[A-Z]*-[\d-]+-[A-Z]+)/);
    const md = line.match(/diff:\s*([+-][\d.]+)%/);
    if (mf) outliers.push({ folio: mf[1], diff: md ? md[1] + '%' : '?' });
}

// Historial previo
let prev = null;
if (fs.existsSync(HIST)) { try { prev = JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch {} }
const prevFolios = new Set((prev?.outliers || []).map(o => o.folio));
const nuevos = outliers.filter(o => !prevFolios.has(o.folio));
const deltaPct = (prev && prev.pct20 != null && pct20 != null) ? +(pct20 - prev.pct20).toFixed(1) : null;

// Veredicto
const caida = deltaPct != null && deltaPct <= -UMBRAL_CAIDA_PP;
const hayNuevos = nuevos.length > 0;
const revisar = caida || hayNuevos;

const L = [];
L.push(`${revisar ? '⚠️  REVISAR' : '✅ OK'} — validación ${new Date().toISOString().slice(0, 10)}`);
L.push('');
L.push(`±20%: ${pct20 != null ? pct20 + '%' : '?'}` +
       (deltaPct != null ? `  (${deltaPct >= 0 ? '+' : ''}${deltaPct} pp vs mes anterior ${prev.fecha})` : '  (primer registro)'));
L.push(`error abs: ${errAbs != null ? errAbs + '%' : '?'}`);
L.push(`OPIs fuera de ±20%: ${outliers.length}  |  nuevos este mes: ${nuevos.length}`);
L.push('');
if (hayNuevos) {
    L.push('NUEVOS fuera de ±20% (revisar estos — el motor difiere >20% del perito):');
    nuevos.forEach(o => L.push(`  • ${o.folio}   diff ${o.diff}`));
    L.push('');
    L.push('OJO: muchos pueden ser OUTLIER_PERITO o límite estructural ya conocido.');
    L.push('Antes de tocar el motor: leer MOTOR_ANTECEDENTES.md y correr el validador completo.');
} else {
    L.push('Sin OPIs nuevos fuera de ±20%.');
}
if (caida) L.push(`\n⚠️ El benchmark ±20% bajó ${deltaPct} pp — revisar qué cambió.`);

fs.writeFileSync(SALIDA, L.join('\n') + '\n');
fs.writeFileSync(HIST, JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), pct20, errAbs, outliers }, null, 2));
console.log(L.join('\n'));
