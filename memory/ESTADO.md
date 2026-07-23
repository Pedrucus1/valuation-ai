# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 23 Jul 2026 (noche, sesión #3)
**Fase:** Prod Railway + Vercel público. Sesión 23-jul mañana = bug sistémico SEPOMEX. Sesión 23-jul noche #2 = validador post-merge + enricher scoped + research IMEPLAN. **Sesión 23-jul noche #3 (esta) = video de anuncios arreglado y desplegado + investigación profunda del caso Cuarzo (causa raíz real encontrada, 2 fixes medidos y descartados, 1 fix real aplicado).** Commits `6b3a76f`, `db7d218` (pusheados).

## 🔥 SESIÓN 23-JUL NOCHE #3 — hecho

### Video de anuncios (bug reportado por el usuario) — RESUELTO Y DESPLEGADO
- Causa: no había ningún creativo de video aprobado/activo (todos los 14 creativos existentes eran imagen). `AdOverlay.jsx` (componente real, usado en ComparablesPage/ReportPage) estaba bien codeado; `AdRenderer.jsx` es código muerto sin usar.
- Subido video (Remotion, `propvalu-emo-horizontal.mp4`) a slot1 y slot2 de la campaña de "avaluos y arquitectura", aprobado como admin. Slot3 quedó con su imagen.
- **Volumen persistente de Railway agregado** (`propvalu-backend-volume`, 5GB, montado en `/app/backend/uploads`) — antes el storage de ads/KYC era efímero, se perdía en cada deploy. **Costo del cambio:** al adjuntar el volumen (dispara redeploy automático) se borraron los archivos viejos que NO estaban respaldados — 14 creativos de imagen de otras campañas de "avaluos y arquitectura" se perdieron (no hay backup, si el usuario los tiene hay que resubirlos).
- **Achicador de video agregado** (`_compress_video()` en `backend/routers/ads.py`, ffmpeg en Dockerfile): cualquier video subido se recomprime automáticamente (720p, CRF26, faststart) antes de guardarse — 12.2MB→1.5MB en la prueba real. Antes NO existía compresión de video (solo imágenes vía `compressFile.js`, que el usuario recordaba mal como "el achicador" que cubría todo). Desplegado y verificado en prod (commit `6b3a76f`).

### Caso Cuarzo — investigación profunda, causa raíz real encontrada
- **Enricher scoped de la sesión anterior confirmado terminado:** 401 docs enriquecidos, 0 errores (CASAS_Y_TERRENOS 201, PROPIEDADES_COM 195, NOCNOK 0, PINCALI 5).
- **Validación de datos:** 605 docs tocados en 20h, 389 con `anio_construccion`, sin colonias/municipios vacíos — datos correctos. **NO forman parte del NSE/IDX** (esos son snapshot precalculado `idx-18m` en `colonias_maestro.json`, no se actualizan solos; reconstruirlo ya se probó y se descartó por deriva de datos).
- **Metodología manual (banda edad + Ross-Heidecke) probada y comparada contra el motor JS (103 OPIs, `validar_lab.js`):** el bucket ya existente `LAB_EDADSEG=1 K=0.5` (0-5→1.0/6-10→0.78/11+→0.67) sigue ganando (+2.4pp ±15, cero regresión, reconfirmado hoy con datos frescos). **Ross-Heidecke (curva continua) NO le gana en ningún K — descartado como curva.**
- **Hallazgo grande: el pipeline de REPORTES reales (`server.py: calculate_valuation` / `mongo_comparables.py`) es código Python completamente separado del motor JS (`motor_remi_api.js`) — nunca se benefició de LAB_EDADSEG ni de nada validado ahí.**
  - Cuarzo real (`val_43a05a7a5511`, 21-jul): `estimated_value=$3,931,206`. Mi cálculo manual segmentado: ~$2.29M (−42%). Ixtepete y La Calma (mismo pipeline) dieron valores cercanos a mi cálculo manual (−3%, −10%) — el problema es específico de Bosques de la Victoria, no generalizado.
  - **Causa raíz:** `mongo_comparables.py::_similarity_score()` rankea comparables SOLO por m²(60%)+precio(40%, inactivo si no hay `precio_referencia`, el caso normal) — **la edad nunca entra al ranking**. El pool "zona exacta" de BV tiene mediana $64,511/m²C en crudo (dominado por PINCALI obra nueva 2026).
  - **Fix #1 descartado (medido):** homologación por edad en `calculate_valuation` (bucket EDADSEG) → NO-OP (mediana +0.0% sobre 19 avalúos guardados) porque los comps GUARDADOS casi no traen `age`.
  - **Fix #2 descartado (medido):** agregar edad a `_similarity_score()` → empeoró (mediana subió de $51,067 a $55,000/m²C, con solo 8/50 comps con edad conocida — ruido, no señal).
  - **Conclusión:** ningún ajuste suave de ponderación arregla esto. El blocker real sigue siendo el split categórico **NSE nuevo/usado** (filtro duro, no reponderación) — ya identificado como su propio scope desde antes de esta sesión.
- **Fix real aplicado y desplegado (bajo riesgo, sin necesidad de medir):** `land_area` en `ValuationForm.jsx` ya NO defaultea a `construction_area` cuando se omite — ahora defaultea a 0. El fallback viejo inflaba el método físico (20% del peso) para CUALQUIER departamento sin importar el piso. Commit `db7d218`.
- **Corrección de memoria propia:** `feedback_pincali_solo_espanol` ya documentaba que el 75% de docs PINCALI históricos en inglés es legado conocido y corregido hacia adelante — lo re-flageé como "hallazgo nuevo" sin consultar memoria primero, corregido para no repetirlo.

### ⏭️ PRÓXIMA SESIÓN
0. **Si el usuario tiene backups de los 14 creativos de imagen perdidos** (otras campañas de "avaluos y arquitectura"), resubirlos.
1. **NSE nuevo/usado × tipo de propiedad — ahora es EL blocker confirmado para reportes reales, no solo para el motor JS.** Filtro duro (excluir obra nueva del pool antes de calcular), no reponderación suave — ya descartadas 2 variantes de reponderación esta sesión. Ver memoria `project_propvalu_nse_nuevo_usado`. Necesita su propio scope.
2. **Usar los comps nuevos en el avalúo Cuarzo real** — ya se hizo el cálculo manual (~$2.29M), pendiente decidir si se actualiza el reporte guardado o se espera al fix estructural de NSE nuevo/usado.
3. Limpiar `colonias_maestro.lab.json` (artefacto de prueba, no committeado) si ya no se necesita.
4. Lab valuación minimalista (`motor_simple`), IMEPLAN Zoom — sin arrancar, ver `BACKLOG.md`.

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **23-jul noche #2:** Validador post-merge SEPOMEX (34 OPIs, dentro de rango normal). Enricher scoped lanzado. Research IMEPLAN Zoom (API pública confirmada, nada integrado).
- **23-jul mañana:** Bug sistémico SEPOMEX corregido (`enriquecer_colonias_ia.js`, merge aditivo, commit `6bd75c9`). Scraper on-demand 86 colonias débiles + cluster La Calma/Ixtepete.
- **22-jul-d:** Scraper on-demand por colonia arreglado + caso Cuarzo/BV con 8 comps directos + 16 similares.
- **22-jul-c:** Fix comparables de zona desplegado (vecinas geográficas reales). Cache rebuild descartado.

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **NSE nuevo/usado es AHORA el blocker #1 confirmado** — afecta tanto al motor JS (validado desde 06-jul) como al pipeline de reportes reales (confirmado hoy, 23-jul). 2 alternativas de reponderación suave ya descartadas por medición. Solo un filtro duro categórico puede arreglarlo.
- **Motor — parche depto-edad `gap6` GRADUADO a `motor_remi_api.js`** (commit `e8ed0fd`, en rama, sin desplegar). Decisión pendiente: mergear+desplegar.
- **Motor: NO reconstruir el caché a ciegas.** El del 7-jul sigue siendo el desplegado.
- **PINCALI solo español** — regla dura. Legado en inglés (75% histórico) ya conocido y corregido hacia adelante, NO re-flagear como hallazgo.
- **Railway ahora tiene volumen persistente** (`propvalu-backend-volume`, `/app/backend/uploads`) — uploads de ads/KYC ya sobreviven redeploys.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa.
1. **Mergear + desplegar el parche gap6** a prod.
2. Contador de folio por presupuesto comprado.
3. #29 Render respaldo gratis — faltan env vars.
4. #34 SMTP — recuperación de contraseña sin correo saliente.
5. ~337 colonias raras (Cancún/Toluca mal etiquetadas).
6. PINCALI/CyT escrapean m² mal (sistémico) — fix en el enricher, sesión aparte.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Anunciante real:** avaluosyarquitectura2@gmail.com (mismo Pedro Vergara, contraseña no confirmada esta sesión — se generó token directo vía script cuando se necesitó).
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas, no confirmado si sigue así).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 103 OPIs):** `motor_remi_api.js` (+ `_lab.js` con flags `LAB_*`). Validador: `validar_lab.js` (offline, correr sin API keys). Baseline hoy: ±10 60.5% / ±15 74.1% / ±20 81.5% / errAbs 11.7%.
- **`LAB_EDADSEG=1 K=0.5`** (bucket 3-escalones por edad del comp): +2.4pp ±15, cero regresión — mejor palanca de edad probada, sin desplegar (falta que suba más la cobertura de `anio_construccion`).
- **`LAB_EDADSEG_MODE=rh`** (Ross-Heidecke continua): agregada y descartada esta sesión, no supera al bucket.
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba. Cualquier mejora ahí NO se propaga a los reportes que ven los usuarios.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · medir/dry-run antes de wirear.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. **Volumen persistente en `/app/backend/uploads`** (nuevo esta sesión). Deploy = `railway up` (no hay auto-deploy desde GitHub, hay que dispararlo manual).
- MongoDB: **prod real = `cluster0.9eliadx`** (confirmado esta sesión vía `railway run` — el `.env` local del backend apunta a `cluster1.avle5ez`, que es staging, bloqueado por IP allowlist de Atlas). Scraper (`scraper-inmuebles/.env`) también apunta a `cluster0.9eliadx` — mismo cluster que prod, sin split-brain.
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizado esta sesión con la causa raíz real.
