# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 20 Jul 2026 (tarde)
**Fase:** Prod Railway (Hobby PAGADO) + Vercel público. Sesión 20-jul = **ronda grande de fixes del flujo de avalúo/reporte** (form, reporte/PDF, folio, reseñas, mapa de avalúos, favicon). **TODO commiteado, pusheado (`0215f1a`) y DESPLEGADO** (frontend Vercel + backend Railway `railway up`).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Google Cloud (cuenta `avaluosyarquitectura2` / proyecto `propvalu-mexico`):** habilitadas esta sesión **Geocoding API**, **Places API (New)** y **Places (legacy)**. La key `AIzaSyB0OMqh…` es pública por diseño (prefijo `REACT_APP_`) y ahora tiene **fallback hardcodeado** en `ValuationForm.jsx` por si falta el env en Vercel (el env estaba guardado como `""` → mapa en blanco; ese fue el bug inicial).
- **Entorno del reporte con NÚMEROS REALES** (`nearby_places.py`, Places API New, radio **800m**): educación/salud/comercio/recreación/plazas. **recreación = parques + gimnasios + estadios**. Fallback a estimado IA si Places falla. Costo ~$0.16/reporte (bajo el crédito gratis $200/mes de Google).
- **Folio nuevo `EST-YYMMDD-TIPO-SIGLAS-NN`** (ej. `EST-260720-IN-AA-01`): tipo IN/PE/AD/PU + siglas del usuario (derivadas de empresa/nombre) + consecutivo. **Estable por avalúo** (se guarda en la valuación). Público sin siglas. Campos nuevos en `User`: `siglas` + `folio_seq`. **PENDIENTE opcional:** reinicio del contador por presupuesto comprado (hoy es acumulado por usuario).
- **Peritos SIN popup de publicidad en generación** (decisión del usuario, por diseño). El sistema de anuncios de terceros (`AdOverlay`/`/ads/active`) sigue solo para público/inmobiliaria no-premier.
- **Motor: NO reconstruir el caché.** El del **7-jul (63.1/74.8/83.5) es el mejor y está desplegado.** Reglas en `MOTOR_ANTECEDENTES.md`.

## ✅ Hecho esta sesión (20 Jul) — flujo de avalúo/reporte
- **Mapa del formulario:** arreglado (env Vercel vacío → fallback key + Geocoding habilitada). Ubica bien la dirección.
- **PDF del reporte:** faltaba `@page`/`@media print` → el navegador metía sus márgenes y desbordaba a 6 hojas. Ahora `@page margin:0` → **4 hojas A4** exactas, sin márgenes laterales gigantes. (`report_generator.py`)
- **Plusvalía:** barras más bajas (max 82px) para que el `+%` no se salga del recuadro.
- **Entorno real** (Places New) + **folio nuevo** + **dirección tras el Folio** en el header + **nombre de archivo** `PropValu {folio} - {dirección}` (sale del `<title>`).
- **Reseñas/CTAs (`ReportPage.jsx`):** perito ya NO ve "califica valuador" (CTA+modal; el filtro comparaba rol `valuador` vs el real `appraiser`) ni la CTA de inmobiliarias (solo público). CTA inmobiliarias solo en el reporte final (no durante el cálculo). Modal "gracias por tu reseña" con `bg-white` (era transparente por `bg-background` sin definir).
- **Página "gracias" (`ThankYouPage.jsx`):** calificar arriba, descargar abajo (para que califiquen antes), con el nombre del archivo visible en la tarjeta de descarga.
- **Mapa de mis avalúos:** usaba coords FALSAS (centro de municipio + jitter). Ahora usa **lat/lng real** del avalúo, **centrado en el más reciente**, y **click abre modal grande** arrastrable/zoom con **filtro por tipo**. Componente compartido nuevo `components/MapaAvaluos.jsx` → usado en **inmobiliaria** (resumen); en valuador quedó la versión inline (ya funcionaba, no se tocó).
- **Favicon:** ícono de edificio más grande y visible en las pestañas (escala 1.5→2.0, trazo un poco más grueso, amarillo `#D9ED92`); regenerados `.ico`/`-32`/`-64`.
- Commits `431eec0`,`64b0006`,`658f9ed`,`218c3ed`,`0215f1a` pusheados + desplegados.

## ⏳ Pendientes / decisiones abiertas
1. **Contador de folio por presupuesto comprado** (hoy: acumulado por usuario; reinicio por paquete se puede activar sin romper nada).
2. **#29 Render respaldo gratis** — servicio en rama main, FALTAN env vars (usuario las pega). Hacer ~5 días antes de que venza Railway.
3. **#34 SMTP** — recuperación de contraseña no funciona (sin correo saliente). Mientras: link JWT a mano.
4. **~337 colonias raras** (Cancún/Toluca mal etiquetadas) — manual con filtro "datos raros" o descartar.
5. **PINCALI escrapea m² mal** (systemic) — el editar-m² del verificador lo mitiga; fix real en el enricher (sesión aparte).

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (sin env vars aún)
- **Login realtor staging (revisar promociones):** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging).
- Reset password sin SMTP: generar JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente, SIN cambios esta sesión)
- **±20 ~83.5%** (validador offline). Techo = falta DATO, no fórmula. Palanca real = selección de comps por segmento.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE (keys en blanco) antes de cambios · **medir/dry-run antes de wirear nada**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, **22 routers**. Auth Bearer (usuarios) + cookie + X-Admin-Token. Cache motor: MongoDB `cache_consolidado.json`. Deploy backend = `railway up` (CLI enlazado a `propvalu-backend` prod).
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas / 111,946 totales en `mercado_props`.
- Seguridad: incidente 06-jul cerrado. Keys → `credentials_registry.md` (Google Maps + APIs actualizado 20-jul).
- **Módulo nuevo:** `backend/nearby_places.py` (conteo POIs reales Places New para el entorno del reporte). **Componente nuevo:** `frontend/src/components/MapaAvaluos.jsx`.

## 🕐 Diseño parqueado (no construir aún)
- **Diseñador de promocionales "Just Listed"** (tab Promociones inmobiliaria, `LayoutJustListed.jsx` multiformato): build-out grande sesiones 18-20 jul, en repo, revisado en local. Seguir puliendo por feedback.
- **#139/#140/#141** crowdsource edades. **#142** Data Exchange descuento por calidad.
- **Gamificación pública (Local Guides):** la versión INTERNA ya está (17-jul); evaluar variante pública.
