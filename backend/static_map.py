"""
Static Map Generator for PropValu
Generates static map images for PDF reports
"""

import io
import base64
from staticmap import StaticMap, CircleMarker
import logging

logger = logging.getLogger(__name__)

def generate_map_image_base64(lat: float, lng: float, width: int = 600, height: int = 250, zoom: int = 16) -> str:
    """
    Generate a static map image and return as base64 data URL.
    
    Args:
        lat: Latitude
        lng: Longitude
        width: Image width in pixels
        height: Image height in pixels
        zoom: Zoom level (16 = neighborhood level)
    
    Returns:
        Base64 data URL string (data:image/png;base64,...)
    """
    try:
        # Create static map
        m = StaticMap(width, height, url_template='https://tile.openstreetmap.org/{z}/{x}/{y}.png')
        
        # Add marker at location (red circle)
        marker = CircleMarker((lng, lat), 'red', 12)
        m.add_marker(marker)
        
        # Render the map
        image = m.render(zoom=zoom, center=(lng, lat))
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        
        base64_data = base64.b64encode(buffer.read()).decode('utf-8')
        return f"data:image/png;base64,{base64_data}"
        
    except Exception as e:
        logger.error(f"Error generating static map: {e}")
        return None

def get_map_for_report(lat: float, lng: float) -> dict:
    """
    Get map data for report generation.
    Returns both base64 image and fallback iframe URL.
    """
    # Generate static image
    static_image = generate_map_image_base64(lat, lng)
    
    # Fallback iframe URL
    zoom_delta = 0.005
    bbox = f"{lng-zoom_delta},{lat-zoom_delta},{lng+zoom_delta},{lat+zoom_delta}"
    iframe_url = f"https://www.openstreetmap.org/export/embed.html?bbox={bbox}&layer=mapnik&marker={lat},{lng}"
    
    return {
        "static_image": static_image,
        "iframe_url": iframe_url,
        "has_static": static_image is not None
    }
