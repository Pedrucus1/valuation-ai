# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 02 Sep 2026 (noche)
**Fase:** Prod Railway + Vercel. El cierre del 01-sep del bug "Continuar Reporte" fue prematuro —
se verificó en frío y seguía dando 503. Causa raíz real encontrada y corregida hoy: la cadena de
fallback del motor perdía los comps ya encontrados al pisarlos con el resultado del siguiente paso
(si Gemini fallaba, borraba lo que ya había).

**Scraper/enricher: consolidado en UNA sola carpeta hoy** (ver punto 2) — la carpeta vieja
`valuation-ai\scraper-inmuebles` (con su propio `pincali.py`/`orquesta.py`, ya no relevante) quedó
archivada en `valuation-ai\_archived_scraper-inmuebles_OLD_20260902\`. Todo el trabajo de scraper
va ahora en `Pagina-Valuacion-con-Ai--main\scraper-inmuebles\`.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Bug de "Continuar Reporte" — fix real aplicado y verificado LOCAL, falta confirmar en prod tras
   el último push.** Root cause: `motor_remi_api.js` sobrescribía `compsIA` en cada paso del fallback
   (jsonld → web → gemini) sin comparar — un paso que fallaba (n=0) borraba comps reales ya
   encontrados. Fix: la cadena ahora **acumula** entre fuentes (dedup por URL). Se agregó además un
   paso nuevo 1b: `buscarCompsBrowser()` invoca `buscar_comparables_browser.js` (scraper dedicado por
   portal — PINCALI/Propiedades.com fetch nativo, NOCNOK/CasasYTerrenos por API — existía pero estaba
   desconectado del motor) vía subprocess con `--json`. Verificado local: El Roble/El Arenal resuelve
   en segundos con 4 comps reales de PINCALI (antes: 503 a los 45s). Commit `d6207aa`, pusheado.
   **PENDIENTE siguiente sesión: repetir `POST /calculate-remi` contra prod (Railway) para confirmar
   que el deploy recogió el fix** — la última prueba contra prod fue ANTES de este commit.
2. **Scraper/enricher consolidados en una sola carpeta (`Pagina-Valuacion-con-Ai--main\scraper-inmuebles`) —
   CERRADO hoy.** Había DOS carpetas divergentes (queja fuerte del usuario: nunca se debió repetir
   trabajo ya resuelto). Portado a la canónica lo que faltaba: 4 municipios nuevos en `config.py`
   (El Arenal, Tala, Ixtlahuacán de los Membrillos, San Isidro Mazatepec — slugs para los 6 portales),
   fix de `propiedades_com.py` `TIPOS_URL` (oficinas/bodegas-comerciales/`locales`→slug real
   `locales-venta`, no `locales-comerciales-venta` que da 404; limpiada constante muerta
   `TIPOS_PROP_URL`), `monitor_local.py` (watchdog, ya probado ahí: detectó y reinició un enricher de
   NOCNOK trabado) y `orquestador_ia.py` (auto-fix). Tareas de Windows Task Scheduler
   `ScraperMonitorLocal`/`ScraperOrquestadorIA` repuntadas a la carpeta correcta; `ScraperMensual`
   (vieja, duplicaba `PropValu_ScraperMensual`) **deshabilitada**. Carpeta vieja movida (no borrada) a
   `valuation-ai\_archived_scraper-inmuebles_OLD_20260902\`. Commit `5c15fce`, pusheado.
   Nota abierta: **San Isidro Mazatepec da 0 en INMUEBLES24** (redirige a URL genérica) — puede ser
   localidad sin slug propio (patrón Ajijic-en-Chapala); falta confirmar con el usuario si es el
   municipio correcto antes de asumirlo. También se corrigió que Mongo estaba "fallando" porque un
   script usaba el `.env` viejo con password desactualizada — el `.env` de la carpeta canónica
   siempre funcionó bien (120K+ props en `mercado_props`).
3. **Corrida real de los 4 municipios nuevos — EN CURSO (lanzada hoy, sigue corriendo en background).**
   `scheduler.py` en la carpeta canónica, 194 tareas pendientes (incluye los 4 municipios × 6 portales
   + tipos), pausas de 12-22 min entre tareas, escribe directo a Mongo `mercado_props` (Sheets ya NO
   se usa, ver `INDICE_SCRAPER.md`). `enricher.py --mongo` corriendo en paralelo, recogiendo props
   nuevas conforme llegan (cooldown de 30 días para reintentos). Verificar avance con `/logs` la
   próxima sesión — si el proceso murió, relanzar `python scheduler.py` desde
   `Pagina-Valuacion-con-Ai--main\scraper-inmuebles`.
6. **Spike de Lamudi — pendiente, no arrancado.** El HTML crudo de su SERP no expone listings ni API
   (bundles JS propios "adform"), hace falta capturar tráfico de red con navegador real
   (Playwright/agent-browser). Timeboxed ~30 min. Mitula comparte el mismo vocabulario "adform" —
   revisar si el hallazgo aplica también ahí (hoy solo scrapea `/casas/`, el resto da 404).
   EasyBroker descartado como fuente centralizada (API es por cuenta individual, no hay endpoint
   público agregado — verificado en `dev.easybroker.com/docs`).
7. **Comparables simulados/inventados en `generate_comparables` — sin resolver, sin tocar hoy.**
   `server.py:934-994` sigue fabricando comps falsos con nombre de portal real cuando faltan datos.
   Pendiente decisión del usuario (#171).
8. **`enrich-stream` — endpoint que el frontend llama pero nunca existió en el backend — sin tocar
   hoy.** `ComparablesPage.jsx:177`, 404 instantáneo. Pedido explícito de construirlo (#172).
9. **Log de actividad/errores para el admin — backend hecho, falta frontend `AdminActividad.jsx`.**
   Sin tocar hoy. Plan en `C:\Users\pedru\.claude\plans\adaptive-giggling-pixel.md`.
10. **Frontend con commits sin desplegar a Vercel** — sin tocar hoy, sigue pendiente `vercel --prod`
    desde `frontend/` (requiere confirmación del usuario, modo automático no despliega solo).
11. **Alerta "zona sin consolidar" + oferta de perito + créditos para inmobiliarias — fuera de
    alcance, discutido pero no diseñado.** Decisión de negocio/precios, no de código — se retoma
    cuando haya claridad de precios.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- Regenerar OPI val_0a773642bef5 (Virgen 3437, La Calma) — confirmar si el usuario ya lo probó.
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- Ver `BACKLOG.md` tabla completa para el resto (#s 1-177).

## 🌐 URLs / accesos
- **Sitio:** https://frontend-pedrucus-projects.vercel.app (alias: frontend-rosy-six-74.vercel.app) — **desactualizado, falta `vercel --prod`**.
- **Backend API:** https://propvalu-backend-production.up.railway.app — deploy visto en logs hoy: `1a77fbac` (previo al fix de esta sesión, confirmar redeploy próxima sesión).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
