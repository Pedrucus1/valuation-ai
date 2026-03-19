# DOCUMENTO MAESTRO DE ARQUITECTURA Y NEGOCIO: PROPVALU (V.1.0)
> **Versión:** 1.1 — **Fecha última actualización:** 18 Mar 2026
> Este es el documento de referencia oficial. Cualquier decisión de producto, precio o arquitectura debe ser consistente con este documento.

---

## 0. MATRIZ COMPARATIVA DE PERFILES

| Elemento | Público General | Inmobiliaria Lite (<30) | Inmobiliaria Premier (30+) | Valuadores |
|---|---|---|---|---|
| **Acceso** | Prepago (1, 3, 5, 10 avalúos) | Prepago / Suscripción | Suscripción Flexible | Registro con KYC (INE + Cédula) |
| **Publicidad** | Sí (Obligatoria) | Sí (Obligatoria) | No (Limpio) | No |
| **Inteligencia** | No | Básica (Newsletter) | Full (Data Analysis) | Básica + Peritajes |
| **Costo Base** | $280 MXN | Escalonado (-3%, -4%) | Domiciliado (-5%+) | Comisión 20% |

---

## 1. DESCRIPCIÓN GENERAL DEL SISTEMA

PropValu es una plataforma nacional (México) de inteligencia y valuación inmobiliaria basada en algoritmos, que integra un ecosistema de software como servicio (SaaS) para profesionales, un marketplace de servicios periciales y un motor de publicidad (Ad-Engine) hiper-segmentado.

**Marca de agua obligatoria**: Todos los reportes generados (en todas sus hojas) deben incluir en el pie de página: *"Estimación realizada con inteligencia de PropValu"*.

---

## 2. MATRIZ DE PRECIOS — PÚBLICO GENERAL (B2C)

Usuarios únicos. Pago prepago. Visualización de anuncios obligatoria.
**Todos los precios son + IVA (16%). El precio base de $280 MXN no incluye IVA → precio final al público: $324.80 MXN.**

| Paquete | Cantidad | Precio Unitario | Descuento | Total |
|---|---|---|---|---|
| Avalúo Individual | 1 | $280.00 MXN | 0% | $280.00 |
| Paquete Bronce | 3 | $271.60 MXN | -3% | $814.80 |
| Paquete Plata | 5 | $263.45 MXN | -6% | $1,317.25 |
| Paquete Oro | 10 | $255.50 MXN | -9% | $2,555.00 |

**Servicios Adicionales (Add-ons en Checkout):**

| Add-on | Precio |
|---|---|
| Revisión y firma por Perito (remota) | +$350 MXN |
| Verificación de m² de construcción (visita física) | +$600 MXN |
| Actualización de Valor | **Gratis** si <3 meses y sin cambios de construcción |

**Flujo de Checkout:**
1. Usuario ve el rango de precio estimado
2. Pantalla de upsell: "Para mayor precisión agrega: [ ] Revisión de Perito ($350) [ ] Verificación m² ($600)"
3. 10 segundos de banner publicitario antes de descargar el PDF

**Retención de datos**: Acceso al avalúo en BD por **3 meses**.

---

## 3. MATRIZ DE PAQUETES — INMOBILIARIAS (B2B SaaS)

Acceso a Dashboard profesional, histórico de BD y generador de fichas comerciales. Pago prepago mensual (Lite) o suscripción domiciliada (Premier).

### A. Paquetes Mensuales de Avalúos

Precio base por avalúo = **$280 MXN** (mismo que Público General). Los paquetes aplican descuento sobre ese precio base.

| Nivel | Avalúos/mes | Precio unitario | Total mensual | Beneficios adicionales | Publicidad |
|---|---|---|---|---|---|
| Lite 5 | 5 | $271.60 (-3%) | **$1,358 MXN/mes** | Dashboard, Ficha básica | Con publicidad |
| Lite 10 | 10 | $268.80 (-4%) | **$2,688 MXN/mes** | Dashboard, Ficha básica | Con publicidad |
| Pro 20 | 20 | $266.00 (-5%) | **$5,320 MXN/mes** | Dashboard, Ficha, Newsletter | Con publicidad |
| Premier 30–50+ | 30+ (flexible) | Precio especial negociado | Domiciliado | Sin publicidad, Data Analysis mensual | Sin publicidad |

### B. Paquetes de Visita Física (Perito en sitio)

Precio base = **$580 MXN** por visita (+ IVA).

| Paquete | Visitas | Precio unitario | Total | Descuento |
|---|---|---|---|---|
| Visita Única | 1 | $580.00 | $580.00 | 0% |
| Pack 5 Visitas | 5 | $562.60 | $2,813.00 | -3% |
| Pack 10 Visitas | 10 | $551.00 | $5,510.00 | -5% |

### C. Avalúos adicionales mid-ciclo

Si una inmobiliaria se queda sin avalúos disponibles antes de que termine el mes, puede comprar más unidades (sueltas o en paquete) al **mismo precio unitario del plan que tiene activo ese mes**. No cambia de plan, solo amplía su consumo puntual.

**Avalúos no usados al final del mes: se pierden.** No hay rollover.

### D. Reuso de Base de Datos Histórica

- **Avalúo de +3 meses de antigüedad**: Se cobra avalúo normal + actualización de valor.
- **Avalúo de -3 meses de antigüedad**: Cuota de recuperación de datos = **$80 MXN** para brandeo con logo del broker y generación del reporte.

### E. Onboarding — Primer mes

Sin periodo de prueba. Al registrarse y realizar su primera compra, la inmobiliaria recibe **3 opiniones de valor gratuitas** válidas durante su primer mes. Si no las usa, se pierden.

---

## 4. PERFIL VALUADOR PROFESIONAL (Partners / Marketplace)

- **Rol en el ecosistema**: Proveedor de servicios (no cliente pagador). Recibe trabajos asignados por la plataforma.
- **Registro con KYC**: INE + Cédula Profesional. Validación anual obligatoria.
- **Sin publicidad**: Los valuadores no ven anuncios en la plataforma.
- **Comisión PropValu**: 20% sobre cada servicio asignado (revisión remota o visita física).
- **Pago al Valuador**: 80% del costo del servicio — automatizado vía módulo financiero mensual.
- **Inteligencia**: Newsletter básica + acceso a datos de peritajes en su zona.
- **Listado**: Público, segmentado por Estado y Población.
- **Dashboard**: Logo, teléfono, email. Historial de trabajos y ganancias. Acceso a volumen de propiedades similares en su zona.

### Asignación de Trabajos

- **Criterio geográfico**: El trabajo se asigna a valuadores activos en la **misma población** que la propiedad.
- **Algoritmo**: Si hay varios valuadores disponibles en la zona, se asigna en **sistema de ruleta** (round-robin) o al **más cercano geográficamente**.
- **SLA de respuesta**: El valuador debe aceptar o rechazar el trabajo en **máximo 24 horas**.
- **Si no responde en 24h**: El trabajo se reasigna automáticamente al siguiente valuador en la cola.

### Sistema de Calificación (Reputación)

Los clientes califican al valuador al recibir el servicio. Escala: **Buena / Regular / Mala**.

| Calificación | Acción |
|---|---|
| Buena | Sube en el ranking de asignación |
| Regular | Sin penalización inmediata, se registra |
| Mala (1er strike) | Advertencia en el perfil |
| Mala (2do strike) | Segunda advertencia, revisión interna |
| Mala (3er strike) | **Cancelación de la alianza con PropValu** |

Las calificaciones son visibles en el listado público del valuador.

---

## 5. MOTOR PUBLICITARIO (AD-ENGINE)

Cualquier usuario, empresa o inmobiliaria puede comprar espacio publicitario.

**Segmentación**: Local (Municipio) / Estatal / Federal.

**Formatos**: Video con sonido o imagen estática (el sistema convierte imágenes en video con transiciones básicas).

### Slots de Visualización

| Slot | Duración disponible | Notas |
|---|---|---|
| Búsqueda de Comparables | 60 segundos totales | Mix de hasta 4 anuncios. Obligatorio para todos. |
| Generación de HTML | 10 segundos | Pantalla de carga |
| Descarga de PDF | 10 segundos | Banner antes de descarga. La publicidad NO va dentro del PDF. |

### Tarifas por Impresión

| Duración | Costo por Impresión |
|---|---|
| 15 segundos | $5.00 MXN |
| 30 segundos | $20.00 MXN |
| 60 segundos | $30.00 MXN |

**Backfill (House Ads)**: Si no hay anuncios pagados en inventario para una zona, el sistema llena automáticamente el espacio con "Anuncios de Cajón" de la marca PropValu: consejos inmobiliarios, noticias del mercado, temas de utilidad para el usuario. **Nunca hay pantalla vacía.**

**Publicidad en PDF — REGLA IMPORTANTE**: La publicidad **NO va incrustada dentro del PDF** del cliente. El banner publicitario aparece únicamente en pantalla mientras el archivo se está descargando (durante los 10 segundos del slot de descarga).

**Alta de Anunciante**: Requiere cuenta registrada con: nombre de empresa, giro, dirección, datos del SAT (RFC). Se necesita confiabilidad y trazabilidad de quien pone publicidad en la plataforma.

**Gestión**: Los anunciantes registrados compran y gestionan sus campañas desde su consola.

---

## 6. FICHAS DE PROMOCIÓN (Herramienta Exclusiva Inmobiliaria)

Funcionalidad exclusiva para Inmobiliarias desde su dashboard. Se genera a partir de un avalúo existente.

**Output**: JPG (para redes sociales) o PDF (para envío digital / impresión).

**Contenido de la ficha:**
- **Valor**: El broker elige con qué precio salir al mercado — Mínimo, Medio o Máximo del rango calculado por PropValu.
- **Foto de portada** + galería de fotos de la propiedad.
- **Datos generales**: tipo de inmueble, m², recámaras, baños, estacionamiento, nivel, antigüedad.
- **Ubicación**: colonia, municipio, estado. Mapa de referencia.
- **Beneficios de la zona**: escuelas, hospitales, transporte, comercios cercanos.
- **Branding del broker**:
  - Logo de la agencia inmobiliaria.
  - Foto del broker.
  - Nombre, teléfono, email, redes sociales.
- **Pie de página obligatorio**: *"Tecnología Inmobiliaria PropValu"*

**Incluida en el plan**: La ficha no tiene costo adicional — está incluida en cualquier paquete de inmobiliaria. Es una impresión de **1 hoja** tipo resumen comercial.

**Flujo**: Avalúo completado → botón "Generar Ficha Comercial" → selección de valor (mín/med/máx) → personalización → descarga JPG o PDF.

---

## 7. INTELIGENCIA DE MERCADO Y NEWSLETTER

| Entrega | Contenido | Acceso |
|---|---|---|
| Semanal | Newsletter: noticias, actualizaciones, novedades del sector | Todos los profesionales registrados |
| Mensual | Data Analysis: tableros de inteligencia por zona, tendencias, comportamiento. **Contenido por definir.** | Gratis para Premier (30+). **$380 MXN** para otros perfiles. |

---

## 8. BACKEND, PAGOS Y REGLAS LEGALES

**Métodos de Pago**: Tarjeta (pasarela digital), SPEI, OXXO, Mercado Pago.

**Política de Reembolsos**: NO devoluciones. Solo ticket de verificación si el cliente alega error de cálculo de la plataforma.

**Política de Morosidad**: Inmobiliaria o Valuador que deja de pagar → acceso bloqueado en máximo **30 días**.

**Contabilidad (Payouts)**: Módulo financiero para llevar contabilidad mensual de valuadores y automatizar depósitos del 80%.

**Super Admin**: PropValu tiene acceso total para auditar solicitudes, cuentas, altas, anuncios y uso de la base de datos.

**Privacidad**: Los datos recopilados son **datos de inmuebles** (ubicación, superficie, características físicas), NO datos personales del usuario. No se almacena nombre, email ni información identificable del solicitante. El modelo es similar al de los portales inmobiliarios (Inmuebles24, Lamudi, etc.) que publican datos de propiedades sin que eso constituya tratamiento de datos personales. Se requiere una Política de Privacidad estándar de portal inmobiliario, no una de datos sensibles. PropValu tiene acceso "Super Admin" para auditar solicitudes, cuentas, altas, anuncios y uso de la base de datos.

---

## 9. ESTADO DE IMPLEMENTACIÓN (18 Mar 2026)

| Módulo | Estado |
|---|---|
| Formulario de valuación (stepper 3 pasos) | ✅ Implementado |
| Cálculo CNBV/SHF/INDAABIN | ✅ Implementado |
| Búsqueda de comparables (Serper + Gemini) | ✅ Implementado |
| Reporte PDF con metodología | ✅ Implementado |
| Edición de factores INDAABIN (valuador) | ✅ Implementado |
| Dashboard con historial y gráficas | ✅ Implementado |
| Google OAuth + sistema de roles | ✅ Implementado |
| Landing con 3 modos (público/valuador/inmobiliaria) | ✅ Implementado |
| BenefitsPage con pricing correcto | ✅ Implementado |
| Advertencia informativa en formulario | ✅ Implementado |
| **Pagos (Stripe/OXXO/SPEI/MP)** | ❌ Pendiente |
| **Ad-Engine (slots publicitarios)** | ❌ Pendiente |
| **Fichas de Promoción (JPG/PDF)** | ❌ Pendiente |
| **Newsletter / Inteligencia de Mercado** | ❌ Pendiente |
| **Módulo financiero / Payouts valuadores** | ❌ Pendiente |
| **Registro y verificación de valuadores (INE + Cédula)** | ❌ Pendiente |
| **Base de datos histórica pública** | ❌ Pendiente |
| **Checkout con upsells** | ❌ Pendiente |

---

## 10. PENDIENTE — REQUIERE DEFINICIÓN FUTURA

- **Contenido del Data Analysis mensual**: Qué métricas, dimensiones geográficas y visualizaciones incluirá el reporte mensual de inteligencia de mercado. Se define cuando se llegue a implementar ese módulo.
- **Registro de valuadores**: ¿La verificación de INE/Cédula es manual (aprobación por admin) o automatizada? Por definir al implementar el módulo KYC.
- **Precio de visitas físicas con IVA**: $580 base + IVA = **$672.80 MXN** precio final al público. Confirmar si aplica igual.
