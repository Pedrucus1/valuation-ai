# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 17 Jul 2026 (2ª sesión)
**Fase:** Prod Railway (Hobby PAGADO) + Vercel público. Sesión 17-jul = arreglo mayor del flujo de avalúo (comparables reales, mapas Google, verificador, gamificación) + auditoría **YA APLICADA Y DESPLEGADA** (commit `d8c0a40`). Motor SIN cambios (caché 7-jul sigue desplegado).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Mapas Google RESUELTOS (17-jul).** La key EN USO vive en **avaluos** (`propvalu-mexico`, cuenta facturación `013DD6`, tarjeta Banamex ...5099) → `AIzaSyB0OMqh…`. Respaldo en **pedrucus** (`fair-geography-430001-k8`, billing `01F912`) → `AIzaSyCgsW8…`. **Sin restricción de referente**, Maps JS+Static habilitadas. Puestas en frontend/.env+Vercel y backend/.env+Railway. Detalle en `credentials_registry.md`. Ambos mapas (formulario arrastrable + reporte Static) verificados 200. Odisea de billing: la cuenta avaluos tardó en verificar documento; se destrabó al final.
- **Comparables reales de la zona (17-jul, DESPLEGADO, el fix estrella).** Bug histórico: `search_comparables_from_mongo` comparaba `tipo="Casa"` (mayúscula) vs `"casa"` (minúscula del pool) + municipio con espacio → **0 resultados → la OPI caía a modo `simulated`** (comparables inventados sin URL + entorno enlatado con "Av. Vallarta"). Fix: normalizar casing + strip municipio + **filtro de proximidad por colonia y banda $/m² del segmento** (no mezcla Chapalita $175k/m² con Ixtepete $25k/m²). Medido en prod: Ixtepete devuelve 6 reales de la zona. `mongo_comparables.py` + `server.py`.
- **Motor: NO reconstruir el caché.** El del **7-jul (63.1/74.8/83.5) es el mejor y está desplegado.** Reconstruir REGRESA ~3pp por deriva de datos, no catastrófico. Detalle en `MOTOR_ANTECEDENTES.md`. Reglas: reportar pass-rates+errAbs, la "mediana" del validador es ruido.

## ✅ AUDITORÍA 17-jul — RESUELTA Y DESPLEGADA (commit `d8c0a40`)
1. **ValuationForm parking/piso:** payload leía `parking_spaces`/`floor_number` inexistentes → mapea `parking_spots` (o cubiertos+descubiertos) y `property_level` (PB→0). ✅
2. **Geocode 404:** `/geocode` no existe → `google.maps.Geocoder` en el navegador (componentRestrictions MX). ✅
3. **gamificacion.py 500:** `$toDate` lanzaba con `edad_fecha` corrupto → `$dateFromString onError:null` (ignora docs inválidos). ✅
4. **ESLint:** `eslint 9→^8.57.1`, `npm install --legacy-peer-deps` → build vuelve a lintar (0 warnings). ✅
5. **Bajos:** doble contador alineado a **día local MX** en `edades.py` (fuente de verdad = gamificacion.py); `static_map` sin iframe si key vacía; imports/estado muertos fuera de EdadesZonaPage; pytest instalado. ✅
   - **NO tocados (con razón ponytail):** `/api/valuations` sin sesión → `[]` (no filtra datos, dashboard espera array; 401 lo rompería); confeti sin `cancelAnimationFrame` (loop auto-terminante 2-3s, `clearRect` sobre canvas desmontado no lanza).
   - **pytest:** instalado, pero los 6 tests de integración viejos (v22-v26) requieren servidor vivo + chocan con incompat pytest+Python 3.14 (`I/O operation on closed file`). No es código del proyecto.

## ✅ Hecho reciente (17 Jul) — flujo de avalúo + gamificación + mapas
- **Comparables reales de la zona** (ver LO MÁS CALIENTE). Raíz también explicaba la OPI de Ixtepete `val_6fc91c341233` que salía con "Av. Vallarta" y comparables sin URL (era modo simulated por el casing).
- **Mapa del formulario:** de iframe embed estático → **Google Maps JS interactivo con pin arrastrable** (agente) + loader singleton + fallback a embed. Antes el pin caía en default **CDMX (19.4326,-99.1332)** y sin forma de corregir → ubicación/entorno mal. `ValuationForm.jsx`.
- **Mapa del reporte:** `static_map.py` de OpenStreetMap → **Google Static Maps** (con fallback OSM).
- **Verificador (`EdadesZonaPage.jsx` + `edades.py`):** (a) **terreno guarda** aunque solo agregues conjunto (antes `conjunto`/m² no contaban como cambio válido en la validación front+back). (b) **Editar m² de terreno/construcción** a mano (corrige el mal scrapeo de PINCALI: guarda el número equivocado del título, ej "1,595 M2 land"→689). (c) detección de terreno case-insensitive. (d) dropdown de tipo con scroll/fit + "Conjunto aparta estudios".
- **Gamificación (construida — la idea parqueada #80/G, ahora INTERNA):** `GamificacionVerificador.jsx` (nuevo) + router `gamificacion.py` (nuevo: `/api/gamificacion/mis-puntos` + `/leaderboard`, aggregation sobre `mercado_props` por `edad_estimador`). Barra Hoy/Récord/Meta-150, **confeti** al récord del día y **fiesta a los 150 pts**, panel con historial diario y **leaderboard/concurso** (trimestral/anual).
- **Panel inmobiliaria:** `InmobiliariaDashboardPage.jsx` usaba MOCK; ahora hace **fetch real a `/valuations`** (mapea status EN→ES). Explicaba "la valuación no aparece en el panel".
- **Reporte:** textos 8/9/10px → **11px** (plusvalía, entorno, ventajas, análisis).
- **Video promo** (Remotion horizontal) como **anuncio en el modal "Generando valuación"**, con audio + botón activar sonido, comprimido 12MB→1.4MB. Copiado a `frontend/public/ads/`.
- **Favicon** PropValu (edificio amarillo sobre círculo verde) + `manifest.json`. Textos formulario: "¿A cuántas calles da el inmueble?", "Cisterna/Aljibe".
- **Promocionales inmobiliarias (parqueado):** se exploró rehacer plantillas white-label multiformato; prototipo "Just Listed" A4/post/reels/facebook hecho como Artifact (referencias del usuario: etsy/freepik). NO integrado a la app aún.
- Commits `ea1fa1f`, `d066e59`, `135fbbb` (+ `0bf4139`,`6799de2`) pusheados. Frontend Vercel + backend Railway desplegados y verificados.

## ✅ Hecho previo (12–15 Jul)
- **15-jul:** Data Exchange UI (tab inmobiliaria) rediseñado + plantilla +3 columnas opcionales (Coto/Piso/Amenidades), test 10/10. Videos promo Remotion. Commits `5c9b59d`+`b58ba71`.
- **12–13 jul:** Verificador A–G desplegado (`9909fd9`). H1 remate (1,517) + H2 dedup cross-portal estricto (3,734) marcados en prod, reversibles. Deriva de datos 7→13 jul investigada (~3pp, no −14).
- **H — DATOS cerrado** (comps + enricher + post-scrape automatizados; PINCALI data-capped). Detalle en BACKLOG_ARCHIVE.

## ⏳ Otras pendientes (sin tocar)
1. **#29 Render respaldo gratis** — servicio en rama main, FALTAN env vars (usuario las pega). Hacer ~5 días antes de que venza Railway.
2. **#34 SMTP** — recuperación de contraseña no funciona (sin correo saliente). Mientras: link JWT a mano.
3. **~337 colonias raras** (Cancún/Toluca mal etiquetadas) — manual con filtro "datos raros" o descartar.
4. **Raíz de fondo (no arreglada): PINCALI escrapea m² mal** (systemic — toma el número equivocado del título). El editar-m² del verificador lo mitiga a mano; el fix real es en el enricher del scraper (sesión aparte).

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (sin env vars aún)
- Reset password sin SMTP: generar JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente, SIN cambios esta sesión)
- **±20 ~83.5%** (validador offline). Techo = falta DATO, no fórmula. Palanca real = selección de comps por segmento.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE (keys en blanco) antes de cambios · **medir/dry-run antes de wirear nada**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, **22 routers** (nuevo: `gamificacion`). Auth Bearer (usuarios) + cookie + X-Admin-Token. Cache motor: MongoDB `cache_consolidado.json`.
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas / 111,946 totales en `mercado_props`.
- Seguridad: incidente 06-jul cerrado. Keys → `credentials_registry.md` (Google Maps actualizado 17-jul).

## 🕐 Diseño parqueado (no construir aún)
- **#139/#140/#141** crowdsource edades (consenso/tokenización/paneles). **#142** Data Exchange descuento por calidad.
- **Promocionales inmobiliarias white-label multiformato** (plantillas tipo "Just Listed"): prototipo Artifact hecho 17-jul, NO integrado. Retomar si se prioriza el módulo de promoción.
- **Gamificación pública (Local Guides):** la versión INTERNA ya se construyó (17-jul). Evaluar variante pública con count-up + confeti para el flujo del público.
