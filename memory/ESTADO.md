# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 26 Jul 2026
**Fase:** Prod Railway + Vercel público (sin cambios de esta sesión desplegados todavía). Sesión 26-jul (esta) = **plan EstateElite implementado por completo** (hojas dinámicas + export real de todas las hojas + formatos Post 1:1/Facebook + auto-ajuste de zoom del visualizador), commits `3934a60`→`3f65e8a` en `main`, **local, sin push/deploy**. Además: 2 pendientes obsoletos detectados y cerrados vía agentes en paralelo (gap6 ya estaba en prod; PINCALI sigue bloqueado por el portal, no por código).

## 🔥 SESIÓN 26-JUL — hecho (EstateElite: plan completo, commits `3934a60`→`3f65e8a`)

Objetivo: retomar el plan aprobado la sesión pasada (`pure-wobbling-dongarra.md`) — hojas opcionales del reel + export real — y resolver los problemas que el usuario encontró al probarlo en vivo.

- **Hojas dinámicas** (`3934a60`): backend expone `puntos_libres`/`puntos_propvalu` en `_PROMO_CAMPOS`; input nuevo de "Puntos destacados" en "Subir propiedad"; `PromoReelEstateElite.jsx` reescrito con array `slides` dinámico — Descripción/Puntos/Galería aparecen solo si hay dato real (sin toggle manual). Verificado con propiedad de prueba: 6 hojas renderizan bien.
- **2 bugs de raíz encontrados al verificar export** (`1398629`): (1) `LayoutEstateElite.jsx` no tenía `id="pv-ficha-root"` (a diferencia de TODOS los demás layouts) → JPG/PDF no capturaba nada; (2) `html2canvas` no soporta el CSS `zoom` (no estándar) que usa el preview → con las hojas en `position:absolute` producía texto de varias hojas montado encima. Fix: agregar el id + capturar siempre a zoom 1.
- **Generalizado a pedido del usuario** (`56e949f`): JPG ahora descarga una imagen por CADA hoja, no solo la visible — aplica a EstateElite (dinámico) Y a Clásico Hoja1+Hoja2 (mismo bug, no reportado antes de hoy). PDF real client-side (jsPDF+html2canvas, una página por hoja) reemplaza el `window.print()` que sacaba la hoja 390×693 chueca en una página A4 sin CSS de impresión (el `@media print` de `index.css` es genérico, sin `@page` por formato). Botón "Secuencias" oculto para EstateElite — estaba codificado para animar siempre el diseño Just Listed (mismatch de hoja 2 reportado por el usuario).
- **Nuevos formatos Post 1:1 y Facebook para EstateElite** (`56e949f`): reutilizan el mismo diseño/datos del reel, escalados y centrados en el lienzo del formato, con el fondo de la hoja activa extendido a los costados (letterbox) — cero CSS nuevo por formato. Post 1:1 se ve bien; Facebook (1200×628) funciona pero con mucho espacio vacío a los lados (choque 9:16→16:9) — marcado `ponytail:` como mejora futura (ej. fondo desenfocado de la foto).
- **Auto-ajuste de zoom del visualizador** (`3709e89`): el zoom fijo de 50% no cabía completo en formatos grandes (Post 1:1 obligaba a hacer scroll para ver los botones de abajo) — ahora se mide el tamaño real de `#pv-ficha-root` y el espacio disponible del panel, genérico para cualquier estilo/formato actual o futuro (no requiere tabla de tamaños a mano). Verificado con ventana angosta (750px alto): ya no hace falta scroll ni en Reel 9:16 ni en Post 1:1.
- **Toolbar solo-ícono en pantallas chicas** (`3f65e8a`): PDF/JPG/Promo Interactiva/Secuencias mostraban texto siempre, apretándose en 360-390px — ahora el texto se oculta bajo `sm` (queda ícono + tooltip).
- **2 agentes en paralelo (background) resolvieron 2 pendientes obsoletos:** el parche de motor `gap6` YA estaba mergeado y desplegado a prod desde una sesión anterior (confirmado por `git log`, commit `99cf9ea`) — pendiente tachado. El re-enriquecimiento PINCALI sigue **bloqueado por soft-block del portal, no por el código** — solo 6 de 6,203 antes de repetir HTTP 202 igual que el 23-jul; no se enfrió en 3 días, necesita proxy rotativo o backoff mucho mayor.
- **Nota de sesión:** hay una tarea programada de Windows ("Respaldo automático diario") que commitea cambios pendientes automáticamente en segundo plano — ya pasó una vez a mitad de esta sesión (commit `600e3a1`), es normal, no confundir con trabajo perdido.

### 📋 PLAN — estado actual (`pure-wobbling-dongarra.md`)
1. Hojas opcionales (Descripción/Puntos/Galería) — **HECHO**, ver arriba.
2. Botón PDF con anclas cliqueables entre hojas — **PARCIAL**: ya hay un PDF real (una página por hoja), pero SIN los links internos cliqueables que pedía el plan original (`doc.link()` de jsPDF). Pendiente si se quiere esa navegación interna del PDF.

### ⏭️ PRÓXIMA SESIÓN
1. **Decidir si se hace `git push` + deploy** de todo lo de EstateElite (commits `3934a60`→`3f65e8a`, solo local hoy).
2. Anclas cliqueables dentro del PDF de EstateElite (`doc.link()`, jsPDF) — mejora sobre el PDF ya funcional.
3. Opcional: mejorar el formato Facebook de EstateElite (fondo desenfocado en vez de color sólido en el letterbox).
4. Verificar responsividad móvil real de `PromocionesTab` en un teléfono físico (no se pudo forzar un viewport móvil real con las herramientas de este entorno) — probar por red local o ya desplegado.
5. Soporte para avalúos OPI en el link de Promo Interactiva (hoy solo funciona con propiedades manuales/Subidas con `propiedad_id`).
6. **Retomar re-enriquecimiento PINCALI** solo si se resuelve el soft-block (proxy rotativo o backoff mucho mayor) — reintentar tal cual ya se probó y no funciona.
7. Decidir si se integra "avalúos ganados" al saldo de créditos real (hoy solo informativo).
8. NSE nuevo/usado sigue bloqueado por cobertura; Render en pausa.
9. Meta tags Open Graph por propiedad para miniatura de WhatsApp en el link de Promo Interactiva.

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **24-jul:** EstateElite seleccionable como estilo en el panel (antes solo vía pill), preview en vivo fiel al diseño de referencia. Plan de hojas opcionales + PDF aprobado, no implementado (retomado hoy).
- **23-jul noche #7:** Feature "Promo Interactiva" desplegada (commit `f86ab06`) — link público del reel EstateElite.
- **23-jul noche #6:** Bug de raíz PINCALI m²c+título + limpieza retroactiva Mongo (38,726 títulos ES + 5,729 m²c corruptos), re-enrich pausado por soft-block HTTP 202 (el mismo bloqueo que sigue activo hoy). Ixtepete: guardia `normCol` portado al motor. Ads, tarjeta de bancos, 165 colonias débiles, gamificación, edades.
- **23-jul noche #5:** Motor JS mejorado (piso espejo del techo + limpieza m²c), NSE nuevo/usado cerrado con 8 variantes descartadas.
- **23-jul y antes:** ver `BACKLOG_ARCHIVE.md`.

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **EstateElite: plan completo implementado y commiteado, sin desplegar — decidir push+deploy es lo primero de la próxima sesión.**
- **PINCALI: re-enriquecimiento sigue bloqueado por soft-block del portal (verificado de nuevo 26-jul, no se enfrió en 3 días) — no reintentar tal cual, necesita proxy rotativo o backoff mucho mayor.**
- **gap6 y la rama `fix/flujo-avaluo-reporte-jul20`: YA estaban en prod desde antes — pendientes obsoletos cerrados.**
- **Motor JS (sesión #5): 103/207 (±10%), 131/207 (±15%), 152/207 (±20%), errAbs 15.2%.** No tocado esta sesión.
- **NSE nuevo/usado: bloqueador de volumen de datos, no de fórmula.**
- **REGLA DURA vigente:** nunca `build_cache_index.js` completo para un fix puntual — parchar la celda a mano.
- **PINCALI solo español** — regla dura.
- **Gamificación "avalúos ganados" es solo informativa — no está conectada a créditos reales.**

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
1. Contador de folio por presupuesto comprado.
2. #29 Render respaldo gratis — deploy falló (puppeteer sospechoso), en pausa.
3. #34 SMTP — recuperación de contraseña sin correo saliente.
4. ~337 colonias raras (Cancún/Toluca mal etiquetadas).

### Nuevos de hoy
5. **Push + deploy de EstateElite** (commits `3934a60`→`3f65e8a`, todo local).
6. Anclas cliqueables dentro del PDF de EstateElite (mejora sobre el PDF ya funcional).
7. Mejorar letterbox del formato Facebook de EstateElite (fondo desenfocado).
8. Verificar responsividad móvil real de `PromocionesTab` en un teléfono físico.
9. Retomar re-enriquecimiento PINCALI (6,203 pendientes, solo 6 enriquecidos el 26-jul) — bloqueado por soft-block, necesita proxy/backoff antes de reintentar.
10. Decidir integración real de "avalúos ganados" al saldo de créditos.
11. Meta tags Open Graph por propiedad para miniatura de WhatsApp en Promo Interactiva.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000` (ONLINE por default, usa Serper/Tavily/Gemini — confirmado que el resultado es igual de determinista con o sin ellos para el set actual). Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **Piso espejo del techo (`poolTipo=exacta`, n≥10, ±5%)** — graduado sesión #5, en producción.
- **`buscarCompsConWeb` ahora valida colonia** (fix Ixtepete) — solo afecta al fallback de búsqueda web, no al pool cacheado.
- **Parche depto-edad `gap6`** (`_gapEdad = tipo==='depto' ? 6 : 25`) — confirmado 26-jul que YA está en prod (`main:Modulo Drive IA/motor_remi_api.js:1068`, sin flag de lab).
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba. Cualquier mejora ahí NO se propaga a los reportes que ven los usuarios.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. Deploy = `railway up` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — `railway run` sirve para correr scripts contra prod real desde local).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizar si se retoma.
- **PINCALI cobertura (post-limpieza, 38,990 activos):** colonia 99.3%, municipio 100%, precio 99.9%, m²c 78.2%, recámaras/baños 63-67%, año 45.2% (techo real, dato faltante del vendedor).
