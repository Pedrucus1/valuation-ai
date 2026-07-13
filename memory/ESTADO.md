# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 11 Jul 2026
**Fase:** Prod en Railway (Hobby PAGADO) + Vercel público. Herramienta "Verificación de Datos por Zona" muy mejorada. Base de colonias limpiada con IA.

## 🔥 COMPENDIO DE TAREAS DEL VERIFICADOR (dejadas 12-jul, retomar aquí)
> Herramienta "Verificación de Datos por Zona" (`EdadesZonaPage.jsx` + `routers/edades.py`). Ya en prod. Todas ⏳.

**A. Conservación / fórmulas (verificar empate con el motor):**
- Mover **"Conservación" ARRIBA de "se remodeló"** en la ficha (reordenar).
- Cambiar estado **"Excelente" → "Muy Bueno"** para que empate con las fórmulas del motor. **VERIFICAR** que la escala `CONSERVACIONES` del verificador coincida con la que usa el motor (revisar MOTOR_ANTECEDENTES / factorConserv).

**B. Tipos de propiedad — agregar más** (ya se agregó Rancho + multi-select dropdown): edificio, escuela, **oficinas** (conjunto de oficinas, nombre corto), hotel, **conjunto apartamentos**, **conjunto mini apartamentos**, **terreno con construcciones**, **salón de eventos**, **centro comercial**. Sugerencias extra a proponer: nave industrial, plaza comercial, penthouse, loft, casa en condominio, usos mixtos.
- **Check "uso mixto" FUERA del dropdown** cuando la casa tenga local comercial (casa con local).

**C. Terrenos:** si NO trae construcciones, **omitir la revisión de EDAD** (no aplica a terrenos en venta). Mantenerlos en la lista **solo para revisar/corregir colonia**. Pedir edad solo si trae construcciones.

**D. Pills bajo la dirección:** mostrar **VENTA o RENTA** (`tipo_operacion`) — hay misma propiedad en anuncios distintos (uno venta, otro renta), confunde.

**E. Corrección refleja en el TÍTULO:** al corregir colonia, actualizar el nombre mostrado en la ficha/título — hoy tras revisar aparece el nombre ORIGINAL, no el corregido → confunde si se hizo o no.

**F. "Aplicar a otras propiedades":** poner **aviso preventivo** (confirmación) antes del apply en lote. Además ese botón sale en props FUERA de coto → acotar/detallar (casas iguales en fracc fuera de coto son pocas, agrupa con cuidado).

**G. Gamificación / record del día:** mostrar el **record del día** (cuántas capturó hoy vs otros días) ABAJO de la medallita del total. (+ idea celebración count-up parqueada.)

**H. PINCALI (datos/enricher) — es donde está el desmadre:**
- Detectar/filtrar **remate / recuperación bancaria** (viene en TÍTULO o DESCRIPCIÓN) → excluir o marcar (precio no de mercado, como juicio/remate). Afinar en scraper/enricher.
- **DEDUP PINCALI:** hay propiedades DUPLICADAS en la BD (ej. "Alcázar Oriente Zapopan") → dedup.
- Enricher PINCALI: capturar **descripción + dirección/Maps** para derivar colonia al scrapear (análisis previo: PINCALI aportó 2,619 de 3,747 fixes IA; su `descripcion` está vacía, no hay dirección/CP/geo).

**I. Pregunta abierta del usuario:** tras corregir una colonia, ¿la colonia vieja debe DESAPARECER del listado del selector? (reconciliación verificado↔original).

**J. Verificar limpieza colonias IA** (3,747 `ia_derivada`): revisar muestra por municipio que la colonia extraída sea correcta. Backups en scratchpad reversibles. ~337 raras restantes (Cancún/Toluca/calles) → manual.
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
