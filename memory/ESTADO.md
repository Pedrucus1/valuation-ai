# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 22 Jul 2026 (c)
**Fase:** Prod Railway + Vercel público. Sesión 22-jul-c = **fix de comparables de zona (Ixtepete) + equipamiento, desplegado; investigación a fondo de por qué reconstruir el caché del motor regresa el validador**. **✅ DESPLEGADO 22-jul-c:** commit `8fe0946` (backend, Railway) — comparables restringidos a colonia exacta + vecinas geográficas reales, Places sin negocios cerrados/con cadenas conocidas primero.

## 🔥 SESIÓN 22-JUL-c — hecho
- **Fix comparables de zona (DESPLEGADO, `8fe0946`):** `mongo_comparables.py` conecta `Modulo Drive IA/_geo/proximidad.py` (centroides SEPOMEX, ya en el repo sin usar) — colonia exacta primero, y solo si faltan, colonias VECINAS GEOGRÁFICAS reales (km_max 2.5→5). Nunca más "todo el municipio" por banda de precio (bug: Villas del Ixtepete traía comps de El Fortín a 8km, Tesistán, Jocotán). Cada comp trae `zona_tag` ("Zona exacta"/"Vecina (X.X km)") visible en la tabla del reporte (repurpone el slot `tenure_tag`, muerto para comps reales). Corregido en el camino: nombres cortos genéricos ("Del Sur") hacían match por substring en "Lomas del Sur" (otro municipio) — ahora match exacto anclado.
- **Fix equipamiento (mismo commit):** `nearby_places.py` — filtro `businessStatus=OPERATIONAL` (ya no sale "Escuela de Fútbol Atlas", cerrada); `rankPreference:POPULARITY` + top 8 nombres (antes 5) para que salgan cadenas conocidas (Super Bara) sobre abarrotes chicos; radio diferenciado (educación 1500m, plazas 2000m — antes 800m dejaba fuera Prepa 9 y plazas de Mariano Otero). Bug real corregido: si Places fallaba TOTAL, el reporte dejaba nombres INVENTADOS por Gemini como si fueran reales — ahora limpia a "sin datos verificados".
- **Motor: cache rebuild MEDIDO y descartado.** Reconstruir `cache_consolidado.json`/`cache_index.json` desde Mongo de hoy (incluye correcciones del verificador) da ±10 63.1→59.2%, ±15 75.7→70.9%, ±20 84.5→82.5%, errAbs 10.6→11.8%, mediana -7.1%→+8.8% — regresión confirmada, NO desplegado, caché restaurado al baseline 7-jul.
  - **Root cause investigado (no especulación):** del pool del 7-jul (21,562 comps), 73.7% SIGUE existiendo hoy en Mongo (colonia+área). El 26.3% que ya no calza esa llave es 98.4% PINCALI — muestreo de 200 mostró 0% marcados duplicado/remate, 46% siguen activos normales: **la corrección de m²/colonia del verificador en PINCALI cambia la llave de dedup `colonia+m²`**, no es que las propiedades se vendieron.
  - **Por qué baja el pass-rate:** los 18 OPIs (de 103) que cruzaron la línea ±10% son casi todos de pools CHICOS (n=3-7) — con tan pocos comps, que entre/salga UNO mueve la mediana 10-40pp. Caso verificado: "Álamo Industrial" (San Pedro Tlaquepaque, sin ancla NSE propia) tiene un pool de 7 anuncios con dispersión de $10k a $43k/m²C.
  - **86 colonias con pool débil (n≤6) → `Modulo Drive IA/colonias_debiles_scraper.md`** (municipio+colonia+n, generado desde `cerebro_datos.json`), para priorizar en la tarea de scraper por colonia.

### ⏭️ PRÓXIMA SESIÓN (arrancar con /crear el scraper por colonia)
1. **Scraper por colonias** (`buscar_comparables_browser.js` — URLs por colonia, anti-bot, +PINCALI ES +nocnok), priorizando las 86 colonias débiles de `colonias_debiles_scraper.md` + BV/Cuarzo.
2. **Cuarzo:** el usuario dará links directos de comparables para ver datos, solo ese avalúo.
3. **Lab valuación minimalista:** `motor_simple` = mediana $/m²C de N comps cercanos (tipo+colonia/similares+banda tamaño) × m²C, SIN cascada NSE/IDX/Ross-Heidecke. Validador 400 OPIs vs motor actual (60/68/79).
4. **Mejora estructural anotada (de la investigación de hoy):** ancla NSE más completa (colonias como Álamo Industrial no tienen) o piso menos ingenuo que $8,000/m²C fijo — ayudaría más que perseguir rebuilds reactivos del caché.

## 🔙 SESIÓN 22-JUL-b (previo)
- **Deploy:** rama `fix/flujo-avaluo-reporte-jul20` mergeada ff-only a main + desplegada (Railway `0d42b1d8` RUNNING + Vercel READY). Motor Opción C + gap6 en prod.
- **BV similares (commit `1722bcc`, main):** las 16 colonias manuales del usuario estaban solo en el legacy `colonias_similares.enriquecido.v2.json`, que el motor **ignora** cuando existe `colonias_maestro.json` (fuente única). Movidas al maestro. 11/16 sobreviven filtro NSE±1. Backup `colonias_maestro.PRE_BV_MANUAL.bak.json`.
- **Discusión metodológica (root cause NSE):** deptos NUEVOS inflan NSE colonia; casa≠depto; remodelado≠viejo. Fix NO es motor (ya se intentó, regresa) sino DATO (año/scraper). **Dirección aprobada:** separar NSE nuevo/usado × tipo en el mismo maestro (blocker=cobertura año). Detalle en memoria Claude `project_propvalu_nse_nuevo_usado`.

## 🔥 SESIÓN 22-JUL — hecho (desplegado ver arriba)
- **Flujo web:** mapa centra en coords reales (no CDMX), botón "Paso anterior" en cabecera, modal informativo ya no parpadea, stepper con círculo "Comparables", auto-descarga PDF + botón "Ver reporte" en Gracias, fotos máx 12→15 + auto-fachada, quitado "Anterior" del cuadro blanco.
- **Ads:** popup excluyente (pagada ó texto de cajón, no ambos), consistentes (no fullscreen) + adaptados a formato V/H, sin loop, cuenta arranca al reproducir el video, no se repite slot1 tras el análisis. **Fix backend: `/uploads` con Range 206** (sin él los videos salían negros) + métricas ASGI puro (no buffea). Setup de prueba: anunciante "Avaluos y Arquitectura" con Remotion en slots 1/2/3 (staging).
- **Reporte/PDF:** genera en **A4** (no carta) sin cortar, régimen legible, orden min/medio/máx, ícono 🎯, "M.N.", fotos que llenan la hoja, fachada junto al mapa (fallback 1ª foto), 6º apartado "Bancos". **Valor físico #11/#12 RESUELTO:** `calculate_remi` deriva enfoque físico (terreno ratio + construcción paramétrica CMIC − Ross-Heidecke), como el `/calculate` viejo. Mapeo recámaras/baños/estac desde `mercado_props`.
- **Comparables/scraper (investigación):** Cuarzo jala comps de otras colonias porque BV tiene ~0 deptos de venta en BD (1 renta de PINCALI inglés). GDL tiene 1547 deptos → hueco de COLONIA, no sistémico. **Tavily VIVA** (Serper muerta) y encuentra ~19 deptos en BV, pero el motor no la dispara (usa pool "exacta"). **PINCALI se scrapea del listado INGLÉS** (viola la regla, debía ser español directo) → ~60% deptos sin año. colonias_similares.v2 es mayormente SEPOMEX geográfico (36% colonias flacas). Override manual de similares de BV hecho (neutral por ahora). Archivo de scrape on-demand por colonia = `Modulo Drive IA/buscar_comparables_browser.js` (corre pero dio 0/nav-error, hay que arreglarlo).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Motor — parche depto-edad `gap6` GRADUADO a `motor_remi_api.js`** (commit `e8ed0fd`, en rama, sin desplegar). Deptos viejos en pool `exacta` se sobre-valuaban (el pool suele ser obra nueva → no depreciaba). Fix: `_gapEdad = tipo==='depto' ? 6 : 25`. Validado OFFLINE: **deptos 68→76% ±20, global --n400 69.3→70.7%, cero regresión en casas**. Cuarzo 2380 $3.55M→$2.80M. Backup `motor_remi_api.PRE_DEPTOEDAD.bak.js`. **Decisión pendiente: mergear a main + desplegar** o seguir puliendo.
- **Recuperar i24 (t→c depto) = MEDIDO NEGATIVO, NO implementar.** El dato SÍ se tira (i24 mete el área en `m2_terreno`, el builder filtra `m2c>0`), pero recuperarlo empeora (deptos 76→60%) porque **64% de lo recuperable es obra nueva** → sube medianas. El lever real = **inventario de deptos USADOS** (escaso), no cobertura de año. Detalle en `MOTOR_ANTECEDENTES.md` (sección 21-jul).
- **Método "banda por edad del sujeto"** (`LAB_ANCLA_SEG`/`LAB_SEG_CLUSTER`) es el fix correcto a futuro pero **inerte hoy** (requiere año en comps USADOS; con 44% no alcanza el umbral).
- **Diccionario nuevo:** `Modulo Drive IA/DICCIONARIO_ARCHIVOS.md` — qué hace cada archivo del motor y en qué paso del pipeline (IDX vs NSE, etc.). Puntero en `INDICE_MOTOR.md` + memoria `reference_diccionario_archivos_motor`.
- **Motor: NO reconstruir el caché a ciegas.** El del 7-jul (63.1/74.8/83.5) sigue siendo el desplegado; el cambio gap6 es sobre ESE cache, sin rebuild.

## ⏳ Pendientes / decisiones abiertas
### De la sesión 22-jul (rama sin desplegar)
0. **Mergear a main + desplegar** TODO lo de la rama (Opción C motor + revisión flujo/ads/reporte). Está pusheado, falta merge + Railway + Vercel.
1b. **Scraper por colonia:** arreglar `buscar_comparables_browser.js` — construir URLs POR COLONIA (los links del usuario funcionan), manejar anti-bot de propiedades.com/i24, sumar PINCALI (español) y nocnok. Objetivo: poblar deptos de BV + colonias similares (chapalita 21, jardines del bosque 3 ya en BD; el resto en 0) **+ 86 colonias con pool débil (n≤6) identificadas 22-jul** al investigar por qué el rebuild del caché bajaba el validador — lista completa en `Modulo Drive IA/colonias_debiles_scraper.md`.
1c. **Enricher PINCALI:** dejar de scrapear el listado INGLÉS → español directo (trae año) para tapar el ~60% de deptos sin edad. Lever real del problema de comps de depto.
1d. **Motor:** que dispare Tavily/similares para la colonia del sujeto cuando la caché es delgada, aunque tenga pool "exacta" (hoy no lo hace). Sesión de motor con validador.
1e. **colonias_similares:** reconstruir por NSE/precio (no solo SEPOMEX geográfico); 36% de colonias están flacas. `residencial victoria` no existía.
1f. **Reporte:** margen simétrico hoja 4 (mejora con altura dinámica, verificar), enfoque físico depto usa `land_area` completo (¿indiviso?), auto-ajuste de texto en celdas si desborda.
### Previos
1. **Mergear + desplegar el parche gap6** a prod — o retomar "recuperar i24 SOLO usados" (filtrar obra nueva año≥2024 del pool depto y re-medir).
2. **Contador de folio por presupuesto comprado** (hoy: acumulado por usuario).
3. **#29 Render respaldo gratis** — FALTAN env vars (usuario las pega). ~5 días antes de que venza Railway.
4. **#34 SMTP** — recuperación de contraseña sin correo saliente. Mientras: link JWT a mano.
5. **~337 colonias raras** (Cancún/Toluca mal etiquetadas) — manual o descartar.
6. **PINCALI/CyT escrapean m² mal** (systemic) — fix en el enricher, sesión aparte.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (sin env vars aún)
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico:** `motor_remi_api.js` (+ `_lab.js` con flags `LAB_*`, incl. nuevo `LAB_EDAD_DEPTO`). Validador: `validar_40_opis.js` (prod) / `validar_lab.js` (lab). **Correr OFFLINE** (`GEMINI_API_KEY= SERPER_API_KEY= TAVILY_API_KEY= DEEPSEEK_API_KEY=`) — nunca online en lote (quema crédito, no determinista).
- **Baseline** (cache 7-jul, sin MITULA): ±10 60.2 / ±15 68.0 / ±20 79.6 (offline --n400 ~69-71% según muestra). Con gap6: deptos +8pp, casas sin cambio.
- **Pipeline:** `actualizar_cache_consolidado_mongo.py` (Mongo→consolidado) → `build_cache_index.js` (→cache_index) → `construir_idx_valoracion.js` (→idx_valoracion) → motor → validador. Ver `DICCIONARIO_ARCHIVOS.md`.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · **medir/dry-run antes de wirear**. Fuentes de verdad: `MOTOR_ANTECEDENTES.md`, `ESQUEMA_CAMPOS.md`, `INDICE_MOTOR.md`.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, **22 routers**. Auth Bearer + cookie + X-Admin-Token. Deploy backend = `railway up` (CLI enlazado a `propvalu-backend` prod).
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas / 111,946 totales en `mercado_props`.
- Seguridad: incidente 06-jul cerrado. Keys → `credentials_registry.md`.
- Módulos recientes: `backend/nearby_places.py` (POIs reales del reporte), `frontend/src/components/MapaAvaluos.jsx`.

## 🕐 Diseño parqueado (no construir aún)
- **Banda-por-sujeto del motor** (LAB_ANCLA_SEG): reactivar cuando suba cobertura de año de deptos USADOS.
- **Diseñador de promocionales "Just Listed"** (`LayoutJustListed.jsx`): en repo, pulir por feedback.
- **#139/#140/#141** crowdsource edades. **#142** Data Exchange descuento por calidad. **Gamificación pública.**
