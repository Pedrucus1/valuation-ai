# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 01 Sep 2026
**Fase:** Prod Railway + Vercel. Sesión larga de bug-hunting: el botón "Continuar Reporte" tronaba
(503 "Motor timeout") en zonas sin comparables en caché. Causa real encontrada tras varias vueltas
(ver detalle abajo) y resuelta con una feature nueva: el motor ahora **lee la página completa** de
los resultados de búsqueda (JSON-LD schema.org) en vez de solo el snippet corto, que nunca traía
precio. Commits `4a62bf2`…`e53643c`, todos pusheados a origin y desplegados a Railway.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Bug de "Continuar Reporte" — RESUELTO (verificar una vez más en frío).** Cadena real: zona sin
   comps en caché → motor busca en vivo → **Tavily/Serper solo devuelven snippets de páginas de
   listado, sin precio visible** → DeepSeek correctamente no inventa precio → 0 comps → antes esto
   colgaba el subprocess Python hasta morir a los 30s (503 mudo, sin ningún log). Fixes aplicados en
   `motor_remi_api.js` y `server.py`:
   - Timeout explícito (AbortController) en Tavily/Serper/Brave (8s) y Gemini (15s) — antes ninguno
     tenía límite.
   - `subprocess.run` de Python: 30s→45s de margen.
   - **Feature nueva (la que de verdad arregla el fondo):** `buscarCompsPaginasReales()` — trae las
     URLs reales de Tavily y lee cada página completa buscando el JSON-LD `RealEstateListing` que
     casi todo portal ya expone para SEO (dato estructurado, sin IA, sin inventar). Probado en vivo
     con "El Roble, El Arenal": encontró 4 casas reales de PINCALI, resolvió en 2s (antes: 503/422 en
     30-45s). **Gotcha real que costó tiempo:** PINCALI etiqueta terrenos como `SingleFamilyResidence`
     en su propio JSON-LD — el filtro no puede confiar en `@type`, usa recámaras>0 + m² en rango de
     vivienda (30-1200) como señal real.
   - Se agregó logging de diagnóstico (`_mark()` en el motor + captura de `stderr` parcial en
     `server.py` en el `except TimeoutExpired`) — antes Python descartaba TODO el stdout/stderr del
     motor cuando lo mataba por timeout, por eso nunca se veía nada en los logs de Railway pase lo
     que pase. Dejar el logging (barato, útil); quitar los `_mark()` de una vez que se confirme que
     no vuelve a fallar en frío.
2. **Bug de ads — RESUELTO.** `file_url` salía como ruta relativa (`BACKEND_URL` vacía en Railway) y
   además con `http://` cuando `request.base_url` no respeta el proxy de Railway (TLS termina ahí,
   reenvía por http). Fix: arma la URL desde `X-Forwarded-Proto` + `request.url.hostname`.
   Verificado en prod: `file_url` ya sale `https://propvalu-backend-production.up.railway.app/...`.
3. **Log de actividad/errores para el admin — construido, falta probar en el navegador.** Pedido
   explícito del usuario ("el admin está ciego"). Middleware `_ActivityLogMiddleware` en `server.py`
   persiste a `db.activity_log` cualquier respuesta `status>=400` (path, status, mensaje, email si hay
   sesión, IP, duración) — nunca loguea clicks/movimientos (ruido + privacidad, decisión explícita).
   Endpoint de lectura `GET /api/admin/activity-log` en `routers/admin_activity.py` (protegido con
   `require_admin`, filtros por tipo/texto, paginado). **Bug propio detectado y arreglado ya en esta
   misma sesión:** se me olvidó el `app.include_router(admin_activity_router)` — el middleware sí
   escribía pero el endpoint de lectura no existía (commit `e53643c`). **Falta: página nueva
   `AdminActividad.jsx` en el frontend** (el plan completo quedó en
   `C:\Users\pedru\.claude\plans\adaptive-giggling-pixel.md` — el backend del plan está hecho, el
   frontend no) y los ~8-10 `insert_one` de eventos de negocio (login/registro/valuación creada/
   reporte) que el plan también contemplaba y no se llegaron a agregar.
4. **Comparables simulados/inventados en `generate_comparables` — sin resolver, pendiente decisión
   del usuario.** `server.py:934-994`: cuando hay <10 comparables reales, el sistema **fabrica** los
   que faltan con matemática aleatoria y les pega el nombre de un portal real + una URL con formato
   real pero falsa (`https://www.inmuebles24.com/inmueble/548213`). Se le mostró esto al usuario en
   vivo (captura de "El Roble" con 15 comparables, varios inventados). Preguntado qué hacer, no se
   decidió nada todavía. Además: **la selección de comparables del usuario en esa pantalla NO se usa
   para calcular la valuación** — `calculate-remi` hace su propia búsqueda desde cero vía el motor
   Node, ignorando lo que el usuario seleccionó (está comentado así en el código a propósito, pero es
   confuso para el usuario — vio 15 comps y le salió "sin comparables" en el paso siguiente).
5. **`enrich-stream` — endpoint que el frontend llama pero NUNCA existió en el backend.**
   `ComparablesPage.jsx:177` abre un `EventSource` a `/valuations/{id}/enrich-stream` para mostrar un
   anuncio (`AdPopup`) mientras "enriquece" comparables — 404 instantáneo, `es.onerror` apaga el
   popup en la misma fracción de segundo (por eso "no salía el ads" ahí). El usuario pidió
   explícitamente construir el endpoint real (streaming SSE que enriquezca con IA en vivo) — **no se
   llegó a hacer esta sesión**, queda para la siguiente.
6. **Frontend con 16 commits sin desplegar a Vercel** (detectado hoy: el botón "Paso anterior" que el
   usuario pidió hace semanas SÍ está commiteado desde el 21-jul pero nunca se hizo `vercel --prod`
   después). El deploy quedó **pendiente de confirmación del usuario** (bloqueado por el modo
   automático, requiere aprobación explícita) — avisarle que hace falta correr `vercel --prod` desde
   `frontend/`.
7. **Scraper: 4 municipios + tipo bodegas agregados a `config.py`/`pincali.py`, SIN correr todavía**
   (commit `aca5f36` en el repo `scraper-inmuebles`, pedido explícito "para la siguiente sesión lo
   aventamos"). Nuevos: El Arenal, Tala, Ixtlahuacán de los Membrillos, San Isidro Mazatepec — slugs
   de URL **sin verificar**, probar con corrida chica antes de lanzar en serio. También falta:
   locales-comerciales/oficinas/bodegas con venta+renta en TODOS los portales y municipios (solo
   INMUEBLES24 los soporta completos hoy; PINCALI solo tenía bodegas agregado esta sesión;
   `propiedades_com.py` solo soporta casas/deptos/terrenos, no se le agregó nada por no tener slugs
   confirmados). El usuario avisa cuándo lanzar el enricher de PINCALI — no lanzado esta sesión.
8. **Cuenta de respaldo Tavily agregada** (segunda cuenta, plan Free 1,000/mes) — key apilada en
   `TAVILY_API_KEY` separada por coma (local `.env` + Railway), el motor ya soporta múltiples keys y
   cae a la siguiente si una se agota (`_webKeys()`).
9. **Auditoría de calidad de datos de `mercado_props` (8,875 activos) — 3 bugs reales encontrados y
   arreglados** por un agente en paralelo: (1) VIVANUNCIOS con 82% de precios en $0 — parser roto en
   el scraper, arreglado (`vivanuncios.py`, commit `840ac6f` en repo `scraper-inmuebles` — ojo, quedó
   en el checkout activo `C:\Users\pedru\valuation-ai\scraper-inmuebles`, no en la copia anidada
   vieja); 269 docs viejos marcados `activo=False` (no recuperables). (2) 220 colonias truncadas
   "ionamiento X" (debía ser "Fraccionamiento X") — 199 reparadas vía DeepSeek (nunca regex, ver
   memoria `feedback_no_regex` reforzada esta sesión), 21 dejadas intactas por baja confianza.
   (3) 5 casas de lujo PINCALI con precio=0 — marcadas inactivas. Backups de todo antes del cambio.
10. **Reforzado en memoria (regla dura, dos reincidencias ya):** NUNCA regex/`.replace()` para
    limpiar/normalizar colonia, dirección o municipio — ni para "solo quitar un prefijo fijo",
    siempre DeepSeek/IA. Ver `feedback_no_regex` en memoria global.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- **19-ago, Identificador de Edad + fuente única: CERRADO completo (Fases 0-3).** Ver `project_manual_arquitectura.md`.
- `colonias_decada.json` / federación con atlas-colonias: diseño completo, 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- Regenerar OPI val_0a773642bef5 (Virgen 3437, La Calma) — confirmar si el usuario ya lo probó.
- Decisión 9-ago: NO self-hostear IA de reportes.
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-167).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app) — **desactualizado, 16 commits atrás, falta `vercel --prod`**.
- **Backend API:** https://propvalu-backend-production.up.railway.app (al día, deploy `e53643c`).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
