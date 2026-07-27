# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 27 Jul 2026 (noche)
**Fase:** Prod Railway + Vercel público. Sesión de la tarde = **#144 alta manual de propiedades** desplegado a prod. Sesión de la noche (esta) = **pulido de UI en Verificación por Zona + gamificación + dashboard inmobiliaria**, commit `e9b5dd7` pusheado y **desplegado a Vercel prod** (solo frontend, backend sin cambios). Incluye TODO lo acumulado — EstateElite (26-jul) + #144 (tarde) + este pulido de UI (noche) ya están en producción.

## 🔥 SESIÓN 27-JUL (noche) — pulido UI Verificación por Zona + gamificación + dashboard inmobiliaria (commit `e9b5dd7`)

Ronda de ajustes de UI a pedido del usuario sobre lo ya desplegado de #144/gamificación, todo verificado en vivo con claude-in-chrome antes de commitear:

- **`GamificacionVerificador.jsx`:** la caja de ayuda ("Ayuda a completar los datos de tu zona…") se integró a la misma barra verde del récord (antes vivía separada y desalineada) y luego se comprimió a **una sola fila** (el texto de ayuda pasó a un ícono `Info` con tooltip). Se agregó vigencia/canje a **avalúos ganados**: se acreditan como créditos adicionales, **vigencia 3 meses**, texto en el tooltip de la barra, en el panel "Mi récord" y en el festejo de trofeo al llegar a la meta. La gráfica de "Últimos días" ahora muestra la cantidad encima de cada barra y el día del mes debajo (antes solo se veía en el hover).
- **`EdadesZonaPage.jsx`:** el bloque "Verifica y Gana" se movió a la misma fila del título (antes ocupaba una fila propia) para ganar espacio vertical. La fila de filtros (Estado/Municipio/Colonia/Tipo/Buscar/Agregar propiedad/Datos raros) se comprimió (`h-8`, `text-xs`) para caber todo en una sola línea; se unificó altura/borde de la caja de Colonia (`ColoniaCombo`) con las demás (antes se veía más alta). Se redujo el margen entre el título y la tarjeta de filtros.
- **`InmobiliariaDashboardPage.jsx`:** la fila de avisos (Falta de documentos / Data Exchange / Renovar plan) ahora es **colapsable desde una campana en el header** (junto al chip de perfil, roja/con punto si hay cambios sin ver — firma `showKycBanner-docsCompletos` persistida en `localStorage["pv_avisos_vistos"]`) en vez de un botón dentro del flujo del dashboard; al colapsar no deja espacio residual. El chip de perfil ahora muestra **empresa + asesor por separado** (chip empresa con logo si existe, chip asesor con foto+nombre si `session.company_name` y `session.name` difieren) para diferenciar cuentas abiertas en pestañas distintas.
- **Fix de bug introducido a medio camino:** el primer intento de la campana puso un `useEffect` después de `if (!session) return null;` → violación de rules-of-hooks (`Compiled with problems`). Se movió el efecto antes del early-return, usando acceso seguro (`session?.`) y recalculando `docsCompletos`/`showKycBanner` inline ahí mismo.
- **Verificado en vivo** con claude-in-chrome en `/edades-zona` y `/dashboard/inmobiliaria`: capturas antes/después de cada cambio, toggle de campana probado (colapsa/expande, persiste tras reload), sin errores de compilación tras el fix.
- **Desplegado a Vercel prod** (`vercel --prod`, solo frontend — sin cambios de backend esta ronda): `frontend-3hrvic99e-pedrucus-projects.vercel.app` → alias `frontend-rosy-six-74.vercel.app`, `READY`.

## 🔥 SESIÓN 27-JUL (tarde) — hecho (#144, commits `4dc68f5`+`42924a2`)

Objetivo: permitir dar de alta 1 o pocas propiedades al catálogo (`mercado_props`) sin armar un Excel — hoy solo existía la carga masiva de Data Exchange (#133).

- **2 endpoints nuevos, misma lógica de validación/dedup reusada** de `core/data_exchange.py` (`normalizar_fila`/`validar_fila`/`id_unico_data_exchange`): `POST /api/inmobiliaria/data-exchange/manual` (inmobiliaria, escribe CRM+pool, cuenta para el descuento por calidad) y `POST /api/comparables/manual` (perito/inmobiliaria/admin vía el mismo patrón de doble auth `_quien()` que ya usa `edades.py`, solo pool). Máx 10 filas por alta. Refactor: `fila_a_doc_pool`/`fila_a_doc_crm` extraídos para que `confirmar()` (carga masiva) y las altas manuales compartan el mismo código de escritura — cero duplicación.
- **Campo `link` de origen** (opcional): se guarda como `url_original`, se verifica en vivo con `httpx` best-effort (nunca bloquea el guardado — varios portales como PINCALI sueltan soft-block a requests automáticos) y se usa para deduplicar contra el pool además del dedup por dirección existente.
- **Remodelación y edad por rango**, igual que Verificación por Zona: check "¿Se remodeló?" que despliega Grado+Año, y toggle Año exacto / Rango para la edad. Nuevos campos opcionales `grado_remodelacion`/`anio_remodelacion` en el schema de `core/data_exchange.py` y en `mercado_props`.
- **Frontend:** componente compartido `PropiedadManualForm.jsx` (modal, hasta 10 propiedades, grid denso de 7 columnas para minimizar scroll), integrado en el tab **Data Exchange** de la inmobiliaria y en **Verificación por Zona** — sin agregar filas nuevas a las barras existentes. Amenidades por iconos (reutiliza `AMENIDADES_ICONS` de `PromocionesTab.jsx`, ahora exportado) en pastillas icono+texto.
- **Bug de raíz encontrado de paso (no introducido hoy, ya existía):** `frontend/src/index.css` tenía `--background`/`--primary`/`--secondary`/`--accent`/`--border` definidas DOS veces — una en hex plano (`:root` sin `@layer`) y otra en HSL-triplete (`@layer base :root`, la que Tailwind necesita para `hsl(var(--x))`). Por cómo Tailwind hoiste `@layer`, el hex ganaba la cascada → `bg-background`/`bg-primary`/etc quedaban con CSS inválido → **fondo transparente en cualquier componente que use esas clases, en TODO el sitio** (no solo en el modal nuevo). Fix: hex renombradas a `--hex-*` (solo las usa scrollbar/body vía `var()` plano, sin `hsl()`).
- **Verificado en vivo** con claude-in-chrome (login realtor real): botones "Descargar Plantilla" y "Agregar propiedad manualmente" medidos por DOM (`getBoundingClientRect`+`getComputedStyle`) — 36px de alto, mismo `top`, confirmado pixel a pixel, no solo a ojo.
- **13/13 tests backend pasan** (`test_data_exchange.py`, incluye casos nuevos de `link`/dedup por URL/shape de docs).

**Detalle largo de la ronda de ajustes de UI (iteración con el usuario, muchos micro-fixes) → `BACKLOG_ARCHIVE.md`.**

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **#144 + pulido de gamificación/dashboard: HECHO, pusheado y DESPLEGADO A PROD** (Vercel, esta noche).
- **Política de avalúos ganados confirmada por el usuario:** se acreditan como **créditos adicionales** en la cuenta, **vigencia 3 meses** desde que se ganan. Ya reflejada en la UI (tooltip barra, panel récord, festejo trofeo) — si cambia la política de negocio, actualizar esos 3 puntos en `GamificacionVerificador.jsx`.
- **REGLA NUEVA DE DISEÑO (memoria `feedback_diseno_alineacion_filas`):** antes de dar por buena cualquier UI con filas/cajas alineadas, revisar (a) `items-stretch` solo funciona si NINGUNA caja interna usa `justify-between` (empuja botones al fondo) — primero quitar justify-between, después stretch; (b) dos botones con la misma altura declarada pueden verse distintos si uno tiene `border` visible y el otro no — igualar grosor Y color de borde, no solo el grosor; (c) un `<Select>` (shadcn) y un `<Button variant="outline">` usados como combobox no se ven iguales por defecto — igualar explícitamente `h-*`, `text-*` y el estilo de borde verde-al-seleccionar.
- **EstateElite: plan completo implementado y commiteado desde 26-jul — ya en producción** (incluido en el deploy de la tarde).
- **PINCALI: re-enriquecimiento sigue bloqueado por soft-block del portal** (verificado 26-jul, no se enfrió en 3 días) — no reintentar tal cual, necesita proxy rotativo o backoff mucho mayor.
- **Motor JS (sesión #5): 103/207 (±10%), 131/207 (±15%), 152/207 (±20%), errAbs 15.2%.** No tocado.
- **NSE nuevo/usado: bloqueador de volumen de datos, no de fórmula.**
- **REGLA DURA vigente:** nunca `build_cache_index.js` completo para un fix puntual — parchar la celda a mano.
- **PINCALI solo español** — regla dura.

## ⏳ Pendientes / decisiones abiertas
1. Anclas cliqueables dentro del PDF de EstateElite.
2. Mejorar letterbox del formato Facebook de EstateElite (fondo desenfocado).
3. Verificar responsividad móvil real de `PromocionesTab` en un teléfono físico.
4. Retomar re-enriquecimiento PINCALI — bloqueado por soft-block, necesita proxy/backoff.
5. **Wirear de verdad** "avalúos ganados" al saldo de créditos en backend — la política ya está definida (créditos adicionales, vigencia 3 meses) y reflejada en la UI, pero el acreditado real a la cuenta al llegar a la meta sigue sin implementarse.
6. Meta tags Open Graph por propiedad en Promo Interactiva.
7. Contador de folio por presupuesto comprado.
8. #29 Render respaldo gratis — en pausa. #34 SMTP — sin correo saliente.
9. ~337 colonias raras (Cancún/Toluca mal etiquetadas).
10. Verificar en vivo el flujo de #144 desde **Verificación por Zona** (solo se probó a fondo el de Data Exchange) — perito/admin.
11. Considerar exponer también el link de origen / remodelación en el formulario de carga masiva (`plantilla.xlsx`) — hoy la plantilla no tiene esas columnas nuevas, solo el alta manual.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby, único environment "production")
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging, cluster1.avle5ez — bloqueado por IP allowlist de Atlas).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico (validador 207 OPIs):** `motor_remi_api.js`. Validador: `validar_40_opis.js --n 1000`. Baseline sesión #5: ±10 49.8% / ±15 63.3% / ±20 73.4% / errAbs 15.2%.
- **Piso espejo del techo (`poolTipo=exacta`, n≥10, ±5%)** — graduado sesión #5, en producción.
- **`buscarCompsConWeb` ahora valida colonia** (fix Ixtepete) — solo afecta al fallback de búsqueda web, no al pool cacheado.
- **Parche depto-edad `gap6`** — confirmado en prod (`main:Modulo Drive IA/motor_remi_api.js:1068`, sin flag de lab).
- **⚠️ Pipeline de REPORTES REALES es código separado** (`backend/server.py: calculate_valuation` + `backend/mongo_comparables.py`) — no comparte nada con el motor JS de arriba.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE/determinista antes de cambios · medir/dry-run antes de wirear · **NUNCA rebuild completo del índice para un fix puntual**.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, 22 routers. Deploy = `railway up` manual.
- MongoDB: **prod real = `cluster0.9eliadx`** (backend local apunta a `cluster1.avle5ez`, staging, bloqueado por IP allowlist de Atlas — `railway run` sirve para correr scripts contra prod real desde local).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso completo, actualizar si se retoma.
- **PINCALI cobertura (post-limpieza, 38,990 activos):** colonia 99.3%, municipio 100%, precio 99.9%, m²c 78.2%, recámaras/baños 63-67%, año 45.2% (techo real, dato faltante del vendedor).
