# Arquitectura de datos del motor de valuación

> Mapa simple de qué archivo hace qué. Si dudas de dónde sale un dato, empieza aquí.

## El motor lee UN archivo

`colonias_maestro.json` — un registro por colonia, con todo en columnas:

```
"campo real": {
  municipio, zona,          ← referencia (no es la llave; sirve para filtrar similares)
  nse: { v1, v2 },          ← nivel socioeconómico / precio por m²
  idx: { casa, terreno...}, ← precio mediano por tipo y tamaño
  similares: [ ... ]        ← colonias comparables
}
```

Búsqueda instantánea por nombre de colonia (no recorre toda la base). Regenerar:
`node construir_maestro.js`. El motor usa la ruta vieja solo si el maestro no existe (red de seguridad).

## Dos capas (NUNCA se sobreescriben entre sí)

| Capa | Campo | De dónde viene | Quién la llena | Prioridad |
|---|---|---|---|---|
| **Ganada** | `nse.v1` | `colonias_nse.json` | Perito (calibración verificada) | 1 — gana siempre |
| **Derivada** | `nse.v2`, `idx` | scraper (`cache_consolidado` → `idx_valoracion`) | Automático | 2 — respaldo |

**Cascada NSE:** `nse.v1 → nse.v2 → idx[tipo].global → idx.casa.global`. La v1 (perito) tiene
prioridad porque es la más cercana a la realidad. La derivada solo se usa donde no hay v1.

Las dos capas viven en columnas separadas del mismo registro: agregar datos a una **no borra** la otra.

## Temporalidad

- **Derivada:** ventana móvil de **18 meses** (`idx_valoracion._meta.ventanaMeses`). Cada listing
  trae fecha (`fs`). Se recalcula al regenerar el índice → los datos viejos salen solos.
- **Ganada:** cada entrada de v1 puede llevar `fecha_verificacion` (opcional). Hoy ninguna la tiene;
  el flywheel mensual (abajo) las irá poniendo. El maestro la propaga automáticamente.

El maestro guarda esto en `colonias_maestro.json._meta` (fechas, ventana, leyenda de capas).

## Base de comparables acumulada (Fase 3a — ACTIVO)

Cada avalúo que hace búsqueda web (Serper→DeepSeek, simula a un humano buscando en Google, sin el
bloqueo de IP del scraper) guarda los comps reales **con URL** en `comps_acumulados.ndjson`
(append-only, una línea por comp → seguro entre avalúos simultáneos). Antes esos comps se
descartaban; ahora **la base de comparables útiles crece sola con cada valuación**.

- No altera la valuación (solo persiste un log). Desactivar: `MOTOR_NO_ACUMULAR=1`.
- Consolidar/dedup por URL: `node consolidar_comps_acumulados.js` → `comps_acumulados.json`.
- Pendiente (3b): que esta base alimente el pool de comparables (meta ~15 por avalúo, ponderado por
  calidad: exacta > similares > zona), medido contra el baseline para no diluir la precisión.

## Flywheel mensual del valor del perito (Fase 3 — pendiente)

Cada avalúo nuevo del perito se vuelve una calibración verificada → se agrega/actualiza en
`colonias_nse.json` con su `fecha_verificacion`. Así la capa ganada **crece sola cada mes** con
datos reales. El maestro se regenera y el motor usa lo más reciente y confiable.

## A nivel nacional (Fase 4 — pendiente)

Un maestro por estado (`maestro_jalisco.json`, ...). El motor carga **solo el estado del sujeto**,
no todo el país → eficiente sin importar el tamaño total. Mismo esquema replicado (regla general).
`municipio` se queda como columna de referencia (no llave) para que colonias colindantes de
municipios vecinos sigan siendo comparables; eso se afina en la regla de selección de similares.

## Archivos fuente (inputs editables — el maestro se construye de aquí)

- `colonias_nse.json` — capa ganada (v1). **Editar aquí las calibraciones del perito.**
- `cache_consolidado.json` → `cache_index.json` / `idx_valoracion.json` — capa derivada (scraper).
- `colonias_similares.enriquecido.v2.json` — similares con municipio/zona resueltos.
- `sepomex_v2.json` — catálogo colonia→municipio (para construir similares).

Backups en `_backups/`. Diagnósticos sueltos no los lee el motor.
