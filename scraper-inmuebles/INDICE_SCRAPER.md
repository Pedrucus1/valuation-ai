# ÍNDICE del Scraper — DÓNDE VIVE CADA COSA + reglas duras

> **LEER ANTES de tocar el scraper/enricher.** Reglas de negocio del scraper (proxy, métodos por portal) que
> NO se deben re-descubrir. Lecciones detalladas → memoria Claude `feedback_scraper_lecciones.md` + `project_scraper_inmuebles.md`.

## ⛔ REGLA DURA: PINCALI SOLO EN ESPAÑOL (`/inmueble/`), NUNCA inglés (`/en/home/`)
**Decisión del usuario (fija):** PINCALI se scrapea y enriquece **solo en la página ESPAÑOLA `/inmueble/<slug>`**.
NO usar la inglesa `/en/home/`. Motivo: la ES trae **TODO junto** (colonia, precio, m², parking, recámaras/baños Y
**año de construcción**); la inglesa NO trae año → obligaba a doble fetch (EN+ES). NO volver a plantear el inglés.
- Legacy: muchos `url_original` guardados son `/en/home/`. Al tocar PINCALI, ir directo a la ES (convertir el slug)
  o re-scrapear en ES; nunca bajar la EN "primero". Pendiente: afinar mapeo de slug EN→ES (los con UUID fallan ~50%).

## ⛔ REGLA DURA: TODO EN MONGO — GOOGLE SHEETS DESCARTADO (no usar en NINGÚN proceso)
**Sheets NO se usa** en el motor, el scraper, el enricher ni ningún otro proceso. La fuente de verdad es
**MongoDB `mercado_props`** (prod cluster0). En `enricher.py` las funciones basadas en Sheets
(`obtener_filas_sin_enriquecer`, `enriquecer_tab`, `SheetsClient`, `COL_*`) son **LEGACY muertas** —
el enricher real es `obtener_props_mongo` (`--mongo`). No proponer ni reactivar Sheets.

## ⛔ REGLA DURA: CARPETA ÚNICA del scraper/enricher (consolidado 02-sep-2026)
Ya NO hay dos carpetas. Todo — scraper, enricher, `monitor_local.py` (watchdog), `orquestador_ia.py`
(auto-fix), `lanzador_scraper_mensual.py` — vive en `Pagina-Valuacion-con-Ai--main\scraper-inmuebles\`.
La antigua `valuation-ai\scraper-inmuebles\` (divergente, escribía a Google Sheets) quedó archivada en
`valuation-ai\_archived_scraper-inmuebles_OLD_20260902\` — NO usarla, NO reactivarla, solo referencia
histórica. Antes de esa fecha se agregaron 4 municipios nuevos y un fix de tipos en `propiedades_com.py`
SOLO en la carpeta vieja; ya están portados a esta carpeta (ver `config.py` y `propiedades_com.py`).
Tareas de Windows Task Scheduler actualizadas: `ScraperMonitorLocal` y `ScraperOrquestadorIA` ahora
apuntan aquí; `ScraperMensual` (vieja, duplicaba `PropValu_ScraperMensual`) quedó deshabilitada.
Si tocas la query `q` de `obtener_props_mongo`, sincroniza los conteos de `monitor_local.py`
(mismos filtros) o el watchdog cree que quedó trabajo y reinicia en loop.

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
