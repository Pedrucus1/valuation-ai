# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 10 Sep 2026 (madrugada)
**Fase:** Vercel auto-deploy reconectado de verdad (GitHub App + git link, ya no manual).
Railway auto-deploy dejado **staged** (repo/root/start command listos, falta que el
usuario apruebe el deploy en su dashboard — no se tocó en vivo por riesgo a prod).
Colisión de NSE por colonias homónimas (#5) CERRADA e implementada en producción.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **Railway: aprobar el deploy staged.** `railway/connect-service-source` +
   `update-service` (root `backend`, start `uvicorn server:app --host 0.0.0.0 --port $PORT`,
   reemplaza el placeholder `echo HELLO_FROM_RAILWAY`) quedaron preparados sin aplicar.
   El usuario tiene que darle "Deploy" en el dashboard de Railway para que el auto-deploy
   quede realmente activo.
2. **CETES real, cascada Banxico → Gemini → fijo (#187, cerrado y verificado en vivo).**
   `backend/cetes.py` nuevo: Banxico SIE API (necesita `BANXICO_TOKEN`, el usuario no lo
   tiene todavía) → si falla, le pregunta a Gemini con anti-alucinación (rango 3-20%,
   fecha del año actual/anterior) → si también falla, 10% fijo (mismo comportamiento de
   antes). Corrida real: `{rate: 11.0, source: 'gemini'}`, caché 24h confirmado. Reporte
   muestra footnote con la fuente real. Pendiente del usuario: sacar token gratis en
   banxico.org.mx/SieAPIRest y ponerlo en Railway si quiere la fuente oficial en vez de IA.
3. **AdminActividad.jsx construida y verificada en vivo (#170, cerrado).** Tabla de
   `activity_log` con filtro tipo/buscador/expandir stack trace. Login admin, backend
   local, 4 filas reales en staging — todo confirmado con screenshot, no solo por código.
4. **#184 casi cerrado (a/b/c/e; solo falta d).**
   - (a) NOCNOK ya no descarta resultados fuera de colonias objetivo (mismo bug ya resuelto
     en CasasYTerrenos/Propiedades.com). Pincali sigue sin cubrir todo el municipio — su URL
     es por-colonia, cambio estructural mayor, no trivial.
   - (b) Era falsa alarma: el pipeline canónico de `colonias_similares` ya estaba resuelto
     desde el 3-sep, solo faltaba documentarlo — hecho en `INDICE_MOTOR.md`.
   - (c) Medido en vivo primero (regla del proyecto): pipeline completo de 7 pasos tarda
     4m1s contra Mongo real. Wireado: `scheduler.py` lo dispara al final de cualquier
     corrida (bloqueante, ya es un batch de horas); `ondemand_pipeline.py` lo dispara en
     background (`Popen`, no alarga la espera del usuario en el dashboard).
   - (d) NSE de terreno con la misma tabla que casas — sigue sin decidir, es pregunta
     metodológica, no código, no urgente.
   - (e) `build_pm2t_semilla.py` ya lee `db.terreno_flywheel` (solo lectura), verificado
     corriendo en vivo — colección vacía hoy, degrada limpio a cerebro/AC108.
5. **#5 CERRADO — colisión de NSE entre colonias homónimas de distinto municipio.**
   Cuantificado (58/3,898 colonias colisionan, 35 con precio/m² divergente ≥25%) y arreglado:
   `construir_maestro.js` ahora indexa también por llave compuesta `nombre|municipio` cuando se
   conoce el municipio (733 colonias hoy); `getNSE`/`getSimilares` en `motor_remi_api.js` (y
   `_lab.js`) generalizan la guardia anti-colisión a los 7 call-sites (antes solo 1 la tenía).
   Validado offline contra los 40 avalúos reales del perito: efecto neutro (±10% 67.6%→64.7%,
   ruido de 1 caso — esperado, la mayoría de la muestra no toca colonias colisionadas). Commit
   `283123d`. Fuera de alcance a propósito (marcado `ponytail:`, no rotos, solo sin aprovechar
   la llave compuesta): `merge_simIA_a_maestro.js`, `backfill_cp_maestro.js`,
   `consolidar_colonias_idx.py`, `validar_produccion.py`, `validar_hibrido_40.py`.
6. **Regex prohibido — violación real, sin corregir. ESPERAR a que termine el scraping activo
   antes de tocar estos archivos** (el usuario lo pidió explícito 10-sep). Dos casos distintos:
   - `Modulo Drive IA/scrapear_propiedades_com_urls.js` línea 44: texto libre real
     (`streetAddress.match(/col\.?\s*([^,]+?)\s*c\.?p\.?/i)`) — el caso que la regla ataca
     directo, migrar a IA.
   - `scraper-inmuebles/scrapers/vivanuncios_detalle.py` líneas 53-60: JSON estructurado
     embebido con etiquetas explícitas (`"label":"ZONA"/"CIUDAD"/"PROVINCIA"`), no texto libre
     — el usuario aún no decidió si cuenta como excepción o si migra igual. Decidir al retomar.
7. **#185 CERRADO (v2), loop completo verificado en vivo — sin Stripe real (sigue bloqueado
   por N3/N4, SAPI no constituida), pago simulado en su lugar.** `ThankYouPage.jsx` muestra el
   aviso prominente junto al botón "Descargar PDF" → `VaultModal.jsx`: tabla (no tarjetas-botón)
   con 5 planes — Gratis (3 meses), 1 año $50, 3 años $110 ("Más elegido"), 5 años $150, Bóveda
   Total (10 años) $195 — columna "si esperas" con el ahorro vs $230 (recuperar sin plan, tarifa
   de referencia, no comprable aún). Plan gratis activa directo; planes pagados pasan por
   checkout simulado (mismo patrón que `ValuationForm.jsx`/`ProCheckoutPage.jsx`: delay +
   validación de formato de tarjeta, label "simulado" explícito, sin cobro real). Backend:
   `POST /vault-request` (crea `pendiente_pago`) → `POST /vault-requests/{id}/confirmar-pago`
   (marca `pagado`, calcula `expira_en`) → `GET /vault/recuperar?email=` + `GET
   /vault/recuperar/{valuation_id}?email=` (recuperación real, nunca confía en el valuation_id
   solo, siempre revalida correo+estado pagado) — nueva página `/recuperar`. Primer índice TTL
   del proyecto (`vault_requests.expira_en`, `expireAfterSeconds=0`) — confirmado en Mongo.
   Commits `5d970e9` (MVP) + `fd90aab` (v2). Fuera de alcance a propósito: Stripe real, tarifa
   de $230/$260 (descarga suelta/actualización) como flujo de pago único real — solo aparece
   como referencia de texto, no es comprable —, `SMTP_*` (usuario no tiene credenciales, correo
   degrada a solo-log).

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- Pincali sin cubrir municipio completo (ver #184-a arriba).
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-rosy-six-74.vercel.app — auto-deploy RECONECTADO hoy (GitHub App + git link en proyecto "frontend" de Vercel).
- **Backend API:** https://propvalu-backend-production.up.railway.app — auto-deploy STAGED (falta aprobar en dashboard, ver punto 1).
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
