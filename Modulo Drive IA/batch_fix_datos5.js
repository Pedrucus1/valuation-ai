/**
 * batch_fix_datos5.js — Quinta ronda de correcciones
 * Diagnóstico post-batch4:
 *   - 2 OPIs Loma Bonita Ejidal con municipio=Zapopan → corregir a Tlaquepaque
 *   - NSE incorrectos para 6 colonias (las agujas $9k→$22k, echeverria $18k→$15k, etc.)
 *   - SIM con colonias equivocadas (victoria, la paz, las agujas, echeverria, emiliano zapata, parques victoria)
 * Uso: node batch_fix_datos5.js
 */
const fs   = require('fs');
const path = require('path');
const DIR  = __dirname;

const cerebro = JSON.parse(fs.readFileSync(path.join(DIR,'cerebro_datos.json'),'utf8'));
const NSE     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_nse.json'),'utf8'));
const SIM     = JSON.parse(fs.readFileSync(path.join(DIR,'colonias_similares.json'),'utf8'));

let cc=0, nc=0, sc=0;

// ── 1. Cerebro: municipio fixes ───────────────────────────────────────────────
// Loma Bonita Ejidal es una colonia de Tlaquepaque, no Zapopan.
// El motor busca en IDX[municipio_norm], así que con municipio=Zapopan no encuentra la colonia
// → cae a suma_partes_mix. Con Tlaquepaque, usa el pool general de Tlaquepaque (7 comps).
// Evidencia: OPI-25-6-14-AV (Tlaquepaque / Loma Bonita Ejidal) → ✅ pool:general n:7.
const col_fixes = {
    'OPI-25-7-03-OF': { municipio: 'Tlaquepaque' },
    'OPI-25-6-17-LM': { municipio: 'Tlaquepaque' },
};

for (const o of cerebro) {
    if (o.folio && col_fixes[o.folio]) {
        const fix = col_fixes[o.folio];
        if (fix.municipio && fix.municipio !== o.municipio) {
            console.log(`  MUN: ${o.folio} "${o.municipio}" → "${fix.municipio}" (col: ${o.sujetoColonia})`);
            o.municipio = fix.municipio; cc++;
        }
    }
}
fs.writeFileSync(path.join(DIR,'cerebro_datos.json'), JSON.stringify(cerebro, null, 2));
console.log(`✅ cerebro: ${cc} cambios\n`);

// ── 2. NSE corrections ────────────────────────────────────────────────────────
// Criterios: IDX pm2c validado + perito valor como evidencia primaria
const nse_updates = {
    // Las Agujas (Zapopan): era nseIdx=1 $9,000 — completamente equivocado.
    // IDX: "las agujas" n=1, pm2c=$20,220. Perito OPI-26-2-05-OF: $1,747k / 69.39m²C = $25,178/m²c.
    // La colonia está en Zapopan norte, zona media-media.
    'las agujas': { nse:'medio-medio', nseIdx:3, medianaPm2:22000 },

    // Echeverría (GDL): era $18,000. IDX: n=3, pm2c=$15,741.
    // Perito OPI-26-2-15-OF: $2,874k / 200.88m²C = $14,307/m²c (2026 sin ajuste).
    // Reducir para frenar sobrevaluación (+26.8% actual).
    'echeverria': { nse:'medio-bajo', nseIdx:2, medianaPm2:15000 },

    // Victoria (Zapopan): era $37,609 — demasiado alto, no tiene efecto como cap.
    // IDX: "victoria" n=11, pm2c=$32,295. Actualizar a IDX real.
    'victoria': { nse:'medio-alto', nseIdx:4, medianaPm2:32000 },

    // La Paz (GDL): sin NSE. Zona media-alta de GDL (Americana/Lafayette adyacente).
    // Perito OPI-25-7-14-LM: $2,968k / 114.06m²C = $26,025/m²c (raw 2025).
    'la paz': { nse:'medio-alto', nseIdx:4, medianaPm2:26000 },

    // Emiliano Zapata (Zapopan): era nseIdx=2 $14,634 (único listing IDX).
    // La colonia en Zapopan es zona media; perito ~$19k/m²c.
    'emiliano zapata': { nse:'medio-medio', nseIdx:3, medianaPm2:19500 },

    // Tinajitas (Tlaquepaque): era nseIdx=3 $18,000 — demasiado alto.
    // Perito OPI-25-11-02-OF: $1,377k (raw) / 150.50m²C = $9,149/m²c → zona interés social/bajo.
    // NSE cap = $10,500 × 1.15 = $12,075 para frenar sobrevaluación.
    'tinajitas': { nse:'interes-social', nseIdx:1, medianaPm2:10500 },

    // Parques de la Victoria (Tonalá): era $18,500, perito muestra ~$18.3k/m²c.
    // Ajustar pm2c para que el cap sea efectivo. Mantener nseIdx=3.
    'parques de la victoria': { nse:'medio-medio', nseIdx:3, medianaPm2:18000 },
};

for (const [col, vals] of Object.entries(nse_updates)) {
    const prev = NSE[col] ? `nseIdx=${NSE[col].nseIdx} pm2:${NSE[col].medianaPm2}` : 'NEW';
    NSE[col] = { ...vals, nListings: NSE[col]?.nListings || 1 };
    console.log(`  NSE: "${col}" [${prev}] → nseIdx=${vals.nseIdx} pm2:${vals.medianaPm2}`);
    nc++;
}
fs.writeFileSync(path.join(DIR,'colonias_nse.json'), JSON.stringify(NSE, null, 2));
console.log(`\n✅ NSE: ${nc} cambios\n`);

// ── 3. SIM corrections ───────────────────────────────────────────────────────
// REGLA: usar claves IDX exactas (verificadas en cache_index.json).
// El pool filter usa dc.includes(s) — la clave SIM debe ser substring del key IDX del listing.
function sim(arr) { return arr.map((c, i) => ({ colonia: c, peso: 20 - i * 2 })); }

const sim_updates = {
    // Las Agujas (Zapopan ~$22k): SIM anterior tenía tesistan área ~$10-15k (equivocado).
    // IDX Zapopan $20-27k: nuevo mexico ($26.7k, n=51), parques de tesistan ($22.2k, n=20),
    // capital norte ($26.3k, n=26), el fortin ($26.5k, n=28), santa ana tepetitlan ($29k, n=26).
    'las agujas': sim(['nuevo mexico','parques de tesistan','capital norte','el fortin','santa ana tepetitlan']),

    // Echeverría (GDL ~$15k): SIM anterior tenía moderna ($25k) y verde valle ($27k) — demasiado caro.
    // IDX GDL $12-17k: heliodoro hernandez loza 1a ($12.3k), analco ($14.8k), oblatos ($14k),
    // huentitan el bajo ($17.9k), alcalde barranquitas ($17.8k).
    'echeverria': sim(['heliodoro hernandez loza 1a','analco','oblatos','huentitan el bajo','alcalde barranquitas']),

    // Victoria (Zapopan ~$32k): SIM anterior tenía garbage (_simIA): loma bonita ejidal, zapopan, etc.
    // IDX Zapopan $30-42k: la estancia ($42.7k, n=21), jardin real ($38.9k, n=43),
    // solares ($38.5k, n=160), bosques vallarta ($34.2k, n=85), real de valdepenas ($30.1k, n=24).
    // Band filter (victoriaIDX $32k × 1.60 = $51.2k) corta los > $51k, estos pasan.
    'victoria': sim(['la estancia','jardin real','solares','bosques vallarta','real de valdepenas']),

    // La Paz (GDL ~$26k): SIM anterior tenía "casa una planta 4 recamaras" (garbage _simIA).
    // IDX GDL $26-34k: ladron de guevara ($33.4k, n=41), americana ($31.6k, n=40),
    // jardines del country ($28.9k, n=32), verde valle ($27.7k, n=10), bosques de la victoria ($25.9k, n=16).
    'la paz': sim(['ladron de guevara','americana','jardines del country','verde valle','bosques de la victoria']),

    // Emiliano Zapata (Zapopan ~$19.5k): SIM anterior tenía la primavera/campanario ($34-35k — demasiado caro).
    // IDX Zapopan $20-27k: nuevo mexico ($26.7k), parques de tesistan ($22.2k),
    // capital norte ($26.3k), el fortin ($26.5k), madeiras ($23.6k).
    'emiliano zapata': sim(['nuevo mexico','parques de tesistan','capital norte','el fortin','madeiras']),

    // Parques de la Victoria (Tonalá ~$18k): SIM batch4 incluía 'coyula' y 'loma dorada a'
    // que tienen pm2c <$20k y diluyen el pool. Reemplazar con colonias Tonalá más densas y similares.
    // IDX Tonalá $20-25k: tonala centro ($24.8k, n=10), hacienda real ($24.9k, n=3),
    // el moral ($24.7k, n=3), vistas del pedregal i ($18.5k, n=5).
    'parques de la victoria': sim(['tonala centro','hacienda real','el moral','vistas del pedregal i','loma dorada delegacion a']),
};

for (const [col, sims] of Object.entries(sim_updates)) {
    const prev = SIM[col] ? SIM[col].map(s=>s.colonia).join(', ') : 'NONE';
    SIM[col] = sims;
    console.log(`  SIM: "${col}"`);
    console.log(`       antes: ${prev}`);
    console.log(`       ahora: ${sims.map(s=>s.colonia).join(', ')}`);
    sc++;
}
fs.writeFileSync(path.join(DIR,'colonias_similares.json'), JSON.stringify(SIM, null, 2));
console.log(`\n✅ SIM: ${sc} cambios`);
console.log(`\nTOTAL: ${cc} cerebro + ${nc} NSE + ${sc} SIM`);
