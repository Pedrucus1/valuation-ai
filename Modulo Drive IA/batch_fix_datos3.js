/**
 * batch_fix_datos3.js — Tercera ronda de correcciones
 * - NSE para colonias sin cobertura que caían al pool general
 * - Similares para colonias nuevas en NSE
 * - Fix cerebro: Alta California
 * Uso: node batch_fix_datos3.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const cerebro = JSON.parse(fs.readFileSync(path.join(DIR,'cerebro_datos.json'),'utf8'));
const NSE     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let cc=0, nc=0, sc=0;

// ── 1. Cerebro ────────────────────────────────────────────────────────────────
// OPI-25-4-19-AV: "Int 298 col Alta California" → "Alta California" (detectado por IA)
const col_fixes = {
    'OPI-25-4-19-AV': { sujetoColonia: 'Alta California' },
};

for (const o of cerebro) {
    if (o.folio && col_fixes[o.folio]) {
        const fix = col_fixes[o.folio];
        if (fix.sujetoColonia && fix.sujetoColonia !== o.sujetoColonia) {
            console.log(`  COL: ${o.folio} "${o.sujetoColonia}" → "${fix.sujetoColonia}"`);
            o.sujetoColonia = fix.sujetoColonia; cc++;
        }
    }
}
fs.writeFileSync(path.join(DIR,'cerebro_datos.json'), JSON.stringify(cerebro, null, 2));
console.log(`✅ cerebro: ${cc} cambios\n`);

// ── 2. NSE — colonias sin cobertura detectadas en diagnóstico ─────────────────
// pm2c validado contra: IDX cache_index.json, valores perito del cerebro, conocimiento GDL
const nse_updates = {
    // IDX-validados
    'auditorio':             { nse:'medio-medio', nseIdx:3, medianaPm2:19000 },   // IDX $18,521 n=2 Zapopan
    'moctezuma':             { nse:'medio-medio', nseIdx:3, medianaPm2:26190 },   // IDX $26,190 n=2 Zapopan
    'parques de la victoria': { nse:'medio-medio', nseIdx:3, medianaPm2:18500 }, // perito 2026 $18,357 Tonalá

    // Perito-validados
    'mision del bosque':     { nse:'medio-alto', nseIdx:4, medianaPm2:27000 },   // peritos ~$20-33k → promedio $27k
    'san elias':             { nse:'medio-alto', nseIdx:4, medianaPm2:28000 },   // peritos $20-33k → $28k
    'alteza residencial nuevo mexico': { nse:'medio-alto', nseIdx:4, medianaPm2:30000 }, // peritos 2023 ajustados $31-35k
    'cantera colorada':      { nse:'medio-medio', nseIdx:3, medianaPm2:19000 },  // perito 2026 $18,584
    'tinajitas':             { nse:'medio-medio', nseIdx:3, medianaPm2:18000 },  // perito 2025 $18,173
    'el parque':             { nse:'medio-alto', nseIdx:4, medianaPm2:32000 },   // perito 2025 $32,662
    'balcones de oblatos':   { nse:'medio-bajo', nseIdx:2, medianaPm2:15000 },  // perito 2025 $15,326
    'villas de zapotepec':   { nse:'medio-bajo', nseIdx:2, medianaPm2:13000 },  // perito 2025 $13,086
    'atotonilquillo':        { nse:'medio-bajo', nseIdx:2, medianaPm2:17000 },  // perito AMG $17,795 (SanPedro)

    // IA-estimados (DeepSeek) + conocimiento GDL
    'alta california':       { nse:'medio-medio', nseIdx:3, medianaPm2:23000 },  // Zapopan zona ITESO
    'valle de san nicolas':  { nse:'medio-medio', nseIdx:3, medianaPm2:17000 },  // Zapopan, peritos ~$16k
    'la experiencia':        { nse:'medio-medio', nseIdx:3, medianaPm2:20000 },  // Zapopan norte
    'postes cuates':         { nse:'medio-bajo', nseIdx:2, medianaPm2:13000 },   // GDL popular
    'el refugio':            { nse:'medio-bajo', nseIdx:2, medianaPm2:15000 },   // Tlaquepaque/Tlajomulco
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? `nseIdx=${NSE[col].nseIdx} pm2:${NSE[col].medianaPm2}` : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" [${prev}] → nseIdx=${vals.nseIdx} pm2:${vals.medianaPm2}`);
    nc++;
}
fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ NSE: ${nc} cambios\n`);

// ── 3. Similares para colonias NSE nuevas ─────────────────────────────────────
function sim(arr) { return arr.map(([c,p]) => ({ colonia:c, peso:p })); }

const sim_updates = {
    'auditorio': sim([
        ['el colli urbano',20],['ciudad granja',18],['el bajio',16],['nueva galicia',14],['parque de la castellana',12],
    ]),
    'moctezuma': sim([
        ['el campanario',20],['la primavera',18],['paraisos del colli',16],['los robles',14],
    ]),
    'parques de la victoria': sim([
        ['tonala centro',20],['loma dorada a',18],['el cerrito tonala',16],['coyula',14],
    ]),
    'mision del bosque': sim([
        ['puerta plata',20],['la cima',18],['los pinos residencial',16],['pinar de la venta',14],
    ]),
    'san elias': sim([
        ['country club guadalajara',20],['jardines del bosque',18],['americana',16],['providencia',14],['chapalita',12],
    ]),
    'alteza residencial nuevo mexico': sim([
        ['nuevo mexico',20],['puerta de hierro',18],['ciudad granja',16],['virreyes',14],
    ]),
    'cantera colorada': sim([
        ['las pintas',20],['el verde',18],['san rafael tlaquepaque',16],['las juntas',14],
    ]),
    'tinajitas': sim([
        ['las pintas',20],['san rafael tlaquepaque',18],['hacienda real',16],['las juntas',14],
    ]),
    'el parque': sim([
        ['ciudad del sol',20],['moctezuma',18],['paraisos del colli',16],['el campanario',14],
    ]),
    'balcones de oblatos': sim([
        ['oblatos',20],['colonia oblatos',18],['huentitan el alto',16],['guadalajara centro',14],
    ]),
    'villas de zapotepec': sim([
        ['tlajomulco centro',20],['hacienda real',18],['santa cruz del valle',16],['la tijera',14],
    ]),
    'atotonilquillo': sim([
        ['el verde',20],['rancho nuevo',18],['las pintas',16],['san rafael tlaquepaque',14],
    ]),
    'alta california': sim([
        ['nuevo mexico',20],['ciudad granja',18],['auditorio',16],['la estancia',14],
    ]),
    'valle de san nicolas': sim([
        ['mariano otero',20],['nuevo mexico',18],['paraisos del colli',16],['el campanario',14],
    ]),
    'la experiencia': sim([
        ['tesistan',20],['mariano otero',18],['nuevo mexico',16],['colli urbano',14],
    ]),
    'postes cuates': sim([
        ['moderna',20],['santa teresita',18],['mexicaltzingo',16],['guadalajara centro',14],
    ]),
    'el refugio': sim([
        ['la providencia',20],['hacienda real',18],['loma dorada a',16],['tonala centro',14],
    ]),
};

for (const [col, sims] of Object.entries(sim_updates)) {
    const prev = SIM[col] ? SIM[col].length : 0;
    SIM[col] = sims;
    console.log(`  SIM: "${col}" ${prev} → ${sims.length}`);
    sc++;
}
fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ SIM: ${sc} cambios`);
console.log(`\nTOTAL: ${cc} cerebro + ${nc} NSE + ${sc} similares`);
