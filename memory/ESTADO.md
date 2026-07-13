# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 13 Jul 2026
**Fase:** Prod Railway (Hobby PAGADO) + Vercel público. Verificador A–G desplegado. H (datos) cerrado. Motor SIN cambios (caché 7-jul es el mejor, desplegado).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Motor: NO reconstruir el caché.** El del **7-jul (63.1/74.8/83.5, +7.2 mediana, 21,562 comps) es el mejor y está desplegado.** Reconstruir con Mongo de hoy REGRESA (60.2/71.8, mediana −7.4) por **deriva de datos** (precios más bajos 7→13 jul), NO por limpieza colonias (~1pp) ni dedup/remate (neutro). Backup: `Modulo Drive IA/cache_*.BASELINE_07JUL*`. Matriz 4 versiones + aislamiento en `MOTOR_ANTECEDENTES`.

### ✅ DERIVA DE DATOS 7→13 jul — INVESTIGADA (13-jul, medido offline). NO es market-wide.
**Resultado:** el rebuild voltea el motor (mediana +7.2→−7.4, ±10 63.1→60.2) pero **NO porque el mercado bajara**: mediana $/m²c del pool solo −2.9% (38,202→37,106), 63% de celdas planas, 25% subieron, inventario fresco 7→13 = 526 comps. Ni market-wide, ni cheap-portal dump, ni colonias (~1pp por revert-test previo). El −14.6pp es **drift LOCAL a las celdas de los 103 OPIs** + PINCALI perdiendo count (−3,373 por colapso de dedup con colonias limpias). **NO filtrable con filtro de comps baratos.** Detalle + `diff_drift.py` → `MOTOR_ANTECEDENTES.md` (sección MATRIZ 4 VERSIONES). Archivos: `cache_*.BASELINE_07JUL*` + `cache_consolidado.REBUILD_13JUL.json`.
**Decisión firme:** mantener caché 7-jul desplegado, **NO reconstruir prod.** Si se retoma: ver updates de precio doc-a-doc entre 7 y 13 jul SOLO en las colonias de los 103 OPIs (no market-wide). Palanca real = datos/segmentación, no rebuild.
- **Deploy pendiente (menor):** `edades.py` excluye dup/remate de la lista del verificador (esfuerzo humano) + revert de `mongo_comparables.py` — commits `bcaa0eb`/`331b095` sin desplegar. Backend live sigue con la versión previa (inerte de todos modos). Desplegar cuando convenga.

## 🔥 COMPENDIO VERIFICADOR — A–G ✅ HECHO+DESPLEGADO (12-jul)
> `EdadesZonaPage.jsx` + `routers/edades.py` + `server.py`. Commit `9909fd9`. Frontend `vercel --prod` + backend `railway up`. Ambos live.
- **A ✅** Conservación arriba de remodelación; **"Excelente"→"Muy Bueno"** (empata `muy_bueno`=1.05 del motor; motor NO tiene "Excelente"). Alias legacy en edades.py/server.py (2 tablas).
- **B ✅** +9 tipos (edificio, escuela, conjunto oficinas/apartamentos/mini, hotel, salón eventos, centro comercial, terreno c/construcción, nave industrial) en `TIPO_OPCIONES` + `TIPOS_CANON`. Check **uso mixto** fuera del dropdown (flag `uso_mixto`).
- **C ✅** Terreno sin construcción oculta edad/conservación/remodelación (solo colonia/tipo). `terreno_construido` sí pide.
- **D ✅** Pill **VENTA/RENTA** (`tipo_operacion` proyectado).
- **E ✅** Ficha refleja colonia/tipo corregidos tras guardar (`setItems`).
- **F ✅** Agrupa por **coto real** (no colonia) + **aviso preventivo** (`confirm`) antes del apply en lote.
- **G ✅** Contador por día (`dias_edad` en users) → **récord del día** bajo la medallita (aparece tras 1er guardado).

## 🔥 H — DATOS (PINCALI/scraper) — remate+dedup APLICADOS, resto ⏳
**Todo READ-ONLY medido antes de aplicar. Prod = cluster0. `.env` que autentican: raíz del repo + carpeta scraper MAIN (`Pagina-…/scraper-inmuebles/.env`). El `.env` de la carpeta VIEJA (`valuation-ai/scraper-inmuebles`) tiene pass ROTADO → NO usar ese. Scripts de análisis en scratchpad (efímero); `dedup_estricto.py` quedó en el repo (MAIN).**
- **H1 remate ✅ APLICADO (1,517):** `es_remate=true` + `activo=false` + `baja_fuente="auto_remate"`. Regex afinado (remate/recuperación bancaria/dación en pago/cesión de derechos/adjudicación judicial…) sobre titulo|descripcion. **OJO:** comps NO filtran `activo` (los "retirado" activo=false son comps de menor calidad POR DISEÑO) → remate se excluye por **`es_remate`**, no por activo (ya wireado en base_q). **Revertir:** `activo=true` + unset es_remate/baja_fuente/baja_fecha where `baja_fuente=auto_remate`.
- **H2 dedup cross-portal ✅ APLICADO (3,734 dups / 2,113 grupos):** ESTRICTO = (muni|colonia|**precio y m² EXACTOS**|op|tipo) + guarda (título-Jaccard≥0.45 O mismo agente). Campos **convención existente**: `duplicado=true`, keeper `es_canonico=true`, `grupo_id`, `canonico_id`, `dedup_fuente="estricto_crossportal"`. **activo INTACTO** (solo marcado, no baja). Keeper=más completo con preferencia perito/ia_derivada; nunca marca doc con dato de perito. **Revertir:** unset duplicado/es_canonico/grupo_id/canonico_id/n_portales_duplicado/dedup_fuente/dedup_fecha where `dedup_fuente=estricto_crossportal`.
  - **Descartado:** dedup oficial `dedup_seguimiento.py` crudo = 52k (huella laxa ±15% precio, sin m² → colapsa distintas). MEDIA (huella tolerante+guarda)=13.5k pero 11k falsos positivos (títulos genéricos de Inmuebles24 = colonia). ESTRICTA es la segura.
  - **Set limpio para uso** (activo, no-duplicado): **97,274**.
- **H ✅ CERRADO** (comps + enricher + post-scrape automatizados; PINCALI data-capped):
  1. **Motor: remate YA excluido ✅ (correcto); dedup extra NO (choque de capas).** El motor usa el CACHÉ (`cache_index.json ← builder`), NO `search_comparables_from_mongo` (secundario, inerte por casing `Casa`/`casa`). **REMATE:** los 1,517 son `activo=false` y el builder excluye `activo=false` → **0 remates en el pool, ya fuera del motor** (metodología correcta, aplicada). **DEDUP:** filtrar `duplicado` en el builder quita 1,824 y da −3pp (±10 63.1→60.2, ±15 74.8→71.8), pero la causa es **doble dedup**: el builder ya colapsa por `colonia+área` (elimina 19,173); mi capa estricta encima cambia cuál sobrevive → mueve medianas. **NO es que los dups ayuden.** Revertido (caché restaurado, filtro fuera del builder y `mongo_comparables.py`). Si se retoma dedup del motor: alinear/reemplazar el dedup interno del builder, no dos capas. Detalle en MOTOR_ANTECEDENTES. El **verificador** SÍ excluye dup/remate de la lista humana (`edades.py`, falta deploy).
  2. **Enricher ✅ WIREADO** (`duplicado!=true` en `obtener_props_mongo` de la carpeta MAIN + sync en 2 conteos de `monitor_local.py`). Ahorro medido: 425 props (3% del set). **NOTA: TODO es Mongo, Sheets DESCARTADO — documentado en `INDICE_SCRAPER.md` (2 reglas duras nuevas: Mongo-only + carpeta canónica).**
  3. **Por-scrape ✅ AUTOMATIZADO (sin timer nuevo — usa el esquema mensual existente):** la tarea de Windows corre `lanzador_scraper_mensual.py` (día aleatorio 2-10) → `scheduler.py`. (a) **remate al vuelo** en `_guardar_en_mongo` (marca `es_remate` por-doc, regex afinado). (b) **`dedup_estricto.py`** (standalone idempotente, campos canónicos, misma lógica; dry-run 2,113 grupos/3,734 dups) enganchado en `scheduler.run()`: tras el auto-enricher (corrida por-portal) Y al final del full-run (portal=None, tras NOCNOK). Nota: en full-run el dedup corre sobre lo YA enriquecido; las props nuevas de ese scrape se depuran el mes siguiente cuando el watchdog/enricher les pone colonia (idempotente, se auto-corrige). Conviven 2 convenciones: `es_duplicado_secundario` (viejo) vs `duplicado`/`es_canonico`/`canonico_id` (nuevo estricto).
  4. **PINCALI ✅ YA HECHO — NO RE-PROPONER.** Backfill de año YA corrido (medido 12-jul, 39,001 activos): **colonia 99.3%** (resuelto en origen desde `Neighborhood`), **año 45.1%** (17,589; 96% ya intentados). El ~45% del año es **TECHO por dato faltante del vendedor**, NO bug — no hay más que sacar re-corriendo. Detalle en `PINCALI_ENRICHER_NOTAS.md`. Regla: PINCALI solo español (`/inmueble/`), ver `feedback_pincali_solo_espanol`.
  - NOCNOK: los "duplicados" que dudaba el usuario son **cross-portal** (mismo agente también en casasyterrenos), no internos.

## ⏳ Otras del compendio (sin tocar)
- **I. ✅ RESUELTO.** Ya pasa por diseño: sin-edad muestra solo props con `anio_construccion:None` → llenar edad las quita; datos-raros filtra por patrón de basura → corregir la colonia las quita. Hueco real tapado: `_base_usables()` y la query datos-raros ahora excluyen `duplicado` + `es_remate` (1,227 menos de ruido). En `edades.py`. **Falta deploy backend.**
- **J. ✅ YA CUBIERTO — NO re-verificar.** (a) La QA puntual de las 3,747 `ia_derivada` YA se hizo: ~62% match SEPOMEX exacto, no-match mayormente falsos negativos (abreviaturas/nombre de municipio/fraccs no-SEPOMEX), errores reales ~10%, mejora neta → NO revertir (`BACKLOG_ARCHIVE.md`). (b) Validación **automática y continua**: el enricher tiene guardia `_colonia_valida_sepomex` (#135) que solo acepta colonia real del municipio en `sepomex_v2.json`; corre cada scrape mensual. Solo queda opcional: las ~337 raras restantes (Cancún/Toluca mal etiquetadas) → manual con filtro "datos raros" o descartar.
1. **#29 Render como respaldo gratis** — servicio `valuation-ai-1` ya en rama `main`; FALTAN las env vars (MONGO_URL/DB_NAME/ADMIN_SECRET/ADMIN_EMAIL/JWT_SECRET/JOBS_SECRET/TAVILY_API_KEY) — el usuario las pega, yo no puedo teclear secretos. Hacerlo **~5 días antes de que venza Railway**. Detalle en BACKLOG #29.
2. **#34 SMTP** — recuperación de contraseña NO funciona (no hay correo saliente). Configurar SMTP en Railway (Gmail app password o SendGrid). Mientras: reset se destraba generando el link JWT a mano.
3. **~337 colonias raras** que la IA no pudo derivar (Cancún/Toluca mal etiquetadas, calles sin colonia). Revisión manual con el filtro "datos raros", o descartar las de otras ciudades.
4. **#136/#137** ahora más viables: la base de colonias quedó limpia (medias por colonia útiles).

## ✅ Hecho reciente (12–13 Jul)
- **Verificador A–G** completado y desplegado (ver compendio arriba). Commit `9909fd9`.
- **H1 remate (1,517)** y **H2 dedup cross-portal estricto (3,734)** marcados en prod, reversibles (ver H arriba). Nada borrado; `activo` intacto en dups.
- Descubierto: `dedup_seguimiento.py` (scraper) ya existía pero su huella es demasiado laxa (52k) → no usar cruda. Scraper `.env` tiene pass Mongo prod ROTADO (usar root `.env`).

## ✅ Hecho previo (10–11 Jul)
- **Colonias limpiadas con DeepSeek: 3,747 props** derivadas (colonia real desde dirección/título; `colonia_fuente=ia_derivada`). + backfill 20,804 case/acento/mojibake. Raras 4,030→337. Backups revertibles. Alimenta #137.
- **Herramienta "Verificación de Datos por Zona"** (ex "Verifica y Gana", renombrada en las 3 vistas): auth **Bearer** (arregló logout/dropdowns cross-dominio), autocompletado de colonia **propio** (sin cmdk, top-12, instantáneo), filtro de basura en colonias, botones de exclusión (Retirado/Info incorrecta/Juicio-remate → excluyen de comps), botón **Editar** en fichas guardadas + historial, filtro "**datos raros**" (colonias por corregir), datalist muestra nombre no CP.
- **Infra:** Railway trial venció → **plan Hobby pagado** (backend revivió). Frontend Vercel **público** (quité deployment protection) + **proxy `/api` vía vercel.json** (mismo-origen). Índices #65 desplegados. #27 motor + TAVILY corregida desplegados. #133 Data Exchange prueba en vivo pasada.
- **#25 catálogo cotos** construido + probado (wiring al motor = NEUTRAL, NO se wirea). Docs de estado unificados (ESTADO.md único). Nueva regla: **medir antes de implementar** (`feedback_medir_antes_de_implementar`).

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (rama main, sin env vars aún)
- Reset password sin SMTP: generar JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente, SIN cambios esta sesión)
- **±20 ~83.5%** (validador offline). Techo = falta DATO, no fórmula. Palanca real = selección de comps por segmento.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE (keys en blanco) antes de cambios · **medir/dry-run antes de wirear nada**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 17 routers. Auth por Bearer (usuarios) + cookie + X-Admin-Token. Cache motor: MongoDB `cache_consolidado.json`.
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas.
- Seguridad: incidente 06-jul cerrado (keys rotadas, pre-commit hook). Registro de keys → memoria `credentials_registry.md`.

## 🕐 Diseño parqueado (no construir aún)
- **#139/#140/#141** crowdsource edades (consenso/tokenización/paneles). **#142** Data Exchange descuento por calidad.
- **IDEA gamificación (para versión PÚBLICA, tipo Google Maps Local Guides):** al terminar una zona/sesión, modal al centro con **count-up de propiedades verificadas** (números corriendo rápido hasta el total) + **confetti/celebración** simple pero vistosa + puntos ganados. Tarjetas "flotantes" sin mostrar cuántas faltan (que no se vea infinito). Prototipo empezado y REVERTIDO 11-jul (el usuario pidió priorizar verificar limpieza de colonias). Componente `CelebracionPuntos` (count-up con requestAnimationFrame + confetti CSS, sin dependencias) — reconstruir cuando se retome. La versión interna actual funciona bien; evaluar si la pública lleva esto.
