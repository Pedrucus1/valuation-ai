# Fuentes externas metropolitanas — antecedente/respaldo

Investigación 22/23-jul-2026: URLs compartidas por el usuario como posible insumo para
avalúos (equipamiento, calificación de colonias, uso de suelo, seguridad). Evaluadas con
WebFetch + navegador (Chrome/agent-browser) en vivo. Ninguna integrada al pipeline todavía
— solo documentadas para consulta futura.

## Alto valor — candidatas reales a integrar

### 1. IIEG Datos Abiertos — https://iieg.gob.mx/ns/?page_id=158
Instituto de Información Estadística y Geográfica de Jalisco. Datos Abiertos descargables
(shapefiles, indicadores), cubre nivel colonia/AGEB en el AMG: demografía, economía,
seguridad, equipamiento urbano. **La más prometedora** para integración estructurada.

### 2. IMEPLAN Zoom Metropolitano — https://zoom.imeplan.mx/mapa
**Mejor que el visor estatal de Jalisco para este propósito.** "Sistema de Información
Geográfica Metropolitana" del IMEPLAN (Instituto Metropolitano de Planeación del AMG).
Revisado en vivo, capas confirmadas por categoría:
- **Ordenamiento Territorial:** Diagnóstico PDM + POTmet 2024, **Estrategia POTmet 2024**
  (zonificación/uso de suelo metropolitano — esto es lo que no se encontró en
  mapa.jalisco.gob.mx), Monitor de crecimiento urbano, Asentamientos de Origen Irregular,
  Instrumentos de Gestión de Suelo, Áreas Naturales Protegidas AMG.
- **Movilidad:** PIMUS, Encuesta Origen-Destino 2023, Transporte Público, Movilidad Activa
  (ciclovías), Infraestructura para la movilidad, Accesos Carreteros — relevante para
  "conectividad/walkability" de una colonia.
- **Resiliencia** y **Medio Ambiente** — no revisadas a fondo, pendiente.
Interactivo (visor tipo ArcGIS/Leaflet), con selector por municipio y búsqueda de dirección.

**23-jul-2026 — CONFIRMADO API pública sin auth, no hace falta scraping visual:**
- Backend del visor: `https://zoom.imeplan.mx/rest/v1/` (Django REST Framework, browsable).
  `categories_with_menus/` (~540KB) da el árbol completo categoría→tema→subtema→capa con
  el nombre real de GeoServer en el campo `capa` de cada nodo hoja (`type: "Capa"`).
- Datos geo: GeoServer en `https://geoserver.imeplan.mx/geoserver/sigmetro/{wms,ows}` (espejo
  `geoserver2.imeplan.mx`), workspace `sigmetro`, sin login. WFS 2.0.0 confirmado funcionando.
- **Estrategia POTmet 2024 → Zonificación Primaria** (uso de suelo metropolitano) =
  layer `sigmetro:vwZonificacion_primaria_POTmet_2024`. 10,590 polígonos AMG. Atributos:
  `Clasificación_general_del_área`, `Subclasificación`, `Municipio`. Descarga directa GeoJSON:
  `https://geoserver.imeplan.mx/geoserver/sigmetro/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=sigmetro:vwZonificacion_primaria_POTmet_2024&outputFormat=application/json&srsName=EPSG:4326`
- Hay decenas más de capas POTmet públicas por el mismo WFS (equipamiento urbano, riesgos,
  centralidades, vialidad, etc. — ver `GetCapabilities` en el mismo `/ows`). No integrado al
  pipeline todavía, solo confirmado que es viable sin scraping visual.

## Valor medio — consulta puntual, no integración sistemática

### 3. ONC — Observatorio Interactivo de Incidencia Delictiva —
https://delitosmexico.onc.org.mx/mapa/jalisco
Observatorio Nacional Ciudadano. Mapa interactivo de delitos por Jalisco, filtrable por
indicador/periodo/tipo de delito vía query params (`unit`, `indicator`, `period`, `crime`).
Pendiente confirmar en vivo: granularidad geográfica exacta (¿llega a colonia o solo
municipio?), si trae serie histórica descargable. Por el diseño de la URL (filtros por mes/
año) probablemente sí tiene histórico — más prometedor que AlertaRoja para dato
ESTRUCTURADO de seguridad, a diferencia de los reportes ciudadanos en tiempo real.

### 4. AlertaRoja — https://www.alertaroja.mx/
Reportes ciudadanos en tiempo real (bloqueos, incidentes), nacido de los narcobloqueos de
feb-2026. Nivel ciudad, no colonia. Sin datos descargables, mapa "en desarrollo". Útil solo
como consulta manual puntual para un caso específico, no para integrar sistemáticamente.

## Bajo valor / descartadas

### 5. Mapa Jalisco (visor estatal) — https://mapa.jalisco.gob.mx/mapa/zapopan
Revisado en vivo con Chrome. Capas: cartografía base (planimetría/altimetría/ortofoto),
medio ambiente (biodiversidad/erosión/sequía), IIEG (salud, ámbito urbano — solo "puentes
peatonales"), IMEPLAN (solo capa de Emergencias vía VIMOZMETRO), Ordenamiento Territorial
(Ecológico/Urbano, no explorado a fondo). Sin capas de "equipamiento", "uso de suelo" ni
"delitos" — se buscaron esos términos exactos en el filtro y no hay resultados. **El #2
(IMEPLAN Zoom) cubre mejor este mismo tema.**

### 6. MapaLab IIEG — https://iieg.jalisco.gob.mx/mapalab/
Bloqueado (HTTP 403, anti-bot) al intentar leer con WebFetch. Mismo organismo que el #1
(IIEG), probablemente misma base de datos por otra puerta. No se insistió — bajo prioridad
frente al #1 que sí es accesible.

### 7. Post de X — https://x.com/joraplas/status/2011302762118856757
No se pudo cargar (bloqueado / requiere pago en el fetch). Pendiente si el usuario pega el
contenido directamente.

## Siguiente paso si se decide integrar
Empezar por **IIEG Datos Abiertos (#1)** — descarga directa, sin fricción de scraping.
**IMEPLAN Zoom (#2)** es el segundo candidato fuerte, específicamente la capa "Estrategia
POTmet 2024" (uso de suelo) — requiere inspeccionar si el visor expone un endpoint
REST/WMS/WFS detrás (común en apps ArcGIS/Leaflet) antes de asumir que hace falta scraping
visual. Ninguna de las dos se ha tocado en código todavía — esto es solo el mapeo de qué
existe y cuánto vale la pena.
