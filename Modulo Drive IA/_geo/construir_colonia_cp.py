"""
construir_colonia_cp.py
Genera colonia_cp.json: { "normColonia|municipio": cp_o_lista }

Fuente: sepomex_v2.json (en el directorio padre).
- Normalización: lowercase, sin acentos, trim, colapsar espacios.
- Para colonias con un solo CP → valor es string.
- Para colonias con varios CP en mismo municipio → valor es lista.
- Solo se incluyen entradas de estado == "Jalisco" (el motor opera en Jalisco).
"""
import json
import os
import unicodedata
import re

SEPOMEX = os.path.join(os.path.dirname(__file__), "..", "sepomex_v2.json")
CP_COORDS = os.path.join(os.path.dirname(__file__), "cp_coords.json")
OUT = os.path.join(os.path.dirname(__file__), "colonia_cp.json")


def normalizar(texto: str) -> str:
    """Lowercase, quitar acentos/diacríticos, trim, colapsar espacios."""
    texto = texto.strip().lower()
    nfkd = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in nfkd if not unicodedata.combining(c))
    texto = re.sub(r"\s+", " ", texto)
    return texto


# Cargar CPs con coordenadas (solo Jalisco)
with open(CP_COORDS, encoding="utf-8") as f:
    cp_coords = json.load(f)
cps_jalisco = set(cp_coords.keys())

# Cargar sepomex
with open(SEPOMEX, encoding="utf-8") as f:
    sepomex = json.load(f)

# Construir mapa normColonia|normMunicipio → set(CPs)
mapa: dict[str, set] = {}

for _key, entries in sepomex.items():
    if not isinstance(entries, list):
        continue
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        # Filtrar solo Jalisco
        if entry.get("estado") != "Jalisco":
            continue
        cp = str(entry.get("cp", "")).strip()
        nombre = entry.get("nombre", "")
        municipio = entry.get("municipio", "")
        if not cp or not nombre or not municipio:
            continue
        # Solo CPs que tenemos en GeoNames (tienen coords)
        if cp not in cps_jalisco:
            continue
        norm_col = normalizar(nombre)
        norm_mun = normalizar(municipio)
        key = f"{norm_col}|{norm_mun}"
        mapa.setdefault(key, set()).add(cp)

# Convertir a JSON-serializable: lista si varios, string si uno
colonia_cp = {}
multi = 0
for key, cps in mapa.items():
    cps_list = sorted(cps)
    if len(cps_list) == 1:
        colonia_cp[key] = cps_list[0]
    else:
        colonia_cp[key] = cps_list
        multi += 1

# Estadísticas
total_resueltas = len(colonia_cp)

# Contar entradas Jalisco en sepomex sin match en GeoNames
sin_match = 0
sin_match_examples = []
seen = set()
for _key, entries in sepomex.items():
    if not isinstance(entries, list):
        continue
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("estado") != "Jalisco":
            continue
        cp = str(entry.get("cp", "")).strip()
        nombre = entry.get("nombre", "")
        municipio = entry.get("municipio", "")
        if not cp or not nombre or not municipio:
            continue
        if cp not in cps_jalisco:
            uid = f"{nombre}|{municipio}|{cp}"
            if uid not in seen:
                seen.add(uid)
                sin_match += 1
                if len(sin_match_examples) < 5:
                    sin_match_examples.append(uid)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(colonia_cp, f, ensure_ascii=False, indent=2)

print(f"colonia_cp.json generado")
print(f"  Colonias resueltas (con coords): {total_resueltas}")
print(f"    - con un solo CP:   {total_resueltas - multi}")
print(f"    - con varios CPs:   {multi}")
print(f"  Entradas Jalisco sin match GeoNames: {sin_match}")
if sin_match_examples:
    print(f"  Ejemplos sin match: {sin_match_examples}")
