# Colonias débiles — objetivo del scraper por colonia

Generado 22-jul-2026 durante la investigación de por qué el rebuild del caché (7-jul→22-jul)
bajó el pass-rate del validador (63.1→59.2% ±10). Hallazgo: el pool real de estas colonias es
tan chico (n=2-6 comparables en `cache_consolidado.json`) que un solo comp que entra o sale
(p.ej. por corrección de m²/colonia en el verificador) mueve la mediana 10-40 puntos y voltea
el pass/fail. Ver `MOTOR_ANTECEDENTES.md` sección 22-jul y memoria `project_motor_lab_121b`
para el caso concreto (Álamo Industrial, San Pedro Tlaquepaque).

**Objetivo:** que `buscar_comparables_browser.js` (scraper on-demand por colonia, BACKLOG #1b)
priorice estas colonias primero — son las que más se benefician de más comps reales (n bajo =
más volátil = más impacto por comp agregado). Nombres tomados de `cerebro_datos.json`
(`sujetoColonia`); algunos traen mojibake del archivo fuente (`�` = acento roto) — no
corregidos aquí, verificar contra el PDF/folio original antes de armar la URL de búsqueda.

Formato: `Municipio | Colonia | n comparables en caché`

```
Tonalá | Educadores Jaliscienses | n=2
Guadalajara | Echeverría | n=2
Tonalá | San Francisco | n=2
Zapopan | Auditorio | n=2
Zapopan | Arcos de Zapopan | n=2
Tlaquepaque | Lomas Altos | n=2
Tonalá | Quintas del Paraiso | n=3
Guadalajara | Miguel Hidalgo | n=3
Tlaquepaque | El Vergel | n=3
Zapopan | Villas Belenes | n=3
Tlaquepaque | Cantera Colorada | n=3
Zapopan | Primera Sección | n=3
Zapopan | Camino Real | n=3
Tlaquepaque | Paseos del Prado. | n=3
Guadalajara | Bosques del Boulevard | n=3
Tonalá | Cd Aztlán | n=3
Zapopan | El Batán | n=3
Guadalajara | Colonia Oblatos | n=3
Tlajomulco | Villas Terranova | n=3
Zapopan | Cond. 2 Altaterra | n=3
Zapopan | Real Valdepeñas | n=3
Zapopan | Pinar de la Calma | n=3
Tlajomulco de Zúñiga | E 17Col. Las Grullas Residencial | n=3
Zapopan | Loma Bonita Ejidal | n=3
Zapopan | Rinconada del Sol | n=3
Zapopan | Valle de San Nicolás | n=3
Tlajomulco | Condominio Ignis | n=3
Zapopan | La Experiencia | n=3
Guadalajara | Del Sur | n=3
San Pedro Tlaquepaque | Alamo Industrial | n=3
San Pedro Tlaquepaque | El Refugio | n=3
Zapopan | Santa margarita 1 sección | n=3
Zapopan | Constitución | n=3
Zapopan | Lomas del Centinela | n=3
Guadalajara | San Elías | n=3
Tlajomulco | Lomas de San Agustín | n=3
Guadalajara | Lomas de Polanco | n=3
Zapopan | Rancho El Centinela | n=3
Zapopan | Moctezuma | n=3
Tonalá | Basilio Badillo | n=4
Guadalajara | Jardines de La Cruz | n=4
Tlaquepaque | Parques de Santa Cruz del Valle | n=4
Tlajomulco de Zúñiga | El Paraíso | n=4
Zapopan | Mariano Otero | n=4
Zapopan | San Isidro Ejidal | n=4
Tlajomulco | Vista Sur | n=4
Tlajomulco | Balcones de Santa Anita | n=4
Guadalajara | La Guadalupana | n=4
Tlaquepaque | San Rafael | n=4
Zapopan | Vista Hermosa | n=4
Zapopan | Colinas del Rey | n=4
Guadalajara | Monumental | n=4
Zapopan | Haciendas del Valle | n=4
Guadalajara | La Paz | n=4
Tlaquepaque | Tlaquepaque | n=4
Zapopan | Jardines de Guadalupe | n=4
San Pedro Tlaquepaque | Haciendas de San José | n=4
Guadalajara | Ladrón de Guevara | n=4
Zapopan | Victoria | n=4
Guadalajara | Miravalle | n=4
Tonala | Vista Reina | n=4
Tonala | Lomas del Camichin | n=4
Guadalajara | Alcalde Barranquitas | n=4
Tlajomulco | Real del Valle | n=4
San Pedro Tlaquepaque | Lomas de la Victoria | n=4
Zapopan | Seattle | n=4
Tonalá | El Moral | n=4
Guadalajara | Lomas Independencia | n=5
Zapopan | Mision del Bosque | n=5
Zapopan | Chapalita las Fuentes | n=5
Zapopan | Misión del Bosque | n=5
Guadalajara | Lázaro Cárdenas | n=5
Guadalajara | Insurgentes | n=5
Guadalajara | Jardines del Bosque | n=5
Zapopan | Las Bóvedas | n=5
Zapopan | Jardines del Valle | n=5
San Pedro Tlaquepaque | Parques de la Victoria | n=5
Zapopan | Zapopan | n=5
Guadalajara | Balcones de Oblatos | n=6
Guadalajara | Santa María | n=6
San Pedro Tlaquepaque | Loma Bonita Ejidal | n=6
Zapopan | Paseos del Sol | n=6
Guadalajara | La Loma | n=6
Tonalá | Educación Jalisciense | n=6
Tlajomulco de Zúñiga | Fraccionamiento el Cortijo San Agustín | n=6
Guadalajara | San Isidro | n=6
```

86 colonias. Muchas comparten municipio (Zapopan/Guadalajara concentran la mayoría) — si el
scraper agrupa por municipio+segmento de precio en vez de 1 URL por colonia, se puede cubrir
varias de un tiro.
