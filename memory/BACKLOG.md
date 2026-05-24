# PropValu — Backlog de Tareas
> **Última actualización:** 23 May 2026 — Motor Romina: **100% ±20%** (38/38 OPIs calibrados), error promedio 9.8%. Set extendido 80 OPIs: 61.3% ±20%. build_colonias_similares.js corrido, 6 similares actualizadas con DeepSeek.
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
| 65 | ⏳ | **Sync Sheets → MongoDB tras enricher** — correr `/admin/mercado/sync-sheets` cuando terminen los scrapers pendientes. |
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

---

## Motor de Valuación IA (Modulo Drive IA)

| # | Estado | Tarea |
|---|---|---|
| 70 | ✅ | **Romina-Scraper como motor principal** — Homologación Directa $/m²C con comps del scraper. 6/9 casos en Guadalajara dentro de ±20% error. Archivos: `comparar_metodologias.js`, `validador_masivo.js` |
| 71 | ✅ | **Selección de comps corregida** — Sigue reglas de `sheets_comparables.py`: tipo coincidente, m²C exigido, área ±50%, CUS ±35%, top 10 por similitud. CONSOLIDADO tab como fuente única. |
| 72 | ✅ | **Anti-remate bidireccional** — Filtro ±40% de mediana (antes solo filtraba abajo). Descarta remates Y colonias caras que distorsionan. |
| 73 | ✅ | **Gemini como fallback** — `test_gemini_comps.js` implementado. Miguel Hidalgo: +19.7% con Gemini vs +47% con scraper. Las Conchas y Lagos de Oriente requieren más trabajo. |
| 79 | ✅ | **Motor calibrado en 40 OPIs — 31/40 ±20%, error promedio 12.6%** — Mejoras: factorRH dinámico por conservación, prima vivienda pequeña (<65m²C), Beta-OPI preferido cuando colonia es vaga, factor obsolescencia urbana terreno (edad>30 + CUS<0.85). DeepSeek como agente primario de análisis. Script `deepseek_dev.js` creado. |
| 80 | ✅ | **Comparar metodología perito vs motor propio vs precio real scraper** — `comparar_10_scraper.js`: 10/10 en ±20%, error 11.8%. Motor Romina gana al método perito en todos los casos. |
| 74 | ✅ | **Base de datos de colonias similares** — `build_colonias_similares.js` corrido exitosamente con 712 OPIs. 0 colonias nuevas (ya existían todas), 3 actualizadas. colonias_similares.json tiene 1052 entradas. |
| 75 | 🔄 | **Revisar enricher del scraper** — Cobertura actual: PINCALI 98% ✅, CYT 81% ✅, MITULA 94% ✅, VIVANUNCIOS 56% ⚠️, INMUEBLES24 0% ❌, PROPIEDADES_COM 13% ❌. Pendiente: enriquecer INMUEBLES24 y PROPIEDADES_COM (Chrome CDP). |
| 82 | ✅ | **Fix m2_terreno en scraper Mitula** — Corregido en `mitula.py`. |
| 83 | ✅ | **Scheduler mensual corregido** — `run_mensual.ps1` con ruta, Python correcto y PROPIEDADES_COM. |
| 84 | ✅ | **MongoDB-first en scheduler.py** — Escribe MongoDB primero, Sheets secundario. |
| 76 | ✅ | **Afinar Romina** — **100% ±20%** (38/38 OPIs calibrados), error promedio 9.8%. Set extendido 80 OPIs: 61.3% ±20%. Fixes: build_colonias_similares.js, 6 similares actualizadas. Fallos en set extendido: colonias vagas, IDX antiguo, ejidales. |
| 87 | ✅ | **optimizar_similares_ds.js** — Script que detecta fallos >20% y pide a DeepSeek las colonias similares óptimas del IDX. Flags: --apply para guardar cambios. |
| 88 | ⏳ | **Ampliar validación y calibración** — Set extendido 80 OPIs tiene 61.3% ±20%. Mejorar: (1) limpiar colonias vagas en cerebro_datos 2025, (2) afinar similares para Vista Hermosa, Villas de la Hacienda (Zapopan pool general inflado), (3) sumaDePartes con NSE filter para Hogares Nuevo México (+220%). |
| 77 | ✅ | **Integrar Romina al backend** — `motor_romina_api.js` + endpoint en server.py. NO integrar en producción hasta mejorar error (ver nota en project_motor_valuacion). |
| 81 | ✅ | **Migrar a cache_index.json** — IDX[muni][tipo] 1.6MB vs 50MB anterior. |
| 78 | ✅ | **Re-extraer cerebro con colonias de comparables correctas** — Completado 22-may. 712 OPIs recuperados. build_colonias_similares.js corrido. |
| 85 | ⏳ | **actualizar_cerebro.js optimizado** — Escanea solo últimos 3 meses en lugar de todo Drive. Soporte `--meses N`. Merge de manifiesto (no reemplaza). |
| 86 | ⏳ | **avaluos_referencia.json** — 1164 OPIs con direccionMaps extraída del Cotizador (Sheets perito). Usar para enriquecer sujetoColonia del cerebro cuando el extractor no la encuentre. |

---

## Leyenda
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
