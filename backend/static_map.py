"""
Static Map Generator for PropValu
Imagen de mapa del reporte. Preferimos Google Static Maps; si la key no tiene
acceso servidor (403) o falla, caemos a OpenStreetMap para no dejar el mapa en blanco.
Se embebe como base64 para que el HTML/PDF sea autónomo.
"""

import io
import os
import base64
import logging
import requests

logger = logging.getLogger(__name__)

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def _google_static(lat: float, lng: float, width: int, height: int, zoom: int):
    if not GOOGLE_KEY:
        return None
    url = (
        "https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat},{lng}&zoom={zoom}&size={width}x{height}"
        "&scale=2&maptype=roadmap"
        f"&markers=color:red%7C{lat},{lng}&key={GOOGLE_KEY}"
    )
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    if "image" not in resp.headers.get("Content-Type", ""):
        raise RuntimeError(f"Static Maps no devolvió imagen: {resp.text[:150]}")
    return f"data:image/png;base64,{base64.b64encode(resp.content).decode('utf-8')}"


def _osm_static(lat: float, lng: float, width: int, height: int, zoom: int):
    from staticmap import StaticMap, CircleMarker
    m = StaticMap(width, height, url_template='https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    m.add_marker(CircleMarker((lng, lat), 'red', 12))
    image = m.render(zoom=zoom, center=(lng, lat))
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode('utf-8')}"


def generate_map_image_base64(lat: float, lng: float, width: int = 600, height: int = 250, zoom: int = 16) -> str:
    """Genera la imagen de mapa como data URL base64. Google primero, OSM de respaldo."""
    try:
        img = _google_static(lat, lng, width, height, zoom)
        if img:
            return img
        logger.warning("GOOGLE_MAPS_API_KEY ausente; usando OpenStreetMap para el mapa del reporte")
    except Exception as e:
        logger.warning(f"Google Static Maps falló ({e}); fallback a OpenStreetMap")
    try:
        return _osm_static(lat, lng, width, height, zoom)
    except Exception as e:
        logger.error(f"Fallback OSM también falló: {e}")
        return None


def get_map_for_report(lat: float, lng: float) -> dict:
    """Datos de mapa para el reporte: imagen base64 + iframe Google de respaldo."""
    static_image = generate_map_image_base64(lat, lng)
    iframe_url = (
        "https://www.google.com/maps/embed/v1/place"
        f"?key={GOOGLE_KEY}&q={lat},{lng}&zoom=16"
    ) if GOOGLE_KEY else None
    return {
        "static_image": static_image,
        "iframe_url": iframe_url,
        "has_static": static_image is not None,
    }
