# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 24 Jul 2026
**Fase:** Prod Railway + Vercel público. Sesión 24-jul (esta) = **EstateElite ahora seleccionable como estilo** en el Diseñador de Promociones (antes solo vía pill "Promo Interactiva"), con preview en vivo fiel — commits `aab71fa`+`b358703` en main. Plan grande de continuación (hojas opcionales + PDF cliqueable) aprobado y guardado, NO implementado (sesión cerrada por presupuesto de contexto). Sesión #7 (previa) = feature "Promo Interactiva" desplegada (commit `f86ab06`).

## 🔥 SESIÓN 24-JUL — hecho (EstateElite seleccionable, commits `aab71fa`+`b358703`)

Objetivo: que EstateElite (antes solo accesible vía el pill "Promo Interactiva") aparezca como una plantilla más en el selector "Estilo de diseño" del Diseñador, con preview en vivo, igual que Clásico/Obsidian/Just Listed.

- **Nuevo `LayoutEstateElite.jsx`** (`.../promociones/`): adaptador delgado que traduce las ~15 props genéricas del panel (`fichaAvaluo`, `asesor`, `slidesFotos`, `amenidades`) al shape que espera `PromoReelEstateElite` (`ficha`/`asesor`), sin tocar ese componente — cero riesgo para `PromoPublicPage.jsx`. Registrado en `getLayoutComponent()`, `TEMA_THUMB`, `FORMATOS` (formato único "Reel 9:16") y la grilla del selector de `PromocionesTab.jsx`.
- **2 bugs de raíz encontrados y corregidos al verificar visualmente** (no eran evidentes por código, solo al renderizar):
  1. **CSS con 0 reglas parseadas:** el `<style>{STYLES}</style>` inline de `PromoReelEstateElite.jsx` quedaba con `sheet.cssRules.length === 0` al montarse anidado dentro del árbol del panel (confirmado con DevTools/JS — el mismo texto copiado a un `<style>` creado a mano en `<head>` sí parseaba bien). Fix: mover la inyección a `document.createElement("style")` + `document.head.appendChild()` vía `useEffect` idempotente (mismo patrón ya usado para las Google Fonts).
  2. **Escala de texto vs. imagen:** el wrapper usaba `1080×1920` (convención de export estático de `LayoutModerno`), pero `PromoReelEstateElite` tiene sus tamaños de fuente calibrados para **ancho de teléfono real** (~390px, como el `stage` de `PromoPublicPage.jsx`: `width: min(100vw, 56.25dvh)`) — el texto se veía diminuto contra la foto. Fix: `REEL_W=390, REEL_H=693`.
- **Fix adicional:** amenidades editadas en el panel ahora sí se reflejan en EstateElite (antes usaba solo `fichaAvaluo.amenidades` original, ignoraba la edición de sesión).
- **Verificado end-to-end con datos reales:** se agregó una foto de prueba + foto de asesor a la propiedad "Cuarzo 2380" en Mongo (tenía `fotos:[]` real) para confirmar visualmente el hero de portada y la foto de contacto — coincide con el diseño de referencia (Stitch/`perfect-green-reel-completo.html`). Confirmado que `/promo-publica` sigue sin exponer `user_id`/email.
- **Efecto secundario resuelto:** el TLS/allowlist de Atlas volvió a fallar (la IP pública rotó) — se re-agregó. Un rabbit-hole de teclado (`AltGr+Q` vs `AltGr+2`) resultó ser un layout de Windows agregado por error al diagnosticar un problema no relacionado — revertido a solo Latinoamericano.

### 📋 PLAN APROBADO, NO IMPLEMENTADO (retomar primero la próxima sesión)
Guardado completo en `C:\Users\pedru\.claude\plans\pure-wobbling-dongarra.md`. Dos partes:

1. **Hojas opcionales en el reel** (Descripción / Puntos destacados / Galería de fotos), insertadas dinámicamente antes de Contacto — aparecen automático según si hay datos llenados (sin toggle manual: "el usuario decide cuántas" con solo llenar o no esos campos).
   - `descripcion` y `fotos` ya están persistidos y en la whitelist `_PROMO_CAMPOS` — cero trabajo de backend.
   - `puntos_libres`/`puntos_propvalu` **faltan en la whitelist** `_PROMO_CAMPOS` (`backend/routers/inmobiliaria.py:282-287`) — 1 línea.
   - `puntos_libres` **no tiene input en el formulario "Subir propiedad"** (solo se edita en el panel efímero del reel, nunca persiste) — agregar 2 líneas junto al textarea de Descripción existente (`PromocionesTab.jsx:695-698`), mismo patrón.
   - `PromoPublicPage.jsx: toFicha()` necesita mapear `descripcion`/`puntos_libres`/`puntos_propvalu`.
   - `PromoReelEstateElite.jsx`: construir array `slides` dinámico (hoy hardcoded 0/1/2), generalizar `go()`/dots/botones "siguiente" a la longitud real del array.
2. **Botón de descarga PDF con navegación interna cliqueable** entre hojas — el mecanismo de PDF ya existente en la app (`exportarFicha`, `PromocionesTab.jsx:413-452`) usa `window.print()` nativo, SIN links cliqueables; el usuario pidió explícitamente la versión con anclas. Confirmado: **`jsPDF` ya está instalado** (`^4.2.1`) y `html2canvas` ya se usa — combinar ambos (capturar cada hoja a imagen + `doc.link()` de jsPDF apuntando a página interna), cero dependencias nuevas, generado 100% client-side (sin guardar nada server-side, igual que el export JPG actual).

### ⏭️ PRÓXIMA SESIÓN
1. **Implementar el plan de arriba** (hojas opcionales + PDF cliqueable) — empezar leyendo `pure-wobbling-dongarra.md`.
2. **Soporte para avalúos OPI en el link** (hoy solo funciona con propiedades manuales/Subidas que tienen `propiedad_id`).
3. **Retomar el re-enriquecimiento de PINCALI** (6,045 docs restantes de los 6,548) cuando el rate-limit se enfríe: `enricher.py --tab PINCALI --max 6600` (sin `--mongo`, esa flag ya no existe en el script actual).
4. **Decidir si se integra "avalúos ganados" al saldo de créditos real** (hoy solo informativo).
5. NSE nuevo/usado sigue bloqueado por cobertura; investigar procesos background "killed"; limpiar `colonias_maestro.lab.json`; Render en pausa.
6. Considerar meta tags Open Graph (`og:image`/`og:title`) por propiedad para que el link de "Promo Interactiva" muestre miniatura al pegarse en WhatsApp (hoy no tiene — requiere pre-render/función serverless, la app es SPA sin SSR).

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **23-jul noche #7:** Feature "Promo Interactiva" desplegada (commit `f86ab06`) — link público del reel EstateElite (entonces solo accesible por ese pill, no seleccionable en el panel).
- **23-jul noche #6:** Bug de raíz PINCALI m²c+título (detalle estructurado pisa la tarjeta inglesa; guardia $/m² antes de insertar) + limpieza retroactiva Mongo (38,726 títulos ES + 5,729 m²c corruptos), re-enrich PAUSADO a 503/6,600 por soft-block HTTP 202. Ixtepete: guardia `normCol` portado a `buscarCompsConWeb` del motor. Ads (video slot1 muted+toggle, 60→30s), tarjeta de bancos, 165 colonias débiles (334 comps), gamificación (sonido+avaluos_ganados informativo), edades (Preventa), fix combo colonias (tope 30→300).
- **23-jul noche #5:** Motor JS mejorado (piso espejo del techo graduado + limpieza de 744 m²c rotos en caché), hallazgo de mecanismo (rebuild completo del índice regresa aunque no cambies datos), NSE nuevo/usado cerrado con 8 variantes descartadas.
- **23-jul noche #4:** Validación de junio/julio, investigación NSE nuevo/usado en el motor JS (negativo).
- **23-jul noche #3:** Video de anuncios arreglado y desplegado. Caso Cuarzo — causa raíz real encontrada.
- **23-jul noche #2:** Validador post-merge SEPOMEX. Enricher scoped. Research IMEPLAN Zoom.
- **23-jul mañana:** Bug sistémico SEPOMEX corregido (commit `6bd75c9`).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **EstateElite seleccionable en el panel + plan de hojas opcionales/PDF cliqueable aprobado sin implementar — ver `pure-wobbling-dongarra.md`, es lo primero a retomar.**
- **PINCALI: fix de raíz de m²c/título desplegado (embebido, no requiere Railway). Limpieza retroactiva grande hecha, PERO el re-enriquecimiento de 6,045 docs quedó pausado por rate-limit del portal — pendiente caliente.**
- **Ixtepete/comps lejanos: causa real (motor sin guardia de colonia en búsqueda web) encontrada y arreglada, no solo el síntoma del panel de reporte.**
- **Motor JS (sesión #5): 103/207 (±10%), 131/207 (±15%), 152/207 (±20%), errAbs 15.2%.** No tocado esta sesión.
- **NSE nuevo/usado: bloqueador de volumen de datos, no de fórmula** (sesión #5). 165 colonias débiles scrapeadas hoy pueden ayudar — no medido aún.
- **REGLA DURA vigente:** nunca `build_cache_index.js` completo para un fix puntual — parchar la celda a mano.
- **PINCALI solo español** — regla dura, reforzada hoy (título ahora se sintetiza en español desde campos estructurados, ya que la tarjeta de listado es irremediablemente inglesa).
- **Gamificación "avalúos ganados" es solo informativa — no está conectada a créditos reales.**
- **Motor — parche depto-edad `gap6`** (commit `e8ed0fd`, en rama, sin desplegar). Decisión pendiente de sesiones previas.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa.
1. **Mergear + desplegar el parche gap6** a prod.
2. Contador de folio por presupuesto comprado.
3. #29 Render respaldo gratis — deploy falló (puppeteer sospechoso), en pausa.
4. #34 SMTP — recuperación de contraseña sin correo saliente.
5. ~337 colonias raras (Cancún/Toluca mal etiquetadas).

### Nuevos de hoy
6. Retomar re-enriquecimiento PINCALI (6,045 docs) cuando baje el rate-limit.
7. Decidir integración real de "avalúos ganados" al saldo de créditos.
8. **Implementar plan de EstateElite: hojas opcionales (Descripción/Puntos/Galería) + botón PDF con anclas cliqueables** — plan completo en `C:\Users\pedru\.claude\plans\pure-wobbling-dongarra.md`.
9. Meta tags Open Graph por propiedad para miniatura de WhatsApp en el link de Promo Interactiva.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000` (ONLINE por default, usa Serper/Tavily/Gemini — confirmado que el resultado es igual de determinista con o sin ellas para el set actual). Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **Piso espejo del techo (`poolTipo=exacta`, n≥10, ±5%)** — graduado sesión #5, en producción.
- **`buscarCompsConWeb` ahora valida colonia** (fix Ixtepete, hoy) — solo afecta al fallback de búsqueda web (Tavily/Serper/DeepSeek/Gemini), no al pool cacheado.
- **`LAB_NSE_SPLIT`/`LAB_INDEX_PATH`** — infra de laboratorio no-op, queda para futuras pruebas de nuevo/usado cuando haya más cobertura de datos.
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba. Cualquier mejora ahí NO se propaga a los reportes que ven los usuarios.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. Deploy = `railway up` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — `railway run` sirve para correr scripts contra prod real desde local).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizar con el fix de hoy si se retoma.
- **PINCALI cobertura (post-limpieza hoy, 38,990 activos):** colonia 99.3%, municipio 100%, precio 99.9%, m²c 78.2% (subiendo), recámaras/baños 63-67%, año 45.2% (techo real, dato faltante del vendedor).
