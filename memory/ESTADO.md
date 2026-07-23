# Estado del Proyecto: PropValu — SNAPSHOT

> **Único archivo que se lee al iniciar** (corto, siempre vigente). Tareas por # → `BACKLOG.md` (grep). Historial → `BACKLOG_ARCHIVE.md`. Motor → `MOTOR_ANTECEDENTES.md` (grep). **Se sobrescribe en cada cierre de sesión.**

**Última actualización:** 22 Jul 2026 (d)
**Fase:** Prod Railway + Vercel público. Sesión 22-jul-d = **scraper on-demand por colonia arreglado y aplicado al caso Cuarzo/Bosques de la Victoria**, commit `5b8243a` (pusheado).

## 🔥 SESIÓN 22-JUL-d — hecho
- **`buscar_comparables_browser.js` arreglado.** Root cause del "0 resultados": Chrome de `agent-browser` sin instalar + 3 portales mal enfocados (Cloudflare i24, 404 CyT, Akamai propiedades.com). Reescrito SIN navegador: PINCALI/NOCNOK requests simple, CasasYTerrenos MeiliSearch (`filter: neighborhood`, exacto server-side), Propiedades.com fetch nativo con **URL directa por colonia confirmada y generalizable**: `propiedades.com/{colonia-kebab}-{municipio-slug}/{tipo}-venta`. Inmuebles24 fuera de alcance (necesita Playwright fresh-browser).
- **`insertar_comparables_ondemand.py` (nuevo)** — sube los comps a Mongo PROD reusando `scheduler._guardar_en_mongo` (mismo chokepoint/dedup del pipeline normal, no reinventado).
- **Caso Cuarzo (Calle Cuarzo 2380, Bosques de la Victoria, depto 45a) resuelto con datos reales:** 8 comps directos en BV + ampliado a las **16 colonias similares** (`colonias_maestro.json→similares`), municipio de cada una VERIFICADO contra `sepomex_v2.json` (no asumido) → **~180 comps nuevos/actualizados** en `mercado_props`. Detalle completo en `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md`.
- **Corrección de premisa:** BV ya tenía 35 docs depto-venta (no ~0 como se creía en sesiones previas) — ~28 son PINCALI obra nueva/preventa (`anio_construccion=2026`). Confirma que el fix real es **NSE nuevo/usado**, no más scraping bruto.
- **Bug propio encontrado y corregido:** Propiedades.com usaba la URL de LISTADO (compartida) como `url_original` de cada comp → `id_unico` colapsado, cada upsert pisaba al anterior. Fix aplicado (URL real del anuncio); 9 docs corruptos borrados y 74 comps reales recuperados al re-correr. Verificado: 0 docs sospechosos restantes en `mercado_props`.
- **Bug sistémico flagged (NO corregido):** `generar_similares_sepomex.js` lee `sepomex_jalisco.json` (1 sola entrada por nombre de colonia, colisiona) en vez de `sepomex_v2.json` (preserva todas). Medido: **1,017/6,542 nombres (15.5%) tienen 2+ municipios/estados distintos** — puede contaminar el campo `similares` de cualquier colonia del maestro, no solo BV.
- **Enrichers de año lanzados en background** (procesos de sistema independientes, sobreviven al cierre de sesión): PROPIEDADES_COM completado (74/74, 0 errores). CASAS_Y_TERRENOS, NOCNOK, INMUEBLES24 en curso al cerrar — revisar logs `scraper-inmuebles/enricher_*.log` la próxima sesión.

### ⏭️ PRÓXIMA SESIÓN
1. **Revisar enrichers** (`enricher_cyt.log`, `enricher_nocnok.log`, `enricher_i24.log`) — ¿terminaron? ¿errores?
2. **Usar los comps nuevos en el avalúo Cuarzo real** — segmentar por edad/antigüedad antes de promediar (BV mezcla obra nueva $58-71k/m²C con usado $22-40k/m²C).
3. **Ampliar a las ~72 colonias débiles restantes** de `colonias_debiles_scraper.md` (fuera del cluster BV) con el scraper ya arreglado.
4. **Fix bug sistémico SEPOMEX:** migrar `generar_similares_sepomex.js` a `sepomex_v2.json`, decidir desambiguación cuando hay 2+ candidatos en el MISMO municipio, regenerar+revalidar `colonias_maestro.json` completo.
5. **NSE nuevo/usado × tipo de propiedad** — separar `idx.casa.usado`/`idx.casa.nuevo` (y extender a depto/local/oficina/bodega) en `colonias_maestro.json`. Blocker = cobertura de año (mejorando con los enrichers de hoy). Ver memoria `project_propvalu_nse_nuevo_usado`. Necesita su propio scope antes de tocar código.
6. **Lab valuación minimalista:** `motor_simple` = mediana $/m²C de N comps cercanos × m²C, sin cascada NSE/IDX/Ross-Heidecke. Validador 400 OPIs vs motor actual. No arrancado.

## 🔙 Historial reciente (condensado — detalle en `BACKLOG_ARCHIVE.md`)
- **22-jul-c:** Fix comparables de zona DESPLEGADO (`8fe0946`) — vecinas geográficas reales vía `proximidad.py`, nunca "todo el municipio". Equipamiento (`nearby_places.py`) sin negocios cerrados. Cache rebuild MEDIDO y descartado (regresión por pools chicos n≤6) → identificadas 86 colonias débiles.
- **22-jul-b:** Rama `fix/flujo-avaluo-reporte-jul20` desplegada (motor Opción C + gap6 en prod). BV similares movidas al maestro (`1722bcc`). Dirección aprobada: NSE nuevo/usado × tipo (blocker=año).
- **22-jul:** Flujo web/ads/reporte — múltiples fixes desplegados. Investigación inicial Cuarzo (premisa "BV ~0 deptos" — corregida esta sesión, ver arriba).

## ⚡ LO MÁS CALIENTE / decisiones vigentes
- **Motor — parche depto-edad `gap6` GRADUADO a `motor_remi_api.js`** (commit `e8ed0fd`, en rama, sin desplegar). `_gapEdad = tipo==='depto' ? 6 : 25`. Validado OFFLINE: deptos 68→76% ±20, global 69.3→70.7%, cero regresión en casas. **Decisión pendiente: mergear+desplegar.**
- **Recuperar i24 (t→c depto) = MEDIDO NEGATIVO, NO implementar** — 64% de lo recuperable es obra nueva, empeora. Lever real = inventario de deptos USADOS.
- **Método "banda por edad del sujeto"** (`LAB_ANCLA_SEG`) es el fix correcto a futuro pero inerte hoy (falta cobertura de año en usados).
- **Motor: NO reconstruir el caché a ciegas.** El del 7-jul (63.1/74.8/83.5) sigue siendo el desplegado.
- **PINCALI solo español (`/inmueble/`)** para colonia/año — regla dura, respetada en el fix de hoy.

## ⏳ Pendientes / decisiones abiertas
### De sesiones previas sin desplegar
0. **Mergear a main + desplegar** rama `fix/flujo-avaluo-reporte-jul20` completa (Opción C motor + revisión flujo/ads/reporte). Pusheada, falta merge + Railway + Vercel.
1. **Mergear + desplegar el parche gap6** a prod.
2. **Contador de folio por presupuesto comprado** (hoy: acumulado por usuario).
3. **#29 Render respaldo gratis** — faltan env vars.
4. **#34 SMTP** — recuperación de contraseña sin correo saliente. Mientras: link JWT a mano.
5. **~337 colonias raras** (Cancún/Toluca mal etiquetadas) — manual o descartar.
6. **PINCALI/CyT escrapean m² mal** (systemic) — fix en el enricher, sesión aparte.

## 🌐 URLs / accesos
- **Sitio (público):** https://frontend-pedrucus-projects.vercel.app (alias prod: frontend-rosy-six-74.vercel.app)
- **Backend API:** https://propvalu-backend-production.up.railway.app (Railway Hobby)
- **Render (respaldo, a medio configurar):** https://valuation-ai-1.onrender.com (sin env vars aún)
- **Login realtor staging:** `pedrucus@gmail.com` / `PropValu2026!` (backend local :8000 → staging).
- Reset password sin SMTP: JWT (`JWT_SECRET` de Railway, type=reset_password) → `/reset-password?token=...`

## 🧠 Motor (vigente)
- **Canónico:** `motor_remi_api.js` (+ `_lab.js` con flags `LAB_*`, incl. `LAB_EDAD_DEPTO`). Validador: `validar_40_opis.js` (prod) / `validar_lab.js` (lab). **Correr OFFLINE** (`GEMINI_API_KEY= SERPER_API_KEY= TAVILY_API_KEY= DEEPSEEK_API_KEY=`) — nunca online en lote.
- **Baseline** (cache 7-jul, sin MITULA): ±10 60.2 / ±15 68.0 / ±20 79.6 (offline --n400 ~69-71%). Con gap6: deptos +8pp, casas sin cambio.
- **Pipeline:** `actualizar_cache_consolidado_mongo.py` (Mongo→consolidado) → `build_cache_index.js` (→cache_index) → `construir_idx_valoracion.js` (→idx_valoracion) → motor → validador. Ver `DICCIONARIO_ARCHIVOS.md`.
- Reglas irrompibles: NO NSE v1→v2 · NO cazar atípicos · validador OFFLINE antes de cambios · **medir/dry-run antes de wirear**. Fuentes de verdad: `MOTOR_ANTECEDENTES.md`, `ESQUEMA_CAMPOS.md`, `INDICE_MOTOR.md`.

## 🏗️ Infra / datos
- Railway (backend): `start.py`, scheduler off, **22 routers**. Auth Bearer + cookie + X-Admin-Token. Deploy backend = `railway up`.
- MongoDB: prod cluster0, staging `cluster1.avle5ez`. ~102k props activas / 111,946+ totales en `mercado_props` (creciendo con el scraper on-demand).
- Seguridad: incidente 06-jul cerrado. Keys → `credentials_registry.md`.
- **`.env` local del scraper apunta a PROD** (no staging pese al comentario de `db_target.py` — verificar si se quiere cambiar).
- `Modulo Drive IA/CUARZO_BOSQUES_VICTORIA.md` — caso de uso completo + bug sistémico SEPOMEX documentado.

## 🕐 Diseño parqueado (no construir aún)
- **Banda-por-sujeto del motor** (LAB_ANCLA_SEG): reactivar cuando suba cobertura de año de deptos USADOS.
- **Diseñador de promocionales "Just Listed"** (`LayoutJustListed.jsx`): en repo, pulir por feedback.
- **#139/#140/#141** crowdsource edades. **#142** Data Exchange descuento por calidad. **Gamificación pública.**
