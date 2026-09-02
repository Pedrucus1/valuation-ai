# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 02 Sep 2026
**Fase:** Prod Railway + Vercel. El cierre del 01-sep del bug "Continuar Reporte" fue prematuro —
se verificó en frío y seguía dando 503. Causa raíz real encontrada y corregida hoy: la cadena de
fallback del motor perdía los comps ya encontrados al pisarlos con el resultado del siguiente paso
(si Gemini fallaba, borraba lo que ya había). Además se destapó un bug crítico separado: `pincali.py`
llevaba **más de una semana** sin poder importarse (SyntaxError en el docstring), por eso el scraper
batch de PINCALI nunca corrió pese a estar "listo".

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
2. **`scrapers/pincali.py` no importaba desde hace +1 semana — CERRADO.** Docstring tenía una ruta
   Windows sin escapar (`\Users...`) desde commit `b54f818` (24-ago) → `SyntaxError` en cualquier
   `import scrapers.pincali`. Fix: raw string. Commit en `scraper-inmuebles` (repo activo
   `C:\Users\pedru\valuation-ai\scraper-inmuebles`), pusheado.
3. **`buscar_comparables_browser.js` — ZONAS sincronizado + modo `--json` agregado.** Ahora incluye
   los 4 municipios nuevos (El Arenal, Tala, Ixtlahuacán de los Membrillos, San Isidro Mazatepec) que
   antes solo tenía `config.py` (11 municipios) y no el script (7). `--json` imprime SOLO el array de
   comps a stdout (progreso va a stderr) para que el motor pueda invocarlo como subprocess.
4. **Propiedades.com: agregados oficinas/locales/bodegas-comerciales a `TIPOS_URL`.** La clasificación
   por tipo ya los reconocía, solo faltaban en el dict que arma las URLs. Slugs verificados en vivo:
   `oficinas-venta` y `bodegas-comerciales-venta` dan 200 con tarjetas reales; ojo,
   `locales-comerciales-venta` da 404 — el slug real es **`locales-venta`**. `orquesta.py` sigue
   con PROPIEDADES_COM comentado del todo (bloqueo de proxy residencial, aparte de este tema).
5. **Corrida de prueba (4 municipios nuevos × 6 portales) — quedó SIN TERMINAR al cerrar sesión**
   (`scraper-inmuebles/test_municipios_nuevos.py`, corriendo en background, commit `d333fcf`).
   Parcial visto antes de cerrar: INMUEBLES24 dio 0/4 (slugs fallando o bloqueo anti-bot), PINCALI
   topó con bot-protection en El Arenal. **Falta: correr completo y leer el resumen final antes de
   lanzar la corrida real de estos 4 municipios en batch.**
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
