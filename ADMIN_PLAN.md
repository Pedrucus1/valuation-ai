# PropValu — Plan Super Admin Panel + Páginas Pendientes
_Última actualización: 2026-03-20_

---

## Contexto

Este documento recoge el análisis completo del Super Admin Panel y todas las páginas/módulos pendientes de implementar en PropValu. Se redactó antes de iniciar el desarrollo para servir como referencia en futuras sesiones.

---

## Páginas frontend pendientes

| Ruta | Descripción | Iteración |
|---|---|---|
| `/terminos-valuadores` | Términos de servicio específicos para valuadores | 1 |
| `/codigo-etica-valuadores` | Código de ética profesional (basado en INDAABIN) | 1 |
| `/terminos-inmobiliarias` | Términos de servicio para inmobiliarias | 1 |
| `/valuadores` | Directorio público de valuadores verificados | 1 |
| `/feedback` | Quejas y sugerencias (público) | 1 |
| `/valuador/red` | Directorio interno para valuadores logueados | 2 |
| `/politica-anuncios` | Política de contenido de anuncios (separada de T&C) | 2 |
| `/admin/*` | Panel completo (ver módulos abajo) | 1–4 |

---

## Endpoints backend pendientes

| Área | Endpoints |
|---|---|
| `/api/admin/*` | Todos los endpoints del panel admin |
| `/api/kyc/valuador` | Upload, listado y gestión de documentos KYC |
| `/api/kyc/inmobiliaria` | Upload, listado y gestión de documentos KYC |
| `/api/feedback` | Crear, listar, actualizar estado de quejas/sugerencias |
| `/api/broadcast` | Envío masivo de emails segmentados (SendGrid/Resend) |
| `/api/cfdi` | Integración Facturama para timbrado CFDI 4.0 |
| `/api/zonas-cobertura` | CRUD de cobertura geográfica por capa |
| `/api/directorio/valuadores` | Listado público filtrable de valuadores |
| `/api/notificaciones` | Notificaciones in-app para valuadores |

---

## Plan de implementación por iteraciones

### Iteración 1 — Funcional desde el día 1
- Dashboard + KPIs
- Gestión de usuarios (ver, suspender, cambiar plan)
- Cola KYC valuadores + inmobiliarias (revisar docs, aprobar/rechazar)
- Moderación de anuncios (aprobar/rechazar contenido)
- Roles de admin + login protegido
- Páginas legales: `/terminos-valuadores`, `/terminos-inmobiliarias`, `/codigo-etica-valuadores`
- Directorio público `/valuadores`
- Página de quejas `/feedback`

### Iteración 2 — Operaciones
- Panel de quejas y sugerencias en admin
- Directorio admin de valuadores (completo con filtros)
- Comunicación / broadcast email (SendGrid)
- Notificaciones in-app
- Monitor del scraper
- Editor legal CMS (términos, privacidad, código ética)
- `/valuador/red` — directorio interno para valuadores

### Iteración 3 — Finanzas y cobertura
- Fiscal / CFDI (Facturama API)
- Cobertura geográfica (tabla + mapa de vista previa)
- Reportes de ingresos exportables (CSV/Excel)
- Blacklist de palabras/dominios prohibidos en anuncios

### Iteración 4 — Inteligencia y control avanzado
- Alertas automáticas (pago fallido, valuador inactivo, scraper caído)
- A/B de precios (cambiar sin deploy)
- Modo mantenimiento global
- Analytics de ads (impresiones, clicks, CTR por slot/zona)
- Carousel de logos afiliados en Landing, InmobiliariaPage, ValuadorPage

---

## Módulos del Super Admin Panel — Detalle completo

### Módulo 1 — Dashboard operativo
- KPIs en tiempo real: valuaciones hoy/semana/mes, ingresos, valuadores activos, anuncios activos
- Gráficas: valuaciones por día (línea), ingresos por tipo (barras), distribución geográfica
- Alertas: errores del scraper, pagos fallidos, usuarios bloqueados, KYC pendientes

### Módulo 2 — Gestión de usuarios
- Tabla paginada con filtros: tipo (público/valuador/inmobiliaria/anunciante), estado, plan
- Acciones: ver detalle, suspender/reactivar, cambiar plan, ver historial de valuaciones
- Búsqueda por nombre, RFC, email, teléfono

### Módulo 3 — KYC Valuadores
**¿Qué es KYC?** Know Your Customer — verificar que el valuador tiene credenciales reales antes de activar su cuenta para firmar reportes.

**Documentos requeridos:**
- Cédula profesional (INDAABIN, IMC o equivalente)
- Título universitario (arquitectura, ingeniería civil o afín)
- INE / pasaporte
- Cédula RFC activo
- Seguro de responsabilidad civil profesional vigente
- Foto profesional (para directorio)

**Flujo:**
1. Valuador se registra → sube documentos → estado "KYC Pendiente"
2. Puede entrar al dashboard pero NO puede firmar reportes ni recibir encargos
3. Admin revisa en `/admin/kyc-valuadores` — visor de documentos integrado
4. Aprueba (estado → "Verificado ✅") o Rechaza (email automático con motivo)
5. Verificado: aparece en directorio, puede firmar, puede recibir encargos

**Panel admin `/admin/kyc-valuadores`:**
- Cola de solicitudes ordenadas por fecha
- Semáforo: 🟡 nuevo | 🔵 en revisión | 🟢 aprobado | 🔴 rechazado | 🟠 info solicitada
- Visor de documentos (PDF/imagen) integrado
- Historial de revisión por solicitud
- Botón "Solicitar información" → email automático al valuador

### Módulo 4 — KYC Inmobiliarias
Mismo concepto que valuadores pero para agencias y agentes inmobiliarios.

**Documentos requeridos:**
- INE / pasaporte del representante
- RFC activo (persona física o moral)
- Acta constitutiva (solo si es empresa)
- Constancia de afiliación AMPI / CIPS / CANACO (activa, con número de membresía)
- Certificado de curso inmobiliario: CONOCER EC0461 o equivalente estatal
- Seguro RC profesional (recomendado)
- Comprobante de domicilio del negocio (no mayor a 3 meses)
- Foto de oficina / letrero (opcional, da credibilidad en directorio)

**Asociaciones reconocidas:**
- AMPI (Asociación Mexicana de Profesionales Inmobiliarios) — más importante
- AMPI Guadalajara / AMPI Vallarta (secciones locales Jalisco)
- CIPS (Certified International Property Specialist)
- CONOCER EC0461 (estándar SEP de competencia laboral)
- CANACO local (cámaras de comercio estatales)

**Diferencias vs KYC Valuadores:**
| Aspecto | Valuadores | Inmobiliarias |
|---|---|---|
| Organismo regulador | INDAABIN, IMC, CNBV | AMPI, CONOCER, CANACO |
| Certificación clave | Cédula profesional SEP | EC0461 o membresía AMPI |
| Tipo de persona | Siempre física | Puede ser moral (empresa) |
| Resultado visible | Badge "Perito Verificado" | Badge "Inmobiliaria Verificada" |

**Flujo:** igual que valuadores. Al aprobar: aparece en directorio, logo en carousel de landing, puede recibir leads de la red.

### Módulo 5 — Moderación de anuncios + política de contenido

**Estados de campaña:** `borrador → en_revisión → activa | rechazada`
La campaña solo aparece en AdRenderer cuando está `activa`.

**Categorías de contenido restringido (administrables desde panel):**
- Contenido sexual / sugestivo ❌
- Alcohol / tabaco ❌
- Servicios financieros sin licencia (préstamos informales) ❌
- Lotería / apuestas / casinos ❌
- Contenido político (candidatos, partidos) ❌
- Inmuebles fuera de zonas con cobertura activa ❌

**Advertencias en flujo de carga (AdvertiserConsolePage):**
```
⚠️ Contenido PERMITIDO: inmuebles, servicios profesionales,
   comercios locales, eventos
🚫 Contenido PROHIBIDO: material sexual, alcohol, apuestas,
   política, préstamos sin licencia
📹 Videos: MP4/MOV, máx. 50MB, duración máx. 30s
🖼 Imágenes: JPG/PNG/WebP → se optimizan automáticamente a WebP
```

**Panel admin de moderación:**
- Queue de campañas en revisión
- Ver imagen/video + texto + URL destino
- Aprobar / Rechazar (campo motivo)
- Historial de moderación por campaña

### Módulo 6 — Fiscal / Facturación (CFDI)

**Integración recomendada: Facturama** (`api.facturama.mx`)
- REST API documentada, sandbox gratuito
- ~$1.50 MXN por CFDI timbrado
- Maneja CFDI 4.0
- Devuelve PDF y XML listos para enviar

**Requisitos previos de PropValu como emisor:**
- RFC de la empresa/persona
- CSD (Certificado de Sello Digital) del SAT — archivos `.cer` + `.key` + contraseña
- Registro como emisor en Facturama

**Flujo:**
1. Cliente paga → si solicita factura: llena RFC, nombre fiscal, código postal, uso CFDI
2. Uso CFDI por defecto: `G03 - Gastos en general`
3. Backend envía al PAC → recibe XML timbrado + PDF
4. Se guarda en BD + se envía por email al cliente

**NO hay conexión directa al SAT** — siempre se va por PAC (Proveedor Autorizado de Certificación).

**Panel admin fiscal:**
- Tabla de transacciones: fecha, cliente, concepto, monto, método pago, estado factura
- Estados de factura: `no_solicitada | pendiente | emitida | cancelada`
- Botón "Emitir CFDI" manual
- Cancelación (solo dentro de 72h o con aceptación del receptor — regla SAT 2023)
- Reporte mensual: exportar CSV con folio fiscal, fecha, RFC, subtotal, IVA, total
- Separar ingresos por concepto: valuaciones / suscripciones / anuncios

### Módulo 7 — Editor de contenido legal (CMS)

Panel para editar textos legales sin tocar código:

| Documento | Ruta pública |
|---|---|
| Términos y Condiciones generales | `/terminos` |
| Política de Privacidad general | `/privacidad` |
| Términos para Anunciantes | `/terminos-anunciantes` |
| Política de contenido de Ads | `/politica-anuncios` |
| Términos para Valuadores | `/terminos-valuadores` |
| Código de Ética Valuadores | `/codigo-etica-valuadores` |
| Términos para Inmobiliarias | `/terminos-inmobiliarias` |

**UI:** textarea con preview + historial de versiones numeradas (fecha + autor admin) + rollback.

### Módulo 8 — Cobertura geográfica

**Tres capas independientes:**
| Capa | Controla | Visible para |
|---|---|---|
| `scraper_activo` | Ciudades con datos de comparables | Valuadores, formulario público |
| `valuadores_activos` | Donde hay valuadores disponibles | Página de peritos, formulario |
| `ads_disponible` | Donde se venden slots de publicidad | Anunciantes al crear campaña |

**UI recomendada:** Tabla de municipios/estados con 3 columnas de switches toggle + filtro por estado + búsqueda. Vista previa en mapa (react-simple-maps o Leaflet + GeoJSON municipios Jalisco) con polígonos coloreados según capas activas.

**Almacenamiento:**
```json
{
  "Guadalajara": { "scraper": true, "valuadores": true, "ads": true },
  "Tonalá": { "scraper": true, "valuadores": false, "ads": true },
  "Puerto Vallarta": { "scraper": false, "valuadores": false, "ads": false }
}
```

**Uso de esta data en el frontend:**
- `AdvertiserConsolePage`: selector de zona solo muestra ciudades con `ads_disponible: true`
- `ValuadorPage` / `InmobiliariaPage`: banner con ciudades activas
- `ValuationForm`: alerta si la ciudad no tiene `scraper_activo`

### Módulo 9 — Roles de administración

| Rol | Acceso |
|---|---|
| `superadmin` | Todo — incluyendo roles, fiscal, configuración |
| `moderador` | Solo moderación de anuncios + KYC |
| `finanzas` | Solo módulo fiscal + reportes |
| `soporte` | Ver usuarios y valuaciones, sin modificar |
| `contenido` | Solo editor legal + cobertura geográfica |

**Acceso al panel:**
- URL: `/admin` — no listada en nav público
- Auth propia (no el login de usuarios normales) + TOTP (Google Authenticator)
- JWT con claim `admin_role` — middleware FastAPI verifica en cada endpoint
- Log de auditoría: quién / qué / cuándo / IP

### Módulo 10 — Monitor del scraper
- Estado de `progress.json`: completadas / pendientes / errores por portal
- Botón "Reset portal" y "Reset error tasks"
- Log de últimas ejecuciones
- Alerta si el scraper lleva +24h sin correr

### Módulo 11 — Directorio de valuadores

**Versión pública `/valuadores`:**
- Grid de cards: foto, nombre, especialidad, municipios, años de experiencia, calificación ⭐, avalúos realizados
- Filtros: municipio, especialidad (habitacional/comercial/industrial), disponibilidad
- Botón "Contactar" → WhatsApp directo o email
- Solo muestra valuadores con KYC aprobado

**Versión valuador `/valuador/red`:**
- Lista de colegas activos, zonas de cobertura, especialidades
- Útil para referir encargos fuera de su zona

**Versión admin `/admin/valuadores`:**
- Tabla completa: plan activo, RFC, estado KYC, fecha último avalúo, ingresos generados, quejas recibidas
- Filtros: estado, municipio, plan
- Acciones: ver detalle, aprobar/rechazar KYC, suspender, cambiar plan, contactar

### Módulo 12 — Comunicación con valuadores

**Canal directo:** botones WhatsApp y email en la ficha de cada valuador en admin.

**Broadcast / lista de difusión:**

| Segmento | Ejemplo de uso |
|---|---|
| Todos los valuadores activos | "Nueva funcionalidad disponible" |
| Valuadores por municipio | "Aumentó demanda en Tlaquepaque" |
| Plan Independiente | "Oferta de upgrade a Despacho" |
| KYC pendiente | "Te falta completar tu verificación" |
| Sin actividad 30+ días | "Te extrañamos..." |

**Canales por etapas:**
1. Email vía SendGrid (gratis hasta 100/día) — implementar primero
2. Notificación in-app (campana en dashboard valuador)
3. WhatsApp Business API (cuando haya 50+ valuadores activos)

### Módulo 13 — Quejas y sugerencias

**Página pública `/feedback`:**

Tipos de reporte:
- 🐞 Bug / Error técnico
- 💡 Sugerencia de mejora
- ⭐ Calificación de valuador (cliente califica al perito)
- ⚠️ Queja de valuador (mal servicio, error en avalúo)
- 📢 Queja de anuncio (contenido inapropiado)
- 🏢 Queja general del servicio

Campos: tipo, descripción (mín 50 chars), adjunto opcional, nombre+contacto, checkbox de autorización para compartir nombre.

Estados: `recibido → en_revisión → resuelto | cerrado`

**Panel admin `/admin/feedback`:**
- Tabla con filtros por tipo, estado, fecha, valuador
- Asignar a admin responsable
- Nota interna + cambio de estado
- Si es queja de valuador: link directo a su expediente KYC
- Acumulación de 3+ quejas graves → alerta automática
- Responder al usuario por email desde el panel

### Módulo 14 — Alertas y control avanzado (Iteración 4)
- Alertas automáticas: pago fallido 3+/día, valuador inactivo 30d, campaña vencida, scraper caído 24h, nuevo KYC
- Blacklist de palabras clave y dominios prohibidos en anuncios (editable desde panel)
- Modo mantenimiento global (banner en toda la plataforma)
- A/B de precios sin deploy
- Analytics de ads: impresiones, clicks, CTR por slot/zona

---

## Carousel de logos afiliados (frontend)

**Páginas donde aparece:**
- `LandingPage` — inmobiliarias + valuadores mezclados
- `InmobiliariaPage` — solo logos de inmobiliarias afiliadas
- `ValuadorPage` — solo logos de despachos/peritos afiliados

**Estilo visual (referencia: avaclick.app):**
```css
/* Logos en escala de grises para verse uniformes */
.logo-carousel img {
  filter: grayscale(100%) opacity(0.6);
  transition: filter 0.3s;
}
.logo-carousel img:hover {
  filter: grayscale(0%) opacity(1); /* color al hover */
}

/* Scroll infinito sin JS */
@keyframes scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
/* Duplicar logos en el HTML para loop seamless */
```

**Admin gestiona logos:** tabla de afiliados con nombre, logo URL, tipo, orden, activo/inactivo + upload directo.

---

## Notas técnicas importantes

### CFDI / SAT
- En México NO existe conexión directa al SAT para timbrado — siempre se usa un PAC
- PAC recomendado: **Facturama** (`api.facturama.mx`) — REST API, sandbox gratuito, ~$1.50 MXN/CFDI
- Requiere CSD del SAT (`.cer` + `.key`) del emisor (PropValu)
- Cancelación de CFDI: solo dentro de 72h o con aceptación del receptor (regla SAT 2023)

### WhatsApp Business API
- Para broadcast masivo se necesita Meta Business API — costo por mensaje (~$0.05 USD)
- Alternativa inicial: descargar CSV de teléfonos y usar WhatsApp Business manual
- Implementar cuando haya 50+ valuadores activos

### Cobertura geográfica
- La data de cobertura debe estar disponible en el frontend sin autenticación (para mostrar ciudades disponibles a visitantes)
- Sugerido: endpoint público `/api/zonas-cobertura` que devuelve solo los estados activos sin IDs internos

### Roles admin
- JWT separado del JWT de usuarios normales
- Middleware FastAPI que verifica `admin_role` en cada endpoint `/api/admin/*`
- TOTP recomendado desde el inicio (librería: `pyotp`)

---

## Estado actual del proyecto (2026-03-20)

**Ya implementado:**
- ✅ AdRenderer con countdown, fallback a house ads, link web/WhatsApp
- ✅ TerminosAnunciantesPage + descarga de declaración HTML
- ✅ PrivacidadPage, TerminosPage, ContactoPage
- ✅ Compresión WebP en AdvertiserConsolePage
- ✅ PDF report: marca de agua, orientación fotos, page breaks explícitos
- ✅ Scraper: fix encoding UTF-8, fix Mitula 404, fix CasasYTerrenos Next.js hydration

**Pendiente (empezar aquí):**
1. `/terminos-valuadores` — legal para valuadores
2. `/terminos-inmobiliarias` — legal para inmobiliarias
3. `/codigo-etica-valuadores` — código de ética
4. `/feedback` — quejas y sugerencias
5. `/valuadores` — directorio público
6. `/admin/*` — panel completo por iteraciones
