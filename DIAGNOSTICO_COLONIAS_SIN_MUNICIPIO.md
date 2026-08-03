# Diagnóstico de colonias sin municipio

Fecha de corte: 2 de agosto de 2026.

## Resultado

Se revisaron las **2,265** entradas cuyo campo top-level `municipio` es `null`. La clasificación usa exclusivamente `es_junk_colonia`, `norm_col_key` y `norm_muni` de `backend/core/colonias.py`; no se interpretaron nombres o direcciones con un normalizador alterno.

| Caso | Criterio | Cantidad |
|---|---|---:|
| a) Basura del scraper | `es_junk_colonia(nombre)` devuelve `True` | 693 |
| b) Coincidencia verificable en `mercado_props` | El nombre normalizado aparece en `colonia` o `conjunto` y todos los documentos coincidentes apuntan a un solo municipio no vacío | 75 |
| c) Sin determinación | No lo descarta el helper y `mercado_props` no aporta un municipio único | 1,497 |
| **Total** |  | **2,265** |

Dentro del caso c), **1,484** nombres no tuvieron coincidencia en `mercado_props` y **13** sí aparecieron, pero asociados con más de un municipio. El diagnóstico fue de solo lectura: no se llenó ningún municipio `null`.

## Diez ejemplos del caso a

| Nombre |
|---|
| `1 hectare plot on the road to colotlan` |
| `128 m apartment in cd granja 48` |
| `3 lagos residential apartment practically new` |
| `542` |
| `a land with development opportunity` |
| `a luxurious apartment` |
| `abie eco habitat casas residenciales desde 345 mdp` |
| `adolf b horn y camino real col la giganterasan pedro tlaquepaque jalisco mexico cp 45601 i` |
| `ajijic chapala chulavista golf course` |
| `ajijic for horizontal residential use` |

## Diez ejemplos del caso b

| Nombre | Municipio único en `mercado_props` | Coincidencias |
|---|---|---:|
| `adamar residential` | tlajomulco de zuniga | 1 |
| `agua escondida` | tonala | 2 |
| `alta california residencial` | tlajomulco de zuniga | 1 |
| `anzures` | ajijic | 2 |
| `aurora boreal towers` | guadalajara | 2 |
| `bacalar` | ajijic | 1 |
| `barrio el santuario` | guadalajara | 1 |
| `bellaterra fronda` | tlajomulco de zuniga | 1 |
| `bosques de las lomas` | ajijic | 3 |
| `brisas` | ajijic | 2 |

## Diez ejemplos del caso c

Estos ejemplos corresponden al subconjunto que sí aparece en `mercado_props`, pero con municipios incompatibles; por ello no hay una asignación única segura.

| Nombre | Municipios observados (número de documentos) |
|---|---|
| `altamira` | zapopan (18), tlajomulco de zuniga (2) |
| `bosques de santa anita` | tlajomulco de zuniga (23), el salto (1) |
| `colinas de san javier` | tonala (2), tlajomulco de zuniga (1), guadalajara (16), zapopan (61) |
| `el rosario` | ajijic (1), guadalajara (14), tonala (5) |
| `lomas del valle` | ajijic (2), guadalajara (3), tlajomulco de zuniga (1), zapopan (26) |
| `nueva galicia` | tlajomulco de zuniga (7), zapopan (2) |
| `patria` | zapopan (1), guadalajara (5) |
| `pontevedra` | zapopan (9), tlajomulco de zuniga (13) |
| `real del bosque` | tlajomulco de zuniga (1), zapopan (1) |
| `residencial victoria` | guadalajara (7), zapopan (16) |

## Conteo de municipios antes y después

| Valor | Antes | Después |
|---|---:|---:|
| tlajomulco de zuniga | 264 | 380 |
| tlajomulco | 116 | 0 |
| san pedro tlaquepaque | 212 | 229 |
| tlaquepaque | 17 | 0 |
| null | 2,265 | 2,265 |

En total cambiaron exclusivamente **133 campos top-level `municipio`**: 116 de `tlajomulco` y 17 de `tlaquepaque`. Las décadas, fuentes, confianza y los subregistros `por_municipio` no se modificaron.

## Limitación metodológica

El caso c) es una categoría residual: significa que los helpers actuales no marcan el nombre como basura y que el corte consultado de `mercado_props` no determina un municipio único. No demuestra por sí solo que cada uno de los 1,497 nombres sea una colonia oficial; algunos residuos del scraper pueden superar los filtros actuales de `es_junk_colonia`. Se requiere otra fuente canónica antes de llenar esos campos.
