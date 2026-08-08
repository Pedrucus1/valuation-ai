# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 7 Ago 2026 (noche)
**Fase:** Prod Railway + Vercel público, estable. Sesión de hoy: comparables de zona equivocada, motor CUS 0.65, reporte (predial/oportunidades), y 3 bugs que tenían el scraper mensual muerto desde hace meses. Detalle completo de la sesión → `BACKLOG_ARCHIVE.md` (7 Ago 2026).

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Scraper corriendo en background al cierre** (agente activo, worktree `agent-acdcdcf3e8d17dfd2`, INMUEBLES24/VIVANUNCIOS/MITULA/CASAS_Y_TERRENOS/PROPIEDADES_COM, sin PINCALI). Revisar avance al abrir la próxima sesión — puede seguir corriendo horas. Progreso al cierre: CASAS_Y_TERRENOS 128 nuevas, PROPIEDADES_COM 95+ nuevas, resto avanzando. MITULA/Lamudi bloqueado 401 en el 100% de sus tareas — no arreglar solo, ver BACKLOG #155.
2. **Regenerar OPI val_0a773642bef5 (Virgen 3437, La Calma)** con los fixes ya desplegados — el usuario dijo que la probaría él mismo desde el panel. Pendiente confirmar si el valor cambió tras el fix de comparables + CUS 0.65.
3. **PINCALI en español sigue caído** (`/inmueble/` → 422/202, verificado hoy). Diferido a propósito — arreglarlo bien es tarea grande aparte (BACKLOG #151). No revertir el fallback a inglés.
4. **Automatización real del scraper mensual — sin decidir:** existe cron en GitHub Actions (`scraper_mensual.yml`, día 2, 3am UTC) pero sus últimas 2 corridas (jul/ago) se cancelaron por timeout de 5h porque INMUEBLES24 queda atorado reintentando indefinidamente sin pasar a los demás portales (IPs de GH Actions bloqueadas). La tarea de Windows local (`ScraperMensual`) tampoco corrió sola el 7-ago (modo "solo interactivo"). Decidir mecanismo principal (BACKLOG #152-154).
5. Cuando el scraper termine, considerar re-correr `fusionar_duplicados.py` y regenerar `cache_index.json` (el motor usa ese índice, no lee `mercado_props` en vivo).

## 🧠 Motor — cambio de hoy
- **Gate lote grande: CUS 0.50 → 0.65** (`motor_remi_api.js`, línea ~808). Validado con `validar_40_opis.js --n 999` (210 OPIs): ±10% 45.7→48.1%, ±15% 59.0→61.0%, ±20% 68.6→70.0%, errAbs 16.8→16.4%. Probado 0.70/0.75 y descartado (empeora ±10/±15/errAbs, mediana cambia de signo). **No subir más sin remedir.**
- Pendiente de sesiones anteriores, sin tocar hoy: `result_lab_rh` (Ross-Heidecke vida útil 70) en observación, sin reemplazar `estimated_value` en prod; `colonias_decada.json` sin cablear al motor JS; validador con baseline 207 OPIs (±10 49.8%) de otra sesión — **ojo, es un baseline distinto al de hoy (210 OPIs, otro punto de partida)**, no confundir ambos al comparar.
- El pipeline de REPORTES REALES (`server.py::calculate_valuation` + `mongo_comparables.py`) es código separado del motor JS — hoy se tocaron AMBOS (comparables de zona en el primero, CUS en el segundo).

## 🏗️ Infra / datos
- Railway (backend): deploy manual `railway up --detach` (sin auto-deploy de GitHub). 2 deploys hoy, ambos verificados con `/api/health`.
- Vercel (frontend): deploy manual `vercel --prod` (tampoco auto-deploy pese a tener GitHub conectado — confirmado hoy, la última corrida en Vercel era 3 commits vieja). 2 deploys hoy, verificados por hash de bundle JS servido.
- MongoDB: prod real = `cluster0.9eliadx`; backend local → `cluster1.avle5ez` (staging). Confirmado hoy: acceso directo desde esta PC a `cluster0` SÍ funciona (antes se creía bloqueado por IP allowlist).
- Scraper: progreso incremental real (30 días) ya implementado en `scheduler.py` — verificar que no vuelva a romperse si se toca ese archivo.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Manual de Arquitectura ZMG (repo aparte, privado) — 82 marcas, cartografía/fotos pendientes. Ver `project_manual_arquitectura.md`.
- `colonias_decada.json` sin cablear al motor JS (decisión aparte, no urgente según nota del usuario).
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-155).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net` (accesible directo desde esta PC, confirmado hoy)
