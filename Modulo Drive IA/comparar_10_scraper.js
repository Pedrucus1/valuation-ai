/**
 * comparar_10_scraper.js
 *
 * Compara 3 métodos sobre 10 propiedades del scraper:
 *   A) Metodología Perito (Suma de Partes: $/m²T × m²T + pm2C BIMSA × m²C × deprec × 1.20)
 *   B) Motor PropValu (Romina-Scraper con fallback Beta-OPI)
 *   C) Precio real de oferta en la BD del scraper
 *
 * Resultado: tabla comparativa → determina qué método se acerca más al precio de mercado real.
 */

require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');

// ── Reutilizar helpers del motor principal ────────────────────────────────────
const INDEX_PATH        = path.join(__dirname, 'cache_index.json');
const COLONIAS_NSE_PATH = path.join(__dirname, 'colonias_nse.json');
const COLONIAS_SIM_PATH = path.join(__dirname, 'colonias_similares.json');

const IDX  = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const _nse = fs.existsSync(COLONIAS_NSE_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_NSE_PATH, 'utf8')) : {};
const _sim = fs.existsSync(COLONIAS_SIM_PATH) ? JSON.parse(fs.readFileSync(COLONIAS_SIM_PATH, 'utf8')) : {};

function normMuni(s) {
    if (!s) return '';
    return s.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        .replace(/^san pedro /, 'tlaquepaque')
        .replace(/tlajomulco de zuniga/, 'tlajomulco');
}

// Devuelve listings de cache_index para muni+tipo como array {p,c,t,co}
function getListings(muni, tipo) {
    const m = normMuni(muni);
    const t = tipo === 'departamento' ? 'depto' : tipo;
    const colonias = IDX[m]?.[t] ?? {};
    const out = [];
    for (const [col, data] of Object.entries(colonias)) {
        for (const l of data.listings) {
            out.push({ p: l.p, c: l.c, t: l.t || 0, co: col });
        }
    }
    return out;
}

const MXN = v => v ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(v) : 'N/A';
const pct  = (calc, ref) => ref ? (((calc/ref)-1)*100).toFixed(1)+'%' : 'N/A';
const abspct = (calc, ref) => ref ? Math.abs((calc/ref)-1)*100 : null;

function normCol(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/\b(col\.|colonia|fracc\.|fraccionamiento|residencial|secc?\.?)\b/g,'')
        .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
}

function antiRemate(arr) {
    if (arr.length<=2) return arr;
    const s = [...arr].sort((a,b)=>a-b);
    const med = s[Math.floor(s.length/2)];
    const f = arr.filter(p=>p>=med*0.60 && p<=med*1.40);
    return f.length>=2 ? f : arr;
}

function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function getRH(edad, vida=70) {
    const x = Math.min(1, edad/vida);
    return Math.max(0.20, 1 - 0.5*(x + x*x));
}

// Factores de conservación relativos al comp "bueno" del scraper (5% por estado)
// bueno = referencia (1.00): los comps del scraper son mayoritariamente "bueno"
// Si sujeto es mejor → leve premio; si es peor → descuento 5% por estado
const FACTORES_CONSERVACION = {
    nuevo:         1.05,
    muy_bueno:     1.05,
    bueno:         1.00,
    regular_bueno: 0.85,
    regular_medio: 0.75,
    regular_malo:  0.65,
    malo:          0.55,
    muy_malo:      0.45,
};
const PISOS_RH = { bueno:0.55, regular_bueno:0.48, regular_medio:0.35, regular_bajo:0.28, malo:0.20 };

// ── MÉTODO A: Suma de Partes (Perito) ─────────────────────────────────────────
// pm2T: mediana $/m²T de terrenos en venta en la zona (scraper)
// pm2C: mediana $/m²C de construcción en la zona (proxy BIMSA via scraper)
//        depreciado por edad (Ross-Heidecke) + factor comercial 20%
function metodoPeritoSumaPartes(prop, zona) {
    const colNorm = normCol(zona.colonia);
    const muni    = (zona.municipio||'').toLowerCase();

    // Terrenos en venta en la zona para $/m²T
    const terrenos     = getListings(muni, 'terreno').filter(d => d.p > 0 && d.t > 0);
    const terrenosZona = colNorm ? terrenos.filter(d => normCol(d.co).includes(colNorm)||colNorm.includes(normCol(d.co))) : [];
    const fuenteT      = terrenosZona.length >= 3 ? terrenosZona : terrenos.slice(0,30);
    const pm2Ts        = fuenteT.map(d=>d.p/d.t).filter(v=>v>0&&v<100000);
    const pm2T         = pm2Ts.length ? mediana(antiRemate(pm2Ts)) : 0;

    // $/m²C de construcción similar en la zona (proxy del catálogo BIMSA via mercado)
    const casas = [...getListings(muni,'casa'), ...getListings(muni,'depto')]
        .filter(d => d.p>0 && d.c>0 && d.t>0);
    const casasZona = colNorm ? casas.filter(d=>normCol(d.co).includes(colNorm)||colNorm.includes(normCol(d.co))) : [];
    const fuenteC   = casasZona.length>=3 ? casasZona : casas.slice(0,50);
    // pm2C "BIMSA proxy": precio - (pm2T * terreno) / construccion
    const pm2CsBrutos = fuenteC.map(d=>{
        const vT = pm2T * d.t;
        const vC = d.p - vT;
        return vC > 0 ? vC/d.c : 0;
    }).filter(v=>v>2000&&v<80000);
    const pm2CBimsa = pm2CsBrutos.length ? mediana(antiRemate(pm2CsBrutos)) : 0;

    if (!pm2T || !pm2CBimsa) return { valor:0, pm2T, pm2CBimsa, nota:'sin datos zona' };

    // Depreciar construcción: factorRH × factorConservacion × factorComercial(20%)
    const conservacion = prop.conservacion || 'bueno';
    const pisoRH   = PISOS_RH[conservacion] ?? 0.35;
    const factorRH = Math.max(pisoRH, getRH(prop.edad)/getRH(10));
    const factorConserv = FACTORES_CONSERVACION[conservacion] || 0.93;
    const factorComercial = prop.edad > 35 ? 1.20 : prop.edad > 20 ? 1.10 : 1.05;

    const valorTerreno      = pm2T * prop.m2T * 0.95;       // factorNeg=0.95
    const valorConstruccion = pm2CBimsa * prop.m2C * factorRH * factorConserv * factorComercial;
    const total = Math.round(valorTerreno + valorConstruccion);

    return { valor:total, pm2T:Math.round(pm2T), pm2CBimsa:Math.round(pm2CBimsa), factorRH:factorRH.toFixed(2), valorTerreno:Math.round(valorTerreno), valorConstruccion:Math.round(valorConstruccion) };
}

// ── MÉTODO B: Romina-Scraper (Motor PropValu) ─────────────────────────────────
function metodoRominaScraper(prop, zona) {
    const colNorm  = normCol(zona.colonia);
    const muni     = (zona.municipio||'').toLowerCase();
    const similares = (_sim[colNorm]||[]).slice(0,5).map(x=>normCol(x.colonia));

    // NSE del sujeto: mediana $/m²C de su colonia exacta, o estimado de colonias similares
    // Opción A+C: filtrar comps dentro de ±40% del NSE del sujeto para evitar mezclas de zona
    const nseEntry   = _nse[colNorm];
    const pm2cRef    = nseEntry?.medianaPm2
        || (similares.length ? avg(similares.map(s=>_nse[s]?.medianaPm2||0).filter(v=>v>0)) : 0);
    const nseMin = pm2cRef > 0 ? pm2cRef * 0.55 : 0;
    const nseMax = pm2cRef > 0 ? pm2cRef * 1.55 : Infinity;

    // Solo casas (incluye casas en coto/conjunto — en el cache todas son tipo "casa")
    const candidatos = getListings(muni, 'casa').filter(d => {
        if (!d.p || !d.c) return false;
        if (Math.abs(d.c-prop.m2C)/Math.max(d.c,prop.m2C) >= 0.50) return false;
        if (pm2cRef > 0) {
            const compNse = _nse[d.co]?.medianaPm2; // d.co ya normalizado
            if (compNse && (compNse < nseMin || compNse > nseMax)) return false;
        }
        return true;
    });

    // Deduplicar: mismo precio ±2% y mismo m²C → mismo anuncio en distintos portales
    const deduped = candidatos.filter((d, i, arr) =>
        arr.findIndex(x => Math.abs(x.p - d.p)/Math.max(x.p,d.p) < 0.02 && x.c === d.c) === i
    );
    if (!deduped.length) return { valor:0, nComps:0, nota:'sin candidatos' };
    const pool0 = deduped;

    // Escalafón de tamaño (definición del perito): cada segmento es un mercado distinto.
    const m2C = prop.m2C;
    const tierLo = m2C <= 62  ? 30  : m2C <= 100 ? 52  : m2C <= 145 ? 88  : m2C <= 200 ? 125 : 170;
    const tierHi = m2C <= 62  ? 72  : m2C <= 100 ? 112 : m2C <= 145 ? 162 : m2C <= 200 ? 225 : 9999;
    const inTier = c => c >= tierLo && c <= tierHi;

    // Selección escalonada: colonia exacta → similares → municipio completo
    const enColonia  = colNorm ? pool0.filter(d => {
        const dc = normCol(d.co);
        if (!dc || dc.length < 5) return false;
        const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
        return ratio >= 0.55 && (dc.includes(colNorm)||colNorm.includes(dc));
    }) : [];
    const enSimilares = similares.length > 0 ? pool0.filter(d => {
        const dc = normCol(d.co);
        if (!dc || dc.length < 4) return false;
        return similares.some(x => x.length >= 4 && dc.includes(x));
    }) : [];
    const poolPreScore = enColonia.length >= 3
        ? enColonia
        : (enSimilares.length >= 3 ? [...enColonia, ...enSimilares] : pool0);

    // Score por similitud m²C (colonia ya está garantizada por el pool)
    const puntuados = poolPreScore.map(d=>{
        const dc = normCol(d.co);
        let s = 1 - Math.abs(d.c-prop.m2C)/Math.max(d.c,prop.m2C);
        if (colNorm && dc.length >= 4 && (dc.includes(colNorm)||colNorm.includes(dc))) s += 0.50;
        else if (dc.length >= 4 && similares.some(x => x.length >= 4 && (dc.includes(x)||x.includes(dc)))) s += 0.25;
        return {...d, score:s};
    }).sort((a,b)=>b.score-a.score).slice(0,10);

    // Filtro post-scoring por escalafón: si hay ≥3 comps en el mismo tier de m²C, usar solo esos.
    // Evita que modelos grandes (73m²C) inflen el precio de propiedades pequeñas (49m²C) en el
    // mismo fraccionamiento sin cambiar la arquitectura de selección de pool.
    const enTier   = puntuados.filter(d => inTier(d.c));
    const compsFin = enTier.length >= 3 ? enTier : puntuados;

    const pm2cs     = compsFin.map(d=>d.p/d.c);
    const pm2csFilt = antiRemate(pm2cs);
    const compsFilt = compsFin.filter((_,i)=>pm2csFilt.includes(pm2cs[i]));

    const conservacion = prop.conservacion||'bueno';
    // Si comps son de colonia exacta (mismo fraccionamiento/edad similar), factorEdad ≈ 1
    // Si son de zona más amplia, aplicar descuento completo por edad del sujeto
    const usaColoniaExacta  = poolPreScore === enColonia && enColonia.length >= 3;
    const usaSimilares      = !usaColoniaExacta && poolPreScore !== pool0;
    // Colonia exacta: misma era → factorEdad=1.0
    // Colonias similares: misma zona/era aproximada → aplicar solo 50% del ajuste por edad
    // Pool general: asumir comps más nuevos → ajuste completo
    const factorEdad   = usaColoniaExacta ? 1.0
                       : usaSimilares     ? Math.max(0.85, 1-(prop.edad-10)*0.005)
                       :                    Math.max(0.70, 1-(prop.edad-10)*0.01);
    const factorConserv = FACTORES_CONSERVACION[conservacion]||0.93;

    let suma = 0;
    compsFilt.forEach(d=>{
        const pu = d.p/d.c;
        const fs = Math.pow(d.c/prop.m2C, 1/6);
        suma += pu * fs * factorEdad * factorConserv;
    });

    const pm2cAvg = suma/compsFilt.length;
    let valor     = Math.round(pm2cAvg * prop.m2C);

    // Prima vivienda pequeña
    if (prop.m2C < 45) valor = Math.round(valor * 1.22);
    else if (prop.m2C < 65) valor = Math.round(valor * 1.12);

    // factorNeg=0.95: precio oferta → precio cierre (~5% de negociación)
    valor = Math.round(valor * 0.95);

    return { valor, nComps:compsFilt.length, pm2cAvg:Math.round(avg(pm2csFilt)) };
}

// ── 10 Propiedades de muestra ─────────────────────────────────────────────────
const MUESTRA = [
    { id:1,  municipio:'tlaquepaque', colonia:'balcones de santa maria', m2C:130, m2T:130, edad:20, conservacion:'bueno',         precioReal:3800000 },
    { id:2,  municipio:'guadalajara', colonia:'centro barranquitas',     m2C:100, m2T:100, edad:40, conservacion:'regular_medio', precioReal:1800000 },
    { id:3,  municipio:'zapopan',     colonia:'real cantabria',          m2C:66,  m2T:74,  edad:15, conservacion:'bueno',         precioReal:1995000 },
    { id:4,  municipio:'zapopan',     colonia:'chapalita inn',           m2C:104, m2T:109, edad:30, conservacion:'bueno',         precioReal:4699000 },
    { id:5,  municipio:'tlaquepaque', colonia:'san pedro tlaquepaque',   m2C:167, m2T:119, edad:25, conservacion:'bueno',         precioReal:4583800 },
    { id:6,  municipio:'tlaquepaque', colonia:'santa anita',             m2C:88,  m2T:66,  edad:10, conservacion:'bueno',         precioReal:3021018 },
    { id:7,  municipio:'tlajomulco',  colonia:'hacienda santa fe',       m2C:49,  m2T:96,  edad:12, conservacion:'bueno',         precioReal:1100000 },
    { id:8,  municipio:'tlajomulco',  colonia:'el paraiso',              m2C:145, m2T:102, edad:18, conservacion:'bueno',         precioReal:3990000 },
    { id:9,  municipio:'tonalá',      colonia:'el moral',                m2C:80,  m2T:102, edad:15, conservacion:'bueno',         precioReal:2050000 },
    { id:10, municipio:'tonalá',      colonia:'hacienda real',           m2C:110, m2T:66,  edad:20, conservacion:'bueno',         precioReal:1550000 },
];

// ── Correr comparación ────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(90));
console.log('COMPARACIÓN: Perito (Suma Partes) vs Motor PropValu (Romina) vs Precio Real Scraper');
console.log('='.repeat(90));

const resultados = [];

for (const prop of MUESTRA) {
    const zona = { municipio: prop.municipio, colonia: prop.colonia };
    const a    = metodoPeritoSumaPartes(prop, zona);
    const b    = metodoRominaScraper(prop, zona);
    const real = prop.precioReal;

    const errA = abspct(a.valor, real);
    const errB = abspct(b.valor, real);

    resultados.push({ prop, a, b, real, errA, errB });

    console.log(`\n${prop.id}. ${prop.colonia.toUpperCase()}, ${prop.municipio} | ${prop.m2C}m²C ${prop.m2T}m²T | ${prop.edad}a ${prop.conservacion}`);
    console.log(`   Precio real scraper : ${MXN(real)}`);
    console.log(`   A) Perito Suma Parts: ${MXN(a.valor)}  (${pct(a.valor,real)})  $/m²T=${a.pm2T?.toLocaleString()}  $/m²C-bimsa=${a.pm2CBimsa?.toLocaleString()}  factRH=${a.factorRH}`);
    console.log(`   B) Motor Romina     : ${MXN(b.valor)}  (${pct(b.valor,real)})  $/m²C-comps=${b.pm2cAvg?.toLocaleString()}  n=${b.nComps}`);
    if (a.nota) console.log(`   ⚠️  A: ${a.nota}`);
}

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(90));
const densA = resultados.filter(r=>r.errA!==null&&r.errA<=20).length;
const densB = resultados.filter(r=>r.errB!==null&&r.errB<=20).length;
const avgA  = resultados.filter(r=>r.errA!==null).reduce((s,r)=>s+r.errA,0)/resultados.filter(r=>r.errA!==null).length;
const avgB  = resultados.filter(r=>r.errB!==null).reduce((s,r)=>s+r.errB,0)/resultados.filter(r=>r.errB!==null).length;

console.log(`RESUMEN vs Precio Real de Oferta:`);
console.log(`  A) Perito Suma Partes : ${densA}/10 dentro de ±20%  |  error promedio ${avgA.toFixed(1)}%`);
console.log(`  B) Motor Romina       : ${densB}/10 dentro de ±20%  |  error promedio ${avgB.toFixed(1)}%`);
console.log(`\n  Ganador vs mercado real: ${avgA < avgB ? 'A) Metodología Perito' : 'B) Motor PropValu'}`);
console.log('='.repeat(90) + '\n');
