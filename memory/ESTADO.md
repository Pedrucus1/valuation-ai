# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 23 Jul 2026 (noche, sesión #5)
**Fase:** Prod Railway + Vercel público. Sesión #5 (esta) = motor JS mejorado (piso espejo graduado + limpieza masiva de datos rotos, +5 OPIs de mejora medida, cero regresión), hallazgo de mecanismo (rebuild completo del caché regresa aunque no cambies datos), NSE nuevo/usado cerrado con 8 variantes descartadas. Commits `052d029`, `1a87870`, `e36b2a6`, `b391518`, `6e43010` (todos pusheados).

## 🔥 SESIÓN 23-JUL NOCHE #5 — hecho

### Motor JS mejorado, MEDIDO y desplegado localmente (commiteado, no requiere deploy a Railway — el motor corre embebido)
- **Piso espejo del techo `poolTipo=exacta` GRADUADO a producción** (`motor_remi_api.js`, commit `1a87870`): mismo 5%/mismo gate n≥10 que el techo ya existente, pero también hacia abajo del blend (antes solo tenía techo, no piso). Aislado de 2 candidatos más (piso-NSE=negativo, bono-edad=nunca se activa) — solo se graduó el que midió positivo. +1.0/+2.9/+1.0pp en ±10/15/20.
- **Bug de datos encontrado y arreglado a escala: 744 registros casa/depto en TODO el caché con `m2c` roto** (mayoría PINCALI, obra nueva mal capturada — deptos de 5-55m² a precios de hasta $5,250 millones, $/m² imposibles hasta $60M). Limpiado en 309 celdas de colonia (commit `e36b2a6`). Mejora en las 4 métricas del validador, cero regresión.
- **Caso Cuarzo (Bosques de la Victoria) arreglado de verdad esta vez** (commit `052d029`): enriquecido con 8 comps reales de Mongo que faltaban en el caché + quitados 2 registros rotos. Motor JS: $2.83M→$1.94M (referencia — el reporte REAL de Cuarzo lo genera el pipeline Python separado, no se tocó).
- **Validador 207 OPIs, acumulado de la sesión: 98→103 en ±10% (+5), 124→131 en ±15% (+7), 147→152 en ±20% (+5), errAbs 15.0%→15.2% (neutral).**

### Hallazgo de mecanismo — CRÍTICO para cualquier fix de caché futuro
- **Reconstruir `cache_index.json` completo (`node build_cache_index.js`), aunque no cambies NADA de datos, regresa el validador** (confirmado: rebuild del `cache_consolidado.json` sin ningún edit mío dio los mismos números "malos" que con mi fix). Causa: el `cache_index.json` commiteado en git ya estaba desactualizado respecto al `cache_consolidado.json` commiteado — cualquier rebuild arrastra TODA la deriva acumulada de TODAS las colonias, no solo la que quieras arreglar.
- **Fix correcto: parchar la celda específica directo en `cache_index.json` (a mano, sin correr el builder completo).** Así se puede corregir una colonia puntual sin regresar el resto. Esta técnica ya se usó para Cuarzo y para la limpieza de los 744 registros rotos, ambas sin regresión.
- **Regla nueva para la memoria:** NUNCA correr `build_cache_index.js` completo para un fix puntual — parchar la celda a mano. Reconstruir todo sigue reservado para cuando se decida conscientemente absorber toda la deriva (y medir el impacto neto primero).

### NSE nuevo/usado — CERRADO por ahora, 8 variantes probadas y descartadas
- Motor JS: split forzado, subject-aware, n≥8 (sesión pasada + hoy) + techo con corte 2/5/6 años + selección-de-comps con corte 2/3/4/5/8 años (a pedido del usuario, probando el punto de inyección correcto). **Las 8 dan negativo o sin efecto.**
- **Causa de fondo (no es la fórmula, es el dato):** casi ninguna colonia tiene ≥5 comparables con edad conocida Y en la misma franja de edad que el sujeto al mismo tiempo. No importa el mecanismo ni el corte de años elegido si no hay volumen con qué segmentar.
- **Conclusión: no reintentar el split nuevo/usado sin antes subir la cobertura de datos por colonia** (scraper dirigido a colonias débiles, ya identificado en sesiones previas). Detalle completo en memoria `project_propvalu_nse_nuevo_usado`.

### Junio/julio sumados al validador
- Cerebro 751→1000 OPIs (17 de junio + 19 de julio). De los "No hallado" en folio: la mayoría son avalúos genuinamente sin terminar por el perito (`#DIV/0!` en la fórmula, tabla de comparables vacía — verificado en Sheets, no es bug), unos pocos sí eran cuota de Google Sheets saturada (recuperados con reintento).

### Render (`valuation-ai-1`) — deploy falló, en pausa
- Email de error de deploy. Diagnóstico (no confirmado con logs, sin MCP de Render): `puppeteer` en `package.json` raíz descarga Chromium completo, típico causante de fallo en plan gratis. Usuario decidió dejarlo en pausa (no es el backend de producción, solo respaldo gratis).

### ⏭️ PRÓXIMA SESIÓN
1. **NSE nuevo/usado sigue bloqueado por cobertura de datos, no por fórmula.** Antes de volver a intentarlo, subir volumen de comparables con edad por colonia (scraper dirigido).
2. **Cache_index.json vs cache_consolidado.json — considerar si conviene alinear ambos con un rebuild completo consciente**, midiendo el impacto neto primero (hoy se evitó a propósito parchando celda por celda).
3. Si el usuario tiene backups de los 14 creativos de imagen perdidos (sesión #3), resubirlos.
4. Limpiar `colonias_maestro.lab.json` (artefacto de prueba, no committeado) si ya no se necesita.
5. Render: retomar cuando el usuario quiera (diagnóstico de puppeteer listo).

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **23-jul noche #4:** Validación de junio/julio, investigación NSE nuevo/usado en el motor JS (negativo, causa: cap unidireccional sobre motor que ya subvalúa).
- **23-jul noche #3:** Video de anuncios arreglado y desplegado. Caso Cuarzo — causa raíz real encontrada (pipeline Python separado del motor JS), 2 fixes de reponderación descartados.
- **23-jul noche #2:** Validador post-merge SEPOMEX. Enricher scoped. Research IMEPLAN Zoom.
- **23-jul mañana:** Bug sistémico SEPOMEX corregido (commit `6bd75c9`).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Motor JS mejorado y estable: 103/207 (±10%), 131/207 (±15%), 152/207 (±20%), errAbs 15.2%.** Todo commiteado y pusheado.
- **NSE nuevo/usado: blocker de negocio real (reportes reales sobrevaloran obra nueva), pero SIN mecanismo algorítmico que funcione — el bloqueador es volumen de datos por colonia, no la fórmula.** No reintentar sin antes resolver cobertura.
- **REGLA NUEVA DURA: nunca `build_cache_index.js` completo para un fix puntual — parchar la celda a mano en `cache_index.json`.** Un rebuild completo regresa el validador aunque no cambies datos, por deriva ya acumulada entre consolidado e índice.
- **PINCALI tiene un bug de captura de m²c en preventa** (números de unidad/modelo confundidos con metros) — ya limpiado en 309 celdas hoy, pero el bug de EXTRACCIÓN en el scraper/enricher sigue sin arreglarse en la fuente (seguirá generando basura nueva).
- **Motor — parche depto-edad `gap6`** (commit `e8ed0fd`, en rama, sin desplegar). Decisión pendiente: mergear+desplegar.
- **PINCALI solo español** — regla dura, ya conocida.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa.
1. **Mergear + desplegar el parche gap6** a prod.
2. Contador de folio por presupuesto comprado.
3. #29 Render respaldo gratis — deploy falló hoy (puppeteer sospechoso), en pausa.
4. #34 SMTP — recuperación de contraseña sin correo saliente.
5. ~337 colonias raras (Cancún/Toluca mal etiquetadas).
6. **Bug de extracción PINCALI m²c en preventa** (fuente del problema limpiado hoy en 309 celdas) — arreglar en el enricher/scraper para que no siga generando basura.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000` (ONLINE por default, usa Serper/Tavily/Gemini — confirmado que el resultado es igual de determinista con o sin ellas para el set actual). Baseline hoy: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **Piso espejo del techo (`poolTipo=exacta`, n≥10, ±5%)** — graduado hoy, en producción.
- **`LAB_NSE_SPLIT`/`LAB_INDEX_PATH`** — infra de laboratorio no-op, queda para futuras pruebas de nuevo/usado cuando haya más cobertura de datos.
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba. Cualquier mejora ahí NO se propaga a los reportes que ven los usuarios.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. Deploy = `railway up` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — `railway run` sirve para correr scripts contra prod real desde local).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizar con el fix de hoy si se retoma.
