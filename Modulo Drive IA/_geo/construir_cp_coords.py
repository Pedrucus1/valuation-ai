"""
construir_cp_coords.py
Genera cp_coords.json: { cp: {lat, lon, municipio, estado} }
filtrando GeoNames (MX.txt) a admin1 == "Jalisco".
Un CP puede tener varias filas en GeoNames (una por colonia/placename);
se toma la primera fila encontrada (todas comparten centroide).
"""
import json
import os

GEONAMES = os.path.join(os.path.dirname(__file__), "MX.txt")
OUT = os.path.join(os.path.dirname(__file__), "cp_coords.json")

cp_coords = {}

with open(GEONAMES, encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 11:
            continue
        estado = parts[3]
        if estado != "Jalisco":
            continue
        cp      = parts[1].strip()
        municipio = parts[5].strip()
        lat     = parts[9].strip()
        lon     = parts[10].strip()
        if not cp or not lat or not lon:
            continue
        if cp not in cp_coords:
            try:
                cp_coords[cp] = {
                    "lat": float(lat),
                    "lon": float(lon),
                    "municipio": municipio,
                    "estado": estado,
                }
            except ValueError:
                pass

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(cp_coords, f, ensure_ascii=False, indent=2)

print(f"cp_coords.json generado: {len(cp_coords)} CPs de Jalisco")
