/**
 * construir_idx_valoracion.js
 *
 * Genera idx_valoracion.json — índice multidimensional de valores:
 *   colonia → tipo → segmento_superficie → { medianaPm2, nListings, nse, nseIdx, fuente }
 *
 * Tipos cubiertos: casa, depto, terreno, bodega
 * Locales: excluidos (lógica de valuación diferente, pendiente)
 *
 * Segmentos por tipo:
 *   casa    (m²C): <80 · 80-150 · 150-250 · 250-450 · 450-1000 · >1000
 *   depto   (m²C): <60 · 60-100 · 100-160 · >160
 *   terreno (m²T): <120 · 120-300 · 300-800 · >800    ← usa m²T, no m²C
 *   bodega  (m²C): <200 · 200-800 · >800
 *
 * Temporal: usa listings con fs dentro de ventana de 18 meses.
 *           Si hay <3 en ventana, usa todos (fallback).
 *
 * Paralelo a colonias_nse.json — no lo reemplaza.
 * El motor consulta este archivo primero; si no hay dato, cae a v1.
 */

const fs   = require('fs');
const path = require('path');

const IDX_PATH    = path.join(__dirname, 'cache_index.json');
const NSE_V1_PATH = path.join(__dirname, 'colonias_nse.json');
const OUT_PATH    = path.join(__dirname, 'idx_valoracion.json');

const VENTANA_MESES       = 18;
const MIN_LISTINGS        = 3;
const M2C_MAX_RESIDENCIAL = 300; // casas/deptos

// Caps de $/m² plausibles por tipo (filtra preventa/desarrollo mal clasificado)
const PM2_MAX_TIPO = { casa: 100000, depto: 100000, bodega: 50000, terreno: 25000 };

// ── Categorías NSE ────────────────────────────────────────────────────────────
const NSE_CATS = [
    { idx: 0, nombre: 'economico',      min: 0,      max: 9000     },
    { idx: 1, nombre: 'interes-social', min: 9000,   max: 14000    },
    { idx: 2, nombre: 'medio-bajo',     min: 14000,  max: 21000    },
    { idx: 3, nombre: 'medio-medio',    min: 21000,  max: 33000    },
    { idx: 4, nombre: 'medio-alto',     min: 33000,  max: 52000    },
    { idx: 5, nombre: 'lujo',           min: 52000,  max: 85000    },
    { idx: 6, nombre: 'super-lujo',     min: 85000,  max: Infinity },
];
function nseDepm2(pm2) {
    return NSE_CATS.find(c => pm2 >= c.min && pm2 < c.max) || NSE_CATS[NSE_CATS.length - 1];
}

// ── Segmentos por tipo ────────────────────────────────────────────────────────
const SEGMENTOS = {
    casa:    [
        { key: '<80',      min: 0,    max: 80    },
        { key: '80-150',   min: 80,   max: 150   },
        { key: '150-250',  min: 150,  max: 250   },
        { key: '250-450',  min: 250,  max: 450   },
        { key: '450-1000', min: 450,  max: 1000  },
        { key: '>1000',    min: 1000, max: Infinity },
    ],
    depto:   [
        { key: '<60',      min: 0,   max: 60   },
        { key: '60-100',   min: 60,  max: 100  },
        { key: '100-160',  min: 100, max: 160  },
        { key: '>160',     min: 160, max: Infinity },
    ],
    terreno: [
        { key: '<120',     min: 0,   max: 120  },
        { key: '120-300',  min: 120, max: 300  },
        { key: '300-800',  min: 300, max: 800  },
        { key: '>800',     min: 800, max: Infinity },
    ],
    bodega:  [
        { key: '<200',     min: 0,   max: 200  },
        { key: '200-800',  min: 200, max: 800  },
        { key: '>800',     min: 800, max: Infinity },
    ],
};

function getSegmento(tipo, superficie) {
    const segs = SEGMENTOS[tipo];
    if (!segs) return null;
    return segs.find(s => superficie >= s.min && superficie < s.max) || null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function mediana(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function dentroDeVentana(fecha) {
    if (!fecha) return false;
    const meses = (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return meses <= VENTANA_MESES;
}

function calcularEntrada(listings) {
    if (!listings.length) return null;

    // Preferir ventana temporal; fallback a todos
    const recientes = listings.filter(l => dentroDeVentana(l.fecha));
    const base = recientes.length >= MIN_LISTINGS ? recientes : listings;
    if (base.length < MIN_LISTINGS) return null;

    const pm2s = base.map(l => l._pm2).filter(v => v > 100 && v < 500000);
    if (pm2s.length < MIN_LISTINGS) return null;

    // Eliminar outliers p10-p90
    const sorted = [...pm2s].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.10)];
    const p90 = sorted[Math.floor(sorted.length * 0.90)];
    const filtrados = pm2s.filter(v => v >= p10 && v <= p90);
    const med = mediana(filtrados.length >= MIN_LISTINGS ? filtrados : pm2s);

    const cat = nseDepm2(med);
    return {
        medianaPm2: Math.round(med),
        nListings:  base.length,
        nse:        cat.nombre,
        nseIdx:     cat.idx,
        fuente:     recientes.length >= MIN_LISTINGS
            ? `idx-${VENTANA_MESES}m`
            : 'idx-historico',
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
    const idx   = JSON.parse(fs.readFileSync(IDX_PATH,    'utf8'));
    const nseV1 = JSON.parse(fs.readFileSync(NSE_V1_PATH, 'utf8'));

    const resultado = {};
    const stats = { colonias: 0, entradas: 0 };
    const conteoTipo = {};

    const TIPOS_ACTIVOS = ['casa', 'depto', 'terreno', 'bodega'];

    for (const [muni, tipos] of Object.entries(idx)) {
        if (muni === '_meta') continue;

        for (const tipo of TIPOS_ACTIVOS) {
            const colonias = tipos[tipo];
            if (!colonias) continue;

            for (const [colRaw, data] of Object.entries(colonias)) {
                // Colonia con mismo nombre que el municipio → renombrar a "X centro"
                const col = colRaw === muni ? muni + ' centro' : colRaw;

                // Descartar claves que parecen títulos de propiedad, no colonias
                if (!col || col.length < 3 || col.length > 50) continue;
                if (/venta|disponible|renta|excelente|hermosa|near|cerca|oportunidad/i.test(col)) continue;
                if (!data.listings || !data.listings.length) continue;

                // Terrenos: área en t (m²T), valor en $/m²T.
                // Resto: área en c (m²C), valor en $/m²C.
                // Casa y depto aplican filtro M2C_MAX_RESIDENCIAL para excluir industriales.
                const esTerr = tipo === 'terreno';
                const aplicarCapM2C = tipo === 'casa' || tipo === 'depto';

                // Puente mientras cache_consolidado no se regenera: si terreno tiene m2t=0 y m2c>0,
                // usar m2c como área de terreno (mismo fix que actualizar_cache_consolidado.js).
                const listings = esTerr
                    ? data.listings.map(l => l.m2t === 0 && l.m2c > 0 ? { ...l, m2t: l.m2c, m2c: 0 } : l)
                    : data.listings;

                // Filtro base de plausibilidad
                const pm2Max = PM2_MAX_TIPO[tipo] || 100000;
                const validos = listings.filter(l => {
                    const sup = esTerr ? l.m2t : l.m2c;
                    if (!sup || sup <= 0) return false;
                    if (aplicarCapM2C && l.m2c > M2C_MAX_RESIDENCIAL) return false;
                    if (!(l.precio > 0)) return false;
                    const pm2Raw = l.precio / sup;
                    if (pm2Raw > pm2Max) return false; // preventa/desarrollo mal clasificado
                    return true;
                }).map(l => ({
                    ...l,
                    _sup: esTerr ? l.m2t : l.m2c,
                    _pm2: l.precio / (esTerr ? l.m2t : l.m2c),
                }));

                if (!validos.length) continue;

                if (!resultado[col]) resultado[col] = {};
                if (!resultado[col][tipo]) resultado[col][tipo] = {};

                // ── Entrada global del tipo (sin segmento) ──────────────────
                const entGlobal = calcularEntrada(validos);
                if (entGlobal) {
                    resultado[col][tipo]['global'] = entGlobal;
                    stats.entradas++;
                    conteoTipo[tipo] = (conteoTipo[tipo] || 0) + 1;
                }

                // ── Entradas por segmento de superficie ─────────────────────
                for (const seg of (SEGMENTOS[tipo] || [])) {
                    const enSeg = validos.filter(l => l._sup >= seg.min && l._sup < seg.max);
                    const ent = calcularEntrada(enSeg);
                    if (ent) {
                        resultado[col][tipo][seg.key] = ent;
                        stats.entradas++;
                    }
                }
            }
        }
    }

    stats.colonias = Object.keys(resultado).length;

    // ── Metadata ─────────────────────────────────────────────────────────────
    const meta = {
        version:      2,
        fechaCalculo: new Date().toISOString(),
        ventanaMeses: VENTANA_MESES,
        tiposActivos: TIPOS_ACTIVOS,
        segmentos:    SEGMENTOS,
        nota:         'Paralelo a colonias_nse.json. Motor consulta primero idx_valoracion, fallback a v1.',
        stats,
    };
    fs.writeFileSync(OUT_PATH, JSON.stringify({ _meta: meta, ...resultado }, null, 2));

    // ── Reporte ───────────────────────────────────────────────────────────────
    console.log('\n=== idx_valoracion.json ===');
    console.log('Colonias con datos:', stats.colonias);
    console.log('Entradas totales (tipo × segmento):', stats.entradas);
    console.log('\nColonias por tipo:');
    TIPOS_ACTIVOS.forEach(t => console.log(`  ${t.padEnd(10)}: ${conteoTipo[t] || 0} colonias`));

    // Comparativa vs NSE v1 para casas/global
    const v1Keys = Object.keys(nseV1);
    const v2CasaKeys = Object.keys(resultado).filter(k => resultado[k].casa?.global);
    const enAmbos = v1Keys.filter(k => resultado[k]?.casa?.global);
    const subieron = enAmbos.filter(k => resultado[k].casa.global.nseIdx > nseV1[k].nseIdx);
    const bajaron  = enAmbos.filter(k => resultado[k].casa.global.nseIdx < nseV1[k].nseIdx);

    console.log(`\nComparativa casa/global vs NSE v1 (${enAmbos.length} colonias en común):`);
    console.log('  NSE subió:', subieron.length);
    console.log('  NSE bajó: ', bajaron.length);
    console.log('  NSE igual:', enAmbos.length - subieron.length - bajaron.length);

    // Casos clave del validador
    const CASOS = ['jardines de la calera','miguel hidalgo','heliodoro hernandez loza',
        'colli urbano','naturezza','loma bonita ejidal','tinajitas',
        'cortijo san agustin','real del valle','provenza'];
    console.log('\nCasos clave:');
    CASOS.forEach(k => {
        const v1 = nseV1[k];
        const v2 = resultado[k];
        const v2str = v2
            ? Object.entries(v2).map(([tipo, segs]) => {
                const g = segs.global;
                const numSegs = Object.keys(segs).filter(s => s !== 'global').length;
                return g ? `${tipo}:${g.nse}(${g.nseIdx}) ${numSegs}seg` : tipo;
              }).join(' | ')
            : 'AUSENTE';
        const v1str = v1 ? `v1:${v1.nse}(${v1.nseIdx})` : 'v1:AUSENTE';
        console.log(`  ${k.padEnd(32)} ${v1str}  →  ${v2str}`);
    });

    console.log('\nGuardado en idx_valoracion.json');
}

main();
