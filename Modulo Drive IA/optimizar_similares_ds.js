/**
 * optimizar_similares_ds.js
 *
 * Para cada OPI que falla >20%, pide a DeepSeek que encuentre
 * las colonias similares óptimas del IDX local para acercar el motor al perito.
 *
 * Uso:
 *   node optimizar_similares_ds.js            → analiza todos los fallos del validador
 *   node optimizar_similares_ds.js --apply    → también actualiza colonias_similares.json
 *   node optimizar_similares_ds.js --skip 40  → desde OPI 41
 */
require('dotenv').config({ path: '../.env' });
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { valuarPropiedadCompleto, normTipo, normCol, normMuni } = require('./motor_romina_api');

const APPLY = process.argv.includes('--apply');
const args  = process.argv.slice(2);
const SKIP  = parseInt(args[args.indexOf('--skip') !== -1 ? args.indexOf('--skip') + 1 : -1] || 0);
const N     = parseInt(args[args.indexOf('--n') !== -1 ? args.indexOf('--n') + 1 : -1] || 40);

const deepseek = new OpenAI({
    apiKey: 'sk-002d18925d514fa7997b0b35718efd82',
    baseURL: 'https://api.deepseek.com/v1'
});

const IDX     = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache_index.json'), 'utf8'));
const NSE     = JSON.parse(fs.readFileSync(path.join(__dirname, 'colonias_nse.json'), 'utf8'));
const cerebro = JSON.parse(fs.readFileSync(path.join(__dirname, 'cerebro_datos.json'), 'utf8'));

const SIM_PATH = path.join(__dirname, 'colonias_similares.json');
const sim = JSON.parse(fs.readFileSync(SIM_PATH, 'utf8'));

const TIPOS_RESIDENCIAL = [
    'CASA HABITACIÓN','DEPARTAMENTO EN CONDOMINIO','CASA HABITACIÓN EN CONDOMINIO',
    'CASA HABITACIÓN CON LOCAL','CASA HABITACIÓN TIPO DÚPLEX','CASA HABITACIÓN TIPO DUPLEX',
    'DEPARTAMENTO CON TERRAZA','DEPARTAMENTO EN CONDOMINIO LOCKOFF'
];
const MUNIS_AMG = new Set(['guadalajara','zapopan','tlaquepaque','san pedro tlaquepaque','tlajomulco','tlajomulco de zuniga','tonala','el salto']);

function normSimple(s) {
    return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s]/g,'').trim();
}
function parsePesos(s) {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    const m = s.toString().match(/[\d,]+\.?\d*/);
    return m ? parseFloat(m[0].replace(/,/g,'')) : 0;
}

// ── Fórmulas del motor (espejo para que DeepSeek entienda el contexto) ──────
const FACTORES_CONSERVACION = {
    nuevo:1.05, muy_bueno:1.05, bueno:1.00,
    regular_bueno:0.85, regular_medio:0.75,
    regular_malo:0.65, malo:0.55, muy_malo:0.45,
};
function factorEdad(poolTipo, edad) {
    if (poolTipo === 'exacta')    return 1.0;
    if (poolTipo === 'similares') return Math.max(0.85, 1 - (edad - 10) * 0.005);
    return Math.max(0.70, 1 - (edad - 10) * 0.01);
}

// ── Obtener colonias disponibles en IDX para un municipio ──────────────────
function getColoniasIDX(muniNorm, tipo = 'casa', nMin = 3) {
    const colonias = IDX[muniNorm]?.[tipo] || {};
    return Object.entries(colonias)
        .map(([col, d]) => ({
            col,
            pm2c:  Math.round(d.medianaPm2c),
            n:     d.count,
            nseIdx: (NSE[col] || {}).nseIdx,
            nse:   (NSE[col] || {}).nse,
        }))
        .filter(x => x.pm2c > 0 && x.n >= nMin)
        .sort((a, b) => b.pm2c - a.pm2c);
}

// ── Llamada a DeepSeek ─────────────────────────────────────────────────────
async function pedirSimilares(opi, motorResult, coloniasDisp) {
    const colNorm  = normCol(opi.colonia || '');
    const muniNorm = normMuni(opi.municipio || '');
    const m2C      = parsePesos(opi.m2Construccion);
    const edad     = parsePesos(opi.edad) || 0;
    const conserv  = opi.estadoConservacion || 'bueno';
    const valorPerito = parsePesos(opi.valorMercado);

    const nseSubj = NSE[colNorm] || {};
    const nseIdx  = nseSubj.nseIdx ?? '?';

    // pm2cAvg objetivo: valor_perito / (m2C * 0.95)
    const pm2cObjetivo = Math.round(valorPerito / (m2C * 0.95));

    // factores que aplicará el motor con pool='similares'
    const fEdad    = factorEdad('similares', edad);
    const fConserv = FACTORES_CONSERVACION[conserv] || 1.00;
    const nseCap   = nseSubj.medianaPm2 ? Math.round(nseSubj.medianaPm2 * 1.15) : null;

    // pm2c RAW promedio que necesitan tener los similares (antes de factores)
    const pm2cRawNecesario = Math.round(pm2cObjetivo / (fEdad * fConserv));

    const prompt = `Eres experto en selección de colonias comparables para valuación inmobiliaria en Jalisco, México.

PROPIEDAD SUJETO:
  Colonia: ${colNorm} | Municipio: ${muniNorm}
  NSE: ${nseIdx} (${nseSubj.nse || '?'}) | NSE mediana pm2c: ${nseSubj.medianaPm2 || '?'} MXN/m²
  m²C: ${m2C} | Edad: ${edad} años | Conservación: ${conserv}

RESULTADO ACTUAL DEL MOTOR:
  pm2cAvg actual: $${motorResult.pm2cAvg}/m² | poolTipo: ${motorResult.poolTipo} | nComps: ${motorResult.nComps}
  Valor motor: $${Math.round(motorResult.valor/1000)}k | Valor perito: $${Math.round(valorPerito/1000)}k
  Diferencia: ${((motorResult.valor - valorPerito)/valorPerito*100).toFixed(1)}%

OBJETIVO:
  pm2cAvg necesario (post-factores): $${pm2cObjetivo}/m²
  Para lograrlo, las colonias similares deben tener pm2c RAW promedio ≈ $${pm2cRawNecesario}/m²
  (El motor aplica: factorEdad=${fEdad.toFixed(3)}, factorConserv=${fConserv}, factorNeg=0.95)
  ${nseCap ? `NSE cap: $${nseCap}/m² (si pm2cAvg supera esto, se limita automáticamente)` : ''}

REGLA NSE: Solo puedes usar colonias con NSE en rango ±1 respecto al sujeto (NSE ${nseIdx}).
  ${nseIdx !== '?' ? `Rango aceptado: NSE ${Math.max(0,nseIdx-1)} a NSE ${Math.min(6,nseIdx+1)}` : 'Sin restricción NSE'}

COLONIAS DISPONIBLES EN ${muniNorm.toUpperCase()} (IDX scraper, n≥3 listings):
${coloniasDisp.slice(0, 40).map(c =>
    `  ${c.col.padEnd(38)} pm2c:$${c.pm2c.toLocaleString().padStart(7)}/m²  n=${c.n}  NSE:${c.nseIdx??'?'}`
).join('\n')}

TAREA:
Selecciona 4-6 colonias de la lista anterior cuyo pm2c RAW promedio se acerque a $${pm2cRawNecesario}/m².
Solo colonias con NSE compatible (±1 del sujeto NSE ${nseIdx}).
Prioriza colonias con más listings (n alto) para mayor estabilidad estadística.

Responde SOLO con JSON:
{"similares":[{"colonia":"nombre_exacto","pm2c":XXXXX,"n":X,"razon":"..."},...],"pm2cRawPromedio":XXXXX,"pm2cAvgEstimado":XXXXX,"diff_estimado_pct":"X.X%"}`;

    try {
        const res = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'Eres valuador inmobiliario Jalisco. Responde SOLO con JSON válido.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1200,
            temperature: 0.1
        });
        const text = res.choices[0].message.content.trim()
            .replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const m = text.match(/\{[\s\S]*"similares"[\s\S]*\}/);
        if (!m) { console.error('DS: sin JSON'); return null; }
        return JSON.parse(m[0]);
    } catch (e) {
        console.error('DS error:', e.message);
        return null;
    }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    const candidatos = cerebro.filter(o =>
        TIPOS_RESIDENCIAL.some(t => (o.tipo||'').toUpperCase().startsWith(t.slice(0,10)))
        && MUNIS_AMG.has(normSimple(o.municipio))
        && parsePesos(o.valorMercado) > 0
        && parsePesos(o.m2Construccion) > 0
    );
    const muestra = candidatos.slice(SKIP, SKIP + N);

    // Primer pass: correr el motor para detectar fallos
    console.log('\n=== DETECTANDO FALLOS >20% ===\n');
    const fallos = [];
    for (const opi of muestra) {
        const valorPerito = parsePesos(opi.valorMercado);
        const m2C = parsePesos(opi.m2Construccion);
        const prop = {
            tipo: normTipo(opi.tipo || 'casa'),
            construccion: m2C,
            terreno: parsePesos(opi.m2Terreno) || 0,
            edad: parsePesos(opi.edad) || 0,
            estadoConservacion: opi.estadoConservacion || 'bueno',
            recamaras: parsePesos(opi.recamaras) || 3,
            banos: parsePesos(opi.banos) || 2,
            municipio: opi.municipio || '',
            colonia: opi.sujetoColonia || '',
        };
        let res;
        try { res = await valuarPropiedadCompleto(prop); }
        catch(e) { continue; }

        if (!res || res.error === 'atipica' || res.valor === 0) continue;
        const diff = ((res.valor - valorPerito) / valorPerito) * 100;
        if (Math.abs(diff) > 20) {
            fallos.push({ opi: {...opi, colonia: opi.sujetoColonia}, motorResult: res, diff });
            console.log(`  ❌ ${opi.folio} diff:${diff.toFixed(1)}%  pool:${res.poolTipo}  pm2c:$${res.pm2cAvg}`);
        }
    }

    if (!fallos.length) {
        console.log('  ✅ Sin fallos >20% en esta muestra.');
        return;
    }

    console.log(`\n=== OPTIMIZANDO SIMILARES CON DEEPSEEK (${fallos.length} fallos) ===\n`);

    const cambios = {};

    for (const { opi, motorResult, diff } of fallos) {
        const muniNorm = normMuni(opi.municipio || '');
        const colNorm  = normCol(opi.colonia || '');
        const tipo     = normTipo(opi.tipo || 'casa');

        console.log(`\n── ${opi.folio} | ${opi.municipio} / ${opi.colonia}`);
        console.log(`   diff actual: ${diff.toFixed(1)}%  pool:${motorResult.poolTipo}  pm2c:$${motorResult.pm2cAvg}`);

        const coloniasDisp = getColoniasIDX(muniNorm, tipo, 2); // n≥2
        if (!coloniasDisp.length) {
            console.log('   ⚠️  Sin datos IDX para este municipio/tipo');
            continue;
        }

        const recomendacion = await pedirSimilares(opi, motorResult, coloniasDisp);
        if (!recomendacion || !recomendacion.similares?.length) {
            console.log('   ⚠️  DeepSeek sin recomendación');
            continue;
        }

        console.log(`   → DS recomienda (pm2c raw promedio: $${recomendacion.pm2cRawPromedio}):`,
            recomendacion.similares.map(s => `${s.colonia}($${s.pm2c})`).join(', '));
        console.log(`   → pm2cAvg estimado: $${recomendacion.pm2cAvgEstimado}  diff estimado: ${recomendacion.diff_estimado_pct}`);

        // Formato para colonias_similares.json
        const nuevaEntrada = recomendacion.similares.map((s, i) => ({
            colonia: s.colonia,
            menciones: recomendacion.similares.length - i
        }));

        cambios[colNorm] = nuevaEntrada;

        if (APPLY) {
            sim[colNorm] = nuevaEntrada;
            console.log(`   ✅ Aplicado a colonias_similares.json`);
        }
    }

    if (APPLY && Object.keys(cambios).length) {
        fs.writeFileSync(SIM_PATH, JSON.stringify(sim, null, 2));
        console.log(`\n✅ colonias_similares.json actualizado (${Object.keys(cambios).length} colonias)`);
    } else if (!APPLY && Object.keys(cambios).length) {
        console.log('\n─────────────────────────────────────────────────────────');
        console.log('Cambios propuestos (usa --apply para aplicar):');
        Object.entries(cambios).forEach(([col, sims]) => {
            console.log(`  "${col}": ${JSON.stringify(sims)}`);
        });
    }
}

main().catch(console.error);
