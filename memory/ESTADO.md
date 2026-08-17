# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 12 Ago 2026
**Fase:** Prod Railway + Vercel público, estable. Sesión 12-ago: scraper mensual caído sin rastro (revivido + watchdog auto-reinicio), fix mojibake zonas + bug CASAS_Y_TERRENOS, pausa entre tareas calibrada por portal, migración caché motor Sheet→Mongo reactivada (Sheets llevaba muerto desde 08-jul), Brave Search agregado como 3er fallback de búsqueda web. Detalle → `BACKLOG_ARCHIVE.md` (12 Ago 2026).

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Corrida mensual del scraper en curso**, relanzada 12-ago con fixes: mojibake de zonas (`Tonalá`/`Tlajomulco de Zúñiga`) arreglado (cp1252 iterativo, era triple-mojibake no simple), `CASAS_Y_TERRENOS` slugs-como-string arreglado, pausa entre tareas calibrada por portal (PINCALI/CYT/MITULA 2-5min, PROPIEDADES_COM 5-10min, INMUEBLES24/VIVANUNCIOS se quedan en 12-22min). Un watchdog (Bash + Monitor, corre solo mientras la sesión de Claude que lo lanzó siga viva) reinicia el proceso si muere y solo declara éxito cuando el log dice "Todas las tareas completadas". **Si se abre nueva sesión y el watchdog ya no está corriendo, verificar manualmente si `scheduler.py` sigue vivo** (no hay tarea de Windows para esto todavía).
2. **Causa raíz del "kill" del scraper SIGUE sin confirmar** (#156) — esta vez el proceso murió ~22h sin dejar rastro (descartado: reboot, crash en Event Log, fallo de auth Mongo — los 3 verificados). Además se encontró que la tarea de Windows `ScraperMonitorLocal` (corre sola cada 5 min) apunta a la carpeta VIEJA del scraper con credenciales de Mongo muertas (#162) — por eso nunca detectó esta caída. El watchdog de esta sesión mitiga mientras la sesión de Claude siga viva, pero no reemplaza arreglar `ScraperMonitorLocal`.
3. **Migración de caché del motor Sheet→Mongo reactivada** (#159) — el Sheet CONSOLIDADO está congelado desde el 08-jul (Sheets retirado del scraper), el motor llevaba 5+ semanas sirviendo datos viejos sin saberlo. Recalibrado con dedup `es_duplicado_secundario` + 118k docs frescos de Mongo: empate técnico contra el baseline Sheets (ya no la regresión fuerte de junio). **Sesgo residual aislado al pool `lote_grande_cus`** (pm2t_semilla.json de #120 desactualizado) — recalibrar es la siguiente tarea del motor, NO cazar OPIs atípicos uno por uno.
4. **Tavily agotado (432, confirmado en vivo) + Serper muerto desde 09-jul** (#161) — Brave Search ya está cableado como 3er fallback en el código pero **falta la API key real** (usuario debe sacarla del tier gratis $5/mes y pasarla). Causa probable del consumo: corridas del validador con `--n` grande iterando cientos de OPIs sin caché.
5. **PINCALI en español sigue caído** (#151, `/inmueble/` → 422/202). Diferido a propósito, tarea grande aparte. No revertir el fallback a inglés.
6. **Automatización real del scraper mensual — sin decidir** (#152-154): GitHub Actions se cancela por timeout de 5h (INMUEBLES24 se atora), tarea de Windows local en modo "solo interactivo" no corre desatendida.
7. Cuando el scraper termine su corrida: re-correr `fusionar_duplicados.py` + regenerar caché (`actualizar_cache_desde_mongo.py` → `build_cache_index.js`) para que la data nueva sí llegue al motor (antes esto se rompía solo porque el builder leía de Sheets).

## 🧠 Motor — cambio de hoy
- **Fuente del caché: Sheets → MongoDB** (`actualizar_cache_desde_mongo.py`, ver #159 arriba). Empate técnico validado, sin regresión real.
- **Brave Search agregado a la cascada `buscarWeb()`** (Tavily → Serper → Brave) en `motor_remi_api.js` — sin key todavía, ver #161.
- Pendiente de sesiones anteriores, sin tocar hoy: gate CUS 0.65 (línea ~808, ya validado, no subir más sin remedir); `result_lab_rh` (Ross-Heidecke vida útil 70) en observación, sin reemplazar `estimated_value` en prod; `colonias_decada.json` sin cablear al motor JS.

## 🏗️ Infra / datos
- Railway (backend): deploy manual `railway up --detach` (sin auto-deploy de GitHub).
- Vercel (frontend): deploy manual `vercel --prod` (tampoco auto-deploy pese a GitHub conectado).
- MongoDB: prod real = `cluster0.9eliadx`; backend local → `cluster1.avle5ez` (staging). Acceso directo desde esta PC a `cluster0` confirmado funcionando.
- Scraper: `scheduler.py` con progreso incremental de 30 días (`_tarea_vencida`) + pausa por portal (`PAUSA_PORTAL`, 12-ago) — verificar que no se rompa si se vuelve a tocar ese archivo.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Manual de Arquitectura ZMG (repo aparte, privado) — Selector "Identificador de Edad" construido (23 elementos, 159 opciones), pensado para conectarse a PropValu (verificador de zona + alta de propiedad, sin empezar). Ver `project_manual_arquitectura.md`.
- **17-ago:** `colonias_decada.json` — 2 correcciones de municipio (`vallarta cuauhtemoc`→zapopan, `mirador de los encinos`→tlajomulco de zuniga) + homónimas cerradas (0 pendientes) + confianza=baja en 0. `colonias-confianza-web` conectada al dataset vigente (ver `project_propvalu_estado.md`).
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- Regenerar OPI val_0a773642bef5 (Virgen 3437, La Calma) — confirmar si el usuario ya lo probó.
- Decisión 9-ago: NO self-hostear IA de reportes (sale más caro que Gemini/DeepSeek por llamada) — pendiente monitoreo/alerta de vencimiento de la llave DeepSeek.
- VIVANUNCIOS #157 (sospecha de límite de paginación mal detectado), MITULA #158 (bloqueado 401 sistémico, requiere revisión de código).
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-161).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net` (accesible directo desde esta PC, confirmado hoy)
