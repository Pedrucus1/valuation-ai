"""
Conteo REAL de POIs cercanos por categoría vía Google Places API (New).
Reemplaza los conteos inventados por la IA en el perfil del entorno del reporte.

Requiere "Places API (New)" habilitada en el proyecto de la key GOOGLE_MAPS_API_KEY.
Si está deshabilitada o falla, cada llamada regresa {} y el llamador conserva el
conteo estimado por la IA (degradación elegante, sin romper el reporte).

La API nueva acepta varios tipos por llamada -> 1 request por categoría.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
RADIUS_M = 800           # ~10 min caminando: da conteos reales diferenciados (1500m satura en 20+)
MAX_RESULTS = 20         # tope de la API (New) por llamada -> si llega a 20 mostramos "N+"
_URL = "https://places.googleapis.com/v1/places:searchNearby"

# Categoría del reporte -> tipos de Google Places (New).
# recreacion incluye parques Y áreas deportivas (queja del usuario).
CATEGORY_TYPES = {
    "educacion": ["school", "university"],
    "salud": ["hospital", "pharmacy", "doctor"],
    "comercio": ["supermarket", "grocery_store"],
    "recreacion": ["park", "gym", "stadium"],
    "plazas": ["shopping_mall"],
}


def _count_category(lat: float, lng: float, types: list) -> str:
    """'N' | 'N+' para una categoría. Lanza si la API deniega (para abortar el resto)."""
    resp = requests.post(_URL, headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.id",
    }, json={
        "includedTypes": types,
        "maxResultCount": MAX_RESULTS,
        "locationRestriction": {
            "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": RADIUS_M}
        },
    }, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"Places (New) {resp.status_code}: {resp.text[:150]}")
    n = len(resp.json().get("places", []))
    return f"{n}+" if n >= MAX_RESULTS else str(n)


def count_nearby_by_category(lat: float, lng: float) -> dict:
    """
    {categoria: 'N' | 'N+'} con conteos reales. {} si la API está deshabilitada
    o la primera llamada falla (para no gastar llamadas ni bloquear el reporte).
    """
    if not GOOGLE_KEY or lat is None or lng is None:
        return {}
    out = {}
    try:
        for cat, types in CATEGORY_TYPES.items():
            out[cat] = _count_category(lat, lng, types)
    except Exception as e:
        logger.warning(f"Places nearby falló ({e}); se usan conteos estimados por IA")
        return {}
    return out


if __name__ == "__main__":
    # Self-check: Zapopan centro. Requiere Places API (New) habilitada + GOOGLE_MAPS_API_KEY.
    import json
    r = count_nearby_by_category(20.6597, -103.4098)
    print(json.dumps(r, indent=2, ensure_ascii=False))
    assert isinstance(r, dict)
