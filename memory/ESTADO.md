# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 26 Ago 2026
**Fase:** Prod Railway + Vercel público, estable. Sesión 25/26-ago: sobre el mini-reporte de 1 hoja (#164,
cerrado 24-ago) se agregó el **ARV** (valor post-remodelación) y se construyó desde cero la **calculadora
de viabilidad de flipping** (#167, `/flipping`) — margen neto + oferta máxima al dueño, con defaults
calibrados a costos reales de México (no la regla del 70% de EE.UU.). Commit `0b1502e`, pusheado. Detalle
completo en `BACKLOG.md` #164/#166/#167.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Calculadora de flipping: hecha y verificada (#167).** `/flipping` (conectable a un avalúo vía
   `?valuation_id=`, o standalone). Backend `routers/flipping.py` (guarda en `flipping_calcs` por
   `user_id`, mismo patrón que `requisiciones.py`), toda la aritmética vive en el frontend. Verificado en
   navegador: precarga de ARV/dirección, matemática correcta a mano, modo standalone, falla con gracia sin
   sesión. **Pendiente real:** probar el guardado con un usuario logueado de verdad (solo se probó que
   falla bien sin sesión) y decidir si se cobra con créditos o se deja libre (a propósito sin decidir hoy).
2. **ARV en el mini-reporte: hecho (#164 extendido).** `generate-mini-report` corre el motor una 2ª vez con
   `estadoConservacion:"remodelacion_completa"` y agrega `arv_estimado` + caja visible en el PDF. Verificado
   con avalúo real: as-is $1,804,153 → ARV $3,312,085 (propiedad de 45 años).
3. **Idea anotada para después, sin diseñar (#166):** calculadora de inversión para renta de
   estudios/aparta-estudios, estilo "Vive de las Rentas" (rentabilidad bruta/neta, cash-on-cash).
4. **Motor de OPI de renta independiente — diseño listo, falta construir (#165).** Hoy la renta es un factor
   derivado de venta (`valor×0.005-0.006` o factor IA con pocos comparables), NO un estudio de comparables
   de renta propio. Se analizaron las fórmulas reales del perito (`opi_perito.xlsx`, hojas "OPI Loc Com" y
   "OPI Rentas"): la doble comprobación real es venta-homologada×factor **vs** comparables de renta directos
   homologados. Diseño de `valuarRentaPropiedad()`/`factorRentaVenta()` guardado en memoria Claude
   `project_propvalu_opi_renta_independiente` — decidir si se construye como función nueva en
   `motor_remi_api.js` o motor separado antes de escribir código.
5. **Fix recurrente: `starlette` se vuelve a subir de versión sola.** Un paquete MCP comparte el mismo Python
   global (`pythoncore-3.14-64`) y a veces sube `starlette` a 1.6.0, incompatible con `fastapi==0.110.1`
   (rompe el arranque local con `TypeError: Router.__init__() got an unexpected keyword argument 'on_startup'`).
   Ya pasó dos veces (24-ago tarde y noche). Fix: `pip install starlette==0.37.2` — ahora SÍ pinneado en
   `backend/requirements.txt` (pendiente de sesión anterior, ya commiteado esta sesión). Si vuelve a pasar,
   revisar qué paquete MCP lo sube.
6. **Federación con atlas-colonias: construida pero sin datos reales todavía.** El feed público
   (`https://atlas-colonias-zmg.pedrucus.workers.dev/api/sync/feed`) está desplegado en Cloudflare y
   PropValu ya tiene `ATLAS_COLONIAS_FEED_URL` apuntando ahí (variable puesta en Railway hoy). Pero la
   base de datos nueva de Cloudflare está vacía — la real (con el trabajo de los peritos) sigue en la
   versión de chatgpt.site, y un export de prueba (`kind=approved`) trajo 0 registros: **no hay
   todavía ninguna clasificación aprobada de verdad en ningún lado**, no es un bug. Próximo paso real:
   confirmar si hay propuestas *pendientes* de aprobar en chatgpt.site (no solo aprobadas), y decidir
   si vale la pena mover ese flujo de revisión hacia el Atlas de Cloudflare a futuro.
7. **Enricher del scraper APAGADO A PROPÓSITO (24-ago noche)** — los 3 shards (`enricher.py --shard 0/3, 1/3, 2/3`) entraron en loop de crash/relanzamiento (el watchdog los revivía cada ~200s, los 3 casi al mismo tiempo — huele a algo sistémico, no aislado, posible relación con el fix reciente "fallback muerto PINCALI"). Se mataron los 3 procesos y se detuvo el watchdog para cortar el loop. **Pendiente next session: diagnosticar por qué crashean los 3 juntos antes de relanzar.**
8. **Causa raíz del "kill" del scraper SIGUE sin confirmar** (#156). Además la tarea de Windows `ScraperMonitorLocal` apunta a la carpeta VIEJA del scraper con credenciales de Mongo muertas (#162).
9. **Migración de caché del motor Sheet→Mongo + `pm2t_semilla.json` — CERRADO (24-ago, #159).** Refrescado desde `cerebro_datos.json` actual + ponderación nueva por antigüedad de la OPI. Cero regresión, mejora consistente en los casos `lote_grande_cus` tocados. Detalle en `BACKLOG.md` #159.
10. **Tavily agotado + Serper muerto desde 09-jul** (#161) — Brave Search cableado, falta API key real.
11. **PINCALI en español sigue caído** (#151). Diferido a propósito. **Confirmado 24-ago (sesión aparte, tarde):** es AWS WAF (`x-amzn-waf-action: challenge`), bloquea ES y EN por igual incluso con `requests` plano — no es un tema de idioma, es sitewide. Se corrigió un bug real en `enricher.py`: el detector de bloqueo no reconocía la página de challenge AWS WAF (título vacío) y la guardaba como "éxito" con contenido basura — ya detecta también `awsWafCookieDomainList`. **Posible relación con el crash-loop del ítem 5 de arriba** — revisar si este fix o el "fallback ES eliminado" (mismo día) tiene algo que ver antes de relanzar el enricher.
12. **Automatización real del scraper mensual — sin decidir** (#152-154).
13. **Carpeta vieja del scraper (`C:\Users\pedru\valuation-ai\scraper-inmuebles`) documentada 24-ago:** no es "toda obsoleta" — hospeda `orquestador_ia.py`/`monitor_local.py` (activos, corren 24/7, pueden auto-fix+push su propio repo git `Pedrucus1/scraper-inmuebles`), pero `enricher.py`/`scheduler.py`/`scrapers/*` ahí SÍ divergen del método real. README de esa carpeta actualizado con el detalle exacto para no repetir la confusión (ver memoria `feedback_scraper_carpetas_divergentes`).

## 🔐 Seguridad — cambio de hoy
- `/auth/register` (perito e inmobiliaria, mismo endpoint) no verificaba correo — cerrado con flujo
  completo de verificación (`User.email_verified`, `/auth/verify-email`, `/auth/resend-verification`,
  mismo patrón JWT que forgot-password). El guard `require_admin_or_credentialed_contributor` ahora lo
  exige antes de dejar proponer contenido. Hallazgo alto de un audit de 3 agentes corrido hoy mismo
  (seguridad/despliegue/páginas) — ver `project_propvalu.md` para el detalle de los otros hallazgos
  (rate limit agregado, fuga de email en perfiles rechazados corregida del lado del Atlas).

## 🧠 Motor — sesión larga de depreciación por edad (24-ago noche)
- **Gate CUS 0.65: CERRADO.** Confirmado en código (`motor_remi_api.js:829`, revalidado 07-ago sobre 210 OPIs). No es pendiente.
- **Ross-Heidecke investigado a fondo con un avalúo SHF real (folio 26080015287) — hallazgos importantes:**
  1. RH cuadrático SÍ es la fórmula real del perito (`Fed=1-0.5*(x+x²)`), pero con **vida útil=70 fija**, no condicionada a calidad como asumía la regla vieja (un caso Interés Social real usó vida=70). Corregido en `server.py::_depreciacion_lab()` (commit `97e8620`) — solo afecta `result_lab_rh`, campo paralelo en observación, NO toca `estimated_value`.
  2. **El perito real NO blendea físico+mercado** — usa 100% mercado, físico solo de referencia. `server.py` sí hace blend 80/20 fijo siempre — esa arquitectura es la pieza mal diseñada, no la curva de edad. Validado contra 614 OPIs + 22 avalúos reales de PropValu: cambiar solo la curva mueve <1% en promedio (blend+clamp ±30% amortiguan casi todo).
  3. **El motor JS (`motor_remi_api.js`) NO usa RH para el flujo normal de comparables** — solo aparece en `sumaDePartes()` (fallback raro cuando faltan comps). El flujo normal deprecia por edad con `factorEdad` propio (K=0.010/GAP=25/piso 0.55 en pool `exacta`, con discriminante `_segRatio`) — ya calibrado y en prod, no se tocó hoy.
  4. **Pendiente real, sin decidir:** si se quita el blend 80/20 de `server.py` (usar 100% comparativo + físico como referencia aparte, como el perito real), ahí sí valdría reevaluar la curva de edad de nuevo. Detalle completo en `MOTOR_ANTECEDENTES.md`.
- **`colonias_decada.json`: cableado en `backend/` (edades/crowdsourcing), NO en el motor JS.** Son dos sistemas distintos — cerrado para su propósito actual.
- **Tavily agotado: confirmado, sigue pendiente.** Free tier 1,000 req/mes se agota con uso normal (no es bug). `BRAVE_API_KEY` sigue sin existir en `.env` — el fallback cableado no tiene key real todavía.

## 🏗️ Infra / datos
- **Backend local no arrancaba (causa raíz encontrada 24-ago):** `starlette` local estaba en 1.6.0 (subida sin querer por un paquete MCP compartiendo el mismo Python global) — incompatible con `fastapi==0.110.1` pinneado en `requirements.txt`. Arreglado localmente con `pip install starlette==0.37.2`. **`requirements.txt` NO tiene `starlette` pinneado explícito** — pendiente decidir si agregarlo para que no se rompa de nuevo si algo más toca ese Python compartido.
- Railway (backend): deploy manual `railway up --detach` de git, PERO hoy se agregó
  `ATLAS_COLONIAS_FEED_URL` vía Railway MCP (`set-variables`) — eso sí dispara redeploy automático,
  confirmado `SUCCESS`. Vercel (frontend): deploy manual `vercel --prod`.
- MongoDB: prod real = `cluster0.9eliadx`; backend local → `cluster1.avle5ez` (staging).
- Colecciones Mongo nuevas hoy: `colonia_classifications_atlas`, `classifier_profiles_atlas`,
  `colonia_sync_status`, `colonia_sync_log` (espejo del feed de atlas-colonias, ver
  `routers/atlas_colonias.py`).
- Scraper: `scheduler.py` con progreso incremental de 30 días + pausa por portal — sin tocar hoy.
- **Nuevo:** atlas-colonias tiene ahora dos deploys — `chatgpt.site` (app completa, login ChatGPT,
  donde trabajan los peritos) y `atlas-colonias-zmg.pedrucus.workers.dev` (Cloudflare directo, solo
  sirve el feed público `/api/sync/*`, sin datos reales todavía). Cuenta Cloudflare:
  `f6e265958283af0851cb2d6483974436`. D1: `atlas-colonias-zmg-db`
  (`507af7a8-2518-416e-bf99-818603fb727a`).
- **Nuevo:** mapa de qué vive en qué proveedor de hosting y opciones de consolidación en
  `Manual-Arquitectura-ZMG/INFRAESTRUCTURA_Y_COSTOS.md` (Railway, Vercel, Mongo Atlas, Cloudflare,
  OpenAI Sites — 5 proveedores hoy, solo Vercel→Railway vale la pena fusionar).

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- **19-ago, Identificador de Edad + fuente única: CERRADO completo (Fases 0-3).** Ver `project_manual_arquitectura.md`.
- **RESUELTO hoy** (era el pendiente #1 de la sesión 19-ago): diseño de cómo enlazar `colonias_decada.json` / Mongo PropValu / atlas-colonias — el plan de federación completo (`Manual-Arquitectura-ZMG/PLAN_FEDERACION_ECOSISTEMA.md`) tiene las 8 fases documentadas, 0-6 construidas.
- **17-ago:** `colonias_decada.json` — correcciones de municipio, homónimas cerradas, `colonias-confianza-web` conectada.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- Regenerar OPI val_0a773642bef5 (Virgen 3437, La Calma) — confirmar si el usuario ya lo probó.
- Decisión 9-ago: NO self-hostear IA de reportes.
- VIVANUNCIOS #157, MITULA #158.
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-167).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
