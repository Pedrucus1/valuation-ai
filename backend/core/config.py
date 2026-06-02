"""Rutas y constantes de configuración compartidas."""
import os
from pathlib import Path

# backend/core/config.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent

UPLOADS_DIR = BACKEND_DIR / "uploads"
KYC_DIR = UPLOADS_DIR / "kyc"
KYC_DIR.mkdir(parents=True, exist_ok=True)
ADS_DIR = UPLOADS_DIR / "ads"
ADS_DIR.mkdir(parents=True, exist_ok=True)

# Ruta del scraper (override por env SCRAPER_DIR). Default histórico:
# valuation-ai/scraper-inmuebles (BACKEND_DIR.parent = proyecto, .parent.parent = valuation-ai)
SCRAPER_DIR = os.environ.get("SCRAPER_DIR", str(BACKEND_DIR.parent.parent / "scraper-inmuebles"))
