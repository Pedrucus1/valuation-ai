/**
 * motor_romina_api.js
 *
 * Wrapper stdin→stdout para llamar desde Python via subprocess.
 *
 * Input (stdin JSON):
 *   { tipo, construccion, terreno, edad, estadoConservacion,
 *     recamaras, banos, municipio, colonia }
 *
 * Output (stdout JSON):
 *   { valor, confianza, cv, nComps, pm2cAvg, poolTipo,
 *     medM2CZona, medPm2Zona, error? }
 *
 * Uso desde Python:
 *   import subprocess, json
 *   r = subprocess.run(['node', 'motor_romina_api.js'],
 *       input=json.dumps(prop), capture_output=True, text=True, cwd=MOTOR_DIR)
 *   result = json.loads(r.stdout)
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');

// ── helpers copiados de comparar_metodologias.js ──────────────────────────────

const INDEX_PATH        = path.join(__dirname, 'cache_index.json');
const COLONIAS_NSE_PATH = path.join(__dirname, 'colonias_nse.json');
const COLONIAS_SIM_PATH = path.join(__dirname, 'colonias_similares.json');

const IDX  = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const _nse = fs.existsSync(COLONIAS_NSE_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_NSE_PATH, 'utf8')) : {};
const _sim = fs.existsSync(COLONIAS_SIM_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_SIM_PATH, 'utf8')) : {};

const FACTORES_CONSERVACION = {
    nuevo: 1.05, muy_bueno: 1.05, bueno: 1.00,
    regular_bueno: 0.85, regular_medio: 0.75,
    regular_malo: 0.65, malo: 0.55, muy_malo: 0.45,
};

const NSE_NIVELES = [
    { idx: 0, nombre: 'economico' }, { idx: 1, nombre: 'interes-social' },
    { idx: 2, nombre: 'medio-bajo' }, { idx: 3, nombre: 'medio-medio' },
    { idx: 4, nombre: 'medio-alto' }, { idx: 5, nombre: 'lujo' }, { idx: 6, nombre: 'super-lujo' },
];

function normCol(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?|seccion)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normMuni(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/^san pedro /, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco')
        .replace(/tlajomulco de z.niga/, 'tlajomulco');
}

const TIPO_SINONIMOS = {
    'casa': ['casa', 'casas', 'residencia', 'chalet', 'villa'],
    'depto': ['departamento', 'depto', 'apartamento', 'flat', 'loft', 'penthouse', 'suite'],
    'terreno': ['terreno', 'lote', 'predio', 'solar'],
    'local': ['local comercial', 'local', 'comercial'],
    'oficina': ['oficina'], 'bodega': ['bodega', 'almacen'],
};
function normTipo(raw) {
    const r = (raw || '').toLowerCase();
    for (const [canon, sins] of Object.entries(TIPO_SINONIMOS)) {
        if (sins.some(s => r.includes(s))) return canon;
    }
    return 'casa';
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function antiRemate(arr) {
    if (arr.length <= 2) return arr;
    const s = [...arr].sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)];
    const f = arr.filter(p => p >= med * 0.60 && p <= med * 1.40);
    return f.length >= 2 ? f : arr;
}

function dedup(arr) {
    return arr.filter((d, i, a) =>
        a.findIndex(x => Math.abs(x.p - d.p) / Math.max(x.p, 1) < 0.02 && x.c === d.c) === i
    );
}

function listingsEnMuni(muni, tipo) {
    const colonias = IDX[muni]?.[tipo] ?? {};
    const out = [];
    for (const [col, data] of Object.entries(colonias)) {
        for (const l of data.listings) out.push({ p: l.p, c: l.c, t: l.t || 0, co: col });
    }
    return out;
}

// ── motor principal ───────────────────────────────────────────────────────────

function valuarPropiedad(prop) {
    const muniNorm = normMuni(prop.municipio || '');
    const colNorm  = normCol(prop.colonia || '');
    const tipo     = normTipo(prop.tipo || 'casa');
    const m2C      = prop.construccion || 0;

    // NSE
    const nseSubjeto = _nse[colNorm] || null;
    const similaresBrutos = (_sim[colNorm] || []).slice(0, 8).map(x => normCol(x.colonia));
    const similares = nseSubjeto
        ? similaresBrutos.filter(s => {
            const ns = _nse[s];
            if (!ns) return true;
            return Math.abs(ns.nseIdx - nseSubjeto.nseIdx) <= 1;
          })
        : similaresBrutos;

    // Pool base
    const todos = listingsEnMuni(muniNorm, tipo);

    // Banda de precio zona
    const enColoniaTodos = colNorm ? todos.filter(d => {
        const dc = normCol(d.co);
        return dc.includes(colNorm) || colNorm.includes(dc);
    }) : [];
    const enNSETodos = similares.length ? todos.filter(d => {
        const dc = normCol(d.co);
        return similares.some(s => dc.includes(s) || s.includes(dc));
    }) : [];
    const fuenteBanda = enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos];
    const pm2sBanda = fuenteBanda.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    const pm2sRef   = pm2sBanda.length >= 3 ? pm2sBanda : todos.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
    const medRef    = mediana(pm2sRef);
    const bandaMin  = medRef * 0.40;
    const bandaMax  = medRef * 1.60;

    // Tiers de escalafón
    const tierLo = m2C <= 62 ? 30 : m2C <= 100 ? 52 : m2C <= 145 ? 88 : m2C <= 200 ? 125 : 170;
    const tierHi = m2C <= 62 ? 72 : m2C <= 100 ? 112 : m2C <= 145 ? 162 : m2C <= 200 ? 225 : 9999;

    // Pool filtrado
    const pool = dedup(todos.filter(d => {
        if (m2C > 0 && Math.abs(d.c - m2C) / Math.max(d.c, m2C) >= 0.50) return false;
        const pm2 = d.p / d.c;
        return pm2 >= bandaMin && pm2 <= bandaMax;
    }));

    // Cascada
    const enColonia = colNorm ? pool.filter(d => {
        const dc = normCol(d.co);
        if (!dc || dc.length < 5) return false;
        const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
        return ratio >= 0.55 && (dc.includes(colNorm) || colNorm.includes(dc));
    }) : [];

    let candidatos = enColonia;
    let poolTipo = 'exacta';

    if (candidatos.length < 3 && similares.length > 0) {
        const enSim = pool.filter(d => {
            const dc = normCol(d.co);
            if (!dc || dc.length < 4) return false;
            if (colNorm && (dc.includes(colNorm) || colNorm.includes(dc))) return false;
            return similares.some(s => s.length >= 4 && dc.includes(s));
        });
        if (enSim.length > 0) {
            candidatos = [...enColonia, ...enSim];
            poolTipo = 'similares';
        }
    }

    if (candidatos.length < 3) {
        candidatos = pool;
        poolTipo = 'general';
    }

    // Score + top-10
    const scored = candidatos.map(d => {
        const dc = normCol(d.co);
        let s = m2C > 0 ? 1 - Math.abs(d.c - m2C) / Math.max(d.c, m2C) : 0;
        if (colNorm && dc.length >= 5 && (dc.includes(colNorm) || colNorm.includes(dc))) s += 0.50;
        else if (dc.length >= 4 && similares.some(x => dc.includes(x))) s += 0.25;
        return { precio: d.p, m2_const: d.c, score: s };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    // Filtro post-scoring por escalafón
    const enTier = scored.filter(d => d.m2_const >= tierLo && d.m2_const <= tierHi);
    const comps  = enTier.length >= 3 ? enTier : scored;

    if (!comps.length) return { valor: 0, confianza: 'N/A', nComps: 0, poolTipo, error: 'sin_comps' };

    // Romina
    const pm2c     = comps.map(c => c.precio / c.m2_const);
    const pm2cFilt = antiRemate(pm2c);
    const edad     = prop.edad || 0;
    const factorEdad = poolTipo === 'exacta'   ? 1.0
                     : poolTipo === 'similares' ? Math.max(0.85, 1 - (edad - 10) * 0.005)
                     :                            Math.max(0.70, 1 - (edad - 10) * 0.01);
    const factorConserv = FACTORES_CONSERVACION[prop.estadoConservacion] || 1.00;
    const factorNeg     = 0.95;

    const compsFilt = comps.filter((c, i) => pm2cFilt.includes(pm2c[i]));
    let suma = 0;
    compsFilt.forEach(c => {
        const pu = c.precio / c.m2_const;
        suma += pu * Math.pow(c.m2_const / m2C, 1/6) * factorEdad * factorConserv;
    });
    const pm2cAvg = suma / compsFilt.length;
    const valor   = Math.round(pm2cAvg * m2C * factorNeg);

    const mean   = avg(pm2cFilt);
    const stddev = Math.sqrt(pm2cFilt.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / pm2cFilt.length);
    const cv     = mean > 0 ? stddev / mean : 1;
    const m2cZona = (enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos])
        .map(d => d.c).filter(v => v > 5 && v < 2000);

    return {
        valor,
        confianza: cv < 0.15 ? 'ALTA' : cv < 0.25 ? 'MEDIA' : 'BAJA',
        cv:        +cv.toFixed(3),
        nComps:    compsFilt.length,
        pm2cAvg:   Math.round(pm2cAvg),
        poolTipo,
        medM2CZona: m2cZona.length >= 5 ? Math.round(mediana(m2cZona)) : 0,
        medPm2Zona: Math.round(medRef),
    };
}

// ── stdin/stdout ──────────────────────────────────────────────────────────────
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
    try {
        const prop = JSON.parse(raw);
        const result = valuarPropiedad(prop);
        process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
        process.stdout.write(JSON.stringify({ error: e.message, valor: 0 }) + '\n');
        process.exit(1);
    }
});
