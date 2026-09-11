# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 11 Sep 2026 (sesión 2)
**Fase:** Sistema de créditos prepago + checkout por transferencia (#192) construido y verificado end-to-end sobre el rol Inversionista (#191, sesión 1). Backend local reiniciado durante ambas sesiones (PID puntual, enrichers a salvo). Frontend local seguía corriendo de una sesión anterior del usuario en :3001, no se tocó/mató.
**Sin pushear a Vercel/producción todavía** — cambios de ambas sesiones solo en local, sin commitear.

## 🔥 LO MÁS CALIENTE — qué sigue

1. **#192 CERRADO — Créditos prepago + checkout por transferencia (11-sep, sesión 2).** Reemplaza la idea original de cobro suelto $380/flip: ahora se compran paquetes (o 1 crédito suelto) por transferencia, usables para Flipping y/o OPI. `creditos_ledger` (ya existía en `User`) gana campo `uso` por entrada ("cualquiera"|"flipping") — `core/creditos.py`: `saldo_efectivo(uso=...)` filtra, `gastar_credito()` nuevo (decremento atómico), `otorgar_credito()` acepta `uso`. Nuevo `CreditPurchase` (`models.py`) + router `backend/routers/creditos_compra.py`: `PAQUETES_CREDITOS` (flip_1=1cr/$380 solo-flipping; chico=3cr/$1100, mediano=7cr/$2400, grande=15cr/$4800, mixtos — precios placeholder) + `DATOS_BANCARIOS` desde env (`BANK_CLABE`/`BANK_BANCO`/`BANK_BENEFICIARIO`, placeholder si no están seteadas). Flujo: `POST /creditos/comprar` (sin sesión → crea investor sin password vía `crear_usuario_investor_publico` en `auth.py`, nuevo helper compartido `crear_sesion()` también extraído de register/login) → `POST /creditos/compras/{id}/comprobante` (upload, mismo patrón que `kyc.py`, guarda en `uploads/comprobantes/`) → correo a `ADMIN_EMAIL` → admin confirma/rechaza manualmente en `/admin/creditos` (nuevo `AdminCreditos.jsx`, patrón `AdminKYC.jsx`) → `otorgar_credito`. **Gate nuevo** `POST /api/creditos/consumir` (uso="opi"|"flipping") wireado en `FlippingCalculatorPage.jsx` (antes de "Generar reporte") y `ReportPage.jsx` (antes de generar reporte OPI) — 402 abre `CreditosCheckoutModal.jsx` nuevo (reusable). **Solo aplica a role público/investor** — appraiser/realtor pasan sin tocar créditos (verificado). Bug real encontrado y corregido en vivo: `otorgar_credito` guardaba `uso="mixto"` literal (el `tipo` del paquete) en vez de traducirlo a `uso="cualquiera"` que es lo que `saldo_efectivo`/`gastar_credito` esperan — comprar un paquete mixto bloqueaba el uso para OPI hasta el fix. Verificado 100% end-to-end en vivo (segunda pasada, a pedido del usuario): compra real en `/flipping` (paquete flip_1, $380) → comprobante subido vía API con el `purchase_id` real capturado del request del navegador → admin real (cuenta de prueba temporal con password, creada y borrada en la misma sesión, nunca quedó en la DB) inició sesión en `/admin/creditos` por la UI real, vio la solicitud, abrió el comprobante (200 OK) y confirmó con un clic → `/dashboard/investor` → Perfil mostró "Créditos disponibles: 1" reflejando el crédito recién aplicado. **Pendiente real, no resuelto:** datos bancarios y precios son placeholder, sin integración bancaria (100% confirmación manual).
2. **#190 CERRADO — `/flipping` rehecho de punta a punta (10-sep, 14 commits `5e637ca`…`66d03ac`).**
   - **ARV real:** "Calcular valor de mercado" crea una OPI con edad 0 y llama al motor
     (`calculate-remi`), mostrando mín/prom/máx real (antes era 100% manual).
   - **Paridad con la OPI:** `LocationMap`/`compressImage` extraídos a `components/`+`lib/`
     compartidos (antes solo vivían dentro de `ValuationForm.jsx`); selector Casa/Depto;
     mapa con pin; hasta 4 fotos con selección de fachada igual que el flujo real (subes
     fotos, luego eliges cuál es fachada desde las miniaturas — no una caja de subida
     aparte, eso fue un fix en vivo tras queja del usuario).
   - **Captura:** `MoneyInput` ($ + miles) en todos los montos; `DynamicMoneyList` nuevo
     (botón "+") para deudas/remodelación/gestión libres; ISR (35% ganancia fiscal),
     escrituración (2% ARV) e ISAI (4% compra) autocalculados pero editables.
   - **Nuevo — "Retorno para el inversionista":** ROI del flip, ROI anualizado, gráfica de
     pastel del desglose (recharts) y gráfica de barras ROI-vs-meses-para-vender, ambas en
     vivo según el campo "tiempo para vender".
   - **Nuevo — reporte:** botón "Generar reporte" (reemplazó "Guardar cálculo", ahora
     autoguardado silencioso solo si hay sesión) abre vista previa escalable de un PDF
     carta de 2 hojas (`flippingReportHtml.js`), mismo header/folio que la OPI real
     (`FLI-YYMMDD-TIPO[-SIGLAS]-NN`).
   - **3 bugs reales cerrados verificando el PDF descargado de verdad (no solo la vista
     previa):** texto aplastado por `font-weight:800` sobre una fuente sin ese peso
     cargado (html2canvas malcalcula anchos con fuente sustituida); media hoja en blanco
     en la portada (llenada con resumen de la operación); y el más importante —
     **el espaciado "aperrado" que el usuario reportó 4+ veces no era caché ni percepción:
     el preview del navegador envuelve cada `.map()` en un `<span
     style="display:contents" data-ve-dynamic>` de instrumentación, que rompe
     `space-y-*` de Tailwind (no atraviesa el span) pero no rompe `gap` de flex/grid.**
     Cambiado a `flex gap-*` en Deudas y en `DynamicMoneyList.jsx`. **Ojo para cualquier
     lista futura renderizada con `.map()` en este entorno de preview: usar `gap`, nunca
     `space-y`/`space-x`.**
   - **Pendiente, sin resolver, preguntas hechas sin respuesta aún:** usuario
     "Inversionista" que se dé de alta sin contraseña (no hay rol paswordless hoy —
     `RegisterRequest` siempre pide contraseña) + cobro de $380 neto por flip vía
     transferencia bancaria (sin datos de cuenta todavía) + integrar la opción en los
     paneles existentes según tipo de usuario. Investigación ya hecha: no hay patrón de
     transferencia/OXXO/SPEI en el código, `recharts` ya instalado, dashboards siguen
     patrón de tabs con `/auth/me`.
2. **#189 CERRADO — Railway backend con auto-deploy real (10-sep tarde).** Root
   Directory de vuelta a la raíz del repo + Start Command `cd backend && uvicorn
   server:app --host 0.0.0.0 --port $PORT` (el Dockerfile asume contexto=raíz). Ahora un
   push a `main` despliega solo, en ambos servicios (Vercel + Railway).
3. **#187 CERRADO del todo — CETES real vía Banxico**, token cargado en `.env`+Railway+
   `credentials_registry.md`.
4. **#188 CERRADO — colisión de NSE entre colonias homónimas de distinto municipio**,
   `construir_maestro.js` indexa también por `nombre|municipio`. Commit `283123d`.
5. **#184 casi cerrado (solo falta d, NSE de terreno — sin decidir, no urgente).**
6. **Regex prohibido sin corregir — ESPERAR a que termine el scraping activo** antes de
   tocar `scrapear_propiedades_com_urls.js`/`vivanuncios_detalle.py` (pedido explícito).

## ⏳ Pendientes de sesiones anteriores (sin tocar hoy, siguen abiertos)
- #185 bóveda de respaldo: falta pantalla de admin, tarifa de descarga suelta, `SMTP_*` real.
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- #34 Email notifications (SendGrid/SMTP) — mismo hueco que SMTP del vault.
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://frontend-rosy-six-74.vercel.app — auto-deploy conectado (GitHub App + git link en proyecto "frontend" de Vercel).
- **Backend API:** https://propvalu-backend-production.up.railway.app — auto-deploy conectado 10-sep. `/api/health` verificado en vivo.
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
