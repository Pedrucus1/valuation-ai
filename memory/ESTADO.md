# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 12–13 Jul 2026
**Fase:** Prod Railway (Hobby PAGADO) + Vercel público. Verificador A–G desplegado. **H (datos): remate + dedup cross-portal APLICADOS en prod (marcados, reversibles).**

## 🔥 COMPENDIO VERIFICADOR — A–G ✅ HECHO+DESPLEGADO (12-jul)
> `EdadesZonaPage.jsx` + `routers/edades.py` + `server.py`. Commit `9909fd9`. Frontend `vercel --prod` + backend `railway up`. Ambos live.
- **A ✅** Conservación arriba de remodelación; **"Excelente"→"Muy Bueno"** (empata `muy_bueno`=1.05 del motor; motor NO tiene "Excelente"). Alias legacy en edades.py/server.py (2 tablas).
- **B ✅** +9 tipos (edificio, escuela, conjunto oficinas/apartamentos/mini, hotel, salón eventos, centro comercial, terreno c/construcción, nave industrial) en `TIPO_OPCIONES` + `TIPOS_CANON`. Check **uso mixto** fuera del dropdown (flag `uso_mixto`).
- **C ✅** Terreno sin construcción oculta edad/conservación/remodelación (solo colonia/tipo). `terreno_construido` sí pide.
- **D ✅** Pill **VENTA/RENTA** (`tipo_operacion` proyectado).
- **E ✅** Ficha refleja colonia/tipo corregidos tras guardar (`setItems`).
- **F ✅** Agrupa por **coto real** (no colonia) + **aviso preventivo** (`confirm`) antes del apply en lote.
- **G ✅** Contador por día (`dias_edad` en users) → **récord del día** bajo la medallita (aparece tras 1er guardado).

## 🔥 H — DATOS (PINCALI/scraper) — remate+dedup APLICADOS, resto ⏳
**Todo READ-ONLY medido antes de aplicar. Prod = cluster0 (root `.env` autentica; scraper `.env` tiene pass ROTADO → usar root). Scripts en scratchpad (efímero).**
- **H1 remate ✅ APLICADO (1,517):** `es_remate=true` + `activo=false` + `baja_fuente="auto_remate"`. Regex afinado (remate/recuperación bancaria/dación en pago/cesión de derechos/adjudicación judicial…) sobre titulo|descripcion. Salen de comps por activo=false. **Revertir:** `activo=true` + unset es_remate/baja_fuente/baja_fecha where `baja_fuente=auto_remate`.
- **H2 dedup cross-portal ✅ APLICADO (3,734 dups / 2,113 grupos):** ESTRICTO = (muni|colonia|**precio y m² EXACTOS**|op|tipo) + guarda (título-Jaccard≥0.45 O mismo agente). Campos **convención existente**: `duplicado=true`, keeper `es_canonico=true`, `grupo_id`, `canonico_id`, `dedup_fuente="estricto_crossportal"`. **activo INTACTO** (solo marcado, no baja). Keeper=más completo con preferencia perito/ia_derivada; nunca marca doc con dato de perito. **Revertir:** unset duplicado/es_canonico/grupo_id/canonico_id/n_portales_duplicado/dedup_fuente/dedup_fecha where `dedup_fuente=estricto_crossportal`.
  - **Descartado:** dedup oficial `dedup_seguimiento.py` crudo = 52k (huella laxa ±15% precio, sin m² → colapsa distintas). MEDIA (huella tolerante+guarda)=13.5k pero 11k falsos positivos (títulos genéricos de Inmuebles24 = colonia). ESTRICTA es la segura.
  - **Set limpio para uso** (activo, no-duplicado): **97,274**.
- **H ⏳ PENDIENTE:**
  1. **Wirear filtro `duplicado:true`** en comps (`mongo_comparables.py`) y enricher (para que el set limpio se use; comps ya excluye remate por activo=false).
  2. **Por-scrape:** correr dedup + detección remate tras cada scrape (marcar nuevos). Dedup puede ir DESPUÉS del enricher.
  3. **PINCALI enricher (el grande):** su `descripcion` VACÍA + sin CP/dirección/geo (aportó 2,619/3,747 fixes IA). Capturar descripción+dirección/Maps al scrapear para derivar colonia en origen.
  - NOCNOK: los "duplicados" que dudaba el usuario son **cross-portal** (mismo agente también en casasyterrenos), no internos.

## ⏳ Otras del compendio (sin tocar)
- **I.** Pregunta abierta: tras corregir colonia, ¿la vieja DESAPARECE del selector? (reconciliación verificado↔original).
- **J.** Verificar limpieza colonias IA (3,747 `ia_derivada`): muestra por municipio. ~337 raras restantes → manual.
1. **#29 Render como respaldo gratis** — servicio `valuation-ai-1` ya en rama `main`; FALTAN las env vars (MONGO_URL/DB_NAME/ADMIN_SECRET/ADMIN_EMAIL/JWT_SECRET/JOBS_SECRET/TAVILY_API_KEY) — el usuario las pega, yo no puedo teclear secretos. Hacerlo **~5 días antes de que venza Railway**. Detalle en BACKLOG #29.
2. **#34 SMTP** — recuperación de contraseña NO funciona (no hay correo saliente). Configurar SMTP en Railway (Gmail app password o SendGrid). Mientras: reset se destraba generando el link JWT a mano.
3. **~337 colonias raras** que la IA no pudo derivar (Cancún/Toluca mal etiquetadas, calles sin colonia). Revisión manual con el filtro "datos raros", o descartar las de otras ciudades.
4. **#136/#137** ahora más viables: la base de colonias quedó limpia (medias por colonia útiles).

## ✅ Hecho reciente (12–13 Jul)
- **Verificador A–G** completado y desplegado (ver compendio arriba). Commit `9909fd9`.
- **H1 remate (1,517)** y **H2 dedup cross-portal estricto (3,734)** marcados en prod, reversibles (ver H arriba). Nada borrado; `activo` intacto en dups.
- Descubierto: `dedup_seguimiento.py` (scraper) ya existía pero su huella es demasiado laxa (52k) → no usar cruda. Scraper `.env` tiene pass Mongo prod ROTADO (usar root `.env`).

## ✅ Hecho previo (10–11 Jul)
- **Colonias limpiadas con DeepSeek: 3,747 props** derivadas (colonia real desde dirección/título; `colonia_fuente=ia_derivada`). + backfill 20,804 case/acento/mojibake. Raras 4,030→337. Backups revertibles. Alimenta #137.
- **Herramienta "Verificación de Datos por Zona"** (ex "Verifica y Gana", renombrada en las 3 vistas): auth **Bearer** (arregló logout/dropdowns cross-dominio), autocompletado de colonia **propio** (sin cmdk, top-12, instantáneo), filtro de basura en colonias, botones de exclusión (Retirado/Info incorrecta/Juicio-remate → excluyen de comps), botón **Editar** en fichas guardadas + historial, filtro "**datos raros**" (colonias por corregir), datalist muestra nombre no CP.
- **Infra:** Railway trial venció → **plan Hobby pagado** (backend revivió). Frontend Vercel **público** (quité deployment protection) + **proxy `/api` vía vercel.json** (mismo-origen). Índices #65 desplegados. #27 motor + TAVILY corregida desplegados. #133 Data Exchange prueba en vivo pasada.
- **#25 catálogo cotos** construido + probado (wiring al motor = NEUTRAL, NO se wirea). Docs de estado unificados (ESTADO.md único). Nueva regla: **medir antes de implementar** (`feedback_medir_antes_de_implementar`).

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (rama main, sin env vars aún)
- Reset password sin SMTP: generar JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente, SIN cambios esta sesión)
- **±20 ~83.5%** (validador offline). Techo = falta DATO, no fórmula. Palanca real = selección de comps por segmento.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE (keys en blanco) antes de cambios · **medir/dry-run antes de wirear nada**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 17 routers. Auth por Bearer (usuarios) + cookie + X-Admin-Token. Cache motor: MongoDB `cache_consolidado.json`.
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas.
- Seguridad: incidente 06-jul cerrado (keys rotadas, pre-commit hook). Registro de keys → memoria `credentials_registry.md`.

## 🕐 Diseño parqueado (no construir aún)
- **#139/#140/#141** crowdsource edades (consenso/tokenización/paneles). **#142** Data Exchange descuento por calidad.
- **IDEA gamificación (para versión PÚBLICA, tipo Google Maps Local Guides):** al terminar una zona/sesión, modal al centro con **count-up de propiedades verificadas** (números corriendo rápido hasta el total) + **confetti/celebración** simple pero vistosa + puntos ganados. Tarjetas "flotantes" sin mostrar cuántas faltan (que no se vea infinito). Prototipo empezado y REVERTIDO 11-jul (el usuario pidió priorizar verificar limpieza de colonias). Componente `CelebracionPuntos` (count-up con requestAnimationFrame + confetti CSS, sin dependencias) — reconstruir cuando se retome. La versión interna actual funciona bien; evaluar si la pública lleva esto.
