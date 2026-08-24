# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 24 Ago 2026 (madrugada)
**Fase:** Prod Railway + Vercel público, estable. Sesión larga 23/24-ago cerrando la federación de datos
entre PropValu / Manual-Arquitectura-ZMG / atlas-colonias (el "tercer proyecto" que quedó pendiente el
19-ago). **Las Fases 0-6 del plan de federación quedaron construidas, probadas y en producción** — ver
`project_propvalu.md` sección de sesión de hoy para el detalle completo. Resumen: PropValu ahora puede
jalar clasificaciones de colonias aprobadas desde atlas-colonias, y un colaborador acreditado del Atlas
puede proponer contenido de acabados sin ser admin. Se cerró también un hallazgo de seguridad alto
(verificación de correo faltante en el registro) encontrado por un audit propio.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Federación con atlas-colonias: construida pero sin datos reales todavía.** El feed público
   (`https://atlas-colonias-zmg.pedrucus.workers.dev/api/sync/feed`) está desplegado en Cloudflare y
   PropValu ya tiene `ATLAS_COLONIAS_FEED_URL` apuntando ahí (variable puesta en Railway hoy). Pero la
   base de datos nueva de Cloudflare está vacía — la real (con el trabajo de los peritos) sigue en la
   versión de chatgpt.site, y un export de prueba (`kind=approved`) trajo 0 registros: **no hay
   todavía ninguna clasificación aprobada de verdad en ningún lado**, no es un bug. Próximo paso real:
   confirmar si hay propuestas *pendientes* de aprobar en chatgpt.site (no solo aprobadas), y decidir
   si vale la pena mover ese flujo de revisión hacia el Atlas de Cloudflare a futuro.
2. **Corrida mensual del scraper en curso**, relanzada 12-ago con fixes: mojibake de zonas (`Tonalá`/`Tlajomulco de Zúñiga`) arreglado (cp1252 iterativo, era triple-mojibake no simple), `CASAS_Y_TERRENOS` slugs-como-string arreglado, pausa entre tareas calibrada por portal (PINCALI/CYT/MITULA 2-5min, PROPIEDADES_COM 5-10min, INMUEBLES24/VIVANUNCIOS se quedan en 12-22min). Un watchdog (Bash + Monitor, corre solo mientras la sesión de Claude que lo lanzó siga viva) reinicia el proceso si muere y solo declara éxito cuando el log dice "Todas las tareas completadas". **Si se abre nueva sesión y el watchdog ya no está corriendo, verificar manualmente si `scheduler.py` sigue vivo** (no hay tarea de Windows para esto todavía).
3. **Causa raíz del "kill" del scraper SIGUE sin confirmar** (#156). Además la tarea de Windows `ScraperMonitorLocal` apunta a la carpeta VIEJA del scraper con credenciales de Mongo muertas (#162).
4. **Migración de caché del motor Sheet→Mongo reactivada** (#159) — recalibrado, empate técnico contra baseline. **Sesgo residual aislado al pool `lote_grande_cus`** (pm2t_semilla.json de #120 desactualizado) — siguiente tarea del motor.
5. **Tavily agotado + Serper muerto desde 09-jul** (#161) — Brave Search cableado, falta API key real.
6. **PINCALI en español sigue caído** (#151). Diferido a propósito.
7. **Automatización real del scraper mensual — sin decidir** (#152-154).

## 🔐 Seguridad — cambio de hoy
- `/auth/register` (perito e inmobiliaria, mismo endpoint) no verificaba correo — cerrado con flujo
  completo de verificación (`User.email_verified`, `/auth/verify-email`, `/auth/resend-verification`,
  mismo patrón JWT que forgot-password). El guard `require_admin_or_credentialed_contributor` ahora lo
  exige antes de dejar proponer contenido. Hallazgo alto de un audit de 3 agentes corrido hoy mismo
  (seguridad/despliegue/páginas) — ver `project_propvalu.md` para el detalle de los otros hallazgos
  (rate limit agregado, fuga de email en perfiles rechazados corregida del lado del Atlas).

## 🧠 Motor — sin cambios hoy
- Pendiente de sesiones anteriores, sin tocar: gate CUS 0.65 (línea ~808); `result_lab_rh`
  (Ross-Heidecke vida útil 70) en observación; `colonias_decada.json` sin cablear al motor JS.

## 🏗️ Infra / datos
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
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-161).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
