# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 23 Jul 2026 (noche, sesión #6)
**Fase:** Prod Railway + Vercel público. Sesión #6 (esta) = bug de raíz de PINCALI arreglado (m²c + título) con limpieza retroactiva grande en Mongo, guardia de colonia lejana portado al motor (Ixtepete), fixes de ads/equipamiento/gamificación/edades, y bug de UX del selector de colonias. Commits `80efa8d`, `8ae0c42`, `36e2d19`, `3ac523f`, `8778746`, `04a99f9` (todos pusheados).

## 🔥 SESIÓN 23-JUL NOCHE #6 — hecho

### PINCALI: bug de raíz de m²c y título arreglado (commits `80efa8d`, `36e2d19`)
- **Causa real:** la página de listado que se escanea es SIEMPRE inglesa (`/propiedades/` española da 403, no existe ruta de listado en español) → su m²c salía de un regex de prosa SIN ancla (primer "N m²" del texto) que a veces agarraba un número ajeno (terraza, rango "desde X m²"). Mismo mecanismo detrás de la limpieza de 744 registros de la sesión pasada.
- **Fix:** el detalle SÍ trae el área real estructurada (JSON-LD `floorSize` / bloque escapado `Area M2`, mismo bloque de donde ya se sacaba Parking Spaces) → el enricher ahora la usa como autoritativa y PISA lo que puso la tarjeta (antes solo rellenaba si faltaba). Guardia de $/m² (3,000–200,000) en `pincali.py` ANTES de guardar (limpiar antes de insertar, no solo después). Título sintetizado en español desde `Property Type`+`Operation Type` estructurados (la tarjeta nunca tiene título en español disponible).
- **Limpieza retroactiva en Mongo (no scraping, solo transformación local):** 38,726 títulos PINCALI regenerados a español (determinístico, desde `tipo_propiedad`/`tipo_operacion`/`colonia` ya guardados) + 5,729 `m2_construccion` corruptos limpiados (`$unset`) — mucho más que los 744 anteriores, porque esa limpieza fue solo en el caché del motor, nunca tocó `mercado_props` crudo.
- **⚠️ PAUSADO: re-enriquecimiento de los 6,548 docs afectados** (los 5,729 limpiados hoy + ~819 que ya estaban vacíos) llegó a 503/6,600 cuando PINCALI empezó a responder HTTP 202 (soft-block) en ~98% de las peticiones — se dejó de insistir para no empeorar el bloqueo. **Retomar más tarde/mañana:** `enricher.py --tab PINCALI --max 6600 --mongo` (ya reseteó `enrich_last_attempt` de los 6,548 el 23-jul).

### Ixtepete — comps de zonas lejanas: causa real encontrada y arreglada en el motor
- El mismo bug ya documentado y arreglado en `mongo_comparables.py` (panel de "comparables reales" del reporte) **nunca se portó al motor de valuación**: `buscarCompsConWeb` (`motor_remi_api.js`) dejaba que DeepSeek metiera cualquier "colonia" que sacara de los snippets de Google sin validarla contra el sujeto — así entraban Tesistán, Valle Imperial, Unidad Díaz Ordaz, etc. en avalúos de Villas del Ixtepete.
- Fix: guardia `normCol(colonia)` contra sujeto+similares antes de aceptar un comp web. No medido con el validador online (la regla es no correr el validador online en lote; este código solo se ejercita en el fallback de búsqueda web, que el offline no toca).

### Ads / reporte
- **Video de slot1 no se veía** (solo counter+botón CTA): `autoPlay` + `muted={false}` — los navegadores bloquean autoplay con audio, el video quedaba en negro pero el overlay (que no depende del video) sí se veía. Fix: arranca muted + botón toggle 🔇/🔊.
- **Duración slot1** 60s→30s (frontend y backend, el backend manda la duración real cuando hay campaña pagada).
- **Equipamiento:** tarjeta de "Bancos" agregada — el dato real (`nearby_places.py`, tipos `bank`/`atm`) ya existía, pero el reporte nunca le hizo tarjeta (grid fijo de 4 + plazas suelta, bancos se quedó fuera).

### Scraper on-demand: 165 colonias débiles de edad
- Recalculadas: 165 colonias con ≥5 props casa/depto pero <5 con edad conocida (antes eran 86 con el criterio más estricto de "0 con edad").
- Corridas 3 veces (94+7+64) por interrupciones del proceso en background (status "killed", sin causa de código identificada) → **334 comps nuevos** en NOCNOK/CASAS_Y_TERRENOS/PROPIEDADES_COM, la mayoría enriquecidos con año (`enricher.py` scoped por `min_id`).

### Gamificación
- Sonidito (Web Audio sintetizado, sin archivos) + 20 variantes de festejo al azar (antes siempre "+1 🎯") al sumar propiedad verificada.
- Nuevo campo `avaluos_ganados` (`total // 150`) en `/api/gamificacion/mis-puntos`, mostrado junto a Récord (barra compacta), en la línea de Meta, y como tile en el panel expandido.
- **Hallazgo importante: el premio NO está conectado a ningún saldo de créditos real** (`session.credits` es solo el plan pagado mensual, totalmente separado). Es puramente informativo hoy. Pendiente decidir si se integra de verdad.

### Edades por zona
- Nueva opción "Preventa (aún no construida)" en el selector de edad — no tiene edad cronológica, pide en su lugar un año probable de terminación (input a futuro, hasta +6 años, opcional). Backend (`edades.py`): rango `preventa` fuera de `RANGO_MIDPOINT`, guarda `anio_terminacion_estimado`.

### Bug de UX arreglado: filtro de colonias del verificador
- El combo (`ColoniaCombo`) tenía tope fijo de **30 items desde siempre** (diseño original) — invisible mientras los municipios tenían <30 colonias. Al crecer la base hoy (165 colonias scrapeadas), Zapopan/Guadalajara ya pasan de 30 y solo se veían las primeras alfabéticamente ("solo la A"). Tope subido a 300 + aviso "+N más" con fondo verde/negritas (antes gris casi invisible).

### ⏭️ PRÓXIMA SESIÓN
1. **Retomar el re-enriquecimiento de PINCALI** (6,045 docs restantes de los 6,548) cuando el rate-limit de PINCALI se enfríe.
2. **Decidir si se integra "avalúos ganados" al saldo de créditos real** (hoy es solo informativo, requiere lógica backend de acreditación idempotente).
3. **NSE nuevo/usado sigue bloqueado por cobertura de datos** — las 165 colonias de hoy suman volumen pero no se volvió a intentar el split; medir si ahora hay suficiente cobertura antes de reintentar.
4. Investigar por qué los procesos en background se están matando solos ("killed", 3 veces en la sesión, sin traceback ni causa de código) — puede ser límite del harness, no del proyecto.
5. Limpiar `colonias_maestro.lab.json` (artefacto de prueba, no committeado) si ya no se necesita — pendiente desde sesión #5.
6. Render: retomar cuando el usuario quiera (diagnóstico de puppeteer listo, sesión #5).

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **23-jul noche #5:** Motor JS mejorado (piso espejo del techo graduado + limpieza de 744 m²c rotos en caché), hallazgo de mecanismo (rebuild completo del índice regresa aunque no cambies datos), NSE nuevo/usado cerrado con 8 variantes descartadas.
- **23-jul noche #4:** Validación de junio/julio, investigación NSE nuevo/usado en el motor JS (negativo).
- **23-jul noche #3:** Video de anuncios arreglado y desplegado. Caso Cuarzo — causa raíz real encontrada.
- **23-jul noche #2:** Validador post-merge SEPOMEX. Enricher scoped. Research IMEPLAN Zoom.
- **23-jul mañana:** Bug sistémico SEPOMEX corregido (commit `6bd75c9`).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **PINCALI: fix de raíz de m²c/título desplegado (embebido, no requiere Railway). Limpieza retroactiva grande hecha, PERO el re-enriquecimiento de 6,045 docs quedó pausado por rate-limit del portal — pendiente caliente.**
- **Ixtepete/comps lejanos: causa real (motor sin guardia de colonia en búsqueda web) encontrada y arreglada, no solo el síntoma del panel de reporte.**
- **Motor JS (sesión #5): 103/207 (±10%), 131/207 (±15%), 152/207 (±20%), errAbs 15.2%.** No tocado esta sesión.
- **NSE nuevo/usado: bloqueador de volumen de datos, no de fórmula** (sesión #5). 165 colonias débiles scrapeadas hoy pueden ayudar — no medido aún.
- **REGLA DURA vigente:** nunca `build_cache_index.js` completo para un fix puntual — parchar la celda a mano.
- **PINCALI solo español** — regla dura, reforzada hoy (título ahora se sintetiza en español desde campos estructurados, ya que la tarjeta de listado es irremediablemente inglesa).
- **Gamificación "avalúos ganados" es solo informativa — no está conectada a créditos reales.**
- **Motor — parche depto-edad `gap6`** (commit `e8ed0fd`, en rama, sin desplegar). Decisión pendiente de sesiones previas.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa.
1. **Mergear + desplegar el parche gap6** a prod.
2. Contador de folio por presupuesto comprado.
3. #29 Render respaldo gratis — deploy falló (puppeteer sospechoso), en pausa.
4. #34 SMTP — recuperación de contraseña sin correo saliente.
5. ~337 colonias raras (Cancún/Toluca mal etiquetadas).

### Nuevos de hoy
6. Retomar re-enriquecimiento PINCALI (6,045 docs) cuando baje el rate-limit.
7. Decidir integración real de "avalúos ganados" al saldo de créditos.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000` (ONLINE por default, usa Serper/Tavily/Gemini — confirmado que el resultado es igual de determinista con o sin ellas para el set actual). Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **Piso espejo del techo (`poolTipo=exacta`, n≥10, ±5%)** — graduado sesión #5, en producción.
- **`buscarCompsConWeb` ahora valida colonia** (fix Ixtepete, hoy) — solo afecta al fallback de búsqueda web (Tavily/Serper/DeepSeek/Gemini), no al pool cacheado.
- **`LAB_NSE_SPLIT`/`LAB_INDEX_PATH`** — infra de laboratorio no-op, queda para futuras pruebas de nuevo/usado cuando haya más cobertura de datos.
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba. Cualquier mejora ahí NO se propaga a los reportes que ven los usuarios.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. Deploy = `railway up` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — `railway run` sirve para correr scripts contra prod real desde local).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizar con el fix de hoy si se retoma.
- **PINCALI cobertura (post-limpieza hoy, 38,990 activos):** colonia 99.3%, municipio 100%, precio 99.9%, m²c 78.2% (subiendo), recámaras/baños 63-67%, año 45.2% (techo real, dato faltante del vendedor).
