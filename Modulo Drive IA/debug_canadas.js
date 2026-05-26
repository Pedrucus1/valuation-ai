/**
 * debug_canadas.js — Trace exacto del motor para Cañadas de San Lorenzo
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

// Copiar funciones del motor
const NSE = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));
const IDX = JSON.parse(fs.readFileSync(path.join(DIR,'cache_index.json'),'utf8'));

function normCol(s) {
    if (!s) return '';
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
            .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function normMuni(s) { return normCol(s); }

function getSimilares(colNorm) {
    const entry = SIM[colNorm];
    if (!entry || !Array.isArray(entry)) return [];
    return entry;
}

function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length%2===0 ? (s[m-1]+s[m])/2 : s[m];
}

function dedup(arr) {
    const out = [];
    for (const d of arr) {
        const dup = out.some(x => Math.abs(x.p - d.p)/Math.max(x.p,1) < 0.02 && x.c === d.c);
        if (!dup) out.push(d);
    }
    return out;
}

function listingsEnMuni(muni, tipo) {
    const byMuni = IDX[muni];
    if (!byMuni) return [];
    const byTipo = byMuni[tipo];
    if (!byTipo) return [];
    const out = [];
    for (const [co, data] of Object.entries(byTipo)) {
        if (!data || !Array.isArray(data.listings)) continue;
        for (const l of data.listings) {
            if (l.c > 0 && l.p > 0) out.push({ co, c: l.c, p: l.p, t: l.t || 0 });
        }
    }
    return out;
}

// ── Params ──
const colNorm   = normCol('Cañadas de San Lorenzo');
const muniNorm  = normMuni('Zapopan');
const m2C       = 74.36;
const tipo      = 'casa';

console.log(`colNorm: "${colNorm}"`);
console.log(`muniNorm: "${muniNorm}"`);

// NSE
const nseSubjeto = NSE[colNorm] || null;
console.log(`\nnseSubjeto: ${JSON.stringify(nseSubjeto)}`);

// SIM
const similaresBrutos = getSimilares(colNorm).slice(0, 8).map(x => normCol(x.colonia));
console.log(`similaresBrutos: ${JSON.stringify(similaresBrutos)}`);

const similares = nseSubjeto
    ? similaresBrutos.filter(s => {
        const ns = NSE[s];
        if (!ns) return true;
        return Math.abs(ns.nseIdx - nseSubjeto.nseIdx) <= 1;
      })
    : similaresBrutos;
console.log(`similares (after NSE filter): ${JSON.stringify(similares)}`);

// NSE of each SIM entry
similaresBrutos.forEach(s => {
    const ns = NSE[s];
    console.log(`  NSE["${s}"]: ${JSON.stringify(ns)}`);
});

// Pool base
const todos = listingsEnMuni(muniNorm, tipo);
console.log(`\ntodos (Zapopan/casa): ${todos.length}`);

// enColoniaTodos
const enColoniaTodos = colNorm ? todos.filter(d => {
    const dc = normCol(d.co);
    return dc.includes(colNorm) || colNorm.includes(dc);
}) : [];
console.log(`enColoniaTodos: ${enColoniaTodos.length}`);

// Show sample of false positives in enColoniaTodos
const colonias_ct = [...new Set(enColoniaTodos.map(d => d.co))];
console.log(`  colonias in enColoniaTodos (${colonias_ct.length}): ${colonias_ct.slice(0,20).join(', ')}`);

// enNSEBrutos
const enNSEBrutos = similares.length ? todos.filter(d => {
    const dc = normCol(d.co);
    return similares.some(s => dc.includes(s) || s.includes(dc));
}) : [];
console.log(`\nenNSEBrutos: ${enNSEBrutos.length}`);

const pm2sNSE = enNSEBrutos.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
const medNSE  = pm2sNSE.length ? mediana(pm2sNSE) : 0;
const enNSETodos = medNSE > 0
    ? enNSEBrutos.filter(d => { const pm2 = d.p / d.c; return pm2 >= medNSE * 0.40 && pm2 <= medNSE * 2.20; })
    : enNSEBrutos;
console.log(`enNSETodos: ${enNSETodos.length}, medNSE: ${Math.round(medNSE)}`);

// Band
const fuenteBanda = enColoniaTodos.length >= 5 ? enColoniaTodos : [...enColoniaTodos, ...enNSETodos];
const pm2sBanda = fuenteBanda.map(d => d.p / d.c).filter(v => v > 0 && isFinite(v));
const tieneAnclaje = pm2sBanda.length >= 3;
const medRef    = tieneAnclaje ? mediana(pm2sBanda) : 0;
const bandaMin  = tieneAnclaje ? medRef * 0.40 : 0;
const bandaMax  = tieneAnclaje ? medRef * 1.60 : Infinity;

console.log(`\nBanda: fuenteBanda.length=${fuenteBanda.length} tieneAnclaje=${tieneAnclaje}`);
console.log(`  medRef=${Math.round(medRef)} bandaMin=${Math.round(bandaMin)} bandaMax=${Math.round(bandaMax)}`);

// Check specific listings
const targetListings = [
    { co: 'canadas de san lorenzo', c: 105, p: 3549050 },
    { co: 'ionamiento canadas de san lorenzo', c: 56, p: 2050000 },
    { co: 'canadas san lorenzo', c: 99, p: 3499000 },
];
console.log(`\n── Checking target listings in pool filter ──`);
for (const l of targetListings) {
    const m2cFilter = m2C > 0 && Math.abs(l.c - m2C) / Math.max(l.c, m2C) >= 0.50;
    const pm2 = l.p / l.c;
    const bandFilter = pm2 >= bandaMin && pm2 <= bandaMax;
    console.log(`  "${l.co}" c=${l.c} pm2=${Math.round(pm2)}: m2C_excl=${m2cFilter} band_ok=${bandFilter} → in_pool=${!m2cFilter && bandFilter}`);
}

// Full pool
const pool = dedup(todos.filter(d => {
    if (m2C > 0 && Math.abs(d.c - m2C) / Math.max(d.c, m2C) >= 0.50) return false;
    const pm2 = d.p / d.c;
    return pm2 >= bandaMin && pm2 <= bandaMax;
}));
console.log(`\npool (after m2C+band+dedup): ${pool.length}`);

// Check if target listings are in pool
for (const l of targetListings) {
    const found = pool.find(d => normCol(d.co) === normCol(l.co) && d.c === l.c);
    console.log(`  "${l.co}" in pool: ${!!found}`);
}

// enColonia
const coloniaEsVaga = false; // "canadas de san lorenzo" is not a municipality name
const enColonia = (!coloniaEsVaga && colNorm) ? pool.filter(d => {
    const dc = normCol(d.co);
    if (!dc || dc.length < 5) return false;
    const ratio = Math.min(dc.length, colNorm.length) / Math.max(dc.length, colNorm.length);
    return ratio >= 0.55 && (dc.includes(colNorm) || colNorm.includes(dc));
}) : [];
console.log(`\nenColonia: ${enColonia.length}`);
enColonia.forEach(d => console.log(`  dc="${d.co}" c=${d.c} pm2=${Math.round(d.p/d.c)}`));

// enSim
console.log(`\n── enSim check ──`);
if (enColonia.length < 3 && similares.length > 0) {
    const enSim = pool.filter(d => {
        const dc = normCol(d.co);
        if (!dc || dc.length < 4) return false;
        if (colNorm && (dc.includes(colNorm) || colNorm.includes(dc))) return false;
        const matches = similares.some(s => s.length >= 4 && dc.includes(s));
        return matches;
    });
    console.log(`enSim: ${enSim.length}`);
    enSim.forEach(d => {
        const matchedSim = similares.filter(s => s.length >= 4 && normCol(d.co).includes(s));
        console.log(`  dc="${d.co}" c=${d.c} pm2=${Math.round(d.p/d.c)} matched_sim=${JSON.stringify(matchedSim)}`);
    });

    // Debug the "canadas san lorenzo" listing specifically
    const target = pool.filter(d => normCol(d.co) === 'canadas san lorenzo');
    console.log(`\n  "canadas san lorenzo" in pool: ${target.length} entries`);
    target.forEach(d => {
        const dc = normCol(d.co);
        const excl = colNorm && (dc.includes(colNorm) || colNorm.includes(dc));
        const simMatch = similares.some(s => s.length >= 4 && dc.includes(s));
        console.log(`    dc="${dc}" excl_by_colonia=${excl} sim_match=${simMatch}`);
        console.log(`    colNorm="${colNorm}" dc.includes(colNorm)=${dc.includes(colNorm)} colNorm.includes(dc)=${colNorm.includes(dc)}`);
        similares.forEach(s => {
            console.log(`    s="${s}" s.length=${s.length} dc.includes(s)=${dc.includes(s)}`);
        });
    });
} else {
    console.log(`Skipping enSim: enColonia.length=${enColonia.length} similares.length=${similares.length}`);
}
