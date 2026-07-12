# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 11 Jul 2026
**Fase:** Prod en Railway (Hobby PAGADO) + Vercel público. Herramienta "Verificación de Datos por Zona" muy mejorada. Base de colonias limpiada con IA.

## 🔥 Lo más caliente (qué sigue)
0. **⭐ VERIFICAR la limpieza de colonias con IA (PRIORIDAD del usuario).** Revisar muestra de las 3,747 derivadas por DeepSeek (`colonia_fuente=ia_derivada`) — que la colonia extraída sea correcta y coincida con SEPOMEX/existentes (no inventadas). Correr find_one/muestreo por municipio. Backups en scratchpad si hay que revertir. Luego decidir sobre las ~337 raras restantes.
1. **#29 Render como respaldo gratis** — servicio `valuation-ai-1` ya en rama `main`; FALTAN las env vars (MONGO_URL/DB_NAME/ADMIN_SECRET/ADMIN_EMAIL/JWT_SECRET/JOBS_SECRET/TAVILY_API_KEY) — el usuario las pega, yo no puedo teclear secretos. Hacerlo **~5 días antes de que venza Railway**. Detalle en BACKLOG #29.
2. **#34 SMTP** — recuperación de contraseña NO funciona (no hay correo saliente). Configurar SMTP en Railway (Gmail app password o SendGrid). Mientras: reset se destraba generando el link JWT a mano.
3. **~337 colonias raras** que la IA no pudo derivar (Cancún/Toluca mal etiquetadas, calles sin colonia). Revisión manual con el filtro "datos raros", o descartar las de otras ciudades.
4. **#136/#137** ahora más viables: la base de colonias quedó limpia (medias por colonia útiles).

## ✅ Hecho reciente (10–11 Jul)
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
