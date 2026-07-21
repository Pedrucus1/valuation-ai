# DICCIONARIO de Archivos del Motor (Modulo Drive IA)

> Qué dice/hace cada archivo y **en qué paso del proceso** se usa. Complementa a
> `INDICE_MOTOR.md` (cuál es canónico) y `MOTOR_ANTECEDENTES.md` (reglas/calibraciones).
> Si creas o renombras un archivo del motor, actualiza esta tabla.

## 🔄 El proceso de punta a punta (pipeline)

```
[1] SCRAPE          scrapers → Mongo `mercado_props`  (listings crudos con precio, m², título, año, operación)
        │
[2] CONSOLIDAR      actualizar_cache_consolidado_mongo.py   Mongo → cache_consolidado.json
        │            (filtra, normaliza, deja ~21.5k comps: precio, m²C, m²T, tipo, colonia, muni, rec, baños, año parcial)
        │
[3] INDEXAR         build_cache_index.js                    cache_consolidado.json → cache_index.json
        │            (agrupa por muni→tipo→colonia; dedup; mediana $/m²C; edadMedianaZona; inyecta comps verificados)
        │
[4] IDX (opcional)  construir_idx_valoracion.js             cache_index.json → idx_valoracion.json
        │            (medianas $/m² por colonia×tipo×segmento de superficie, con cap $/m² y trim p10-p90)
        │
[5] VALUAR          motor_remi_api.js                       lee cache_index + NSE + similares (+idx) → { valor, confianza, cv, comps }
        │            (si faltan comps locales: buscarWeb = Tavily → Serper → Gemini)
        │
[6] VALIDAR         validar_40_opis.js                      corre el motor sobre cerebro_datos.json (OPIs del perito) → ±10/15/20, errAbs
```

## 🎯 Archivos CANÓNICOS (producción)

| Archivo | Paso | Qué es / qué hace |
|---|---|---|
| `motor_remi_api.js` | **[5] Valuar** | **El motor de producción.** Recibe {tipo, m²C, m²T, edad, conservación, rec, baños, muni, colonia} y devuelve `{valor, confianza, cv, nComps, pm2cAvg, poolTipo}`. Selecciona comps (pool `exacta`/`similares`/`general`/`suma_partes`), ajusta por tamaño (×(m²c/M2C)^⅙), edad (Ross-Heidecke / `factorEdad`), conservación y negociación. Pondera comps por distancia DV (#121). Si no hay comps locales, `buscarWeb`. |
| `motor_remi_api_lab.js` | [5] Valuar (LAB) | Copia del motor para **experimentos**, gateada por variables `LAB_*` de entorno. Con todos los flags OFF ≈ prod (ojo: hay pequeñas divergencias; medir siempre **dentro del lab**, baseline vs tratamiento). |
| `validar_40_opis.js` | **[6] Validar** | Corre `motor_remi_api.js` sobre los OPIs del perito y reporta ±10/±15/±20% y error abs. Flags: `--n N`, `--skip N`, `--folios A,B`. **OFFLINE** = con keys en blanco (determinista, no re-busca web). |
| `validar_lab.js` | [6] Validar (LAB) | Igual pero usa `motor_remi_api_lab.js`. Para medir experimentos LAB. |
| `actualizar_cache_consolidado_mongo.py` | **[2] Consolidar** | Vuelca Mongo `mercado_props` → `cache_consolidado.json`. Lee `MONGO_URL` del `.env`. **Paso 1 del rebuild.** |
| `build_cache_index.js` | **[3] Indexar** | `cache_consolidado.json` → `cache_index.json` (lo que lee el motor). Dedup, mediana $/m²C, `edadMedianaZona`, overlay de edad desde `edad_mongo.json`, inyección de `comps_verificados.json` en celdas pobres. **Paso 2 del rebuild.** |
| `construir_idx_valoracion.js` | **[4] IDX** | `cache_index.json` → `idx_valoracion.json`. Medianas $/m² por colonia×tipo×**segmento de superficie**, con cap $/m² por tipo (`PM2_MAX_TIPO`, depto=100k) y recorte de outliers p10-p90. |

**Rebuild completo del caché:** `python actualizar_cache_consolidado_mongo.py` → `node build_cache_index.js`.

## 📊 Archivos de DATOS (los que el motor/scripts leen)

| Archivo | Paso | Qué contiene |
|---|---|---|
| `cerebro_datos.json` | [6] | **OPIs del perito** (~981). El "ground truth": `folio, sujetoColonia, municipio, tipo, valorMercado`(=perito), `m2Construccion, m2Terreno, edad, recamaras, banos, comparables`. |
| `cache_consolidado.json` | [3] entrada | **Pool de comps de mercado** (~21.5k). Por comp: `precio, m2c, m2t, tipo, colonia, muni, recamaras, banos, estac, fecha, anio, portal`. **NO trae título ni tipo_operacion** (se pierden en [2]). |
| `cache_index.json` | [5] lo lee el motor | Índice `IDX[muni][tipo][colonia] = { listings, medianaPm2c, count, edadMedianaZona }`. ~1-2 MB. |
| `idx_valoracion.json` | [5] lo lee el motor | Medianas $/m² por colonia×tipo×segmento: `{ medianaPm2, nListings, nse, nseIdx, fuente }`. |
| `colonias_nse.json` (v1) · `colonias_nse_v2.json` | [5] | **Ancla NSE por colonia** (nivel socioeconómico → $/m² esperado). REGLA DURA: NO cambiar v1→v2. |
| `colonias_similares*.json` · `colonias_ia*.json` | [5] | Mapa de **colonias similares** (para el pool `similares` cuando la exacta tiene pocos comps). |
| `edad_mongo.json` | [3] overlay | Años de construcción desde Mongo → alimenta `edadMedianaZona` (fuente oficial de edad; el consolidado casi no trae año). |
| `edades_prior.json` | [5] | Prior de edad por colonia/tipo (cuando no hay año del sujeto). |
| `comps_verificados.json` | [3] puente | Comps web verificados + comps del perito (flywheel #101). Se inyectan en celdas pobres (<3 listings). |
| `catalogo_cotos.json` | (sin wirear) | 1,762 zonas/cotos SEPOMEX+mercado. Data lista, **aún no conectada** al motor. |
| `_geo/proximidad.cjs`, `_geo/*.json` | [5] | Geo: colonia→CP→coords, para proximidad geográfica de comps. |
| `MOTOR_ANTECEDENTES.md` | — | **Fuente de verdad** de reglas, calibraciones y qué NO funcionó. |
| `INDICE_MOTOR.md` | — | Cuál archivo es canónico vs variante/experimento. |

## 🗑️ Variantes / experimentos (NO son prod)
- Motores: `motor_remi_api_dv.js` (DV, ya mergeado), `_limpio`, `_migr`.
- Validadores: `validar_dv.js`, `validar_limpio.js`, `validar_migr.js`, `validar_idx_valoracion.js`.
- Builders: `build_cache_index_{dv,limpio,mongo}.js` (`_mongo` usa nombres `*_mongo.json` propios), `actualizar_cache_{desde_mongo.py, mongo.cjs, mongo_limpio.py}`, `actualizar_cache_consolidado.js` (Sheets, deprecado).
- Backups: `*.PRE_*.bak.json`, `*.BASELINE_*.json`, `cache_consolidado.REBUILD_*.json`.
- **Regla:** si dudas, usa el de la tabla CANÓNICA.

## 🔑 Conceptos clave del motor
- **poolTipo**: origen de los comps — `exacta` (misma colonia), `similares` (colonias parecidas), `general` (municipio), `suma_partes` (terreno IDX + construcción depreciada INDAABIN), `lote_grande_cus`.
- **factorEdad**: descuento por edad (Ross-Heidecke). En pool `exacta` asume comps de edad similar → casi no deprecia (supuesto que **falla en deptos**, donde el pool suele ser obra nueva).
- **edadMedianaZona / anclaEdad**: edad típica de la zona; el descuento por edad se mide contra ella (no contra un fijo). Sin dato → ancla=10.
- **cv**: coeficiente de variación de los comps → ancho del rango y confianza.
- **DV (#121)**: ponderación de comps por distancia estandarizada al sujeto en {m²C, m²T, rec, baños, año}.
