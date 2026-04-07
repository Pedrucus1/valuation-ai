# PropValu — Backlog de Tareas
> **Última actualización:** 7 Abr 2026
> Actualizar este archivo conforme se completen tareas. Marcar con ✅ cuando esté lista, con 🔄 cuando esté en progreso.

---

## Flujo de Usuario / Cobro

| # | Estado | Tarea |
|---|---|---|
| 1 | ✅ | **Checkout público general** — flujo: formulario pasos 1-2-3 → paso 4 (pago integrado en ValuationForm) → ads → análisis. Paquetes Individual $280, Bronce $815, Plata $1,317, Oro $2,555 + IVA. También disponible en `/comprar` como entrada opcional previa. |
| 8 | ✅ | **Checkout con upsells** — add-ons Revisión por Perito +$350 y Verificación de m² +$600 en `PricingPage`. |
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
| 3 | ✅ | **Páginas legales** — `/privacidad`, `/terminos`, `/contacto`, `/terminos-anunciantes`, `/terminos-valuadores`, `/terminos-inmobiliarias`. |
| 4 | ✅ | **Registro y login** — email+password, bcrypt, cookie sesión, redirect por rol. |
| 25 | ✅ | **Registro valuador — paso 2** — ModoSelector (básico/afiliado), servicios, cobertura multi-municipio, años de experiencia con medalla preview (🥉🥈🥇). |
| 26 | ✅ | **Registro valuador — paso 3** — docs con hints explicativos, `comprobante_experiencia` obligatorio (título maestría / avalúo fechado / carta colegio), cédula profesional (arq/ing verificable en DGP-SEP), términos y privacidad con checkbox. |
| 27 | ✅ | **Subida de docs al registrarse** — `handleRegister` sube cada archivo a `/kyc/upload` tras crear cuenta usando la cookie recién generada. |
| 28 | ✅ | **Programa afiliado en ModoSelector** — opción "completo" se expande mostrando beneficios (80% comisión, encargos, medallitas), compromisos (SLA 24h) y requisitos (docs + entrevista). |
| 9 | 🔄 | **KYC valuadores** — expediente por etapas (pendiente→listo→revision→aprobado), botón solicitar entrevista. Admin puede Ver y Ratificar cada documento. |

---

## Dashboards

| # | Estado | Tarea |
|---|---|---|
| 5 | ✅ | **Dashboard Valuador** — tabs: Resumen, Valuaciones, Perfil, Mi expediente. PlanCard al entrar muestra plan/precio/créditos. Medalla de experiencia en header y perfil. |
| 6 | ✅ | **Dashboard Inmobiliaria** — tabs: Resumen, Valuaciones, Equipo, Documentos, Perfil. PlanCard con planes Básico/Estándar/Premier. |
| 20 | ✅ | **Panel Admin** — 17 módulos. Verificación (AdminKYC) con botón "Ratificar" por documento. |

---

## Sistema de Credenciales (Medallitas)

| # | Estado | Tarea |
|---|---|---|
| 30 | ✅ | **BADGE_DEFS** — cada `doc_tipo` mapea a credencial (identidad 🪪, cédula 🎓, e.firma ✍️, experiencia 📅, seguro RC 🛡️, domicilio 🏠, recomendado ⭐, CV 📄, avalúos 📊). |
| 31 | ✅ | **Ratificación por admin** — `POST /admin/kyc/ratificar/{doc_id}` cambia `estado:"ratificado"` en MongoDB. Botón en AdminKYC. |
| 32 | ✅ | **Badges en dashboard** — sección "Credenciales verificadas" aparece cuando hay al menos una ratificada. Cada fila de doc muestra pill "Ratificado" si aplica. |
| 33 | ✅ | **Medallitas en directorio público** — 5 burbujas circulares emoji (🎓📅✍️🛡️📊), sin texto, con tooltip. Medalla de experiencia 🥇🥈🥉 reemplaza chip de años. |

---

## Features de Negocio

| # | Estado | Tarea |
|---|---|---|
| 10 | ⏳ | **Fichas de Promoción para Inmobiliarias (JPG/PDF)** |
| 12 | ⏳ | **Módulo financiero / Payouts valuadores** — 80% valuador / 20% PropValu, asignación round-robin, SLA 24h. |
| 13 | ⏳ | **Sistema de calificación de valuadores** — escala Buena/Regular/Mala, strikes. |
| 14 | ⏳ | **Base de datos histórica de avalúos** — reutilización <3 meses $80 MXN. |
| 15 | ⏳ | **Newsletter e Inteligencia de Mercado** |
| 21 | ✅ | **Google Sheets como fuente de comparables** — scraper conectado. |
| 34 | ⏳ | **Email notifications** — confirmación entrevista, resultado, bienvenida (SendGrid). |
| 35 | ⏳ | **WhatsApp notifications** — mismos triggers (Twilio). |

---

## Skills y Herramientas Dev

| # | Estado | Tarea |
|---|---|---|
| 36 | ✅ | **Skills globales** — `/backup` (commit seguridad), `/recordar` (guardar aprendizaje a memoria). |
| 37 | ✅ | **Skills PropValu** — `/status` (backend/frontend/git en <15 líneas). |
| 38 | ✅ | **Skills Scraper** — `/logs` (log de hoy + buffer), `/reset-scraper PORTAL`. |

---

## QA / PDF

| # | Estado | Tarea |
|---|---|---|
| 17 | ⏳ | **Marca de agua PropValu en PDF** |
| 18 | ⏳ | **Pruebas y ajustes finales del PDF** |

---

## Leyenda
- ⏳ Pendiente
- 🔄 En progreso
- ✅ Completado
