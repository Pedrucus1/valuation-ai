# ARQUITECTURA_MAPA — PropValu (mapa de 1 página)

> ⛔ **PROTOCOLO DE ARRANQUE (regla #1 del proyecto):** ANTES de grepear/adivinar CUALQUIER
> ubicación ("¿dónde está X? / ¿cómo funciona Y? / ¿qué archivo hace Z?") →
> **`cd C:\Users\pedru; graphify query "<pregunta>"` PRIMERO** (grafo en `graphify-out\`, devuelve `archivo:línea`),
> luego el índice del subsistema (INDICE_MOTOR / INDICE_SCRAPER / ESQUEMA_CAMPOS / credentials_registry / ESTADO).
> **Prohibido grepear a ciegas teniendo el índice.** Verificar en el dato REAL antes de afirmar; nunca concluir
> desde salida truncada (mostrar la lista completa). Queja fuerte del usuario: reinventar = horas perdidas.
>
> Mapa de arquitectura para arranque de sesión. Derivado del grafo (graphify) + memoria.
> Si cambia la arquitectura, actualizar aquí. Grafo completo consultable: `C:\Users\pedru\graphify-out\` (`/graphify query "..."`).

## Ejes del sistema (god nodes — lo más conectado)
- **Auth**: `require_admin()` (admin, sesión rotatoria) · `require_auth()` (usuario, cookie/Bearer) · `require_admin_or_job()` (crons externos #66.3) → `backend/routers/*`
- **Normalización**: `backend/core/colonias.py` es la **fuente única** del lado Python (`norm_col_key`, `limpia_decor`, `norm_muni`, `es_junk_colonia`) + `decada_de(nombre, municipio)` para leer `colonias_decada.json`; `routers/edades.py` solo re-exporta (antes había 4 copias divergiendo). El motor JS conserva su `normCol()`/`normMuni()` aparte. **Regla: las truncaciones del scraper se restauran (`omos X`→`colomos X`, `inas X`→`colinas X`), y `coto`/`condominio`/`privada` NO se quitan** — son desarrollos con edad propia.
- **Motor valuación**: `valuarPropiedad()` / `valuarPropiedadCompleto()` → `Modulo Drive IA/motor_remi_api.js` (prod) · `motor_remi_api_lab.js` (LAB)
- **Sheets**: `SheetsClient` / `googleSheetsConnector` — integración Google Sheets del scraper. **MUERTO desde 08-jul** (10M celdas, scraper ya no le escribe). El caché del motor (`actualizar_cache_desde_mongo.py`) volvió a leer de Mongo el 12-ago tras 5+ semanas sirviendo una foto congelada — ver BACKLOG #159.
- **Scrapers**: `BaseScraper` (clase base abstracta) · `ErrorScraping` → inmuebles24 / pincali / nocnok / mitula(lamudi) / casas_y_terrenos / propiedades.com

## Módulos (top-level)
- `backend/` — FastAPI. `server.py` monolito en migración a `routers/` (#66). **24 routers.** `core/` (auth, db, email, **creditos** [`saldo_efectivo()` — ledger con expiración, choke point en `auth.py::get_current_user`, sin cron]), `models/` (Pydantic), `routers/` (admin, mercado, kyc, newsletter, accesos, resenas, edades, data_exchange, **gamificacion** [/api/gamificacion/mis-puntos+leaderboard, aggregation sobre mercado_props por edad_estimador], **requisiciones** [28-jul: bolsa de requerimientos entre asesores, `core/requisiciones.py` — match contra `mercado_props` + coords vía `_geo/proximidad.py`, recálculo lazy sin cron, mismo patrón que `creditos.py`], **acabados** [19-ago: colección Mongo `acabados_propuestas`, mismo patrón que `access.py`/`AdminAccesos.jsx` — propone/aprueba/rechaza cambios al catálogo del Identificador de Edad (Manual ZMG) sin tocar código; `aplicar_hallazgos_acabados.py` en el repo del Manual lee las aprobadas vía este API y las mergea a `acabados_master.json`]). Comparables reales: `mongo_comparables.py` (`search_comparables_from_mongo` — casing normalizado + colonia exacta → vecinas GEOGRÁFICAS reales vía `Modulo Drive IA/_geo/proximidad.py`, nunca todo el municipio; camino de la lista de selección de la OPI, distinto del caché del motor). **Nuevo cross-import 22-jul:** `backend/` ahora importa por path un módulo de `Modulo Drive IA/` (antes solo se comunicaban por subprocess/cache JSON). Mapa reporte: `static_map.py` (Google Static Maps + fallback OSM). Entorno reporte: `nearby_places.py` (conteo POIs reales por categoría vía Google Places API New, radio 800m; fallback a estimado IA). Folio del reporte: `report_generator.build_folio` (`EST-YYMMDD-TIPO-SIGLAS-NN`, estable por avalúo; `User.siglas`+`folio_seq`).
- `frontend/` — React (CRA/craco). Páginas admin (`Admin*`), dashboards (Valuador/Inmobiliaria/Advertiser), `MercadoView`, `EdadesZonaPage`. Componentes compartidos: `components/MapaAvaluos.jsx` (mapa leaflet de avalúos), **`components/IdentificadorEdadDialog.jsx`** (18-ago, nuevo — modal que estima década de construcción marcando acabados observables; datos en `frontend/src/data/acabados_selectores.json`, **copia manual** del repo hermano `Manual-Arquitectura-ZMG` — no hay sync automático, hay que recopiar a mano si el catálogo del Manual cambia; usado en `ValuationForm.jsx` y `EdadesZonaPage.jsx`). Plugins de edición visual en `frontend/plugins`
- `Modulo Drive IA/` — motor de valuación IA (JS). Comps, similares, edad Ross-Heidecke, NSE, IDX, calibración, validadores (`validar_40_opis.js`)
- `scraper-inmuebles/` — scrapers Python + enrichers (año/m2T) + Mongo + anti-bloqueo + SEPOMEX

## Flujos clave (hyperedges)
1. **Pipeline datos**: scraper → Mongo `mercado_props` → `actualizar_cache_desde_mongo.py` (12-ago, reemplaza al builder de Sheets) → `cache_consolidado.json` / `cache_index.json` → motor → reporte. **El caché es una foto estática — no se refresca solo**; hay que re-correr el builder tras cada corrida grande del scraper o el motor sigue viendo datos viejos.
2. **Comps flywheel**: `acumularComps()` guarda comps web (Tavily/Serper/Brave) en `comps_acumulados.ndjson` + Mongo `mercado_props` vía `enriquecerCompsWeb()`; requiere `node consolidar_comps_acumulados.js` + rebuild del caché (#1) para que lo nuevo llegue al motor — no es automático
3. **Cascada NSE multicapa**: v1 perito → v2 (`colonias_similares.enriquecido.v2.json`) → idx
4. **Calibración motor**: edad×clase (Ross-Heidecke) · seg_ratio discriminante · LAB_EDAD_EXACTA
5. **Seguridad (S1–S7 resueltos, #64)**: require_admin, rate limiting (slowapi), fix IDOR, CORS restringido
6. **Staging (#66)**: cluster Atlas separado — `db_target.py` / `seed_staging.py` / `core/db.py`
7. **Email marketing**: `core/email.py` + `newsletter.py` + `AdminNewsletter.jsx` + Gemini + react-quill-new
8. **Alta a `mercado_props` (3 caminos, misma validación/escritura #144):** scraper automático · Data Exchange masivo (`routers/data_exchange.py::confirmar`, archivo) · alta manual 1-10 (`.../data-exchange/manual` inmobiliaria, `.../comparables/manual` perito/admin vía `_quien()`). Los 3 últimos comparten `core/data_exchange.py::normalizar_fila/validar_fila/fila_a_doc_pool/fila_a_doc_crm` — tocar ahí propaga a ambos endpoints.

## Datos / campos
- Campo año canónico: `anio_construccion` (sin ñ). Solo ~58 docs con año. Ver `ESQUEMA_CAMPOS.md`
- Ventana comps: 12 meses (no 18)
- Fuentes de verdad: `MOTOR_ANTECEDENTES.md` (motor), `ESQUEMA_CAMPOS.md` (campos), `SEGURIDAD_ARQUITECTURA_ANTECEDENTES.md` (seguridad #64 + monolito #66)

## Reglas duras (contexto)
- PINCALI solo español (`/inmueble/`), nunca inglés
- Nunca regex para texto libre (colonias/direcciones) → siempre IA
- TODO en Mongo (scraper); carpeta canónica del scraper con `cdp_fetch.js`
- Medir OFFLINE antes de implementar; no búsqueda masiva (quema créditos)
