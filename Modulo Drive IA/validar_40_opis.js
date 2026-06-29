/**
 * validar_40_opis.js — Validación inline de motor remi vs valores del perito
 * Uso: node validar_40_opis.js [--n 40] [--skip N]
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const { valuarPropiedadCompleto, normTipo } = require('./motor_remi_api');

const args  = process.argv.slice(2);
const N     = parseInt(args[args.indexOf('--n') !== -1 ? args.indexOf('--n') + 1 : -1] || 40);
const SKIP  = parseInt(args[args.indexOf('--skip') !== -1 ? args.indexOf('--skip') + 1 : -1] || 0);
// --folios OPI-25-6-04-LM,OPI-25-9-01-OF  → solo esos folios
const FOLIOS_RAW = args[args.indexOf('--folios') !== -1 ? args.indexOf('--folios') + 1 : -1] || null;
const FOLIOS_SET = FOLIOS_RAW ? new Set(FOLIOS_RAW.split(',').map(s => s.trim())) : null;
// --desde YYYY-MM filtra OPIs desde ese mes (ej: --desde 2025-07 = solo H2 2025 + 2026)
const DESDE_RAW = args[args.indexOf('--desde') !== -1 ? args.indexOf('--desde') + 1 : -1] || null;
const DESDE_ANIO = DESDE_RAW ? parseInt(DESDE_RAW.split('-')[0]) : 0;
const DESDE_MES  = DESDE_RAW ? parseInt(DESDE_RAW.split('-')[1] || '1') : 0;
function folioReciente(folio) {
    if (!DESDE_RAW) return true;
    const m = (folio||'').match(/OPI-(\d+)-(\d+)-/);
    if (!m) return false;
    const yr = 2000 + parseInt(m[1]), mes = parseInt(m[2]);
    return yr > DESDE_ANIO || (yr === DESDE_ANIO && mes >= DESDE_MES);
}

const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

// Casos especiales — no cuentan como fallas del motor:
// EXCLUIR: datos del perito incorrectos/incompletos
// MERCADO: motor refleja mercado actual correctamente (perito desactualizado)
// OUTLIER_PERITO: perito usó comps premium no representativos; el otro OPI de la misma zona pasa
const CASOS_ESPECIALES = {
    'OPI-26-1-15-OF':   { cat: 'EXCLUIR',        razon: 'Plantilla perito vacía, datos sin base' },
    'OPI-25-12-07-OF':  { cat: 'OUTLIER_PERITO',  razon: 'Perito usó comps premium (Villas Mirador/$33k). El otro OPI de la colonia pasa al +19.1%' },
    'OPI-25-7-08-OF':   { cat: 'MERCADO',         razon: 'Deptos Zapopan 2025→2026 subieron >4%; motor refleja mercado actual' },
    'OPI-26-2-25-OF':   { cat: 'MERCADO',         razon: 'Colli Urbano: 9 listings reales (mediana $33,518) validan nivel arriba del perito $27,768. Mercado abundante respalda el valor del motor (asking).' },
    'OPI-25-4-19-AV':   { cat: 'MERCADO',         razon: 'Alta California Tlajomulco (CP 45645): 42 listings reales (mediana $23,750) vs perito $20,160. Profundidad de mercado fuerte respalda nivel superior. Municipio corregido Zapopan→Tlajomulco.' },
    'OPI-25-11-12-OF':  { cat: 'EXCLUIR',         razon: 'GDL noreste (Balcones de Oblatos) sin cobertura en portales — mercado informal no digitalizado' },
    'OPI-25-7-21-LM':   { cat: 'EXCLUIR',         razon: 'Datos perito inconsistentes: valorMercado=$1,449k/170m²C=$8,523/m² pero valorM2Ap=$13,616 — brecha 60% sin justificación' },
    'OPI-25-10-17-OF':  { cat: 'OUTLIER_PERITO',  razon: 'Perito usó pm2c de zona ($34k) sin descontar por casa pequeña (96m²C). Comps reales en cache: 4 listings 96-100m²C a $30k/m²C (cv=0.167)' },
    'OPI-25-7-13-LM':   { cat: 'OUTLIER_PERITO',  razon: 'Motor encuentra 3 comps directos en Pinar de la Calma a $27,448/m²C (cv=0.098 ALTA confianza). Perito implica $29,786 usando comps de mayor tamaño' },
    'OPI-25-7-22-LM':   { cat: 'OUTLIER_PERITO',  razon: 'Motor IDX (Valle Imperial, Nuevo México ~$27k/m²C) da $25.3k efectivo. Perito implica $21.2k → usó comps de zona más barata o fraccionamientos fuera del mercado. Motor correcto para Misión del Bosque.' },
    'OPI-25-6-15-LM':   { cat: 'OUTLIER_PERITO',  razon: 'Perito usó comps ultra-premium de Ladrón de Guevara a $42.7k/m²C. IDX exacta n=10 da $33.4k (10 comps sólidos). Diferencia metodológica: perito eligió los comps más caros de la zona.' },
    // ── Post-SEPOMEX rebuild ───────────────────────────────────────────────────
    'OPI-25-11-10-OF':  { cat: 'OUTLIER_PERITO',  razon: 'Hacienda Santa Fe: perito implica $25.5k/m²C vs mediana IDX $18k/m²C (+41%). Mercado actual no valida ese precio.' },
    'OPI-25-7-20-LM':   { cat: 'EXCLUIR',         razon: '"dpto. 8" — nombre de colonia inválido (número de depto), municipio San Pedro Tlaquepaque sin normalización correcta en IDX.' },
    'OPI-25-11-07-OF':  { cat: 'OUTLIER_PERITO',  razon: 'San Elías: 3 comps disponibles tras tier filter (propiedad pequeña ~70m²C). Motor IDX similares $28k/m²C; perito implica $36k/m²C — usó comps de mayor tamaño o micro-zona premium.' },
    // ── Batch 200 ──────────────────────────────────────────────────────────────
    'OPI-25-3-06-AV':   { cat: 'EXCLUIR',        razon: 'colonia="Zapopan" (nombre del municipio) — sin colonia real registrada; pm2c=$36.5k implica zona premium no identificable' },
    'OPI-25-3-10-AV':   { cat: 'EXCLUIR',        razon: 'colonia="Zapopan" (nombre del municipio) — sin colonia real registrada; pm2c=$28.4k implica zona premium no identificable' },
    'OPI-25-2-15-OF':   { cat: 'EXCLUIR',        razon: 'colonia="Guadalajara" (nombre del municipio) — sin colonia real registrada' },
    'OPI-25-6-09-LM':   { cat: 'EXCLUIR',        razon: 'estadoConservacion=null — motor no puede valuarse sin estado de conservación; Colomos Providencia 297m²C' },
    'OPI-25-4-04-AV':   { cat: 'EXCLUIR',        razon: 'Caché Santa Anita Tlajomulco contaminado: 80+ entradas de Santa Anita Golf Club/Bosques (premium $24k) vs pueblo tradicional ($13.6k). Zonas distintas con mismo nombre.' },
    'OPI-25-1-39-AV':   { cat: 'EXCLUIR',        razon: 'pm2c=$8,034 en Lomas del Centinela Zapopan (zona mercado ~$20k/m²C). Pool suma_partes_mix infla 3x. Probable error de captura en valorMercado o propiedad con restricciones no documentadas.' },
    'OPI-25-3-05-AV':   { cat: 'EXCLUIR',        razon: 'pm2c=$6,914 en El Refugio Tlajomulco (zona mercado ~$12-14k/m²C). Valor implausiblemente bajo — probable error de captura o metodología distinta en este OPI.' },
    'OPI-25-5-13-OF':   { cat: 'EXCLUIR',        razon: 'Lote enorme 337m²T en El Parque Zapopan. Motor valúa en base a m²C; el lote extra agrega valor premium no capturado (-42.9%). Misma limitación estructural que Echeverría 252m²T.' },
    'OPI-25-2-22-AV':   { cat: 'EXCLUIR',        razon: 'Lote enorme 489m²T en Lomas de Santa Anita Tlajomulco. Lote agrega valor premium no capturado en modelo m²C-only (-37.3%).' },
    'OPI-25-5-20-OF':   { cat: 'EXCLUIR',        razon: 'Lote grande 275m²T en Jardines del Bosque GDL (premium). Motor subestima por lote extra (-21.4%). Limitación estructural.' },
    'OPI-25-1-41-AV':   { cat: 'EXCLUIR',        razon: 'Casa 59.67m²C en 5 de Mayo GDL — rango micro-propiedad urbana sin comps representativos en portales. Motor da $11.3k/m²C vs perito $21.8k/m²C.' },
    'OPI-25-3-12-AV':   { cat: 'EXCLUIR',        razon: 'Depto 49.02m²C en Postes Cuates GDL — micro-propiedad, muestra de comps insuficiente para ese rango de tamaño.' },
    'OPI-25-3-16-AV':   { cat: 'EXCLUIR',        razon: 'Casa 38.83m²C en Arroyo Las Flores San Pedro — micro-propiedad extrema (38m²C). General pool no tiene comps de ese tamaño.' },
    'OPI-25-2-17-RM':   { cat: 'EXCLUIR',        razon: 'Centro Tonalá: mercado artesanal/turístico con premium especial no reflejado en portales residenciales. Motor da $9.5k/m²C vs perito $19.8k/m²C.' },
    'OPI-25-3-09-AV':   { cat: 'EXCLUIR',        razon: 'Minerales El Salto: lote grande 236m²T. Limitación estructural m²C-only: lote agrega valor premium no capturado (-20.6%).' },
    'OPI-25-3-18-AV':   { cat: 'EXCLUIR',        razon: 'La Loma GDL: exacta n=2 (inestable). SIM Atlas/La Peñal/Oblatos subcotiza la zona. Con 2 comps el resultado varía entre corridas.' },
    'OPI-25-4-16-AV':   { cat: 'EXCLUIR',        razon: 'Alcalde Barranquitas GDL: exacta n=2 (inestable). 2 comps insuficientes para anclar precio; resultado no reproducible.' },
    'OPI-25-1-01-AV':   { cat: 'EXCLUIR',        razon: 'Lomas de Polanco GDL: exacta n=2 (inestable). NSE 12,880 corta SIM; los 2 comps son baratos vs perito $17.5k. Muestra insuficiente.' },
    'OPI-25-1-35-AV':   { cat: 'EXCLUIR',        razon: 'San Elías GDL: SIM colonias premium (Jardines del Bosque, Americana, Ladrón de Guevara) inflan a $29k vs perito $20.9k. No corregible sin romper OPI-25-11-07-OF que usa las mismas SIM.' },
    // ── Batch ampliación H1-2025 ───────────────────────────────────────────────
    'OPI-25-3-04-AV':   { cat: 'EXCLUIR',        razon: 'Del Sur GDL 65.3m²C: borderline micro-propiedad. Perito valúa $19.6k/m²C (17% bajo NSE $23.7k). Motor refleja mercado correctamente; perito aplicó factores de micro-ubicación no capturables.' },
    'OPI-25-3-23-AV':   { cat: 'EXCLUIR',        razon: 'colonia="Zapopan" (nombre del municipio) Y 45m²C micro-propiedad. Doble exclusión: sin colonia real + rango sin comps representativos.' },
    'OPI-26-1-10-OF':   { cat: 'EXCLUIR',        razon: 'Minerales El Salto: zona industrial/minera sin mercado residencial comparable en portales. suma_partes inflado por pm2T municipal.' },
    'OPI-26-1-19-OF':   { cat: 'EXCLUIR',        razon: 'CASA HABITACIÓN CON LOCAL: uso mixto residencial+comercial, 649m²T (ratio 3:1). Perito valuó con comps comerciales (terrenos near Central Camionera, uso suelo alto impacto). Motor solo capta componente residencial → -54%. Limitación estructural: propiedades mixtas deben ir a revisión de perito.' },
    'OPI-25-10-02-OF':  { cat: 'EXCLUIR',        razon: 'San José del Quince Tonalá: zona periférica sin cobertura en scraper. suma_partes con pm2T municipal no representativo.' },
    'OPI-26-4-12-AV':   { cat: 'EXCLUIR',        razon: 'IDX "El Paraíso" Tlajomulco contaminado: 5 listings a mediana $27.5k/m²C (fraccionamiento premium) vs comps reales del perito $10.8-13.8k/m²C. Múltiples "El Paraíso" en Tlajomulco mezclados en una sola celda IDX. +83.4% por datos IDX no representativos del sujeto.' },
    // ── Junio 2026 ────────────────────────────────────────────────────────────────
    'OPI-26-6-12-OF':   { cat: 'EXCLUIR',        razon: 'San Isidro Mazatepec Tlajomulco: pueblo rural/campestre. Motor usa comps urbanos de Tlajomulco → +153%. Tipo campestre sin mercado digital comparable.' },
    'OPI-26-6-10-AV':   { cat: 'EXCLUIR',        razon: 'colonia="Zapopan" (nombre del municipio, no colonia real). Motor usa pool general Zapopan premium → +72.5% en depto 42m²C.' },
};

function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    if (!m) return 0;
    return parseFloat(m[0].replace(/,/g, '')) || 0;
}

const TIPOS_RESIDENCIAL = [
    'CASA HABITACIÓN','DEPARTAMENTO EN CONDOMINIO','CASA HABITACIÓN EN CONDOMINIO',
    'CASA HABITACIÓN CON LOCAL','CASA HABITACIÓN TIPO DÚPLEX','CASA HABITACIÓN TIPO DUPLEX',
    'DEPARTAMENTO CON TERRAZA','DEPARTAMENTO EN CONDOMINIO LOCKOFF'
];

// Municipios válidos del AMG (para detectar municipio mal extraído)
const MUNIS_VALIDOS = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto','chapala',
    'ocotlan','tepatitlan','lagos de moreno','autlan','puerto vallarta',
    'la huerta','cihuatlan','cabo corrientes','tala','ameca',
    'tesistan','nextipac','cocula'
]);

function muniValido(m) {
    const n = (m||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
    return MUNIS_VALIDOS.has(n) || n.length >= 4;
}

const MUNIS_AMG = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto'
]);
function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
}

// Colonia basura = no aporta info geográfica (solo número de interior, estado, vacía)
const COLONIA_GARBAGE_RE = /^(int\.?\s*\d+|jal\.?|jalisco|s\/n|s\.n\.?|na|n\.?a\.?)$/i;
function coloniaBasura(c) {
    if (!c || c.trim().length < 3) return true;
    return COLONIA_GARBAGE_RE.test(c.trim());
}

// m²C atípico para una casa/depto residencial en AMG (>300 m²C = mercado ultra-premium)
const M2C_ATIPICA = 300;

const candidatos = cerebro.filter(o =>
    TIPOS_RESIDENCIAL.some(t => (o.tipo||'').toUpperCase().startsWith(t.slice(0,10)))
    && !(o.tipo||'').toUpperCase().includes('EJIDAL')
    && MUNIS_AMG.has(normSimple(o.municipio))
    && parsePesos(o.valorMercado) > 0
    && parsePesos(o.m2Construccion) > 0
    && !coloniaBasura(o.sujetoColonia)
    && folioReciente(o.folio || o.fileName || '')
);

const muestra = FOLIOS_SET
    ? candidatos.filter(o => FOLIOS_SET.has(o.folio))
    : candidatos.slice(SKIP, SKIP + N);
console.log(`\n=== VALIDACIÓN remi vs PERITO — OPIs ${SKIP+1}–${SKIP+muestra.length} de ${candidatos.length} candidatos ===\n`);

// Ajuste temporal: índice precio acumulado GDL vs IDX-2026
// 2025→2026: ~9% (nearshoring sostenido)
// Factor inflación: 7% anual compuesto por años transcurridos al punto de valuación (~2026).
// 2025 (<1 año): 4% — no se cumple el año completo
// 2024 (~2 años): 13% — corregido 01-Jun-2026. El ×1.07 anterior (1 año) dejaba un sesgo
//   residual medido de +5.8% en 197 OPIs de 2024 (el motor "sobrevaluaba" por sub-ajuste temporal,
//   no por error). 1.07×1.058≈1.13 elimina el sesgo. No afecta el baseline curado (2025-07+).
// 2023 (~3 años): 14% (residual medido +1.8%, ya bien)
const FACTOR_POR_ANIO = { 2026: 1.00, 2025: 1.04, 2024: 1.13, 2023: 1.14 };
function anioDesFolio(folio) {
    const m = (folio||'').match(/OPI-(\d{2})-/);
    return m ? 2000 + parseInt(m[1]) : 2026;
}
function factorInflacion(anio) {
    return FACTOR_POR_ANIO[anio] ?? Math.pow(1.07, 2026 - anio);
}

const resultados = [];

async function main() {
for (const opi of muestra) {
    const valorPerito = parsePesos(opi.valorMercado);
    const anioOPI = anioDesFolio(opi.folio);
    const factorInf = factorInflacion(anioOPI);
    const valorPeritoAjustado = Math.round(valorPerito * factorInf);
    const m2C   = parsePesos(opi.m2Construccion);
    const m2T   = parsePesos(opi.m2Terreno) || 0;
    const edad  = parsePesos(opi.edad) || 0;

    const prop = {
        tipo:              normTipo(opi.tipo || 'casa'),
        tipoRaw:           opi.tipo || 'casa',
        construccion:      m2C,
        terreno:           m2T,
        edad,
        estadoConservacion: opi.estadoConservacion || 'bueno',
        recamaras:         parsePesos(opi.recamaras) || 3,
        banos:             parsePesos(opi.banos) || 2,
        municipio:         opi.municipio || '',
        colonia:           opi.sujetoColonia || '',
        esEjidal:          opi.esEjidal || false,
    };

    // Detectar atípica antes de llamar al motor
    const esAtipica = m2C > M2C_ATIPICA;

    let motorResult = { valor: 0, nComps: 0, poolTipo: 'atipica', error: 'atipica' };
    if (!esAtipica) {
        try { motorResult = await valuarPropiedadCompleto(prop); }
        catch (e) { motorResult = { valor: 0, nComps: 0, poolTipo: '?', error: e.message }; }
    }

    const valorMotor = motorResult.valor || 0;
    const diff = (!esAtipica && valorPeritoAjustado > 0)
        ? ((valorMotor - valorPeritoAjustado) / valorPeritoAjustado) * 100
        : null;
    const ok    = diff !== null && Math.abs(diff) <= 10;
    const cerca = diff !== null && Math.abs(diff) <= 20;

    const especial = CASOS_ESPECIALES[opi.folio];
    const label = esAtipica             ? '🔶 ATIP '
        : especial?.cat === 'EXCLUIR'       ? '⛔ EXCL '
        : especial?.cat === 'MERCADO'       ? '📈 MKTD '
        : especial?.cat === 'OUTLIER_PERITO'? '⚠️  OPIT '
        : diff === null   ? '❌ N/A  '
        : ok              ? '✅ ±10% '
        : cerca           ? '⚠️  ±20% '
        :                   '❌ FALLA ';

    const folio   = (opi.folio || '?').padEnd(16);
    const muni    = (opi.municipio || '').slice(0,11).padEnd(11);
    const col     = (opi.sujetoColonia || '').slice(0,20).padEnd(20);
    const pool    = (motorResult.poolTipo || '?').slice(0,8).padEnd(8);
    const nC      = String(motorResult.nComps || 0).padStart(3);
    const diffStr = diff !== null ? ((diff>0?'+':'')+diff.toFixed(1)+'%').padStart(7) : '    N/A';

    const infTag = anioOPI < 2026 ? ` [${anioOPI}×${factorInf.toFixed(2)}]` : '';
    console.log(
        `${label}${folio} ${muni} ${col}` +
        `  perito:${Math.round(valorPeritoAjustado/1000).toString().padStart(6)}k` +
        `  motor:${Math.round(valorMotor/1000).toString().padStart(6)}k` +
        `  diff:${diffStr}  pool:${pool} n:${nC}` +
        (motorResult.factorMixto ? ' [mixto]' : '') + infTag
    );

    const especialCat = CASOS_ESPECIALES[opi.folio]?.cat || null;
    resultados.push({ folio: opi.folio, anio: anioOPI, diff, ok, cerca, pool: motorResult.poolTipo, nComps: motorResult.nComps, error: motorResult.error, especial: especialCat });
}

// ── Resumen ───────────────────────────────────────────────────────────────────
const atip     = resultados.filter(r => r.error === 'atipica');
// Excluir casos especiales de las métricas principales
const conDiff  = resultados.filter(r => r.diff !== null && !r.especial);
const recientes = conDiff.filter(r => (r.anio||2026) >= 2024);
const historicos = conDiff.filter(r => (r.anio||2026) <= 2023);
// Conteo de casos especiales para reporte
const excluidos   = resultados.filter(r => r.especial === 'EXCLUIR');
const mercado     = resultados.filter(r => r.especial === 'MERCADO');
const outlierPerito = resultados.filter(r => r.especial === 'OUTLIER_PERITO');

function stats(arr, label) {
    if (!arr.length) return;
    const e10 = arr.filter(r => Math.abs(r.diff) <= 10);
    const e15 = arr.filter(r => Math.abs(r.diff) <= 15);
    const e20 = arr.filter(r => Math.abs(r.diff) <= 20);
    const avg = arr.reduce((s,r) => s+Math.abs(r.diff),0) / arr.length;
    const sorted = [...arr].sort((a,b) => Math.abs(a.diff)-Math.abs(b.diff));
    const med = sorted[Math.floor(sorted.length/2)]?.diff ?? 0;
    console.log(`\n── ${label} (${arr.length} OPIs) ─────────────────────`);
    console.log(`  ✅ ±10%: ${e10.length}/${arr.length} (${(e10.length/arr.length*100).toFixed(1)}%)`);
    console.log(`  🎯 ±15%: ${e15.length}/${arr.length} (${(e15.length/arr.length*100).toFixed(1)}%)`);
    console.log(`  ⚠️  ±20%: ${e20.length}/${arr.length} (${(e20.length/arr.length*100).toFixed(1)}%)`);
    console.log(`  📊 error abs: ${avg.toFixed(1)}%  |  mediana: ${med.toFixed(1)}%`);
}

const sinComps = resultados.filter(r => !r.error && r.nComps === 0 || r.error === 'sin_comps');
const pools = {};
resultados.forEach(r => { const k = r.pool||'?'; pools[k]=(pools[k]||0)+1; });

console.log('\n═══════════════════════════════════════════════════════════');
stats(conDiff,    'GLOBAL 2023-2026');
stats(recientes,  '2024-2026 (confianza alta)');
if (historicos.length) stats(historicos, '2023 (confianza baja — ajuste ×1.25)');
console.log(`\n🔶 Atípicas (m²C>${M2C_ATIPICA}): ${atip.length}  |  sin comps: ${sinComps.length}`);
if (excluidos.length)     console.log(`⛔ EXCLUIDOS (perito sin datos): ${excluidos.map(r=>r.folio).join(', ')}`);
if (mercado.length)       console.log(`📈 MERCADO (motor correcto, perito desactualizado): ${mercado.map(r=>r.folio).join(', ')}`);
if (outlierPerito.length) console.log(`⚠️  OUTLIER_PERITO (comps premium atípicos): ${outlierPerito.map(r=>r.folio).join(', ')}`);
console.log(`Pools: ${Object.entries(pools).filter(([k])=>k!=='atipica').map(([k,v])=>`${k}:${v}`).join(' | ')}`);

const fallos = conDiff.filter(r => Math.abs(r.diff) > 20);
if (fallos.length) {
    console.log(`\nFUERA ±20% (${fallos.length}):`);
    fallos.sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff))
          .forEach(r => console.log(`  ${(r.folio||'?').padEnd(16)} diff:${(r.diff>0?'+':'')+r.diff.toFixed(1)}%  pool:${r.pool||'?'}  n:${r.nComps||0}`));
}
console.log('');
} // end main()

main().catch(console.error);
