"""
config.py — Configuración central del scraper
Lee variables de entorno y define parámetros por portal.
"""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv
from pathlib import Path

# Cargar variables del archivo .env
BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

# ─────────────────────────────────────────
# Variables de entorno
# ─────────────────────────────────────────
GOOGLE_SHEET_ID = os.environ["GOOGLE_SHEET_ID"]
CREDENTIALS_PATH = str(BASE_DIR / "credentials.json")

SCRAPING_DELAY_MIN = float(os.getenv("SCRAPING_DELAY_MIN", 4))
SCRAPING_DELAY_MAX = float(os.getenv("SCRAPING_DELAY_MAX", 9))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", 2))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Proxy residencial rotativo (opcional)
# Si está vacío o no definido, se usa IP directa
PROXY_URL = os.getenv("PROXY_URL", "").strip() or None

# ─────────────────────────────────────────
# Nombres de pestañas en Google Sheets
# ─────────────────────────────────────────
TAB_INMUEBLES24 = "INMUEBLES24"
TAB_VIVANUNCIOS = "VIVANUNCIOS"
TAB_PROPIEDADES_COM = "PROPIEDADES_COM"
TAB_MITULA = "MITULA"
TAB_CASAS_Y_TERRENOS = "CASAS_Y_TERRENOS"
TAB_PINCALI = "PINCALI"
TAB_CONSOLIDADO = "CONSOLIDADO"
TAB_LOG = "LOG"

TODAS_LAS_TABS = [
    TAB_INMUEBLES24,
    TAB_VIVANUNCIOS,
    TAB_PROPIEDADES_COM,
    TAB_MITULA,
    TAB_CASAS_Y_TERRENOS,
    TAB_PINCALI,
    TAB_CONSOLIDADO,
    TAB_LOG,
]

# Encabezados de la hoja de propiedades
HEADERS_PROPIEDADES = [
    "id_unico",
    "titulo",
    "precio",
    "moneda",
    "tipo_operacion",
    "tipo_propiedad",
    "colonia",
    "municipio",
    "estado",
    "recamaras",
    "banos",
    "m2_construccion",
    "m2_terreno",
    "estacionamientos",
    "año_construccion",   # Año en que fue construida (o antigüedad en años)
    "descripcion",
    "url_original",
    "nombre_agente",       # Nombre del agente/anunciante (de página de detalle)
    "fecha_publicacion",   # Fecha en que se publicó el anuncio en el portal
    "portal_origen",
    "fecha_scraping",
    "activo",
]

# Encabezados de la pestaña LOG
HEADERS_LOG = [
    "fecha_hora",
    "portal",
    "zona",
    "paginas_procesadas",
    "propiedades_encontradas",
    "propiedades_nuevas",
    "propiedades_actualizadas",
    "errores",
    "duracion_segundos",
    "estado",
]

# ─────────────────────────────────────────
# Zonas geográficas a scrapear
# ─────────────────────────────────────────
ZONAS = [
    {
        "municipio": "Guadalajara",
        "estado": "Jalisco",
        # Slug usado en URLs de cada portal (se sobreescribe por portal si difiere)
        "slug_inmuebles24": "guadalajara",
        # Vivanuncios (OLX): solo nombre de ciudad en el path, sin _jalisco
        "slug_vivanuncios": "guadalajara",
        # Código de localidad OLX confirmado 2026-03-16 (test_vivanuncios_gdl.py)
        "vivanuncios_loc_code": "10567",
        "slug_propiedades": "guadalajara",
        "slug_mitula": "guadalajara",
        "slug_casas_terrenos": "guadalajara",
        "slug_pincali": "guadalajara-jalisco",
    },
    {
        "municipio": "Zapopan",
        "estado": "Jalisco",
        "slug_inmuebles24": "zapopan",
        "slug_vivanuncios": "zapopan",
        # vivanuncios_loc_code pendiente — se omite y OLX filtra por nombre de ciudad
        "slug_propiedades": "zapopan",
        "slug_mitula": "zapopan",
        "slug_casas_terrenos": "zapopan",
        "slug_pincali": "zapopan-jalisco",
    },
    {
        "municipio": "Tlaquepaque",
        "estado": "Jalisco",
        "slug_inmuebles24": "tlaquepaque",
        "slug_vivanuncios": "san-pedro-tlaquepaque",
        "slug_propiedades": "san-pedro-tlaquepaque",
        "slug_mitula": "san-pedro-tlaquepaque",
        "slug_casas_terrenos": "san-pedro-tlaquepaque",
        "slug_pincali": "san-pedro-tlaquepaque-jalisco",
    },
    {
        "municipio": "Tonalá",
        "estado": "Jalisco",
        "slug_inmuebles24": "tonala",
        "slug_vivanuncios": "tonala",
        "slug_propiedades": "tonala",
        "slug_mitula": "tonala",
        "slug_casas_terrenos": "tonala",
        "slug_pincali": "tonala-jalisco",
    },
    {
        "municipio": "Tlajomulco de Zúñiga",
        "estado": "Jalisco",
        "slug_inmuebles24": "tlajomulco-de-zuniga",
        "slug_vivanuncios": "tlajomulco-de-zuniga",
        "slug_propiedades": "tlajomulco-de-zuniga",
        "slug_mitula": "tlajomulco-de-zuniga",
        "slug_casas_terrenos": "tlajomulco-de-zuniga",
        "slug_pincali": "tlajomulco-de-zuniga-jalisco",
    },
    {
        "municipio": "Chapala",
        "estado": "Jalisco",
        "slug_inmuebles24": "chapala",
        "slug_vivanuncios": "chapala",
        "slug_propiedades": "chapala",
        "slug_mitula": "chapala",
        "slug_casas_terrenos": "chapala",
        "slug_pincali": "chapala-jalisco",
    },
    {
        "municipio": "Ajijic",
        "estado": "Jalisco",
        # Ajijic es localidad dentro de Chapala; algunos portales no tienen slug propio
        "slug_inmuebles24": "ajijic",
        "slug_vivanuncios": "ajijic",
        "slug_propiedades": "ajijic",
        "slug_mitula": "ajijic",
        "slug_casas_terrenos": "ajijic",
        "slug_pincali": "ajijic-jalisco",
    },
]

# Tipos de operación a scrapear
TIPOS_OPERACION = ["venta", "renta"]

# Máximo de páginas a scrapear por zona/operación (seguridad)
MAX_PAGINAS_POR_ZONA = 50
