# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 10 Sep 2026 (madrugada)
**Fase:** Dos features cerrados hoy — colisión de NSE (#188) y bóveda de respaldo (#185).
Servidores locales de prueba (backend/frontend) apagados al cerrar sesión. El scraper
mensual sigue corriendo independiente en background (Windows Task Scheduler), no se tocó.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Railway: aprobar el deploy staged.** `railway/connect-service-source` +
   `update-service` (root `backend`, start `uvicorn server:app --host 0.0.0.0 --port $PORT`)
   quedaron preparados sin aplicar. El usuario tiene que darle "Deploy" en el dashboard.
2. **#188 CERRADO — colisión de NSE entre colonias homónimas de distinto municipio.**
   `construir_maestro.js` indexa también por llave compuesta `nombre|municipio` (733
   colonias); `getNSE`/`getSimilares` en `motor_remi_api.js` (+ `_lab.js`) generalizan la
   guardia anti-colisión a los 7 call-sites del motor. Validado offline: efecto neutro en
   los 40 avalúos reales (esperado — la mayoría no toca colonias colisionadas). Commit
   `283123d`. **Metodología corregida en el proceso:** comparar un fix en `_lab.js` contra
   el baseline de producción mezcla dos variables — el control correcto es el mismo
   archivo con/sin el cambio. Memoria: `feedback_validador_mismo_archivo_baseline`.
3. **#185 CERRADO (v2) — bóveda de respaldo, sin Stripe real (bloqueado por N3/N4, SAPI no
   constituida).** `ThankYouPage.jsx` aviso junto al botón de descarga → `VaultModal.jsx`:
   tabla de planes (Gratis 3 meses, 1/3/5/10 años → $0/$50/$110/$150/$195), toggle
   "Inversión por año" ↔ "% de ahorro", checkbox de términos obligatorio (política de
   marketing + aclaración de que el respaldo NO es actualización de valores). Pago
   simulado (mismo patrón que `ValuationForm.jsx`/`ProCheckoutPage.jsx`, sin cobro real).
   Backend: `POST /vault-request` → `POST /vault-requests/{id}/confirmar-pago` → `GET
   /vault/recuperar` + `/vault/recuperar/{valuation_id}` (recuperación real por correo,
   página nueva `/recuperar`, rate-limited). Primer índice TTL del proyecto
   (`vault_requests.expira_en`). Recordatorios anual + 30 días antes de vencer, vía el
   APScheduler ya existente (`ENABLE_SCHEDULER=1`), verificado con docs simulados
   (idempotente). ~20 commits `5d970e9`…`a40e2b2` (mayoría copy/UX iterativo).
   **Pendiente:** pantalla de admin para ver `vault_requests` (usuario dijo "después"),
   tarifa de "descarga suelta sin plan" ($230/$260 — hoy solo texto de referencia, no
   comprable), configurar `SMTP_*` real (usuario no tiene credenciales aún).
4. **CETES real, cascada Banxico → Gemini → fijo (#187, cerrado y verificado en vivo).**
   Pendiente del usuario: sacar token gratis en banxico.org.mx/SieAPIRest y ponerlo en
   Railway si quiere la fuente oficial en vez de IA.
5. **#184 casi cerrado (a/b/c/e; solo falta d).**
   - (a) Pincali sigue sin cubrir todo el municipio (URL por-colonia, cambio estructural
     mayor, no trivial).
   - (d) NSE de terreno con la misma tabla que casas — sin decidir. Debate del panel
     (valuador/inmobiliario/INDAABIN/sistemas/industrial/PM): no construir tabla nueva, el
     hueco real es chico (solo el fallback `pm2t*1.8` sin `calidadConstruccion`) y afecta
     también depto/local/bodega/oficina (`sumaDePartes` no recibe `tipo`, usa costos
     residenciales para todo). Dirección acordada con el usuario: conectar el **atlas de
     colonias** (vivo, se retroalimenta de perito madre + peritos PropValu + inmobiliarios)
     como fuente del fallback — hoy 0 conexión entre el atlas y el motor. Medir antes de
     construir, no urgente.
6. **Regex prohibido — sin corregir. ESPERAR a que termine el scraping activo antes de
   tocar estos archivos** (pedido explícito del usuario). Dos casos distintos:
   - `Modulo Drive IA/scrapear_propiedades_com_urls.js` línea 44: texto libre real, el
     caso que la regla ataca directo — migrar a IA.
   - `scraper-inmuebles/scrapers/vivanuncios_detalle.py` líneas 53-60: JSON estructurado
     con etiquetas explícitas, no texto libre — usuario aún no decidió si cuenta como
     excepción. Decidir al retomar.
7. **Scraper: 2 fallos de PINCALI hoy** (oficinas Guadalajara, casas Ajijic — "falló 3
   veces"). No bloqueó la cola, pero si se repite vale la pena revisar el scraper de
   PINCALI en la próxima sesión.

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-rosy-six-74.vercel.app — auto-deploy RECONECTADO (GitHub App + git link en proyecto "frontend" de Vercel).
- **Backend API:** https://propvalu-backend-production.up.railway.app — auto-deploy STAGED (falta aprobar en dashboard, ver punto 1).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
