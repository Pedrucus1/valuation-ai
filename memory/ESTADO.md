# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 23 Jul 2026 (noche, sesión #7)
**Fase:** Prod Railway + Vercel público. Sesión #7 (esta) = feature "Promo Interactiva" desplegada (commit `f86ab06`): link público compartible por WhatsApp con el reel EstateElite de 3 hojas alimentado con datos reales de la propiedad. Sesión #6 (previa) = bug de raíz PINCALI + limpieza Mongo + Ixtepete al motor + ads/gamificación/edades (commits `80efa8d`, `8ae0c42`, `36e2d19`, `3ac523f`, `8778746`, `04a99f9`).

## 🔥 SESIÓN 23-JUL #7 — hecho (feature Promo Interactiva, commit `f86ab06`)

Feature autocontenida, aditiva (5 archivos, no toca flujos existentes). El usuario pidió llevar SU diseño EstateElite (reel 9:16 de 3 hojas: Portada + Características + Contacto, verde `#051b12`+dorado `#e9c176`, Noto Serif + Work Sans) a Promociones como una opción que genera un **link público** para mandar por WhatsApp (un `.html` adjunto no siempre lo reconoce el celular).

- **Nuevo pill "Promo Interactiva"** en la toolbar de `PromocionesTab.jsx` (junto a PDF/JPG): si la propiedad tiene `propiedad_id` copia `${origin}/promo/{propiedad_id}` al portapapeles; si no, pide guardarla primero. Handler `handlePromoInteractiva`.
- **Componente `PromoReelEstateElite.jsx`** (`.../promociones/`): port fiel 100% del diseño, **autocontenido** — estilos en `<style>` scoped bajo `.ee-reel` + iconos SVG inline. NO usa el `tailwind.config` del app (esos tokens colisionarían). Navegación por botones propios de cada hoja (Ver características → Ver contacto → Atrás/puntos). Alimentado con datos reales: precio, dirección, colonia/municipio, m²c, recámaras, baños, estacionamiento, amenidades, y asesor {nombre, foto, teléfono}.
- **Backend `GET /api/inmobiliaria/propiedades/{id}/promo-publica`** (público, sin auth, patrón `directorio.py`): whitelist de campos de la propiedad (`_PROMO_CAMPOS`) — **nunca expone `user_id`, email ni internos**; asesor resuelto server-side desde el `User` dueño (proyección solo name/picture/foto_url/phone/telefono/company_name).
- **Página pública `/promo/:propiedadId`** (`PromoPublicPage.jsx`, ruta en `App.js` sin auth shell, patrón `/reporte/:valuationId`): fetch → render del reel; 404 → "promoción no disponible". Carga Noto Serif + Work Sans por CDN (web normal, permitido).
- **Se decidió NO persistir config de diseño** (el diseño es fijo → no hace falta `promo_config` ni refactor de render pipeline). Se descartaron plan original de `renderPromo.js` y PUT de config.
- **⚠️ NO verificado end-to-end con datos reales:** el entorno no alcanza staging (`cluster1.avle5ez`, bloqueado por IP allowlist de Atlas — esperado). Sí verificado: frontend compila limpio, backend importa y registra la ruta como GET público. **Prompt de verificación entregado al usuario** para correr desde una terminal con acceso a la DB.
- **Diseños de referencia (FUERA del repo, no se commitean):** `C:\Users\pedru\valuation-ai\disenos-tiktok\perfect-green-reel-completo.html` (y `-whatsapp.html` autocontenido, `perfect-green-2.html`).

### ⏭️ PRÓXIMA SESIÓN
1. **Verificar Promo Interactiva end-to-end en prod** (o local con acceso DB): que `promo-publica` no filtre `user_id`/email, que `/promo/:id` se vea idéntico al diseño con datos reales, y que el pill copie bien.
2. **Soporte para avalúos OPI en el link** (hoy solo funciona con propiedades manuales/Subidas que tienen `propiedad_id`).
3. Mejoras del reel: botón **WhatsApp (wa.me)** además del `tel:` en el CTA de contacto; **preview del reel dentro del panel** de Promociones (hoy abre en pestaña nueva).
4. **Retomar el re-enriquecimiento de PINCALI** (6,045 docs restantes de los 6,548) cuando el rate-limit se enfríe: `enricher.py --tab PINCALI --max 6600 --mongo`.
5. **Decidir si se integra "avalúos ganados" al saldo de créditos real** (hoy solo informativo).
6. NSE nuevo/usado sigue bloqueado por cobertura; investigar procesos background "killed"; limpiar `colonias_maestro.lab.json`; Render en pausa.

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **23-jul noche #6:** Bug de raíz PINCALI m²c+título (detalle estructurado pisa la tarjeta inglesa; guardia $/m² antes de insertar) + limpieza retroactiva Mongo (38,726 títulos ES + 5,729 m²c corruptos), re-enrich PAUSADO a 503/6,600 por soft-block HTTP 202. Ixtepete: guardia `normCol` portado a `buscarCompsConWeb` del motor. Ads (video slot1 muted+toggle, 60→30s), tarjeta de bancos, 165 colonias débiles (334 comps), gamificación (sonido+avaluos_ganados informativo), edades (Preventa), fix combo colonias (tope 30→300).
- **23-jul noche #5:** Motor JS mejorado (piso espejo del techo graduado + limpieza de 744 m²c rotos en caché), hallazgo de mecanismo (rebuild completo del índice regresa aunque no cambies datos), NSE nuevo/usado cerrado con 8 variantes descartadas.
- **23-jul noche #4:** Validación de junio/julio, investigación NSE nuevo/usado en el motor JS (negativo).
- **23-jul noche #3:** Video de anuncios arreglado y desplegado. Caso Cuarzo — causa raíz real encontrada.
- **23-jul noche #2:** Validador post-merge SEPOMEX. Enricher scoped. Research IMEPLAN Zoom.
- **23-jul mañana:** Bug sistémico SEPOMEX corregido (commit `6bd75c9`).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
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
