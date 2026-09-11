# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 11 Sep 2026 (sesión 3, cierre)
**Fase:** Sistema de créditos prepago (#192) + dominio propio `propvalu.com.mx` conectado en Vercel/Railway (#193) + correo con Email Routing (#194), todo verificado end-to-end. Fix de bug en perfil de entorno (sesión 3) pusheado a prod, verificación en vivo pendiente por falta de folio.

## 🔥 LO MÁS CALIENTE — qué sigue

0. **Bug real fijo (11-sep, sesión 3) — "Perfil del Entorno" vs "Calificación del Entorno" contradictorios (reportado por el usuario en la OPI de El Roble).** `nearby_places.py` devuelve `count` como STRING (`"0"`, `"1"`, `"3+"`); en `server.py` la corrección honesta que baja `score`/`texto` cuando Places confirma 0 lugares cercanos usaba `if not _data["count"]:` — `"0"` es truthy en Python, así que esa rama NUNCA se ejecutaba. Resultado real: "Perfil del Entorno" mostraba el conteo real (0 cercanos) pero "Calificación del Entorno" se quedaba con el score/texto inventado por Gemini ANTES de conocer Places ("amplia oferta de supermercados" en zona rural). Fix de una línea: `if _data["count"] in ("", "0"):` en `backend/server.py` (línea ~2096). Commiteado y pusheado (`9e4d800`, solo ese archivo) — Railway auto-deploy debería tomarlo. **Pendiente real: verificar en vivo contra el reporte de El Roble** — no se pudo porque el usuario no dio el folio/link y jalar la Mongo de producción (`cluster0.9eliadx.mongodb.net`) o las variables de Railway para eso quedó bloqueado por el clasificador de permisos (pull de credenciales de prod) y por reglas de seguridad (no crear cuentas ni loguearse con contraseña ajena). Cuando el usuario pase el link/folio, abrir el reporte público (no requiere login) y confirmar que ambas secciones ya coinciden.
1. **#194 CERRADO — Dominio propio + correo (11-sep, cierre sesión 2).** El usuario compró `propvalu.com.mx`. DNS gestionado en **Cloudflare** (cuenta `propvalu.contacto@gmail.com`): 3 registros CNAME agregados (`@`→Vercel, `www`→Vercel, `api`→Railway). **Bug real encontrado y arreglado:** el Root Directory del proyecto `frontend` en Vercel estaba en `./` (raíz del repo, que tiene un `package.json` viejo de un backend Node/Express abandonado con puppeteer) — el build instalaba ESE paquete y fallaba con `react-scripts: command not found`. Corregido a `frontend` (el repo de GitHub `Pedrucus1/valuation-ai` YA tiene como raíz lo que localmente es `Pagina-Valuacion-con-Ai--main/`, ojo con esa diferencia de nombres al dar rutas). Redeploy manual disparado, quedó `READY`. **Verificado en vivo:** `https://www.propvalu.com.mx` responde 200. `api.propvalu.com.mx` (Railway, dominio custom generado vía MCP) seguía sin resolver al cerrar sesión — certificado SSL de Railway puede tardar más en propagar, el sitio sigue funcionando mientras tanto por `propvalu-backend-production.up.railway.app`. **Email Routing en Cloudflare activado** (MX+SPF+DKIM agregados automático con "Add missing records"): 5 direcciones activas — `ventas@`, `soporte@`, `notificaciones@`, `admin@`, `contacto@propvalu.com.mx`, todas reenviando a `propvalu.contacto@gmail.com` (auto-verificada por ser la cuenta dueña). **Pendiente real:** el usuario pidió que cada dirección caiga en su propia carpeta/etiqueta de Gmail — falta crear los filtros de Gmail (`to:ventas@propvalu.com.mx` → etiqueta "Ventas", etc.), no se hizo por falta de tiempo/tokens en la sesión.
2. **#192 CERRADO — Créditos prepago + checkout por transferencia (11-sep, sesión 2).** Reemplaza la idea original de cobro suelto $380/flip: ahora se compran paquetes (o 1 crédito suelto) por transferencia, usables para Flipping y/o OPI. `creditos_ledger` (ya existía en `User`) gana campo `uso` por entrada ("cualquiera"|"flipping") — `core/creditos.py`: `saldo_efectivo(uso=...)` filtra, `gastar_credito()` nuevo (decremento atómico), `otorgar_credito()` acepta `uso`. Nuevo `CreditPurchase` (`models.py`) + router `backend/routers/creditos_compra.py`: `PAQUETES_CREDITOS` (flip_1=1cr/$380 solo-flipping; chico=3cr/$1100, mediano=7cr/$2400, grande=15cr/$4800, mixtos — precios placeholder) + `DATOS_BANCARIOS` desde env (`BANK_CLABE`/`BANK_BANCO`/`BANK_BENEFICIARIO`, placeholder si no están seteadas). Flujo: `POST /creditos/comprar` (sin sesión → crea investor sin password vía `crear_usuario_investor_publico` en `auth.py`, nuevo helper compartido `crear_sesion()` también extraído de register/login) → `POST /creditos/compras/{id}/comprobante` (upload, mismo patrón que `kyc.py`, guarda en `uploads/comprobantes/`) → correo a `ADMIN_EMAIL` → admin confirma/rechaza manualmente en `/admin/creditos` (nuevo `AdminCreditos.jsx`, patrón `AdminKYC.jsx`) → `otorgar_credito`. **Gate nuevo** `POST /api/creditos/consumir` (uso="opi"|"flipping") wireado en `FlippingCalculatorPage.jsx` (antes de "Generar reporte") y `ReportPage.jsx` (antes de generar reporte OPI) — 402 abre `CreditosCheckoutModal.jsx` nuevo (reusable). **Solo aplica a role público/investor** — appraiser/realtor pasan sin tocar créditos (verificado). Bug real encontrado y corregido en vivo: `otorgar_credito` guardaba `uso="mixto"` literal (el `tipo` del paquete) en vez de traducirlo a `uso="cualquiera"` que es lo que `saldo_efectivo`/`gastar_credito` esperan — comprar un paquete mixto bloqueaba el uso para OPI hasta el fix. Verificado 100% end-to-end en vivo (segunda pasada, a pedido del usuario): compra real en `/flipping` (paquete flip_1, $380) → comprobante subido vía API con el `purchase_id` real capturado del request del navegador → admin real (cuenta de prueba temporal con password, creada y borrada en la misma sesión, nunca quedó en la DB) inició sesión en `/admin/creditos` por la UI real, vio la solicitud, abrió el comprobante (200 OK) y confirmó con un clic → `/dashboard/investor` → Perfil mostró "Créditos disponibles: 1" reflejando el crédito recién aplicado. **Datos bancarios reales cargados** (cuenta Bitso: banco Nvio, beneficiario Pedro Vergara Espinosa, CLABE en `.env` `BANK_*`). **SMTP configurado y probado en vivo** (Gmail `propvalu.contacto@gmail.com` + app password en `.env` `SMTP_*`; `ADMIN_EMAIL` también apunta ahí) — ambos correos (aviso de compra pendiente al admin, confirmación de créditos activos al cliente) confirmados recibidos por el usuario en pruebas reales de punta a punta. **Pendiente real:** precios de los paquetes siguen siendo placeholder (`PAQUETES_CREDITOS` en `creditos_compra.py`); sin integración bancaria (100% confirmación manual); nada de esto commiteado ni desplegado a prod todavía.
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
- #185 bóveda de respaldo: falta pantalla de admin, tarifa de descarga suelta. `SMTP_*` **ya resuelto** (11-sep, sesión 2 — Gmail `propvalu.contacto@gmail.com`, ver `.env`), falta solo confirmar que `send_email()` en `vault.py` también lo esté usando bien (probado hoy solo en el flujo de créditos).
- Decisión 9-ago: NO self-hostear IA de reportes.
- `colonias_decada.json` / federación con atlas-colonias: 0-6 de 8 fases construidas.
- Rediseño hoja 2 A4 EstateElite (pedir dirección de diseño antes de construir).
- MITULA #158 (excluido a propósito del caché, dato corrupto).
- San Isidro Mazatepec da 0 en INMUEBLES24 — puede ser localidad sin slug propio.
- #34 Email notifications (SendGrid/SMTP) — **ya resuelto** (11-sep, sesión 2), mismo `SMTP_*` de arriba.
- Ver `BACKLOG.md` tabla completa para el resto.

## 🌐 URLs / accesos
- **Sitio:** https://www.propvalu.com.mx (dominio propio, conectado 11-sep sesión 2 — verificado 200 en vivo) — sigue disponible también en https://frontend-rosy-six-74.vercel.app. Auto-deploy conectado (GitHub App + git link en proyecto "frontend" de Vercel).
- **Backend API:** https://api.propvalu.com.mx (dominio propio, conectado 11-sep — confirmar que ya resuelve, seguía propagando al cerrar sesión) o https://propvalu-backend-production.up.railway.app (siempre funciona). Auto-deploy conectado 10-sep. `/api/health` verificado en vivo.
- **Correo del dominio:** `ventas@`/`soporte@`/`notificaciones@`/`admin@`/`contacto@propvalu.com.mx` reenvían a `propvalu.contacto@gmail.com` vía Cloudflare Email Routing (11-sep). DNS del dominio gestionado en Cloudflare, cuenta `propvalu.contacto@gmail.com`.
- **Prod Mongo:** `cluster0.9eliadx.mongodb.net`
- **Backend local:** apunta a **staging** (`cluster1.avle5ez.mongodb.net`) — distinto del cluster de producción, no confundir al verificar datos.
- **Atlas de colonias (revisión, ChatGPT):** https://atlas-colonias-guadalajara.avaluosyarquit852538.chatgpt.site/
- **Atlas de colonias (feed público, Cloudflare):** https://atlas-colonias-zmg.pedrucus.workers.dev
