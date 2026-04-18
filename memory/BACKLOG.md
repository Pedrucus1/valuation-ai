# PropValu — Backlog de Tareas
> **Última actualización:** 17 Abr 2026 — Features #10 #12 #13 #15
> Actualizar este archivo conforme se completen tareas. Marcar con ✅ cuando esté lista, con 🔄 cuando esté en progreso.

---

## Flujo de Usuario / Cobro

| # | Estado | Tarea |
|---|---|---|
| 1 | ✅ | **Checkout público general** — flujo: formulario pasos 1-2-3 → paso 4 (pago integrado en ValuationForm) → ads → análisis. |
| 8 | ✅ | **Checkout con upsells** — add-ons Revisión por Perito +$350 y Verificación de m² +$600. |
| 19 | ✅ | **Checkout Valuador e Inmobiliaria** — `/checkout/pro` con planes por rol. Modal de pago simulado. |
| 7 | ⏳ | **Integración pasarela de pagos** — Stripe (tarjeta), OXXO, SPEI, Mercado Pago. |

---

## Publicidad (Ad-Engine)

| # | Estado | Tarea |
|---|---|---|
| 2 | ✅ | **Ads en investigación + generación** — Slot 1/2/3 con countdown, fallback a house ads PropValu. |
| 22 | ✅ | **AdRenderer.jsx** — countdown, link web/WhatsApp, fallback. |
| 23 | ✅ | **Carga de creatividades** — subir JPG/PNG/MP4, preview, estado pendiente de revisión. |
| 11 | ✅ | **Consola de anunciantes** — `/anunciantes`, `/anunciantes/registro`, `/anunciantes/consola` (5 tabs). |

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
| 65 | ⏳ | **Sync Sheets → MongoDB tras enricher** — correr `/admin/mercado/sync-sheets` cuando terminen los scrapers pendientes. |
| 66 | ⏳ | **Correr scrapers pendientes** — 85 tareas: PINCALI 54, INMUEBLES24 20, MITULA 6, CASAS_Y_TERRENOS 5. Auto-enricher integrado al terminar cada portal. |
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

---

## Leyenda
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
