# ÍNDICE del Motor (Modulo Drive IA) — DÓNDE VIVE CADA COSA

> **LEER ANTES de buscar/tocar cualquier cosa del motor.** Hay muchos archivos con nombres parecidos
> (_mongo/_limpio/_dv/_migr) que son variantes/experimentos. Aquí está cuál es el BUENO y qué carga cada uno.
> Reglas y calibraciones del motor → `MOTOR_ANTECEDENTES.md` (leer también).

## 🎯 ARCHIVOS CANÓNICOS (los de producción — usar estos)
| Rol | Archivo | Notas |
|---|---|---|
| **Motor prod** | `motor_remi_api.js` | El que se despliega. Carga `cache_index.json` (línea 46), `colonias_nse.json`(+`_v2`), `colonias_sim*`. `factorNeg` línea 952. Fallbacks vivos: `buscarCompsGemini` (272), `buscarEnSerper` (334). |
| **Motor LAB** | `motor_remi_api_lab.js` | Copia para experimentos, gateada por ENV (`LAB_NEG`, `LAB_ANCHOR`, `LAB_SIZECAP`, `LAB_DEBUG`). Con flags OFF = idéntico a prod. |
| **Validador prod** | `validar_40_opis.js` | Usa `motor_remi_api.js`. `node validar_40_opis.js --n 400 --desde 2025-01`. |
| **Validador LAB** | `validar_lab.js` | Usa `motor_remi_api_lab.js`. Mismo uso. Para medir experimentos. |
| **Builder caché (paso 1)** | `actualizar_cache_consolidado_mongo.py` | Mongo `mercado_props` → `cache_consolidado.json`. Lee MONGO_URL del `.env`. |
| **Builder índice (paso 2)** | `build_cache_index.js` | `cache_consolidado.json` → `cache_index.json` (lo que lee el motor). |

**Rebuild completo del caché:** `python actualizar_cache_consolidado_mongo.py` → `node build_cache_index.js`.

## 📊 DÓNDE VIVE LA INFORMACIÓN
| Qué | Archivo | Estructura |
|---|---|---|
| **OPIs del perito** (sujeto + valor real, para validar) | `cerebro_datos.json` | array de ~981. Campos: `folio, sujetoColonia, municipio, tipo, valorMercado`(=perito), `m2Construccion, m2Terreno, edad, valorM2Aplicable, recamaras, banos, estacionamientos, comparables`. |
| **Comps del motor** (pool de mercado) | `cache_consolidado.json` | por comp: precio, m²C, m²T, año(parcial), rec, baños, estac. ~25,556 comps. |
| **Índice/IDX** (medianas $/m²C por colonia/tipo — lo que lee el motor) | `cache_index.json` | `IDX[municipio][tipo][colonia].{listings, medianaPm2c, count}`. |
| **Ancla NSE** por colonia | `colonias_nse.json` (v1, PROD) · `colonias_nse_v2.json` | REGLA DURA: NO cambiar v1→v2. |
| **Colonias similares** (mapa SIM) | `colonias_sim*.json`, `colonias_ia*.json` | Para pool `similares`. |
| **Geo** (colonia→CP→coords) | `_geo/proximidad.cjs`, `_geo/*.json` | proximidad geográfica. |
| **Reglas/calibraciones/antecedentes** | `MOTOR_ANTECEDENTES.md` | fuente de verdad de decisiones del motor. |

## ⚙️ CÓMO CORRER (gotchas)
- **Validador OFFLINE determinista:** `GEMINI_API_KEY= SERPER_API_KEY= DEEPSEEK_API_KEY= node validar_lab.js --n 400 --desde 2025-01`. Sin esto, los OPIs sin cobertura de caché re-buscan comps vivos (legítimo pero no reproducible para A/B).
- **Python Windows:** `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe` + `PYTHONUTF8=1` (o crashea en consola por acentos).
- **Baseline vigente (06-Jul, caché colonias-limpias):** ±10 54.4 / ±15 62.1 / ±20 75.7 / errAbs 13.5 / mediana −8.7.

## 🗑️ VARIANTES/EXPERIMENTOS (NO son prod — no confundir)
- Motores: `motor_remi_api_dv.js` (experimento DV, ya mergeado a prod), `_limpio`, `_migr`.
- Validadores: `validar_dv.js`, `validar_limpio.js`, `validar_migr.js`, `validar_idx_valoracion.js`.
- Builders: `build_cache_index_{dv,limpio,mongo}.js` (el `_mongo` usa nombres `*_mongo.json` distintos), `actualizar_cache_{consolidado.js(Sheets, deprecado),desde_mongo.py,mongo.cjs,mongo_limpio.py}`.
- Regla: si dudas, es uno de la tabla CANÓNICA de arriba.
