/**
 * validar_motor_simple_lab.js — LAB, no toca produccion.
 *
 * Metodologia "estilo portal" (AvaClick/Monopolio/Yals, ver reference_avm_metodologia):
 * mediana de $/m2C de los N comps mas cercanos por tamano (mismo tipo + colonia/similares),
 * SIN cascada NSE/IDX/Ross-Heidecke/DV-weighting/factorEdad-curva. Usa SOLO el dato que ya
 * existe en cache_index.json (IDX) -- no agrega fuente nueva.
 *
 * Incluye un filtro nuevo/usado SIMPLE (el tipo de cosa que un portal simple SI podria hacer
 * bien, porque no tiene el problema del cap unidireccional del motor actual): si el sujeto es
 * nuevo (edad<=2) excluye comps usados del pool y viceversa, ANTES de tomar la mediana -- no
 * como un cap posterior, sino como filtro de entrada. Si el filtro deja <3 comps, no filtra
 * (fallback al pool completo, igual de simple).
 *
 * Uso: node validar_motor_simple_lab.js [--n 1000] [--sin-filtro-edad]
 */
const fs = require('fs');
const path = require('path');
const { normCol, normMuni, normTipo, getSimilares } = require('./motor_remi_api');

const args = process.argv.slice(2);
const N = parseInt(args[args.indexOf('--n') !== -1 ? args.indexOf('--n') + 1 : -1] || 1000);
const SIN_FILTRO_EDAD = args.includes('--sin-filtro-edad');
const CON_CONSERV = args.includes('--con-conserv');
const FACTOR_NEG_ARG = args.indexOf('--factor-neg');
const FACTOR_NEG = FACTOR_NEG_ARG !== -1 ? parseFloat(args[FACTOR_NEG_ARG + 1]) : 1.0;
const N_COMPS = 8;          // comps mas cercanos por tamano, igual que DV_NMAX del motor actual
const BANDA_TAMANO = 0.40;  // +-40%, igual que la banda por defecto del motor actual
const CORTE_NUEVO = 2;      // anios

// Misma tabla que motor_remi_api.js (no exportada, se duplica minima para el LAB)
const FACTORES_CONSERVACION = {
    nuevo: 1.05, muy_bueno: 1.05, bueno: 1.00,
    regular_bueno: 0.85, regular_medio: 0.75, regular_malo: 0.65, malo: 0.55, muy_malo: 0.45,
    remodelacion_menor: 0.85, remodelacion_intermedia: 1.00, remodelacion_completa: 1.05,
};

const IDX = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Motor simple: comps de colonia exacta -> si <3, agrega similares -> mediana de los N mas
// cercanos en m2C, filtrados por banda de tamano y (opcional) por bucket nuevo/usado del sujeto.
function motorSimple(prop) {
    const muni = normMuni(prop.municipio || '');
    const col = normCol(prop.colonia || '');
    const tipo = normTipo(prop.tipo || 'casa');
    const m2C = prop.construccion || 0;
    const edadSubj = prop.edad || 0;

    const celdaCol = IDX[muni]?.[tipo]?.[col];
    let pool = (celdaCol?.listings || []).slice();

    if (pool.length < 3) {
        const sims = getSimilares(col, muni).slice(0, 6).map(x => normCol(x.colonia));
        for (const s of sims) {
            const celda = IDX[muni]?.[tipo]?.[s];
            if (celda?.listings) pool.push(...celda.listings);
            if (pool.length >= N_COMPS) break;
        }
    }
    if (!pool.length) return { valor: 0, nComps: 0, error: 'sin_comps' };

    // Banda de tamano
    let filtrado = m2C > 0
        ? pool.filter(l => l.m2c > 0 && Math.abs(l.m2c - m2C) / Math.max(l.m2c, m2C) <= BANDA_TAMANO)
        : pool;
    if (filtrado.length < 3) filtrado = pool.filter(l => l.m2c > 0);
    if (!filtrado.length) return { valor: 0, nComps: 0, error: 'sin_comps' };

    // Filtro simple nuevo/usado por edad del SUJETO (no un cap, un filtro de entrada)
    if (!SIN_FILTRO_EDAD) {
        const ANIO_ACTUAL = new Date().getFullYear();
        const bucket = filtrado.filter(l => {
            if (!l.anio || l.anio <= 1900) return false;
            const edadComp = ANIO_ACTUAL - l.anio;
            return edadSubj <= CORTE_NUEVO ? edadComp <= CORTE_NUEVO : edadComp > CORTE_NUEVO;
        });
        if (bucket.length >= 3) filtrado = bucket;
    }

    // N comps mas cercanos por tamano
    const ordenados = filtrado
        .map(l => ({ ...l, distM2: m2C > 0 ? Math.abs(l.m2c - m2C) : 0 }))
        .sort((a, b) => a.distM2 - b.distM2)
        .slice(0, N_COMPS);

    const pm2cs = ordenados.filter(l => l.m2c > 0).map(l => l.precio / l.m2c);
    if (!pm2cs.length) return { valor: 0, nComps: 0, error: 'sin_comps' };

    const pm2cMed = mediana(pm2cs);
    const factorConserv = CON_CONSERV ? (FACTORES_CONSERVACION[prop.estadoConservacion] || 1.00) : 1.00;
    const valor = Math.round(pm2cMed * m2C * factorConserv * FACTOR_NEG);
    return { valor, nComps: ordenados.length, pm2cAvg: pm2cMed };
}

// ── Reusa exactamente el mismo set de candidatos/casos-especiales que validar_40_opis.js ──
require('dotenv').config({ path: '../.env' });
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

const TIPOS_RESIDENCIAL = [
    'CASA HABITACIÓN', 'DEPARTAMENTO EN CONDOMINIO', 'CASA HABITACIÓN EN CONDOMINIO',
    'CASA HABITACIÓN CON LOCAL', 'CASA HABITACIÓN TIPO DÚPLEX', 'CASA HABITACIÓN TIPO DUPLEX',
    'DEPARTAMENTO CON TERRAZA', 'DEPARTAMENTO EN CONDOMINIO LOCKOFF'
];
const MUNIS_AMG = new Set(['guadalajara', 'zapopan', 'tlaquepaque', 'san pedro tlaquepaque',
    'tlajomulco', 'tlajomulco de zuniga', 'tonala', 'el salto']);
function normSimple(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, '').trim(); }
const COLONIA_GARBAGE_RE = /^(int\.?\s*\d+|jal\.?|jalisco|s\/n|s\.n\.?|na|n\.?a\.?)$/i;
function coloniaBasura(c) { if (!c || c.trim().length < 3) return true; return COLONIA_GARBAGE_RE.test(c.trim()); }
function parsePesos(s) { if (!s) return 0; if (typeof s === 'number') return s; const m = s.toString().match(/[\d,]+\.?\d*/); return m ? parseFloat(m[0].replace(/,/g, '')) || 0 : 0; }
const M2C_ATIPICA = 300;
const FACTOR_POR_ANIO = { 2026: 1.00, 2025: 1.04, 2024: 1.13, 2023: 1.14 };
function anioDesFolio(folio) { const m = (folio || '').match(/OPI-(\d{2})-/); return m ? 2000 + parseInt(m[1]) : 2026; }
function factorInflacion(anio) { return FACTOR_POR_ANIO[anio] ?? Math.pow(1.07, 2026 - anio); }

const candidatos = cerebro.filter(o =>
    TIPOS_RESIDENCIAL.some(t => (o.tipo || '').toUpperCase().startsWith(t.slice(0, 10)))
    && !(o.tipo || '').toUpperCase().includes('EJIDAL')
    && MUNIS_AMG.has(normSimple(o.municipio))
    && parsePesos(o.valorMercado) > 0
    && parsePesos(o.m2Construccion) > 0
    && !coloniaBasura(o.sujetoColonia)
).slice(0, N);

const resultados = [];
for (const opi of candidatos) {
    const valorPerito = parsePesos(opi.valorMercado);
    const anioOPI = anioDesFolio(opi.folio);
    const valorPeritoAjustado = Math.round(valorPerito * factorInflacion(anioOPI));
    const m2C = parsePesos(opi.m2Construccion);
    if (m2C > M2C_ATIPICA) continue;

    const prop = {
        tipo: normTipo(opi.tipo || 'casa'), construccion: m2C,
        edad: parsePesos(opi.edad) || 0,
        municipio: opi.municipio || '', colonia: opi.sujetoColonia || '',
        estadoConservacion: opi.estadoConservacion || 'bueno',
    };
    const r = motorSimple(prop);
    if (!r.valor || valorPeritoAjustado <= 0) continue;
    const diff = ((r.valor - valorPeritoAjustado) / valorPeritoAjustado) * 100;
    resultados.push({ folio: opi.folio, diff, nComps: r.nComps });
}

function stats(arr, label) {
    if (!arr.length) return;
    const e10 = arr.filter(r => Math.abs(r.diff) <= 10);
    const e15 = arr.filter(r => Math.abs(r.diff) <= 15);
    const e20 = arr.filter(r => Math.abs(r.diff) <= 20);
    const avgAbs = arr.reduce((s, r) => s + Math.abs(r.diff), 0) / arr.length;
    const sorted = [...arr].sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
    const med = sorted[Math.floor(sorted.length / 2)]?.diff ?? 0;
    console.log(`\n── ${label} (${arr.length} OPIs con valor) ─────────────────────`);
    console.log(`  ±10%: ${e10.length}/${arr.length} (${(100 * e10.length / arr.length).toFixed(1)}%)`);
    console.log(`  ±15%: ${e15.length}/${arr.length} (${(100 * e15.length / arr.length).toFixed(1)}%)`);
    console.log(`  ±20%: ${e20.length}/${arr.length} (${(100 * e20.length / arr.length).toFixed(1)}%)`);
    console.log(`  error abs: ${avgAbs.toFixed(1)}%  |  mediana: ${med.toFixed(1)}%`);
}

console.log(`\n=== MOTOR SIMPLE (estilo portal) — ${candidatos.length} candidatos, filtro edad ${SIN_FILTRO_EDAD ? 'OFF' : 'ON'} ===`);
console.log(`Con resultado: ${resultados.length} (sin_comps/atipica excluidos)`);
stats(resultados, 'MOTOR SIMPLE');
const sinComps = candidatos.length - resultados.length;
console.log(`\nSin comps o atípica: ${sinComps}`);
