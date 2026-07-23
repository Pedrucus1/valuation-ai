# Cuarzo — avalúo Bosques de la Victoria (Guadalajara)

Links pasados por el usuario (22-jul-2026, 3ra vez que se pasan en distintas sesiones —
guardar SIEMPRE en archivo, no solo en memoria, si la tarea no se termina en la sesión):

- https://www.inmuebles24.com/departamentos-en-bosques-de-la-victoria.html
- https://www.inmuebles24.com/departamentos-en-venta-en-bosques-de-la-victoria.html
- https://propiedades.com/bosques-de-la-victoria-guadalajara/departamentos-venta
- https://www.casasyterrenos.com/jalisco/guadalajara/bosques-de-la-victoria/departamentos/venta

**Nota clave (confirmada 22-jul):** Propiedades.com expone URL de listado directo POR COLONIA
con patrón generalizable `https://propiedades.com/{colonia-kebab}-{municipio-slug}/{tipo}-venta`
(probado con Independencia-Guadalajara y Seattle-Zapopan, ambos devuelven la colonia correcta;
slug inexistente da 404 real, no fallback silencioso). Ya implementado en
`buscar_comparables_browser.js` (1er intento URL directa, fallback municipio-wide + match).

Contexto del avalúo (de `MOTOR_ANTECEDENTES.md`/`BACKLOG_ARCHIVE.md`): subject = Calle Cuarzo 2380,
Bosques de la Victoria, depto ~75m² construcción, edad ~45 años (OPI-25-1-42-AV). Investigación previa
había encontrado BV con ~0 deptos de venta en Mongo (hueco de COLONIA, no sistémico — GDL completo
tiene 1547 deptos). Motor jalaba comps de otras colonias por eso.

## Resultado del scraper on-demand arreglado (22-jul, m²=75, departamento venta)
**8 comparables reales encontrados** en BV (antes: 0, script roto):
| Precio | m²C | $/m²C | Fuente |
|---|---|---|---|
| $5,680,000 | 80 | $71,000 | CasasYTerrenos |
| $1,530,000 | 67 | $22,836 | CasasYTerrenos |
| $6,400,000 | 92 | $69,565 | CasasYTerrenos |
| $2,700,000 | 84 | $32,143 | Propiedades.com |
| $2,850,000 | 61 | $46,721 | Propiedades.com |
| $6,600,133 | 113 | $58,408 | Propiedades.com |
| $3,700,000 | 100 | $37,000 | Propiedades.com |
| $2,200,000 | 55 | $40,000 | Propiedades.com |

Spread amplio ($22.8k–$71k/m²C) — BV mezcla obra nueva/premium con stock usado modesto. Para un
subject de 45 años, los comparables más relevantes son los del extremo bajo (~$22.8k–$40k/m²C:
filas 2, 4, 5, 8), no los $58-71k (esos son unidades nuevas/premium). **No promediar todo el pool
sin segmentar por edad/antigüedad** — mismo patrón de "NSE nuevo/usado" ya documentado para casas.

PINCALI e Inmuebles24 no aportaron (Inmuebles24 fuera de alcance del script, PINCALI sin match en
esta corrida — no investigado más a fondo).

## Estado
- [x] Verificar patrón de URL por colonia en Propiedades.com — confirmado y generalizable
- [x] Correr el scraper arreglado sobre Bosques de la Victoria — 8 comps reales
- [x] **Subido a Mongo PROD (`mercado_props`)** vía `insertar_comparables_ondemand.py` (reusa
  `scheduler._guardar_en_mongo`, mismo chokepoint que el pipeline normal — no reinventa dedup).
- [x] **Corrección de premisa (22-jul):** BV en realidad YA tenía 35 docs depto-venta en Mongo, no
  ~0 como decía la investigación previa (quedó obsoleta). El problema real: ~28 son PINCALI con
  `anio_construccion=2026` (obra nueva/preventa) — confirma la necesidad del split NSE nuevo/usado.
  Solo 2-3 docs son usados con año real (1996, 1999); los 6 recién insertados (CasasYTerrenos/
  Propiedades.com) no traen año del portal — pendiente enricher.
- [x] **Ampliado a las 14 (de 16) colonias similares de BV** (`colonias_maestro.json → similares`,
  fuente=manual), municipio resuelto contra el maestro (Guadalajara/Zapopan según corresponda):
  **76 nuevas + 124 actualizadas** en `mercado_props`. Sin resultados: Residencial del Bosque,
  Jardines de la Victoria, Parque de las Estrellas (0 en portales, no error).
  **"Loma Bonita" y "La Estancia" NO se omitieron finalmente** — se verificó el municipio real
  contra `sepomex_v2.json` (ver bug sistémico abajo) en vez de asumirlo: ambas resuelven a coincidencia
  exacta en **Zapopan** (Loma Bonita CP 45086, La Estancia CP 45030). Corridas con Zapopan:
  Loma Bonita → **26 nuevas + 19 actualizadas**; La Estancia → **3 nuevas + 6 actualizadas**.
- [ ] Enricher (año) sobre los docs nuevos sin `anio_construccion` — decidido posponer, no corrido aún.
- [ ] Segmentar por edad/antigüedad antes de usar en el avalúo Cuarzo (no promediar el pool completo)
- [ ] Ampliar a las demás 86 colonias débiles de `colonias_debiles_scraper.md` (mismo patrón, caso por caso)
- [ ] **NSE nuevo/usado × tipo** (ver memoria `project_propvalu_nse_nuevo_usado`) — feature de motor
  más grande, blocker=cobertura de año; NO iniciada esta sesión, requiere su propio scope.

## ⚠️ BUG PROPIO encontrado y corregido (22-jul) — id_unico colapsado en Propiedades.com
`buscarEnPropiedadesCom` usaba la URL de LISTADO (`urlColonia`, la misma para toda la corrida)
como `url` de cada comparable → `id_unico = md5(url)` salía idéntico para todos los comps de una
misma colonia+tipo, y cada upsert pisaba al anterior (solo sobrevivía el último). Afectó 9 colonias
(las que tuvieron aporte de Propiedades.com hasta ese punto). Fix: `_extraerTarjetasPropCom` ahora
captura el href real del anuncio (`/inmuebles/...`) por tarjeta. **Verificado y corregido:**
9 docs colapsados borrados de Mongo (confirmados por URL exacta antes de borrar) + las 9 colonias
re-corridas con el fix → 0 docs sospechosos restantes, 18,621 docs PROPIEDADES_COM con URL correcta.

## ⚠️ BUG SISTÉMICO encontrado (22-jul) — colisión de nombre de colonia entre municipios/estados
`generar_similares_sepomex.js:20` lee **`sepomex_jalisco.json`** (catálogo VIEJO, **1 sola entrada por
nombre de colonia normalizado** — cuando el mismo nombre existe en 2+ municipios/estados, el último
que se procesó pisa a los demás). Existe **`sepomex_v2.json`** (de `construir_sepomex_v2.js`), que SÍ
preserva TODAS las entradas por nombre (array), pero **nada en el pipeline de similares lo usa todavía**.

**Medido:** de 6,542 nombres de colonia en el catálogo Jalisco+Nayarit+Colima, **1,017 (15.5%) tienen
2+ municipios distintos** con el mismo nombre. Ejemplo real: "Loma Bonita" tiene 20 entradas (Zapopan,
El Salto, Villa Guerrero, Etzatlán... hasta Puerto Vallarta y 2 en Colima); `sepomex_jalisco.json`
solo guardaba UNA (Tecomán, Colima — la incorrecta para casi cualquier uso en AMG).

**Impacto:** cualquier colonia de `colonias_maestro.json` cuyo campo `similares` se generó vía
`generar_similares_sepomex.js` puede tener contaminación cruzada de municipio/estado donde el nombre
colisiona (potencialmente ~15% de las colonias del sistema, no solo BV). No cuantificado cuántas
"similares" ya guardadas están afectadas — pendiente auditar.

**No corregido esta sesión** (requiere: migrar `generar_similares_sepomex.js` a `sepomex_v2.json`,
decidir qué candidato de una colisión usar cuando hay varios en el MISMO municipio destino ["Loma
Bonita" también colisiona DENTRO de Zapopan-cercanías con "Loma Bonita Ejidal"/"Loma Bonita Sur"], y
re-generar+re-validar `colonias_maestro.json` completo). Es un hilo de trabajo aparte, no bloqueante
para Cuarzo/BV (ya resuelto a mano arriba).
