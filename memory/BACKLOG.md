# PropValu — Backlog de Tareas
> **Última actualización:** 29 Jun 2026 (sesión colonias-basura+cleaner-INEGI+OPI análisis). Snapshot de estado vigente → `ESTADO.md`. Bitácora histórica de sesiones → `BACKLOG_ARCHIVE.md` (NO leer al iniciar).
> Marcar ✅ completado · 🔄 en progreso · ⏳ pendiente · 👁️ pendiente revisión personal. Las descripciones largas de tareas viven en las tablas de abajo; el detalle del motor en `MOTOR_ANTECEDENTES.md` (grep, no leer completo).

---

## Flujo de Usuario / Cobro

| # | Estado | Tarea |
|---|---|---|
| 1 | ✅ | **Checkout público general** — flujo: formulario pasos 1-2-3 → paso 4 (pago integrado en ValuationForm) → ads → análisis. |
| 8 | ✅ | **Checkout con upsells** — add-ons Revisión por Perito +$350 y Verificación de m² +$600. |
| 19 | ✅ | **Checkout Valuador e Inmobiliaria** — `/checkout/pro` con planes por rol. Modal de pago simulado. |
| 7 | ⏳ | **Integración pasarela de pagos** — Stripe (tarjeta), OXXO, SPEI, Mercado Pago. |
| 67 | ✅ | **Accesos autorizados (cortesía / pruebas)** — módulo admin `/admin/accesos` para dar acceso gratis a emails internos o de prueba (valuador/inmobiliaria). Por categoría (interno/valuador/inmobiliaria), acceso total o N avalúos gratis, modalidad (solo valuación / con valuador=addon $350 / con visita=addon $600) y vigencia opcional. Backend: colección `authorized_access`, CRUD + `GET /access/status` + consumo de cupo al generar reporte. Frontend: `AdminAccesos.jsx` + nav (Finanzas y datos) + banner de cortesía en ValuationForm que salta el pago. Probado contra Atlas; build OK. Pendiente: replicar salto de pago en ProCheckoutPage (planes pro) si se requiere. |

---

## Publicidad (Ad-Engine)

| # | Estado | Tarea |
|---|---|---|
| 2 | ✅ | **Ads en investigación + generación** — Slot 1/2/3 con countdown, fallback a house ads PropValu. |
| 22 | ✅ | **AdRenderer.jsx** — countdown, link web/WhatsApp, fallback. |
| 23 | ✅ | **Carga de creatividades** — subir JPG/PNG/MP4, preview, estado pendiente de revisión. |
| 11 | ✅ | **Consola de anunciantes** — `/anunciantes`, `/anunciantes/registro`, `/anunciantes/consola` (3 tabs). Métricas Resumen y Facturación conectadas a endpoints reales. Saldo a favor calculado desde budget-spend. Mocks eliminados. |

---

## Páginas y Autenticación

| # | Estado | Tarea |
|---|---|---|
| 3 | ✅ | **Páginas legales** — `/privacidad`, `/terminos`, `/contacto`, etc. |
| 4 | ✅ | **Registro y login** — email+password, bcrypt, cookie sesión, redirect por rol. |
| 39 | ✅ | **Fix auth propio** — reemplazar `auth.emergentagent.com` por sistema login propio. |
| 25 | ✅ | **Registro valuador — paso 2** — ModoSelector, servicios, cobertura, experiencia con medalla. |
| 26 | ✅ | **Registro valuador — paso 3** — docs con hints, comprobante_experiencia obligatorio, términos. |
| 27 | ✅ | **Subida de docs al registrarse** — `/kyc/upload` tras crear cuenta. |
| 46 | ✅ | **Registro sin fricción** — docs opcionales, draft en localStorage. |
| 47 | ✅ | **CTA inmobiliarias en ReportPage** — card verde tras resultado OPI. |
| 28 | ✅ | **Programa afiliado en ModoSelector** — beneficios, compromisos, requisitos. |
| 9 | ✅ | **KYC valuadores** — expediente por etapas, botón entrevista, admin ratifica. |

---

## Dashboards

| # | Estado | Tarea |
|---|---|---|
| 5 | ✅ | **Dashboard Valuador** — tabs: Resumen, Valuaciones, Perfil, Expediente, Facturación. |
| 6 | ✅ | **Dashboard Inmobiliaria** — tabs: Resumen, Mercado, Valuaciones, Equipo, Documentos, Perfil, Reseñas, Facturación. |
| 48 | ✅ | **Perfil inmobiliaria rediseñado** — header verde, grid 4 col, todos campos visibles. |
| 49 | ✅ | **Reseñas de clientes** — tab Reseñas con promedio, distribución, respuesta del titular. |
| 50 | ✅ | **Equipo real de asesores** — GET /inmobiliaria/equipo, tabla, mock preview. |
| 51 | ✅ | **Editar perfil inline** — ✏️ abre form con redes, dirección, asociación, galardones. |
| 52 | ✅ | **Refresh sesión al montar** — fetch /auth/me al cargar, merge con localStorage. |
| 53 | ✅ | **Sistema de billing** — tab Facturación en ambos dashboards, tarjeta Próximo corte. |
| 54 | ✅ | **MercadoTab inmobiliaria — rediseño completo** — tabla con colonias por tipo, sticky, filtros, análisis dinámico, segmentos 7 niveles, PDF vía window.print(). |
| 55 | ✅ | **Plan card junto a tabs** — badge + precio + beneficios + créditos + botón en misma fila que nav. |
| 56 | ✅ | **StatCards 5 fichas** — grid-cols-5, Próximo corte siempre visible. |
| 57 | ✅ | **ValuadorDashboard: MercadoTab + ResumenActividad + plan card colores + tab order** — portado completo desde InmobiliariaDashboard. Starter plan verde, tabs ordenados igual. |
| 59 | ✅ | **AdminScraper: tab Mercado + tarjetas por portal + botón Ejecutar todos + filtros** — portales como cards individuales con estado propio, ExecutarPanel modal eliminado, backend 409 fix para portales individuales. |
| 20 | ✅ | **Panel Admin** — 17 módulos. |
| 40 | ✅ | **Admin Inmobiliarias** — 4 tabs, endpoints detalles. |
| 41 | ✅ | **Admin Ads mejorado** — campañas con lightbox, moderación inline. |

---

## Sistema de Credenciales (Medallitas)

| # | Estado | Tarea |
|---|---|---|
| 30 | ✅ | **BADGE_DEFS** — mapeo doc_tipo → credencial. |
| 31 | ✅ | **Ratificación por admin** — POST /admin/kyc/ratificar/{doc_id}. |
| 32 | ✅ | **Badges en dashboard** — sección Credenciales verificadas. |
| 33 | ✅ | **Medallitas en directorio público** — burbujas emoji con tooltip. |

---

## Features de Negocio

| # | Estado | Tarea |
|---|---|---|
| 10 | 🔄 | **Fichas Studio (Promociones)** — tab Promociones reescrito como diseñador split-panel: CRUD propiedades manuales (`propiedades_inmobiliaria`), upload fotos base64, 5 paletas, puntos verificados auto, propiedad demo, 6 estilos (Clásico/Minimalista/Noir/Moderno/Colección AI/Obsidian) × 4 formatos (A4/horizontal/reels/post), paletteUtils contraste, export PDF/JPG. **Pendiente:** integrar diseños nuevos de Stitch vía MCP (reiniciar sesión), pase de calidad a Moderno/Stitch, export TikTok 3 modos. |
| 12 | 👁️ | **Módulo financiero / Payouts valuadores** — colección encargos, split 80/20, admin AdminPayouts, FacturacionTab con tabla de encargos — **pendiente revisión personal para afinar detalles** |
| 13 | 👁️ | **Sistema de calificación de valuadores** — CTA en ReportPage, ReseñasTab ya estaba en ValuadorDashboard — **pendiente revisión personal para afinar detalles** |
| 14 | ✅ | **Base de datos histórica de avalúos** — es `db.valuations` en MongoDB, se guarda automáticamente. Usada como comparables internos (Sección 0). |
| 15 | 👁️ | **Newsletter fase 1** — suscriptores en MongoDB, sección en LandingPage, AdminNewsletter, endpoints subscribe/unsubscribe. Envío real pendiente (SendGrid) — **pendiente revisión personal para afinar detalles** |
| 21 | ✅ | **Google Sheets como fuente de comparables** — scraper conectado. |
| 64 | ✅ | **MongoDB como fuente primaria de comparables** — `mongo_comparables.py` filtra `mercado_props` por municipio/tipo/m2 ±40%, integrado en server.py step 0.5. |
| 65 | ⏳ | **Sync Sheets → MongoDB inicial** — El endpoint `/admin/mercado/sync-sheets` ya existe y tiene scheduler automático (día 3 de cada mes). Solo falta correrlo una vez manualmente desde el panel admin. Scrapers ya están completos (#66 ✅). |
| 66 | ✅ | **Correr scrapers pendientes** — Todos completados: CYT ✅, MITULA ✅ (re-scrape 20-may con fix m2_terreno), INMUEBLES24 ✅, PINCALI ✅, PROPIEDADES_COM ✅, VIVANUNCIOS ✅. Total: 84,597 props en MongoDB. |
| 34 | ⏳ | **Email notifications** — SendGrid. |
| 35 | ⏳ | **WhatsApp notifications** — Twilio. |
| 133 | ⏳ | **Backend "Data Exchange"** — Crear endpoint de IA para parsear Excels sucios de inmobiliarias, mapearlos a nuestro formato, rechazar si faltan datos de oro (edad/precio), y calcular el 50% de descuento en el carrito de compras. |

---

## Skills y Herramientas Dev

| # | Estado | Tarea |
|---|---|---|
| 36 | ✅ | **Skills globales** — `/backup`, `/recordar`, `/ayuda`. |
| 37 | ✅ | **Skills PropValu** — `/ctx`, `/status`, `/restart-backend`, `/check-errors`, `/end-session`, etc. |
| 38 | ✅ | **Skills Scraper** — `/logs`, `/reset-scraper PORTAL`. |
| 42 | ✅ | **Script seed/datos demo** |
| 43 | ✅ | **Permisos automáticos Claude Code** |
| 44 | ✅ | **Statusline con barras visuales** |
| 45 | ✅ | **Statusline placeholders** |

---

## QA / PDF

| # | Estado | Tarea |
|---|---|---|
| 17 | ❌ | **Marca de agua PropValu en PDF** — descartado, no necesario. |
| 18 | ✅ | **Pruebas y ajustes finales del PDF de valuación** |
| 58 | ✅ | **PDF de Mercado** — reemplazado html2canvas por window.print() con @media print |
| 60 | ✅ | **Responsive móvil (03-Jun)** — AdvertiserConsole grid de fotos `grid-cols-4`→`grid-cols-2 sm:grid-cols-4` (botón borrar tappable en móvil). AdminAdsAnalytics tabla anunciantes `overflow-hidden`→`overflow-x-auto`+`min-w-[640px]` (antes recortaba columnas en móvil). Barrido confirmó: era el único grid 4-col fijo en todo el frontend; los grid-cols-3 son stats chicos (OK 3-up). |

---

## Infraestructura / Deploy

| # | Estado | Tarea |
|---|---|---|
| 61 | ✅ | **Deploy backend** — En **Railway** (no Render). Proyecto `propvalu-backend`, online en https://propvalu-backend-production.up.railway.app. Dockerfile + railway.json + start.py. Deploy manual vía `railway up` (auto-deploy GitHub no configurado en esta rama). |
| 62 | ⏳ | **Agregar secret `PROPVALU_BACKEND_URL` en GitHub** — URL de Render una vez desplegado, para que el workflow de scraper pueda hacer el sync final. Ir a github.com/Pedrucus1/valuation-ai → Settings → Secrets → Actions |
| 63 | ✅ | **Consolidación de ramas** — Resuelto 02-Jun. `master` y `feature/search-api` tenían historias DISJUNTAS (sin ancestro común; master era solo el respaldo inicial de feb). En vez de force-push se creó rama **`main`** con el código actual y se puso como **default en GitHub**. Rama local renombrada a `main`. Pendiente opcional: borrar `master` y `feature/search-api` redundantes en origin (no urge). Deploy sigue siendo `railway up` (branch-agnóstico). |
| 64 | 🔄 | **Auditoría de seguridad del portal — sustancialmente completa** — Ver **`SEGURIDAD_ARQUITECTURA_ANTECEDENTES.md`** (fuente de verdad). Cerrados 02-Jun: **IDOR** avalúos (4e15e10), **escalada privilegios** upgrade-role (4e15e10), **S1+S2+S3** hash bcrypt+migración+timing-safe+expiry tokens (21bca3e), **S4** rate limiting login/registro 10/min (70653dc), **S5** validación+topes+rate limit en públicos feedback/reseñas/newsletter (b13acb1). S6 barrido IDOR sin más casos. Ya OK de antes: CORS restringido, cookies httponly/secure, upload KYC allowlist+5MB+ownership, secrets fuera del repo. **DESPLEGADO A PROD 02-Jun** (railway up, build f783c269; smoke test 5/5: IDOR 403, anónimo 200, rate limit 429). S7 (auth legacy responder_resena) y S4b (rate limit avalúo público 30/h) DESPLEGADOS 02-Jun (build 9f3943a1, commit 1ffed47, prod 404×30→429). **Todos los hallazgos de seguridad cerrados.** Quedan solo infra (#66.3/4/5) y higiene de ramas (#63). |
| 65 | ⏳ | **Escalabilidad por volumen** — revisar comportamiento bajo carga: índices MongoDB, paginación de endpoints pesados (mercado/colonias, comps), caché, concurrencia del motor IA (Gemini/Serper rate limits), conexiones DB, cold starts Railway. Definir límites y plan de crecimiento. |
| 66 | 🔄 | **Revisión de arquitectura y deploy** — REVISADA 01-Jun-2026. Hecho (quick wins): índices MongoDB en rutas calientes, CORS restringido a dominio propio + cuenta Vercel, handler de error sin filtrar internals. Ver sub-tareas #66.x para lo pendiente. |
| 66.1 | 🔄 | **Partir el monolito** — EN PROGRESO (server.py 4482→**1786, −60%**). 17 routers extraídos (incl. mercado, ads, encargos, inmobiliaria/equipo). Restante: SOLO valuations (~1230 líneas, diferido hasta probar avalúos) + glue de app/scheduler (mercado-admin snapshot/sync entrelazado con jobs — puede quedarse). Detalle abajo ↓. **Fundación:** `models.py`, `core/db.py`, `core/auth.py` (get_current_user/require_auth/require_admin/pwd_context), `core/accesos.py`, `core/pricing.py` (PRECIOS_DEFAULT), `core/config.py` (UPLOADS_DIR/KYC_DIR/ADS_DIR/SCRAPER_DIR). **13 routers extraídos:** access, newsletter, cms, feedback, admin_config (precios/mantenimiento/blacklist/cobertura), admin_misc (alertas/stats), admin_inmobiliarias, admin_reportes (valuadores/reportes), directorio, auth, admin_usuarios, kyc, admin_scraper. Patrón: `routers/<dominio>.py` con `APIRouter(prefix="/api")` + `app.include_router(...)`. Verificado en prod. **PENDIENTE:** anuncios/anunciantes (~830 líneas, advertiser auth), mercado público (usa caché `_cache_get/_set` → mover a core/cache.py), mercado-admin/encargos, `/inmobiliaria/equipo`, y **valuations al final** (se está probando). Técnica para bloques grandes: script Python que copia líneas por marcadores y reemplaza @api_router→@router. **DEFERIDO (03-Jun, decisión usuario):** el extract de valuations (~1410 líneas reales, `generate_comparables` solo ~580) es mecánicamente factible (orquesta módulos externos + core/*), pero es el core de avalúos bajo calibración activa (motor #101/#102/#104) — refactor puro sin beneficio funcional que mete churn donde se está afinando. Retomar en sesión propia con verificación de avalúo real (no basta el smoke-test de import) cuando el motor esté estable. |
| 66.2 | ✅ | **Unificar auth admin** — Hecho en commit c9bdaf4. `require_admin` (core/auth.py) valida token contra colección `admins` activo:true. No quedan comparaciones `token==ADMIN_SECRET` sueltas fuera del login. |
| 66.3 | ✅ | **Separar jobs pesados del proceso web (03-Jun)** — Scheduler embebido ya era opt-in (`ENABLE_SCHEDULER=1`, off en Railway). Cron externo cerrado: `require_admin_or_job` (acepta `X-Job-Token`==`JOBS_SECRET` o sesión admin) en sync-sheets + generar-snapshot; workflow `scraper_mensual` dispara ambos por curl. Arreglado bug: el curl usaba `ADMIN_SECRET` que `require_admin` ya no acepta post-#66.2. **Config pendiente:** secret `JOBS_SECRET` en GitHub + env en Railway. |
| 66.4 | ✅ | **Entorno de staging (03-Jun)** — cluster M0 separado `cluster1.avle5ez` (proyecto Atlas aparte=gratis). Seeded prod→staging (10k props + app data, `backend/seed_staging.py`). Backend local→staging (`backend/.env`); scraper→prod. Scripts mantenimiento con `db_target.py` fail-closed + avisan cluster. |
| 66.5 | ✅ | **Observabilidad (03-Jun)** — Sentry (errores) ya estaba. Métricas básicas HECHO: `core/metrics.py` (in-memory, sin deps: conteo/latencia/errores por ruta + uptime) + middleware HTTP + `/api/metrics` admin-only (snapshot + ping Mongo + conteos colecciones). Bonus: eliminado `/health` duplicado muerto. Single-instance (no agrega entre réplicas — para eso Prometheus). |
| 66.6 | ✅ | **Higiene de repo** — Hecho en commit c9bdaf4. `server.py.bak` (2935 líneas) y `uvicorn.log` eliminados del repo; `.gitignore` cubre `*.env`/`*.bak`/`*.log`/`memory/`. |
| 65.1 | ✅ | **Índices MongoDB** — `_ensure_indexes()` en startup: users(email,user_id), user_sessions(session_token,expires_at), valuations(valuation_id,user_id), authorized_access(email), admins(token,email). Creados en Atlas. |

---

## Motor de Valuación IA (Modulo Drive IA)

| # | Estado | Tarea |
|---|---|---|
| 70 | ✅ | **Remi-Scraper como motor principal** — Homologación Directa $/m²C con comps del scraper. 6/9 casos en Guadalajara dentro de ±20% error. Archivos: `comparar_metodologias.js`, `validador_masivo.js` |
| 71 | ✅ | **Selección de comps corregida** — Sigue reglas de `sheets_comparables.py`: tipo coincidente, m²C exigido, área ±50%, CUS ±35%, top 10 por similitud. CONSOLIDADO tab como fuente única. |
| 72 | ✅ | **Anti-remate bidireccional** — Filtro ±40% de mediana (antes solo filtraba abajo). Descarta remates Y colonias caras que distorsionan. |
| 73 | ✅ | **Gemini como fallback** — `test_gemini_comps.js` implementado. Miguel Hidalgo: +19.7% con Gemini vs +47% con scraper. Las Conchas y Lagos de Oriente requieren más trabajo. |
| 79 | ✅ | **Motor calibrado en 40 OPIs — 31/40 ±20%, error promedio 12.6%** — Mejoras: factorRH dinámico por conservación, prima vivienda pequeña (<65m²C), Beta-OPI preferido cuando colonia es vaga, factor obsolescencia urbana terreno (edad>30 + CUS<0.85). DeepSeek como agente primario de análisis. Script `deepseek_dev.js` creado. |
| 80 | ✅ | **Comparar metodología perito vs motor propio vs precio real scraper** — `comparar_10_scraper.js`: 10/10 en ±20%, error 11.8%. Motor Remi gana al método perito en todos los casos. |
| 74 | ✅ | **Base de datos de colonias similares** — `build_colonias_similares.js` corrido exitosamente con 712 OPIs. 0 colonias nuevas (ya existían todas), 3 actualizadas. colonias_similares.json tiene 1052 entradas. |
| 75 | 🔄 | **Enricher propiedades.com — RESUELTO vía HTTP simple Node (01-Jun PM).** La "puerta": `GET` con fetch nativo de Node da 200 con `__NEXT_DATA__` (incl. `amenities.age`), SIN Akamai/Chrome/CDP. `scrapers/plain_fetch.js` + `enricher.py fetch_html_node()`. Verificado: 47 props/página, 6/6 detalles con antigüedad (2003-2025). Enricher corriendo a escala (`--max 1000`, log `logs/enricher_pcom_run.log`). **Pendiente:** correr más lotes para llenar cobertura, luego refrescar cache. (La lección vieja "propiedades.com necesita CDP" quedó OBSOLETA: requests-Python recibe tarpit TLS, Node no.) |
| 82 | ✅ | **Fix m2_terreno en scraper Mitula** — Corregido en `mitula.py`. |
| 83 | ✅ | **Scheduler mensual corregido** — `run_mensual.ps1` con ruta, Python correcto y PROPIEDADES_COM. |
| 84 | ✅ | **MongoDB-first en scheduler.py** — Escribe MongoDB primero, Sheets secundario. |
| 76 | ✅ | **Afinar Remi** — **100% ±20%** (38/38 OPIs calibrados), error promedio 9.8%. Set extendido 80 OPIs: 61.3% ±20%. Fixes: build_colonias_similares.js, 6 similares actualizadas. Fallos en set extendido: colonias vagas, IDX antiguo, ejidales. |
| 87 | ✅ | **optimizar_similares_ds.js** — Script que detecta fallos >20% y pide a DeepSeek las colonias similares óptimas del IDX. Flags: --apply para guardar cambios. |
| 88 | ✅ | **Ampliar validación y calibración** — **COMPLETADO 26-May**: 89/99 ±10% (89.9%), 100% ±20%, error abs 5.0%. Comando: `node validar_40_opis.js --n 200 --desde 2025-07`. FLOOR_EDAD_SIMILARES diferenciado por conservación implementado. |
| 89 | ✅ | **Validación ampliada todo 2025+2026** — 157 OPIs: 82.8% ±10%, 98.1% ±20%, error 5.9%. 2 nuevos EXCLUIR (Del Sur micro + Zapopan-municipio). Motor confirmado robusto. |
| 93 | ✅ | **SEPOMEX/IDX + SIM fixes post-rebuild 26-May** — +1,410 colonias SEPOMEX al IDX (8,703 total). SIM corregidas: san elias (similares premium→medio-alto), oblatos (garbage→analco/san juan bosco), zalatitan (sin datos→tonala/santa paula). Conservation mapping completo en server.py (11 estados vs 4 antes). Resultado: **85.4% ±10%, 99.0% ±20%, error 5.2%** (96 OPIs H2 2025+2026). |
| 90 | 🔄 | **Opción 2: edad relativa a la zona** — **Maquinaria LISTA y probada neutral (01-Jun):** `build_cache_index.js` calcula `edadMedianaZona` por colonia; `motor_remi_api.js` usa ancla relativa en `factorEdad` (fallback a 10 sin dato → idéntico). **DESBLOQUEADA** (ver #75/#91): propiedades.com ya da antigüedad. Se activa al refrescar cache con cobertura nueva. Falta: medir mejora en colonias de casas viejas. |
| 91 | 🔄 | **Capturar edad en scraper — RESUELTO PARA LOS 6 PORTALES (02-Jun PM).** **Enricher modo `--mongo`** (commit ebeb4bc): lee y escribe DIRECTO en `mercado_props.anio_construccion` (canónico sin ñ), sin tocar Sheets (Mongo es base oficial). Antes era Sheets-céntrico → la edad nunca llegaba a Mongo (solo 58/84,733). **Extracción arreglada por portal:** PROPIEDADES_COM (amenities.age + 'Nuevo'→año actual, commit 3581448); INMUEBLES24 + VIVANUNCIOS (edad en JSON Navent CFT5 `"label":"antigüedad"`, NO en texto; 'A estrenar'→nuevo, commits e758abb/de25d2a); PINCALI residencial (regex no abarcaba "construcción", e758abb); CASAS_Y_TERRENOS (features.age>0; age=0='sin dato', correcto); MITULA parcial. **Verificado en prod:** anio_construccion 58→212 y subiendo en vivo. Lección: NO concluir "portal no expone edad" desde script — el dato suele estar en JSON embebido (memoria feedback_extraccion_falso_negativo). **Enrichers corriendo (02-Jun ~22h):** PCOM 500, INM24/PINCALI/MITULA 500 c/u, VIVANUNCIOS 600 + CYT 1500. **Pendiente al terminar:** refrescar cache del motor (cache_index/colonias_maestro) desde Mongo + medir mejora en colonias de casas viejas (#90). |
| 92 | ❌ | **Replicar calibración en comparar_metodologias_v2.js** — DESCARTADO: producción ya usa `motor_remi_api.js` directamente desde server.py. comparar_metodologias_v2.js es script legacy de prueba. |
| 77 | ✅ | **Integrar Remi al backend** — `motor_remi_api.js` + endpoint en server.py. |
| 81 | ✅ | **Migrar a cache_index.json** — IDX[muni][tipo] 1.6MB vs 50MB anterior. |
| 78 | ✅ | **Re-extraer cerebro con colonias de comparables correctas** — Completado 22-may. 712 OPIs recuperados. build_colonias_similares.js corrido. |
| 85 | ✅ | **actualizar_cerebro.js optimizado** — Ya implementado (item obsoleto): `ultimosMeses(N)` default 3, flag `--meses N`, merge de manifiesto sin reemplazar (`[...anterior, ...nuevos]`). Verificado 03-Jun. |
| 86 | 🔄 | **avaluos_referencia.json** — Archivo existe con 1,168 OPIs. Pendiente: integrar en motor_remi_api.js para enriquecer sujetoColonia cuando el extractor no la encuentre. |
| 94 | ✅ | **Consolidación en archivo maestro** — `construir_maestro.js`: 6 fuentes por-colonia → `colonias_maestro.json` (1 archivo, ~33% menos bytes/avalúo). Motor lee solo de ahí, cascada idéntica + fallback legacy. `ARQUITECTURA_DATOS.md` documenta capas. |
| 95 | ✅ | **Capas ganada/derivada + temporalidad + flywheel del perito** — cascada NSE v1→perito→v2→idx. `construir_calibraciones_perito.js` deriva NSE verificado de avalúos reales (split temporal para medir). Neutral pero +115 colonias de cobertura, cero regresión. |
| 96 | ✅ | **Acumulación de comps web + score de confianza** — `acumularComps()` guarda comps web reales (con URL) en `comps_acumulados.ndjson`. `consolidar_comps_acumulados.js` dedup + clasifica verificado/por_verificar/sospechoso cruzando contra mediana de zona. |
| 97 | ✅ | **Cap de comps por calidad de pool** — COMP_CAP 15 (exacta/similares) / 10 (general). +1 ±10%, cero regresión. |
| 98 | ✅ | **Fix municipio mal capturado** — `corregir_municipios_cerebro.js` (guardrail pm2c-coincide-otro-muni). Real del Valle Zapopan→Tlajomulco: −27%→−6.6%. Detector reutilizable. |
| 99 | ✅ | **Fix gate suma_partes (clave exacta→fuzzy)** — usaba IDX[col].count exacto, subcontaba comps fuzzy. Cortijo San Agustín usó sus 6 comps reales (+21%→−10%). |
| 100 | ✅ | **Benchmark honesto 2025-2026 + descartar 2023-2024** — validar contra avalúos viejos = adivinanza (plusvalía). Factor inflación 2024 corregido 1.07→1.13. Colli/Alta California reclasificadas MERCADO (respaldadas por 9/42 listings). |
| 101 | 🔄 | **Puente NSE de comps acumulados** — clasificar cada comp `verificado` por NSE (pm2c→nivel) y fusionar a cache_consolidado/cache_index para que el motor los use. Aditivo, medible. **Avance 03-Jun (flywheel comps web):** el motor (`motor_remi_api.js` `enriquecerCompsWeb`) ahora abre cada comp REAL de Serper vía `enrich_urls.py` (Node→Python), saca edad/m²/recámaras/baños/tel y los hace upsert a `mercado_props` con `generar_id_unico` (sin duplicar) + `$setOnInsert` (no pisa scrape). Así lo que se busca en web queda guardado con calidad de scrape → próxima vez sale del scrape. Validado el puente (an=2001) y sin regresión del motor (Providencia $7.43M). OJO: la ruta AI de `server.py` (OpenAI/Gemini) genera URLs alucinadas → su enriquecimiento inline quedó apagado (flag ENRICH_WEB_COMPS_INLINE); el real vive en la ruta Serper del motor. **Pendiente:** (a) ajuste per-comp por edad dentro de `remiSobreComps` (hoy usa edad del sujeto, no `c.an`) — cambio de fórmula, requiere validador_masivo. **BLOQUEADO POR DATOS (03-Jun):** el caché del motor tiene **0% de comps con `an`** (cache_consolidado/cache_index) → per-comp por edad es no-op hoy; el `an` vive en Mongo (enrichers subiéndolo) pero meterlo al caché = rebuild Mongo / migración #107 que regresa. Deferido hasta que `an` llegue al caché. Ver MOTOR_ANTECEDENTES (#101a). (b) test en vivo del fallback Serper — independiente; bajo ROI como caso aislado (el puente ya se validó: an=2001, Providencia $7.43M). |
| 102 | ✅ | **Fórmula suma_partes sobrevalúa (03-Jun)** — Era `suma_partes_mix` (60% sumaDePartes + 40% pool) inflando lotes terreno-pesados. Fix: cota asimétrica `mix ≤ pool×1.25` (recorta solo sobrevalúo, no toca subvalúo). Offline: ±20% 86.7→88.7%, err 10.9→9.7%; set curado ±15% 86.1→88.9%, ±20% 100% sin cambio. Emiliano Zapata +82→+16.5 ✅, La Experiencia +36.5→+19.4 ✅. Sin regresión. Ver MOTOR_ANTECEDENTES. |
| 103 | ❌ | **Bucket colonia vacía — PROBADO Y REVERTIDO 02-Jun.** Guard de longitud en el ancla de banda regresó el benchmark 71.6/83.9/92.9 → 69.7/81.3/91.0 (+3 violadores). Los listings sin colonia aportan ancla de zona útil. NO reintentar. Ver MOTOR_ANTECEDENTES.md. |
| 104 | ❌ | **Similares premium/baratos — LÍMITE ESTRUCTURAL, NO reintentar (03-Jun)** — Heliodoro -52% (SIM baratas) y San Carlos +30.5% (SIM premium) tiran en direcciones OPUESTAS, ambos pool:similares n=3. No hay fix de fórmula sin overfit; curar SIM a mano = cazar atípicos prohibido (regla #4). Mejora real = datos scrapeados propios de esas colonias. Ver MOTOR_ANTECEDENTES. |
| 105 | ✅ | **Aislar Chrome scraper propiedades.com (03-Jun)** — Resuelto de fondo: el path vivo (scraper `_node_get` + enricher `fetch_html_node`) usa `plain_fetch.js` (fetch nativo de Node, sin Chrome) → ya NO abre el navegador personal ni marca tu sesión a Akamai. Alineé los 2 defaults CDP legacy 9222→9333 (`enricher.fetch_html_cdp` muerto + `propiedades_com.CDP_PORT`); `config.PROPIEDADES_CDP_PORT`=9333 + `lanzar_chrome_scraper.bat` ya existían. |
| 106 | ✅ | **Esquema de campos UNIFICADO (03/04-Jun)** — Mismo dato = mismo nombre legible en todas las capas. Claves de caché mín→legible (`p→precio, c→m2c, t→m2t, tp→tipo, co→colonia, mu→muni, an→anio, fs→fecha`…) en `cache_consolidado.json`, `cache_index.json`, `edad_mongo.json`, `comps_verificados.json`, `motor_remi_api.js`, `build_cache_index.js`, los 3 `actualizar_cache_*`, `construir_puente_comps.js`. Renombre PURO: validador IDÉNTICO antes/después (±10% 69.2 / ±15% 76.6 / ±20% 88.8). Diccionario único `ESQUEMA_CAMPOS.md` (raíz) + chequeo `verificar_esquema.cjs`. Memoria `reference_esquema_campos.md`. **Edad: campo canónico `anio_construccion` SIN ñ; el de ñ está 99.96% vacío (PROHIBIDO).** |
| 107 | ✅ | **Dedup intra-portal (04-Jun)** — `fusionar_duplicados.py` ahora marca también la MISMA propiedad re-scrapeada en el mismo portal (firma estricta: portal+colonia+tipo+m²+precio EXACTO+rec+baños). No destructivo (`dup_intra=True`, reversible `--reset`). Resultado: secundarias 963→**5,522 (6.8%)**, inventario real 80,833→**76,263**. Cross 698 grupos + intra 3,334. **Pendiente:** re-correr cuando enrichers llenen el 19.8% no evaluable (sin colonia/m²) → caerán más; y caso "re-listada a otro precio" (huella por dirección/agente). |
| 108 | 🔄 | **Drenar enrichers a toda la base (04-Jun, CORRIENDO)** — Causa del "ya terminó" falso: los lotes corrían con `--max` chico (15% de la base). Rendimiento de año verificado ALTO en los enriquecidos: INMUEBLES24 98%, PROPIEDADES_COM 93%, VIVANUNCIOS 93%. Relanzados los 5 con `--max` grande para drenar (~70k pendientes venta+renta, sin duplicados). Fix: la consulta del enricher ahora excluye `es_duplicado_secundario` (no re-procesa duplicados). **Proyección:** ~8k→~43k con año al terminar → activa #90/#91. Procesos `nohup` siguen tras /clear. Al terminar: refrescar caché + re-correr dedup + medir #90. |
| 109 | ✅ | **Edad pendiente NO es bug del extractor (04-Jun)** — Verificado bajando HTML crudo: el residuo ~67k es estructural (PINCALI/comercial sin año, CYT `age=0`, MITULA `/adform` sin datos, I24 `antigüedad=None`; lo que parecía falso-neg era CSS). El extractor capta el año cuando existe. Único fix: `En construcción`/`Preventa` → año actual en I24/VIVA (commit `ff959ac`). Backfill productivo restante = PCOM colonia (~11k). Memoria `feedback_edad_pendientes_no_son_bug`. |
| 110 | ✅ | **Límites de creatividades de ads (04-Jun, `9ed6374`)** — Tamaño por slot (video 25/12/6 MB, imagen 10 MB) + tope por anunciante (5 videos, 25 imágenes) validado en BACKEND (`routers/ads.py`, no bypasseable) y front. Leyendas de tamaño/duración y uso de almacenamiento en la consola. SLOT_SPECS maxSizeMB 50/20/10→25/12/6 + maxDuration 60/30/15. |
| 111 | ✅ | **Fix consola anunciante adDuration (04-Jun, `3fd5e10`)** — `spec.adDuration` (inexistente, NaN) → `adDuration`. Pausar/reactivar + badges aprobación ya estaban OK (verificado e2e). Datos de prueba en staging: advertiser `test-ads@propvalu.test` + 2 campañas slot1/2 + 2 MP4 (borrables). |
| 112 | ✅ | **Cobertura similares: 231 cotos sin SEPOMEX resueltos + 2 alucinaciones corregidas (04-Jun, `6d179b7`/`70ed7e5`)** — `resolver_similares_municipios.js` (Gemini, rate-limit) resolvió municipio/zona de 231/336 colonias nuevas (resto bloqueado por cuota Gemini, checkpoint guardado). Corregidas 2 alucinaciones del LLM (`colotlan`,`huejuquilla` mal mapeadas a AMG→Otro). Validador IDÉNTICO (sin regresión); valor = cobertura futura. |
| 113 | ❌ | **Cross-municipio por adyacencia de MUNICIPIO — PROBADO Y REVERTIDO (04-Jun, `ec36a11`)** — `MUNI_VECINOS` solo en `enSim` regresó el validador (±15 76.6→73.8, ±20 88.8→86.9, fuera 12→14): la adyacencia a nivel municipio es muy gruesa. NO reintentar así. Camino correcto = proximidad por CP (ver #114). Ver MOTOR_ANTECEDENTES. |
| 114 | ✅ | **Herramienta de proximidad por CP/coords (04-Jun, `c272359`, Sonnet)** — Infraestructura lista en `Modulo Drive IA/_geo/`: `cp_coords.json` (2,025 CPs Jalisco con lat/lon, GeoNames), `colonia_cp.json` (6,178 colonias, 97.3% match, SEPOMEX), `proximidad.py` (haversine + `colonias_cercanas`). Self-test OK (cruza Tlaquepaque↔GDL). **COMPLETADO:** Integrado al motor (`motor_remi_api.js`) y al build (`construir_maestro.js`). Validación: baseline subió a 89.7% en ±20%. |

| 115 | ✅ | **Fix obra nueva genérico todos los portales (05-Jun, `42cf3e5`)** — El fix anterior solo cubría I24/VIVA. Agregado fallback: texto libre "obra nueva/en construcción/preventa/a estrenar" → año actual en PINCALI, PCOM, MITULA, CYT. |
| 116 | 🔄 | **Enrichers relanzados con fixes (05-Jun)** — Relanzados con `python -u` (fix de buffering). Fix 09-Jun: scheduler.py línea 680 le faltaba `--mongo` → enriquía en modo Sheets y tiraba 429. Corregido. Enrichers relanzados con `--mongo`: PINCALI 12k · INMUEBLES24 8.4k · PROPIEDADES_COM 16.8k pendientes CORRIENDO. Al terminar: refrescar caché + re-dedup + medir #90/#91. |
| 117 | ✅ | **Scraper NOCNOK completo (09-Jun)** — API JSON pura `/api/properties/search` con `stateId=14` + `countyIds` por municipio. 7 municipios GDL metro mapeados (IDs verificados). Split por precio para municipios >500 props (Zapopan/GDL). Detalle via `_next/data/{buildId}` para `yearBuilt`, `county`, `settlement`. Sin enricher separado — todo en un paso. Comando: `python scheduler.py --portal NOCNOK`. Corriendo en background (80+ props en Mongo al iniciar, ~2k total esperado). |
| 118 | ⏳ | **Scraper Monopolio** — Explorado 09-Jun: API usa AWS Cognito con `explicit deny` para peticiones directas. Solo funciona desde browser autenticado. Para scraperlo se necesita login + JWT; fuera del alcance actual. Diferir. |
| 119 | 🔄 | **Limpiar colonias basura IDX (29-Jun)** — Diagnóstico: 60-70% colonias únicas en GDL/Zapopan/Tlajomulco/Tlaquepaque son strings con dirección completa. Fuente: PINCALI 71.6%, PCOM 29.5%, VIVANUNCIOS 12%. Fix aplicado: (a) `enricher.py` re-procesa PINCALI/PCOM/VIVANUNCIOS con colonia basura; (b) `cleaner.py` rescata colonia via patrón "Col. NOMBRE" + catálogo SEPOMEX 2,827 colonias; (c) `_reset_enrich_portal.py` para resetear cooldown. Enrichers CORRIENDO (PINCALI 34k + PCOM 13k). Al terminar: re-correr `fusionar_duplicados.py` + rebuild `cache_index.json` + re-validar motor. |
| 120 | ✅ | **Gate lote grande (CUS<0.50) homologación CUS — IMPLEMENTADO+VALIDADO+MERGEADO (30-jun)** — En motor_remi_api.js: `valuarLoteGrandeCUS` (homologación CUS + semilla pm2T + tope NSE muni-correcto). + anti-colisión NSE por municipio + fix normMuni "tlaquepaquetlaquepaque" + filtro de segmento de precio. **Validado en 103 OPIs base fresca: ±10% 40.8→47.6%, error 19.9→15.7%, sin regresión.** OPI-26-5-16 −52%→−1.3%. Re-extracción Drive: colonias comps 4%→88%. Commiteado+pusheado (main). Detalle: memoria `project_motor_homologacion_cus`. |
| 121 | ✅ | **Selección/ponderación de comps por similitud (DV) — IMPLEMENTADO+VALIDADO+MERGEADO (30-jun, `e5cb542`)** — Papers leídos (Krause&Kummerow completo + Copiello + SIEV + arxiv). Adaptación a datos MX: ponderación INVERSA a distancia estandarizada sobre {m²C,m²T,rec,baños,año}, top-8 más parecidos, var faltante no penaliza; conserva ajustes tamaño/edad/conserv. SIN el OLS por avalúo (muestra chica). **Geo DESCARTADA** (redundante con pre-filtro colonia/similares). **Estac**: sin efecto medible hoy (cobertura comps rota por bug PINCALI — ARREGLADO `32f30d2`, backfill ~15.7k corriendo). build_cache_index ahora arrastra rec/baños/estac. **Validado 103 OPIs 2025-26: ±15 57.3→60.2, ±20 68.9→73.8, errAbs 15.7→15.6, 0 regresiones** (rescata errores grandes, no afina ±10). Backup motor_remi_api.PRE_DV.bak. Detalle: `reference_avm_metodologia`. PENDIENTE: re-medir estac tras backfill (deptos) + variable NIVELES (OPI AF85:AM86, ~10% precio en deptos). |

---

## Estrategia de Negocio

| # | Estado | Tarea |
|---|---|---|
| N1 | ✅ | **Plan de Negocio 2026** — `memory/PLAN_NEGOCIO.md` creado. Pivot SaaS inmobiliarias, cascada descuentos, DocuProp, portal. |
| N2 | ✅ | **Análisis de negocio completo** — `memory/ANALISIS_NEGOCIO_COMPLETO.md`: TAM/SAM/SOM Jalisco, P&L 3 años, unit economics, GTM, legal, equipo. |
| N8 | ✅ | **Análisis competencia avalúos** — Tabla comparativa YALS/Monopolio/Romina/AvaClick con precios reales verificados. |
| N11 | ✅ | **Análisis Nexti** — CRM inmobiliario con módulo de avalúos. $499/mes ilimitados. Homologación 0.80-1.20, PDF con UID, cita NMX-R-081 implícita. Para agentes: certificaciones CONOCER (EC0110.02/EC0903.01), curso gratis, respaldo de perito, entrega automática por correo. Diferenciador PropValu: comparables automáticos del mercado real vs captura manual; rigor técnico vs ecosistema generalista. |
| N12 | ✅ | **NMX-R-081-SCFI-2015 revisada** — Motor PropValu alineado con principios: enfoque mercado (Romina ≥3 comps) + costo (Suma de Partes INDAABIN). Frase segura: "metodología alineada con los principios de la NMX-R-081-SCFI-2015". |
| N3 | ⏳ | **Constituir SAPI de CV** — Prerequisito para cobrar con Stripe. Notario + RFC + cuenta bancaria empresarial. |
| N4 | ⏳ | **Integrar Stripe** — Cobro real de suscripciones. Prerequisito: SAPI constituida. |
| N5 | ⏳ | **10 pilotos gratuitos** — Validar product-market fit antes de gastar en marketing. |
| N6 | ⏳ | **Contactar AMPI Guadalajara** — Solicitar presentación en asamblea mensual. Canal principal GTM. |
| N7 | ⏳ | **Firmar acuerdos con abogados** — Red DocuProp: 3-5 abogados socios con split 75/25. |
| N9 | ✅ | **Scraper NOCNOK** — `inmuebles.nocnok.com` — API JSON pura, sin Playwright. Ver #117. |
| N10 | ⏳ | **Scraper Monopolio** — `monopolio.com.mx` — AWS Cognito explicit deny. Requiere login+JWT. Ver #118. |

---

## Leyenda
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
