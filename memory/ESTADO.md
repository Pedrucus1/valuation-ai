# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 28 Jul 2026
**Fase:** Prod Railway + Vercel público. Sesión larga con 3 features nuevas + 5 bugs reales de producción encontrados y corregidos, todo desplegado. Un solo pendiente rechazado por el usuario (hoja 2 del A4 EstateElite).

## 🔥 SESIÓN 28-JUL — Créditos + Bolsa de Requerimientos + 5 bugs de producción + A4 EstateElite (parcial)

**Features nuevas (desplegadas):**
- **Créditos con expiración real** (`bb949f1`): ledger `creditos_ledger` en `User` (`backend/core/creditos.py`) — gamificación (150 pts=1 crédito) expira a 3 meses, créditos pagados mensuales expiran fin de mes y se reemplazan (no acumulan). Choke point de lectura en `core/auth.py::get_current_user`.
- **Bolsa de Requerimientos** (`330ada6`): tab nuevo en dashboard inmobiliaria. Un asesor publica requisitos de cliente, el sistema busca coincidencias YA existentes en `mercado_props` (con contacto resuelto) al vuelo; sin match, la requisición queda 15 días y el recálculo de "coincidencias nuevas" es LAZY (al abrir `/mias`, mismo patrón que `saldo_efectivo`). Layout final (tras feedback del usuario): KPIs arriba → mapa de zonas con demanda (reusa `MapaAvaluos.jsx`, coords vía `Modulo Drive IA/_geo/proximidad.py`) → feed de otros asesores primero → mis requerimientos → captura como modal "ficha" (no formulario siempre visible). Backend: `backend/core/requisiciones.py` + `backend/routers/requisiciones.py`.

**5 bugs reales de producción encontrados (reportados por usuarios reales, no por mí) y corregidos:**
1. **Alta manual pedía casi todos los campos** (`1a6a723`): `REQUERIDOS_POR_TIPO` en `core/data_exchange.py` exigía recámaras/baños/medios baños/estacionamientos/niveles/conservación para casa/depto/local/oficina/bodega — se dejaron opcionales (solo ubicación+precio+edad+m² son obligatorios, lo que usa el motor).
2. **Video de ads slot1 se veía negro** (`8a96c60`+`ea6f876`+`ce3e51c`): causa real = metadata de color no estándar heredada de Remotion (`yuvj420p`+`color_range=pc`+colorspace SD sobre HD) — combinación que el decodificador de hardware de Chrome/Windows renderiza como negro sólido aunque el archivo sea válido (se ve bien en VLC/ffplay). Fix: forzar `bt709`+rango limitado al recomprimir (`_compress_video` en `ads.py`) + endpoint puntual `/admin/ads/reprocesar-video/{id}` para arreglar creatividades ya subidas + video de respaldo estático también recomprimido. Verificado con `ffprobe` antes/después en el archivo real de producción.
3. **"La Calma" seguía con pendientes tras "verificarla completa"** (sin fix de código — diagnóstico only): NO es bug. La colonia tiene 390 propiedades reales en producción (`cluster0`), la sesión previa solo cubrió 94 — quedaban ~25-27 genuinamente nunca tocadas. Se agregó un contador real "X de Y pendientes en esta zona" en Verificación por Zona (`GET /comps-sin-edad` ahora devuelve `total_pendientes`) para que no se repita la confusión de "ya no queda nada" cuando solo se vio un lote parcial.
4. **Alta manual no aparece en Data Exchange** (sin fix de código, es diseño intencional): `/api/comparables/manual` (Verificación por Zona) solo escribe al pool anónimo (`inmobiliaria_id=None`), nunca al CRM — a diferencia del alta manual DENTRO de Data Exchange, que sí escribe ambos. Se agregó una nota visible (prop `nota` en `PropiedadManualForm.jsx`) en ambos modales explicando la diferencia, para que no se preste a confusión.
5. **"Activar análisis IA" en Perfil del entorno/Equipamiento del reporte** (`0410734`): diagnosticado con logs reales de Railway — NO era falta de cuota (gemini-2.5-flash solo usa 1-2 de 20/día). La falla real fue un JSON truncado puntual de Gemini, y los "respaldos" `gemini-2.0-flash`/`-lite` tienen cuota **0 permanente** en el proyecto GCP (nunca protegieron nada). Fix: `response_mime_type=json` en Gemini (reduce truncamiento) + **DeepSeek real como respaldo** (mismo proveedor que ya usa el motor JS, sin dependencia nueva — `httpx` directo a `api.deepseek.com`). Verificado end-to-end en ambos caminos (Gemini normal + Gemini roto a propósito → DeepSeek).

**Pendiente / RECHAZADO por el usuario:**
- **Ficha A4 de EstateElite — Hoja 1 lista y aprobada** (`LayoutA4EstateElite.jsx`, fuentes reales Archivo Black/Barlow Condensed/Bodoni Moda copiadas del export de Framer a `public/fonts/estate-elite/`, datos reales sin fabricar claims tipo "Escrituras listas"/"Verificada"). **Hoja 2 rechazada explícitamente por el usuario** ("está terrible, no sé de dónde sacaste ese diseño tan malo") — se construyó a partir de un screenshot del editor de Framer (galería 6 fotos + amenidades + contacto) pero el resultado no gustó. **Retomar en la próxima sesión con mejor dirección de diseño antes de tocar código** — no asumir que el patrón de `LayoutFichaTecnica.jsx` (Clásico) ni el screenshot del editor son la referencia correcta; preguntar primero qué debe llevar.
- Todo el código de hoja 2 (`LayoutA4EstateElite2.jsx`) sigue en el repo, funcional pero con mal diseño — no se desplegó a producción (el formato "Ficha A4" de EstateElite no se anunció al usuario como listo, solo se mostró en local).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Créditos, Requisiciones, y los 5 bugs: HECHOS, pusheados y DESPLEGADOS a Railway+Vercel prod.**
- **A4 EstateElite hoja 2: NO desplegar, rediseñar primero.** Hoja 1 sí está bien y aprobada.
- **Regla nueva confirmada hoy:** cuando el usuario reporta un bug de producción, verificar SIEMPRE contra `cluster0.9eliadx` (prod real), NUNCA asumir que el diagnóstico en `cluster1.avle5ez` (staging local) aplica — quedó demostrado con el caso de "La Calma" que ambas bases tienen datasets muy distintos.
- **DEEPSEEK_API_KEY agregada a `backend/.env` local** (antes solo estaba en Railway) para poder probar el fallback del reporte en local.
- EstateElite (26-jul, hoja única) sigue en producción sin cambios de esta sesión.
- PINCALI: re-enriquecimiento sigue bloqueado por soft-block del portal, sin cambios.
- Motor JS: sin tocar esta sesión.

## ⏳ Pendientes / decisiones abiertas
1. **Rediseñar hoja 2 del A4 EstateElite** (prioridad de la próxima sesión — pedir dirección de diseño antes de construir).
2. Anclas cliqueables dentro del PDF de EstateElite.
3. Mejorar letterbox del formato Facebook de EstateElite (fondo desenfocado).
4. Verificar responsividad móvil real de `PromocionesTab` en un teléfono físico.
5. Retomar re-enriquecimiento PINCALI — bloqueado por soft-block, necesita proxy/backoff.
6. Meta tags Open Graph por propiedad en Promo Interactiva.
7. Contador de folio por presupuesto comprado.
8. #29 Render respaldo gratis — en pausa. #34 SMTP — sin correo saliente.
9. ~337 colonias raras (Cancún/Toluca mal etiquetadas).
10. Considerar exponer también el link de origen / remodelación en la plantilla de carga masiva (Data Exchange) — hoy solo el alta manual las tiene.
11. Migrar usuarios existentes con `credits` int plano a una entrada de ledger explícita (opcional, no urgente — el fallback ya funciona).
12. Investigar por qué staging (`cluster1`) tiene datasets mucho más chicos que producción para la misma colonia (ej. La Calma: 29 vs 390) — posible desincronización útil de resolver para que las pruebas en local sean representativas.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente, sin cambios esta sesión)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000`. Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 23 routers (se agregó `requisiciones`). Deploy = `railway up --ci` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — usar Mongo directo con la URI de prod, comentada en `backend/.env`, para diagnósticos puntuales contra datos reales).
- **Ads:** archivos en `backend/uploads/ads/` (Railway, volumen persistente confirmado — sobrevivió redeploys esta sesión).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, sin cambios.
