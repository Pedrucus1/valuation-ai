# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 23 Jul 2026 (tarde/noche, sesión #2)
**Fase:** Prod Railway + Vercel público. Sesión 23-jul mañana = bug sistémico SEPOMEX corregido y aplicado. Sesión 23-jul noche (esta) = **validador post-merge corrido, enricher scoped en `enricher.py` (min_id), research IMEPLAN Zoom (API pública confirmada)**. Commits `225e788` (pusheado).

## 🔥 SESIÓN 23-JUL NOCHE — hecho
- **Validador offline post-merge SEPOMEX** (`validar_40_opis.js`, motor prod): 34 OPIs candidatos → ±10% 61.8%, ±15% 79.4%, ±20% 88.2%, error abs 10.0%/mediana -7.3%. No hay baseline pre-merge guardado para comparar directo, pero está dentro de rango histórico normal del motor.
- **Revisados resultados reales de los 2 scrapes** (`colonias_debiles_progreso.md` + `ixtepete_calma_progreso.md`): ~301 comps nuevos insertados en `mercado_props` (41 del cluster La Calma/Ixtepete, ~260 de las 86 colonias débiles). 39/86 colonias débiles terminaron en 0 nuevos — casi todo por "0 resultados" del scraper (sin match en portal), NO por bloqueo (`ninguna bloqueo hasta ahora` según el propio log).
- **Detectado y cerrado gap de enriquecimiento:** `insertar_comparables_ondemand.py` reusa `_guardar_en_mongo` pero NO dispara el auto-enricher (ese trigger solo vive dentro del loop normal de `scheduler.py`). Los ~301 comps nuevos tenían `m2_construccion` (lo pone el scraper directo) pero `anio_construccion` incompleto.
- **`enricher.py` — nuevo parámetro `min_id`** en `obtener_props_mongo`/`enriquecer_mongo` (ObjectId, opcional, default None = comportamiento sin cambios) para acotar una corrida a un lote reciente sin barrer el backlog completo del portal. Usado para enriquecer scoped los 4 portales del batch on-demand (CASAS_Y_TERRENOS 205, PROPIEDADES_COM 195, NOCNOK 2, PINCALI 5 pendientes detectados). **Corrida lanzada en background, sigue corriendo al cierre de sesión** — ver abajo.
- **Research IMEPLAN Zoom (`zoom.imeplan.mx`) — API pública confirmada, sin scraping visual:** backend REST (`zoom.imeplan.mx/rest/v1/`, Django REST Framework browsable) + GeoServer WMS/WFS público sin auth (`geoserver.imeplan.mx/geoserver/sigmetro/{wms,ows}`). Confirmado en vivo: capa "Estrategia POTmet 2024 → Zonificación Primaria" = `sigmetro:vwZonificacion_primaria_POTmet_2024` (10,590 polígonos AMG, uso de suelo). Catálogo completo tiene además: marginación por AGEB/localidad, riesgo industrial/químico (`vwARQuimico*`), islas de calor + proyecciones de temperatura a 2039/2069, densidad poblacional (`AMG_densidad_2020_sm`), y movilidad muy completa (estaciones de transporte masivo, cobertura de rutas de camión, infraestructura ciclista, suficiencia de transporte público por zona). Documentado con URLs exactas en `FUENTES_EXTERNAS_METROPOLITANAS.md`. Nada integrado al pipeline todavía — solo confirmado que es viable.
- **INEGI DENUE (equipamiento urbano)** identificado como alternativa gratuita a Google Places, pero requiere token de registro (no se probó en vivo, endpoint sin token dio 404).

## 🔥 SESIÓN 23-JUL MAÑANA — hecho
- **Bug sistémico SEPOMEX CORREGIDO:** el culpable real era `enriquecer_colonias_ia.js` (no `generar_similares_sepomex.js`, que tenía un import muerto de `sepomex_jalisco.json` nunca usado — limpiado). Fix de 2 líneas: lee `sepomex_v2.json` + `.flat()` antes de filtrar. Verificado con dry-run: +52 a +93 colonias visibles por municipio AMG, caso "Loma Bonita" en Zapopan ya no se pierde contra Tecomán/Colima.
- **Regenerado `colonias_similares_enriquecido.json`** con DeepSeek+Gemini (7 municipios AMG) usando el fix — 2,349 colonias con similares, 15,756 pares nuevos. Errores transitorios de Gemini (rate-limit) no bloquearon nada, DeepSeek cubrió el 100%.
- **Hallazgo crítico sobre `construir_maestro.js`:** un rebuild completo PIERDE 647 colonias con similares que solo viven en `colonias_maestro.json` (ediciones manuales acumuladas de sesiones pasadas vía scripts in-place como `backfill_cp_maestro.js`, nunca alimentadas de vuelta a los 6 archivos fuente). Medido con copia lab (`colonias_maestro.lab.json`) antes de aplicar nada — **regla "NO reconstruir a ciegas" ahora cuantificada**.
- **Fix aplicado vía merge ADITIVO** (`merge_simIA_a_maestro.js`, nuevo script, no destructivo): 51 colonias nuevas, 1,805 ampliadas, 11,852 pares agregados, CERO pérdidas. Commit `6bd75c9`.
- **Fusión de variantes de nombre Ixtepete:** "Jardines del/de Ixtepete" y "Villa/Villas del Ixtepete" eran la misma colonia partida en 2 por typo — unificadas a los nombres oficiales SEPOMEX, similares combinados.
- **La Calma (Zapopan) ampliada a mano** con conocimiento del usuario: +6 similares verificados contra `sepomex_v2.json` por CP (El Colli Ejidal, El Colli Urbano 1a, Arboledas 1a Secc, Loma Bonita, Las Águilas, Pinar de la Calma).
- **Scraper on-demand ampliado:** las 86 colonias débiles de `colonias_debiles_scraper.md` corridas completas (loop propio en background, sin supervisión granular por evento — lección de eficiencia) + cluster La Calma/Ixtepete/nuevos similares (10 corridas).
- **Enrichers de año completos:** PROPIEDADES_COM (74/74), INMUEBLES24 (100/100, 4 enriquecidas), NOCNOK (500/500, 0 nuevas), CASAS_Y_TERRENOS (2000/2000, 1906 enriquecidas, 94 errores normales).
- **Incidente resuelto en la sesión:** un agente lanzado para "arreglar" el loop de scraping duplicó el trabajo (2 loops corriendo en paralelo sobre las mismas colonias) — detectado por entradas repetidas en el log, matado a tiempo, solo 3 colonias re-procesadas sin daño (dedup por id_unico en Mongo).
- **Investigación de fuentes externas** (IIEG datos abiertos, mapa.jalisco.gob.mx, MapaLab, AlertaRoja): solo IIEG Datos Abiertos vale la pena integrar (nivel colonia/AGEB, descargable). El visor de Zapopan revisado en vivo no trae equipamiento/uso de suelo/seguridad como capas. AlertaRoja = solo consulta manual puntual, no sistemático.

### ⏭️ PRÓXIMA SESIÓN
0. **Verificar si terminó el enricher scoped** lanzado en background (CASAS_Y_TERRENOS ✅ 201/0 err, PROPIEDADES_COM en curso ~85/195, NOCNOK y PINCALI pendientes). Log: `AppData\Local\Temp\claude\...\scratchpad\enrich_ondemand_batch.log` (ruta de sesión, puede haberse limpiado — si no está, solo son ~400 docs, tarda <1h, se puede relanzar con el mismo `min_id` documentado en `enricher.py`).
1. **Usar los comps nuevos (BV + 86 colonias débiles + La Calma/Ixtepete) en el avalúo Cuarzo real** — segmentar por edad/antigüedad antes de promediar (BV mezcla obra nueva $58-71k/m²C con usado $22-40k/m²C). Sigue pendiente, no arrancado.
2. **NSE nuevo/usado × tipo de propiedad** — separar `idx.casa.usado`/`idx.casa.nuevo` (y extender a depto/local/oficina/bodega) en `colonias_maestro.json`. Blocker = cobertura de año (mejorada con los enrichers). Nueva idea a evaluar en el scope: cruzar índice de marginación IMEPLAN (`vwPOTmetGradoMarginacionAGEB`) como señal NSE independiente para colonias sin/pocos comps — medir correlación contra `colonias_nse.json` ANTES de conectar nada. Ver memoria `project_propvalu_nse_nuevo_usado`. Necesita su propio scope antes de tocar código.
3. **Limpiar `colonias_maestro.lab.json`** (artefacto de prueba, no committeado) si ya no se necesita de referencia.
4. **Lab valuación minimalista:** `motor_simple` = mediana $/m²C de N comps cercanos × m²C, sin cascada NSE/IDX/Ross-Heidecke. Validador 400 OPIs vs motor actual. No arrancado.
5. **Si se decide integrar IMEPLAN:** empezar por la capa de zonificación (`vwZonificacion_primaria_POTmet_2024`, uso de suelo — filtra si un predio cae en área no urbanizable/conservación) o distancia a transporte masivo (mayor impacto en plusvalía, hoy el motor no tiene nada de esto). Requiere su propio scope (cómo cruzar polígono↔colonia, WFS es point-in-polygon no lookup directo).

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **22-jul-d:** Scraper on-demand por colonia arreglado (`buscar_comparables_browser.js` reescrito sin navegador) + caso Cuarzo/BV resuelto con 8 comps directos + 16 similares (~180 comps). Bug propio Propiedades.com (id_unico colapsado) corregido. Bug sistémico SEPOMEX flagged (corregido al día siguiente, ver arriba).
- **22-jul-c:** Fix comparables de zona DESPLEGADO (`8fe0946`) — vecinas geográficas reales vía `proximidad.py`, nunca "todo el municipio". Equipamiento (`nearby_places.py`) sin negocios cerrados. Cache rebuild MEDIDO y descartado (regresión por pools chicos n≤6) → identificadas 86 colonias débiles.
- **22-jul-b:** Rama `fix/flujo-avaluo-reporte-jul20` desplegada (motor Opción C + gap6 en prod). BV similares movidas al maestro (`1722bcc`). Dirección aprobada: NSE nuevo/usado × tipo (blocker=año).
- **22-jul:** Flujo web/ads/reporte — múltiples fixes desplegados. Investigación inicial Cuarzo (premisa "BV ~0 deptos" — corregida esta sesión, ver arriba).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Motor — parche depto-edad `gap6` GRADUADO a `motor_remi_api.js`** (commit `e8ed0fd`, en rama, sin desplegar). `_gapEdad = tipo==='depto' ? 6 : 25`. Validado OFFLINE: deptos 68→76% ±20, global 69.3→70.7%, cero regresión en casas. **Decisión pendiente: mergear+desplegar.**
- **Recuperar i24 (t→c depto) = MEDIDO NEGATIVO, NO implementar** — 64% de lo recuperable es obra nueva, empeora. Lever real = inventario de deptos USADOS.
- **Método "banda por edad del sujeto"** (`LAB_ANCLA_SEG`) es el fix correcto a futuro pero inerte hoy (falta cobertura de año en usados).
- **Motor: NO reconstruir el caché a ciegas.** El del 7-jul (63.1/74.8/83.5) sigue siendo el desplegado.
- **PINCALI solo español (`/inmueble/`)** para colonia/año — regla dura, respetada en el fix de hoy.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa (Opción C motor + revisión flujo/ads/reporte). Pusheada, falta merge + Railway + Vercel.
1. **Mergear + desplegar el parche gap6** a prod.
2. **Contador de folio por presupuesto comprado** (hoy: acumulado por usuario).
3. **#29 Render respaldo gratis** — faltan env vars.
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
- **Canónico:** `motor_remi_api.js` (+ `_lab.js` con flags `LAB_*`, incl. `LAB_EDAD_DEPTO`). Validador: `validar_40_opis.js` (prod) / `validar_lab.js` (lab). **Correr OFFLINE** (`GEMINI_API_KEY= SERPER_API_KEY= TAVILY_API_KEY= DEEPSEEK_API_KEY=`) — nunca online en lote.
- **Baseline** (cache 7-jul, sin MITULA): ±10 60.2 / ±15 68.0 / ±20 79.6 (offline --n400 ~69-71%). Con gap6: deptos +8pp, casas sin cambio.
- **Pipeline:** `actualizar_cache_consolidado_mongo.py` (Mongo→consolidado) → `build_cache_index.js` (→cache_index) → `construir_idx_valoracion.js` (→idx_valoracion) → motor → validador. Ver `DICCIONARIO_ARCHIVOS.md`.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · **medir/dry-run antes de wirear**. Fuentes de verdad: `MOTOR_ANTECEDENTES.md`, `ESQUEMA_CAMPOS.md`, `INDICE_MOTOR.md`.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, **22 routers**. Auth Bearer + cookie + X-Admin-Token. Deploy backend = `railway up`.
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas / 111,946+ totales en `mercado_props` (creciendo con el scraper on-demand).
- Seguridad: incidente 06-jul cerrado. Keys → `credentials_registry.md`.
- **`.env` local del scraper apunta a PROD** (no staging pese al comentario de `db_target.py` — verificar si se quiere cambiar).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso de uso completo + bug sistémico SEPOMEX documentado.

## 🕐 Diseño parqueado (no construir aún)
- **Banda-por-sujeto del motor** (LAB_ANCLA_SEG): reactivar cuando suba cobertura de año de deptos USADOS.
- **Diseñador de promocionales "Just Listed"** (`LayoutJustListed.jsx`): en repo, pulir por feedback.
- **#139/#140/#141** crowdsource edades. **#142** Data Exchange descuento por calidad. **Gamificación pública.**
