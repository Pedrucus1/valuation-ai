/**
 * diagnostico_colonias.js — Escaneo masivo de los 712 OPIs del cerebro
 * Detecta: colonias basura, municipios inválidos, colonias sin IDX, sin similares, sin NSE
 * Uso: node diagnostico_colonias.js [--output diagnostico.json]
 */
const fs   = require('fs');
const path = require('path');

const cerebro  = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));
const IDX      = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const NSE      = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_nse.json'), 'utf8'));
const SIM      = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_similares.json'), 'utf8'));
const SIMIA    = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_similares_enriquecido.json'), 'utf8'));

const args = process.argv.slice(2);
const OUTPUT_FILE = args[args.indexOf('--output') !== -1 ? args.indexOf('--output')+1 : -1] || 'diagnostico_colonias.json';

// ── Helpers ────────────────────────────────────────────────────────────────
function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s]/g,'').trim();
}
function normCol(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ñ/g,'n').replace(/[^a-z0-9\s]/g,'').trim();
}
function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    return m ? parseFloat(m[0].replace(/,/g,'')) : 0;
}
function normTipo(s) {
    const t = normSimple(s||'');
    if (t.includes('depart')) return 'departamento';
    return 'casa';
}

const MUNIS_AMG = new Set([
    'guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque',
    'tlajomulco','tlajomulco de zuniga','tonala','el salto'
]);

// Patrones de colonia claramente basura (no son nombres de colonia)
const GARBAGE_PATTERNS = [
    /https?:/i, /www\./i, /\.com/i, /\.mx/i,
    /entre calle/i, /entre\s+\w+\s+y\s+\w+/i,
    /cp\s*\d{5}/i,                          // código postal
    /\d+m2/i, /\dm\b/i,                     // medidas
    /recamar/i, /cochera/i,                  // descripciones de inmueble
    /inmueble/i, /construccion\s+de\s+/i,
    /precio\s+de\s+/i, /en\s+venta/i,
    /\bsecc\b.*\d{3,}/i,                    // "Secc 12122"
    /\bcoto\s+\d+\b/i,                       // "Coto 5"
    /col\.\s+alta\s+california/i,            // descripción mezclada
];

function esBasura(colonia) {
    if (!colonia || colonia.trim().length < 2) return true;
    const c = colonia.trim();
    if (c.length > 80) return true;
    if (c.split(/\s+/).length > 9) return true;
    if (/\d{5,}/.test(c)) return true;       // números largos (CP, etc.)
    return GARBAGE_PATTERNS.some(p => p.test(c));
}

function anioDesFolio(folio) {
    const m = (folio||'').match(/OPI-(\d{2})-/);
    return m ? 2000 + parseInt(m[1]) : 0;
}

// ── Tipos residenciales ────────────────────────────────────────────────────
const TIPOS_RESIDENCIAL = [
    'CASA HABITACIÓN','DEPARTAMENTO EN CONDOMINIO','CASA HABITACIÓN EN CONDOMINIO',
    'CASA HABITACIÓN CON LOCAL','CASA HABITACIÓN TIPO DÚPLEX','CASA HABITACIÓN TIPO DUPLEX',
    'DEPARTAMENTO CON TERRAZA','DEPARTAMENTO EN CONDOMINIO LOCKOFF'
];

// ── Escanear ───────────────────────────────────────────────────────────────
const problemas = {
    municipio_invalido:   [],
    colonia_basura:       [],
    colonia_vaga:         [],   // nombre demasiado genérico (igual al municipio)
    sin_idx:              [],   // no tiene listings en IDX
    sin_similares:        [],   // no tiene similares en ningún archivo
    sin_nse:              [],   // no tiene entrada NSE
    sin_valor_perito:     [],
};

const resumen_colonias = {};  // colNorm → { opis, tenIDX, tenSim, tenNSE, municipio }

for (const o of cerebro) {
    const esResidencial = TIPOS_RESIDENCIAL.some(t => (o.tipo||'').toUpperCase().startsWith(t.slice(0,10)));
    const muniNorm = normSimple(o.municipio||'');
    const colBruta = o.sujetoColonia || '';
    const colNorm  = normCol(colBruta);
    const tipoNorm = normTipo(o.tipo||'');
    const valorPerito = parsePesos(o.valorMercado);

    // Municipio inválido
    if (!MUNIS_AMG.has(muniNorm) && muniNorm.length >= 3) {
        problemas.municipio_invalido.push({ folio: o.folio, municipio: o.municipio, colonia: colBruta });
        continue; // no analizar más
    }

    if (!esResidencial) continue;
    if (valorPerito === 0) {
        problemas.sin_valor_perito.push({ folio: o.folio, municipio: o.municipio, colonia: colBruta });
        continue;
    }

    // Colonia basura
    if (esBasura(colBruta)) {
        problemas.colonia_basura.push({ folio: o.folio, municipio: o.municipio, colonia: colBruta });
    }

    // Colonia vaga (igual o casi igual al municipio)
    const vagaPats = [muniNorm, 'jalisco', 'zona metropolitana', 'amg', 'sin colonia', 'n/a', 'no aplica', 's/n'];
    if (vagaPats.some(p => colNorm === p || colNorm.length < 3)) {
        problemas.colonia_vaga.push({ folio: o.folio, municipio: o.municipio, colonia: colBruta });
    }

    // Acumular por colonia
    if (!resumen_colonias[colNorm]) {
        resumen_colonias[colNorm] = {
            coloniaBruta: colBruta, municipio: o.municipio,
            opis: 0, tenIDX: false, tenSim: false, tenNSE: false, tipoNorm
        };
    }
    const rc = resumen_colonias[colNorm];
    rc.opis++;

    // IDX
    const idxMuni = IDX[muniNorm]?.[tipoNorm] || {};
    if (idxMuni[colNorm] && idxMuni[colNorm].count >= 1) rc.tenIDX = true;

    // Similares
    if ((SIM[colNorm] && SIM[colNorm].length > 0) || (SIMIA[colNorm] && SIMIA[colNorm].length > 0)) rc.tenSim = true;

    // NSE
    if (NSE[colNorm]) rc.tenNSE = true;
}

// Agregar problemas por colonia
for (const [colNorm, rc] of Object.entries(resumen_colonias)) {
    if (!rc.tenIDX) problemas.sin_idx.push({ colonia: rc.coloniaBruta, colNorm, municipio: rc.municipio, opis: rc.opis });
    if (!rc.tenSim) problemas.sin_similares.push({ colonia: rc.coloniaBruta, colNorm, municipio: rc.municipio, opis: rc.opis });
    if (!rc.tenNSE) problemas.sin_nse.push({ colonia: rc.coloniaBruta, colNorm, municipio: rc.municipio, opis: rc.opis });
}

// Ordenar por impacto (OPIs afectados)
for (const k of ['sin_idx','sin_similares','sin_nse']) {
    problemas[k].sort((a,b) => (b.opis||0) - (a.opis||0));
}

// ── Reporte en consola ────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║        DIAGNÓSTICO MASIVO — CEREBRO DATOS (712 OPIs)     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log(`🏙️  Colonias únicas encontradas: ${Object.keys(resumen_colonias).length}`);
console.log(`🗺️  Municipios inválidos:   ${problemas.municipio_invalido.length} OPIs`);
console.log(`🗑️  Colonias basura:        ${problemas.colonia_basura.length} OPIs`);
console.log(`❓  Colonias vagas:         ${problemas.colonia_vaga.length} OPIs`);
console.log(`📭  Sin IDX:                ${problemas.sin_idx.length} colonias únicas`);
console.log(`🔗  Sin similares:          ${problemas.sin_similares.length} colonias únicas`);
console.log(`📊  Sin NSE cap:            ${problemas.sin_nse.length} colonias únicas`);

if (problemas.municipio_invalido.length) {
    console.log('\n── MUNICIPIOS INVÁLIDOS ──────────────────────────────────');
    problemas.municipio_invalido.slice(0,20).forEach(p =>
        console.log(`  ${(p.folio||'?').padEnd(16)} municipio:"${p.municipio}" colonia:"${p.colonia}"`)
    );
    if (problemas.municipio_invalido.length > 20) console.log(`  ... y ${problemas.municipio_invalido.length-20} más`);
}

if (problemas.colonia_basura.length) {
    console.log('\n── COLONIAS BASURA (muestra) ─────────────────────────────');
    problemas.colonia_basura.slice(0,15).forEach(p =>
        console.log(`  ${(p.folio||'?').padEnd(16)} "${p.colonia.slice(0,60)}"`)
    );
    if (problemas.colonia_basura.length > 15) console.log(`  ... y ${problemas.colonia_basura.length-15} más`);
}

if (problemas.colonia_vaga.length) {
    console.log('\n── COLONIAS VAGAS ────────────────────────────────────────');
    problemas.colonia_vaga.slice(0,10).forEach(p =>
        console.log(`  ${(p.folio||'?').padEnd(16)} "${p.colonia}" (muni: ${p.municipio})`)
    );
}

console.log('\n── TOP 30 COLONIAS SIN SIMILARES (por volumen de OPIs) ───');
problemas.sin_similares.slice(0,30).forEach(p =>
    console.log(`  ${(p.colonia||'').slice(0,32).padEnd(32)} muni:${(p.municipio||'').slice(0,14).padEnd(14)} opis:${p.opis}  nse:${NSE[p.colNorm]?'✓':'✗'}  idx:${(IDX[normSimple(p.municipio||'')])?.[p.tipoNorm||'casa']?.[p.colNorm]?'✓':'✗'}`)
);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(problemas, null, 2));
console.log(`\n✅ Diagnóstico completo guardado en ${OUTPUT_FILE}`);
