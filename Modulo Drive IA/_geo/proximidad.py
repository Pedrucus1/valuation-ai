"""
proximidad.py
Módulo de proximidad geográfica para el motor de valuación.

Funciones públicas:
  haversine(lat1, lon1, lat2, lon2) -> float  [km]
  coords_de_colonia(colonia, municipio) -> dict | None
  colonias_cercanas(colonia, municipio, km_max=3) -> list[dict]

Los datos se cargan una sola vez al importar el módulo (lazy en primer uso).
"""

import json
import math
import os
import re
import unicodedata
from functools import lru_cache
from typing import Optional

# ---------------------------------------------------------------------------
# Rutas de datos (relativas a este archivo)
# ---------------------------------------------------------------------------
_DIR = os.path.dirname(os.path.abspath(__file__))
_CP_COORDS_PATH    = os.path.join(_DIR, "cp_coords.json")
_COLONIA_CP_PATH   = os.path.join(_DIR, "colonia_cp.json")

# ---------------------------------------------------------------------------
# Carga lazy de datos
# ---------------------------------------------------------------------------
_cp_coords:  Optional[dict] = None
_colonia_cp: Optional[dict] = None


def _load():
    global _cp_coords, _colonia_cp
    if _cp_coords is None:
        with open(_CP_COORDS_PATH, encoding="utf-8") as f:
            _cp_coords = json.load(f)
    if _colonia_cp is None:
        with open(_COLONIA_CP_PATH, encoding="utf-8") as f:
            _colonia_cp = json.load(f)


# ---------------------------------------------------------------------------
# Normalización (idéntica a construir_colonia_cp.py)
# ---------------------------------------------------------------------------
def _normalizar(texto: str) -> str:
    texto = texto.strip().lower()
    nfkd = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in nfkd if not unicodedata.combining(c))
    texto = re.sub(r"\s+", " ", texto)
    return texto


# ---------------------------------------------------------------------------
# Fórmula de Haversine
# ---------------------------------------------------------------------------
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en kilómetros entre dos puntos en la esfera terrestre."""
    R = 6371.0  # radio medio de la Tierra en km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Lookup de coordenadas de una colonia
# ---------------------------------------------------------------------------
def coords_de_colonia(colonia: str, municipio: str) -> Optional[dict]:
    """
    Devuelve {lat, lon, municipio, estado, cp} para la colonia indicada,
    o None si no hay datos.

    Si la colonia tiene varios CPs, usa el primero de la lista (todos
    comparten centroide GeoNames en la mayoría de los casos).
    """
    _load()
    key = f"{_normalizar(colonia)}|{_normalizar(municipio)}"
    cp_val = _colonia_cp.get(key)
    if cp_val is None:
        return None
    # Puede ser string o lista
    cp = cp_val[0] if isinstance(cp_val, list) else cp_val
    coord = _cp_coords.get(cp)
    if coord is None:
        return None
    return {
        "lat": coord["lat"],
        "lon": coord["lon"],
        "municipio": coord["municipio"],
        "estado": coord["estado"],
        "cp": cp,
    }


# ---------------------------------------------------------------------------
# Colonias cercanas
# ---------------------------------------------------------------------------
def colonias_cercanas(
    colonia: str,
    municipio: str,
    km_max: float = 3.0,
) -> list[dict]:
    """
    Devuelve lista de colonias dentro de km_max del centroide de (colonia, municipio).
    Cada elemento: {colonia, municipio, cp, lat, lon, distancia_km}.
    La lista NO incluye la colonia sujeto y está ordenada por distancia ascendente.
    Cruza límites de municipio automáticamente.

    Retorna [] si la colonia sujeto no tiene coordenadas.
    """
    _load()
    origen = coords_de_colonia(colonia, municipio)
    if origen is None:
        return []

    lat0, lon0 = origen["lat"], origen["lon"]
    norm_key_sujeto = f"{_normalizar(colonia)}|{_normalizar(municipio)}"

    resultados = []
    for key, cp_val in _colonia_cp.items():
        if key == norm_key_sujeto:
            continue
        cp = cp_val[0] if isinstance(cp_val, list) else cp_val
        coord = _cp_coords.get(cp)
        if coord is None:
            continue
        dist = haversine(lat0, lon0, coord["lat"], coord["lon"])
        if dist <= km_max:
            norm_col, norm_mun = key.rsplit("|", 1)
            resultados.append({
                "colonia": norm_col,
                "municipio": coord["municipio"],
                "cp": cp,
                "lat": coord["lat"],
                "lon": coord["lon"],
                "distancia_km": round(dist, 3),
            })

    resultados.sort(key=lambda x: x["distancia_km"])
    return resultados


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Ejemplos con colonias reales del dataset que demuestran cruce de municipio.
    # GeoNames asigna un centroide por CP → colonias del mismo CP muestran 0.00 km
    # (comparten polígono postal); colonias en CP distintos muestran distancia real.
    ejemplos = [
        # Tlaquepaque Centro → debería ver colonias de Guadalajara limítrofes
        ("Tlaquepaque Centro", "San Pedro Tlaquepaque", 3.0),
        # El Manantial (Tlaquepaque, CP 45590) → vecina directa de colonias de Guadalajara
        ("El Manantial", "San Pedro Tlaquepaque", 2.0),
        # Chapalita (Guadalajara) → colonias mixtas Guadalajara + Zapopan
        ("Chapalita", "Guadalajara", 2.0),
    ]

    for col, mun, km in ejemplos:
        print(f"\n--- colonias_cercanas('{col}', '{mun}', km_max={km}) ---")
        origen = coords_de_colonia(col, mun)
        if origen is None:
            print(f"  !! Colonia '{col}' / '{mun}' no encontrada en datos.")
            continue
        print(f"  Origen: lat={origen['lat']}, lon={origen['lon']}, cp={origen['cp']}")
        cercanas = colonias_cercanas(col, mun, km_max=km)
        if not cercanas:
            print("  (sin resultados)")
            continue
        # Separar mismo municipio vs cruce
        mismo_mun = [c for c in cercanas if _normalizar(c["municipio"]) == _normalizar(mun)]
        otro_mun  = [c for c in cercanas if _normalizar(c["municipio"]) != _normalizar(mun)]
        print(f"  Total cercanas: {len(cercanas)}  (mismo mun: {len(mismo_mun)}, otro mun: {len(otro_mun)})")
        for c in cercanas[:20]:
            cross = " *** CRUCE ***" if _normalizar(c["municipio"]) != _normalizar(mun) else ""
            print(f"  {c['distancia_km']:5.2f} km  {c['colonia']:<40} {c['municipio']}{cross}")
        if len(cercanas) > 20:
            print(f"  ... y {len(cercanas)-20} más")
