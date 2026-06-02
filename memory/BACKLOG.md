# PropValu — Backlog de Tareas
> **Última actualización:** 01 Jun 2026 — Motor Remi: consolidación en archivo maestro (6 fuentes→1), capas ganada/derivada + temporalidad, flywheel del perito, acumulación de comps web + score de confianza, cap por calidad de pool, y fixes de bugs reales (municipio mal capturado, gate suma_partes con clave exacta). Benchmark honesto **2025-2026 (153 OPIs): 69.9% ±10%, 81.7% ±15%, 91.5% ±20%**; curado 93: 76.3/81.7/94.6. (El 85.4% del 26-May era pre-rebuild de caché; el set 2025-2026 es más amplio y honesto.) Ver MOTOR_ANTECEDENTES.md.
> Actualizar este archivo conforme se completen tareas. Marcar con ✅ cuando esté lista, con 🔄 cuando esté en progreso.

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
| 10 | 👁️ | **Fichas de Promoción para Inmobiliarias** — tab Promociones en InmobiliariaDashboard, 2 templates, exportable PDF vía window.print() — **pendiente revisión personal para afinar detalles** |
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
| 60 | ⏳ | **Responsive móvil — ajustes menores pendientes** — AdminAdsAnalytics grid-cols-3 sin colapsar, AdvertiserConsolePage grid-cols-4 sin breakpoint. El resto del admin está OK. |

---

## Infraestructura / Deploy

| # | Estado | Tarea |
|---|---|---|
| 61 | ⏳ | **Deploy backend en Render** — subir FastAPI a Render, obtener URL pública |
| 62 | ⏳ | **Agregar secret `PROPVALU_BACKEND_URL` en GitHub** — URL de Render una vez desplegado, para que el workflow de scraper pueda hacer el sync final. Ir a github.com/Pedrucus1/valuation-ai → Settings → Secrets → Actions |
| 63 | ⏳ | **Merge `feature/search-api` → `main`** — todos los cambios desde Mar 2026 están en esta branch |
| 64 | ⏳ | **Auditoría de seguridad del portal** — revisar auth (cookies session_token, X-Admin-Token), secrets/API keys expuestas en repo, CORS, validación de inputs, rate limiting de endpoints, control de acceso por rol, sanitización de uploads KYC. Aunque ya está en producción, hay que asegurar que funcione correctamente y de forma segura. |
| 65 | ⏳ | **Escalabilidad por volumen** — revisar comportamiento bajo carga: índices MongoDB, paginación de endpoints pesados (mercado/colonias, comps), caché, concurrencia del motor IA (Gemini/Serper rate limits), conexiones DB, cold starts Railway. Definir límites y plan de crecimiento. |
| 66 | 🔄 | **Revisión de arquitectura y deploy** — REVISADA 01-Jun-2026. Hecho (quick wins): índices MongoDB en rutas calientes, CORS restringido a dominio propio + cuenta Vercel, handler de error sin filtrar internals. Ver sub-tareas #66.x para lo pendiente. |
| 66.1 | 🔄 | **Partir el monolito** — EN PROGRESO. Hecho: `models.py`, `core/db.py`, `core/auth.py` (get_current_user/require_auth/require_admin), `core/accesos.py`; routers extraídos: `access`, `newsletter`, `cms`, `feedback`. server.py 4482→3930 líneas. Patrón probado y verificado en prod. PENDIENTE: routers de valuations (dejar al final — se está probando), admin (usuarios/kyc/ads/mercado/scraper/precios/alertas/etc.), mercado público. |
| 66.2 | ⏳ | **Unificar auth admin** — `require_admin` valida token contra colección `admins`, pero ~3 endpoints comparan `token == ADMIN_SECRET` directo. Unificar al patrón de DB. |
| 66.3 | ⏳ | **Separar jobs pesados del proceso web** — APScheduler corre dentro del backend; el job mensual lanza subprocesos de scraper-inmuebles (carpeta inexistente en Railway → falla). Mover a worker/cron externo; evita duplicado si se escala a 2+ instancias. |
| 66.4 | ⏳ | **Entorno de staging** — local y prod comparten la misma Mongo Atlas (las pruebas tocan datos reales). Crear DB/cluster de staging. |
| 66.5 | ⏳ | **Observabilidad** — solo logs a stdout. Agregar Sentry (errores) + métricas básicas. |
| 66.6 | ⏳ | **Higiene de repo** — quitar `backend/server.py.bak` (128 KB) y `backend/uvicorn.log` del repo / gitignore. |
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
| 91 | 🔄 | **Opción 3: capturar edad en scraper — RESUELTO la fuente (01-Jun PM).** propiedades.com (73k, el más grande) ya entrega `año_construccion` vía enricher Node (#75). `actualizar_cache_consolidado.js` mapea col 14 → `an`; `an` cargado en comps. **Pendiente:** correr enricher a escala + refrescar cache + medir. |
| 92 | ❌ | **Replicar calibración en comparar_metodologias_v2.js** — DESCARTADO: producción ya usa `motor_remi_api.js` directamente desde server.py. comparar_metodologias_v2.js es script legacy de prueba. |
| 77 | ✅ | **Integrar Remi al backend** — `motor_remi_api.js` + endpoint en server.py. |
| 81 | ✅ | **Migrar a cache_index.json** — IDX[muni][tipo] 1.6MB vs 50MB anterior. |
| 78 | ✅ | **Re-extraer cerebro con colonias de comparables correctas** — Completado 22-may. 712 OPIs recuperados. build_colonias_similares.js corrido. |
| 85 | ⏳ | **actualizar_cerebro.js optimizado** — Escanea solo últimos 3 meses en lugar de todo Drive. Soporte `--meses N`. Merge de manifiesto (no reemplaza). |
| 86 | 🔄 | **avaluos_referencia.json** — Archivo existe con 1,168 OPIs. Pendiente: integrar en motor_remi_api.js para enriquecer sujetoColonia cuando el extractor no la encuentre. |
| 94 | ✅ | **Consolidación en archivo maestro** — `construir_maestro.js`: 6 fuentes por-colonia → `colonias_maestro.json` (1 archivo, ~33% menos bytes/avalúo). Motor lee solo de ahí, cascada idéntica + fallback legacy. `ARQUITECTURA_DATOS.md` documenta capas. |
| 95 | ✅ | **Capas ganada/derivada + temporalidad + flywheel del perito** — cascada NSE v1→perito→v2→idx. `construir_calibraciones_perito.js` deriva NSE verificado de avalúos reales (split temporal para medir). Neutral pero +115 colonias de cobertura, cero regresión. |
| 96 | ✅ | **Acumulación de comps web + score de confianza** — `acumularComps()` guarda comps web reales (con URL) en `comps_acumulados.ndjson`. `consolidar_comps_acumulados.js` dedup + clasifica verificado/por_verificar/sospechoso cruzando contra mediana de zona. |
| 97 | ✅ | **Cap de comps por calidad de pool** — COMP_CAP 15 (exacta/similares) / 10 (general). +1 ±10%, cero regresión. |
| 98 | ✅ | **Fix municipio mal capturado** — `corregir_municipios_cerebro.js` (guardrail pm2c-coincide-otro-muni). Real del Valle Zapopan→Tlajomulco: −27%→−6.6%. Detector reutilizable. |
| 99 | ✅ | **Fix gate suma_partes (clave exacta→fuzzy)** — usaba IDX[col].count exacto, subcontaba comps fuzzy. Cortijo San Agustín usó sus 6 comps reales (+21%→−10%). |
| 100 | ✅ | **Benchmark honesto 2025-2026 + descartar 2023-2024** — validar contra avalúos viejos = adivinanza (plusvalía). Factor inflación 2024 corregido 1.07→1.13. Colli/Alta California reclasificadas MERCADO (respaldadas por 9/42 listings). |
| 101 | ⏳ | **Puente NSE de comps acumulados** — clasificar cada comp `verificado` por NSE (pm2c→nivel) y fusionar a cache_consolidado/cache_index para que el motor los use. Aditivo, medible. |
| 102 | ⏳ | **Fórmula suma_partes sobrevalúa** — Emiliano Zapata +82%, La Experiencia +37% (con <3 comps reales, suma_partes correcto pero la fórmula infla). |
| 103 | ⏳ | **Bucket colonia vacía en cache_index** — zapopan/casa key "" con n=399 $34,677 contamina ancla de zona vía `colNorm.includes("")`. Limpiar listings sin colonia del índice. |
| 104 | ⏳ | **Similares premium/baratos + sobre-depreciación** — San Carlos (similares premium), Heliodoro (similares baratos + factor edad 0.82 en casa de 46a). |
| 105 | ⏳ | **Aislar Chrome scraper propiedades.com** — `PROPIEDADES_CDP_PORT=9333` + `lanzar_chrome_scraper.bat` (perfil aislado). Alternativa mejor: ruta de búsqueda Serper (Google indexa propiedades.com, sin Akamai). IPRoyal lo bloquea. |

---

## Leyenda
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
