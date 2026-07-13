# ÍNDICE del Scraper — DÓNDE VIVE CADA COSA + reglas duras

> **LEER ANTES de tocar el scraper/enricher.** Reglas de negocio del scraper (proxy, métodos por portal) que
> NO se deben re-descubrir. Lecciones detalladas → memoria Claude `feedback_scraper_lecciones.md` + `project_scraper_inmuebles.md`.

## ⛔ REGLA DURA: TODO EN MONGO — GOOGLE SHEETS DESCARTADO (no usar en NINGÚN proceso)
**Sheets NO se usa** en el motor, el scraper, el enricher ni ningún otro proceso. La fuente de verdad es
**MongoDB `mercado_props`** (prod cluster0). En `enricher.py` las funciones basadas en Sheets
(`obtener_filas_sin_enriquecer`, `enriquecer_tab`, `SheetsClient`, `COL_*`) son **LEGACY muertas** —
el enricher real es `obtener_props_mongo` (`--mongo`). No proponer ni reactivar Sheets.

## ⛔ REGLA DURA: CARPETA CANÓNICA del scraper/enricher
El código que CORRE es `Pagina-Valuacion-con-Ai--main\scraper-inmuebles\` (lo lanza `monitor_local.py:_ENRICHER_DIR`).
La carpeta `valuation-ai\scraper-inmuebles\` es DIVERGENTE/vieja (ahí vive `monitor_local.py`, el watchdog).
Editar el enricher SIEMPRE en la carpeta MAIN. Si tocas la query `q` de `obtener_props_mongo`, sincroniza
los conteos de `monitor_local.py` (mismos filtros) o el watchdog cree que quedó trabajo y reinicia en loop.

## ⛔ REGLA DURA: IPRoyal / proxy DESCARTADO 100% (06-Jul-2026)
**NO usar el proxy IPRoyal.** Causa **conflicto con las páginas** y además quedó **sin saldo (402 Payment Required)**.
Está **comentado en `.env`** (`PROXY_URL`). El enricher lo aplica solo si `config.PROXY_URL` existe (enricher.py:1089),
así que comentado = corre proxy-free. **NO reactivar** ningún proxy sin confirmar con el usuario.

## Portales — método de fetch (enricher.py)
| Portal | Método | Antibot | Notas |
|---|---|---|---|
| **PINCALI** | requests simple | No | HTTP plano. Colonia/parking en JSON escapado de `/en/home/`. **AÑO solo en página ES `/inmueble/`** (mismo slug vía `<link rel=alternate hreflang>`): `Año de construcción: 2012` o `A estrenar`(=nuevo). Ver `PINCALI_ENRICHER_NOTAS.md`. |
| **CASAS_Y_TERRENOS** | requests simple | No | `__NEXT_DATA__` JSON. |
| **MITULA** | requests simple | No | m2c ×1000 corrupto (bug Lamudi). |
| **NOCNOK** | requests simple | No | Portal nuevo. constructionSize basura del API. |
| **PROPIEDADES_COM** | Playwright / Node plain_fetch | Sí (Akamai) | `__NEXT_DATA__`. Fetch ~20s. |
| **INMUEBLES24** | Playwright | Sí (Cloudflare) | — |
| **VIVANUNCIOS** | requests | leve | — |

## Cómo correr el enricher (año/m2/colonia faltantes)
- `<PY> enricher.py --tab PINCALI --mongo [--max N] [--dry-run]` (PY = `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe`, con `PYTHONUTF8=1`).
- Lee MONGO_URL del `.env` (scraper). Escribe en Mongo prod.
- **Cooldown:** no re-procesa docs con `enrich_last_attempt` < 30 días (enricher.py:1219). Para forzar backfill: `col.update_many({portal_origen:X, <falta campo>}, {$unset:{enrich_last_attempt:''}})`.
- Campo canónico de año: **`anio_construccion`** (sin ñ).

## Cobertura de año por portal (Mongo, 06-Jul)
VIVANUNCIOS 94% · PROPIEDADES_COM 83% · INMUEBLES24 83% · CASAS_Y_TERRENOS 34% · PINCALI 31%→~50% (post-fix) · NOCNOK 19% · MITULA 17%. Global ~44%.
