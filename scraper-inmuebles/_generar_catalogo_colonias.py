"""
Genera utils/colonias_catalogo.json desde colonias_maestro.json (SEPOMEX).
Lista plana de nombres únicos, en minúsculas, ordenada de más largo a más corto
para que el substring match en cleaner.py prefiera el match más específico.

Uso: python _generar_catalogo_colonias.py
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")

MAESTRO = os.path.join(os.path.dirname(__file__), "..", "Modulo Drive IA", "colonias_maestro.json")
SALIDA  = os.path.join(os.path.dirname(__file__), "utils", "colonias_catalogo.json")

print("Leyendo colonias_maestro.json...")
with open(MAESTRO, encoding="utf-8") as f:
    maestro = json.load(f)

# Municipios y términos geográficos que no deben ser colonia
EXCLUIR = {
    "guadalajara", "zapopan", "tlaquepaque", "san pedro tlaquepaque",
    "tonala", "tonalá", "tlajomulco", "tlajomulco de zuniga",
    "el salto", "ajijic", "chapala", "jalisco", "mexico", "jal",
    "mexico city", "ciudad de mexico", "estado de mexico",
}

colonias = set()
for cp_data in maestro.values():
    for entry in cp_data.get("similares", []):
        nombre = entry.get("colonia", "").strip().lower()
        if nombre and 7 <= len(nombre) <= 45 and nombre not in EXCLUIR:
            colonias.add(nombre)

# Ordenar de más largo a más corto (match más específico primero)
catalogo = sorted(colonias, key=len, reverse=True)

with open(SALIDA, "w", encoding="utf-8") as f:
    json.dump(catalogo, f, ensure_ascii=False)

print(f"Generado: {SALIDA}")
print(f"Colonias únicas: {len(catalogo):,}")
print(f"Más larga: '{catalogo[0]}' ({len(catalogo[0])} chars)")
print(f"Más corta: '{catalogo[-1]}' ({len(catalogo[-1])} chars)")
