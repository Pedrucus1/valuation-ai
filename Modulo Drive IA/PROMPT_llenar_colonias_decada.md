# PROMPT — Llenar `colonias_decada.json` con la década estimada de TODAS las colonias (ZMG → Ribera de Chapala)

> Pégale esto a un agente/sesión de investigación. Es un trabajo grande: hazlo POR MUNICIPIO, no todo de golpe.

## Objetivo
Enriquecer `Pagina-Valuacion-con-Ai--main/Modulo Drive IA/colonias_decada.json` con la **década estimada de urbanización/poblamiento** de cada colonia de la Zona Metropolitana de Guadalajara y, después, de la Ribera de Chapala. Esto siembra la edad de referencia para el validador de PropValu (colonia → rango de edad efectiva, editable).

## Archivos
- **A cubrir:** `colonias_maestro.json` (~4,988 colonias, dict keyed por nombre normalizado) — la lista completa.
- **A escribir/mergear:** `colonias_decada.json` — YA tiene 39 colonias sembradas a mano; **MERGE, no sobrescribas** las buenas (solo mejóralas si encuentras fuente).
- **Cruce socioeconómico:** `colonias_nse.json` (nivel por colonia).
- **Geo (heurística de anillo):** `_geo/proximidad.py` (`coords_de_colonia`, `colonias_cercanas`).
- **Contexto histórico:** Manual Cronológico ZMG en `Downloads/Manual Cronologico de Arquitectura 1900-2026/` + `Colonias_Fechas.md`, `Roster_Arquitectos.md`.

## Esquema por colonia (igual que lo ya sembrado)
```json
"<colonia normalizada: lowercase sin acentos>": {
  "decada_ref": "1960s",            // década principal / de auge
  "decadas": ["1950s","1960s"],     // arco: donde se pobló mayormente (puede ser 1+)
  "nivel": "media",                  // popular | media-baja | media | media-alta | lujo (cruzar con colonias_nse.json)
  "fuente": "plan-parcial | hemeroteca | inegi | wikipedia | heuristica-anillo | manual",
  "confianza": "alta | media | baja"
}
```

## Método (máxima precisión, SIN inventar)
1. **Trabaja por MUNICIPIO**, en este orden (AMG oficial): Guadalajara → Zapopan → San Pedro Tlaquepaque → Tonalá → Tlajomulco de Zúñiga → El Salto → Juanacatlán → Ixtlahuacán de los Membrillos → Zapotlanejo. **Luego Ribera de Chapala:** Chapala, Ajijic, Jocotepec, San Juan Cosalá, San Antonio Tlayacapan, etc.
2. Para cada colonia busca fecha de urbanización/fundación en fuentes reales: **planes parciales de desarrollo urbano municipales, INEGI, hemeroteca de El Informador/Mural, sitios de gobierno municipal, historias de fraccionamientos y clubes, tesis RIUdeG, Wikipedia.** → `confianza: alta` si hay fuente directa con año/década.
3. Si no hay fuente directa, **infiere** por: (a) hito asociado (club, avenida, plaza, iglesia), (b) vecindad con colonias ya fechadas, (c) **heurística de anillo centro→periferia** con el geo (entre más al centro, más vieja; entre más periferia/reciente, más nueva). → `confianza: media` (hito/vecindad) o `baja` (solo anillo).
4. **Nunca marques confianza alta sin fuente.** Si no hay absolutamente nada, deja `confianza: baja`, `fuente: heuristica-anillo` con la mejor estimación, o déjala fuera para captura manual — pero documenta la decisión.
5. Cruza `nivel` con `colonias_nse.json` (si ya tiene NSE, úsalo).
6. **MERGE** al archivo existente; claves normalizadas (lowercase, sin acentos), `indent=1`, `ensure_ascii=False`. No borres lo previo.

## Ritmo y entrega
- No intentes las ~5,000 de una: **ve municipio por municipio** para no perder precisión.
- Al terminar cada municipio, reporta: total de colonias procesadas, cuántas con confianza alta / media / baja, y cuántas quedaron sin dato.
- Guarda incrementalmente (mergea y escribe tras cada municipio) para no perder avance.
