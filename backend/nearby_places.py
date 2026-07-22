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
    "bancos": ["bank", "atm"],
}


def _fetch_category(lat: float, lng: float, types: list):
    """(conteo 'N'|'N+', [nombres reales]) para una categoría. Lanza si la API deniega."""
    resp = requests.post(_URL, headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName",
    }, json={
        "includedTypes": types,
        "maxResultCount": MAX_RESULTS,
        "locationRestriction": {
            "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": RADIUS_M}
        },
    }, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"Places (New) {resp.status_code}: {resp.text[:150]}")
    places = resp.json().get("places", [])
    n = len(places)
    count = f"{n}+" if n >= MAX_RESULTS else str(n)
    nombres = [p.get("displayName", {}).get("text", "") for p in places]
    nombres = [x for x in nombres if x]
    return count, nombres


def _count_category(lat: float, lng: float, types: list) -> str:
    """Compat: solo el conteo."""
    return _fetch_category(lat, lng, types)[0]


def count_nearby_by_category(lat: float, lng: float) -> dict:
    """{categoria: 'N' | 'N+'} — solo conteos (compat)."""
    return {k: v["count"] for k, v in nearby_by_category(lat, lng).items()}


def nearby_by_category(lat: float, lng: float) -> dict:
    """
    {categoria: {"count": 'N'|'N+', "nombres": "A, B, C"}} con datos REALES de Places.
    {} si la API está deshabilitada o la primera llamada falla (sin gastar llamadas
    ni bloquear el reporte). Los nombres reales evitan que la IA invente establecimientos
    de otras zonas.
    """
    if not GOOGLE_KEY or lat is None or lng is None:
        return {}
    out = {}
    try:
        for cat, types in CATEGORY_TYPES.items():
            count, nombres = _fetch_category(lat, lng, types)
            out[cat] = {"count": count, "nombres": ", ".join(nombres[:5])}
    except Exception as e:
        logger.warning(f"Places nearby falló ({e}); se usan conteos estimados por IA")
        return {}
    return out


if __name__ == "__main__":
    # Self-check: Zapopan centro. Requiere Places API (New) habilitada + GOOGLE_MAPS_API_KEY.
    import json
    r = nearby_by_category(20.6597, -103.4098)
    print(json.dumps(r, indent=2, ensure_ascii=False))
    assert isinstance(r, dict)
    for v in r.values():
        assert "count" in v and "nombres" in v
