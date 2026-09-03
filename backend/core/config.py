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

# Ruta del scraper (override por env SCRAPER_DIR). Consolidado 01-sep-2026 dentro del
# propio repo: Pagina-Valuacion-con-Ai--main/scraper-inmuebles (BACKEND_DIR.parent = proyecto).
# Antes vivía en valuation-ai/scraper-inmuebles (un nivel arriba) — ese default quedó
# apuntando a una carpeta inexistente tras la consolidación (WinError 267 silencioso,
# tragado por el except de _enrich_comp_urls: el enriquecimiento web nunca corría).
SCRAPER_DIR = os.environ.get("SCRAPER_DIR", str(BACKEND_DIR.parent / "scraper-inmuebles"))
