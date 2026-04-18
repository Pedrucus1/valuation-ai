"""
Google Sheets Comparables Fetcher for PropValu
Reads real estate listings scraped into a Google Sheet.
Uses service account credentials (same as scraper) — no API key needed.
"""

import asyncio
import logging
import os
import re
from pathlib import Path
from typing import List, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

SHEET_ID_DEFAULT = "1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE"

SHEET_TABS = [
    "INMUEBLES24",
    "VIVANUNCIOS",
    "PROPIEDADES_COM",
    "MITULA",
    "CASAS_Y_TERRENOS",
    "PINCALI",
    "CONSOLIDADO",
]

# Column order as written by scraper (config.py HEADERS_PROPIEDADES)
# index: name → mapped_field
SHEET_COLUMNS = [
    "id_unico",           # 0
    "titulo",             # 1  → title
    "precio",             # 2  → price
    "moneda",             # 3
    "tipo_operacion",     # 4  → listing_type
    "tipo_propiedad",     # 5  → property_type
    "colonia",            # 6  → neighborhood
    "municipio",          # 7  → municipality
    "estado",             # 8  → state
    "recamaras",          # 9  → bedrooms
    "banos",              # 10 → bathrooms
    "m2_construccion",    # 11 → construction_area
    "m2_terreno",         # 12 → land_area
    "estacionamientos",   # 13
    "anio_construccion",  # 14
    "descripcion",        # 15
    "url_original",       # 16 → source_url
    "nombre_agente",      # 17
    "fecha_publicacion",  # 18
    "portal_origen",      # 19 → source
    "fecha_scraping",     # 20
    "activo",             # 21
]

PROPERTY_TYPE_SYNONYMS: Dict[str, List[str]] = {
    "casa":            ["casa", "casas", "casa en condominio", "casa condominio", "casa habitacion",
                        "casa habitación", "residencia", "house", "home", "single family", "chalet", "villa"],
    "departamento":    ["departamento", "departamentos", "depto", "dept", "apartamento", "apto",
                        "apartment", "flat", "loft", "penthouse", "studio", "suite"],
    "terreno":         ["terreno", "terrenos", "lote", "predio", "solar", "land", "lot", "plot"],
    "local comercial": ["local comercial", "locales-comerciales", "local", "comercial", "retail", "shop", "store"],
    "oficina":         ["oficina", "oficinas", "despacho", "office", "coworking"],
    "bodega":          ["bodega", "bodegas", "almacén", "almacen", "warehouse", "storage"],
    "nave industrial": ["nave industrial", "nave", "industrial"],
}


def _normalize_property_type(raw: str) -> str:
    raw_lower = raw.strip().lower()
    for canonical, synonyms in PROPERTY_TYPE_SYNONYMS.items():
        if any(raw_lower == s or raw_lower.startswith(s) for s in synonyms):
            return canonical
    return raw.strip()


def _property_types_match(search_type: str, row_type: str) -> bool:
    return _normalize_property_type(search_type) == _normalize_property_type(row_type)


def _parse_price(raw) -> float:
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[\$,\s]", "", str(raw))
    cleaned = cleaned.replace("MXN", "").replace("mxn", "")
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def _parse_area(raw) -> Optional[float]:
    if raw is None or str(raw).strip() == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[^\d.]", "", str(raw))
    try:
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def _parse_int(raw) -> Optional[int]:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return int(float(str(raw)))
    except (ValueError, TypeError):
        return None


def _parse_float(raw) -> Optional[float]:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return float(str(raw))
    except (ValueError, TypeError):
        return None


def _cell(row: list, index: int):
    try:
        val = row[index]
        return val if val != "" else None
    except IndexError:
        return None


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _get_bearer_token() -> Optional[str]:
    """
    Returns a Bearer token using the service account credentials.json.
    Falls back to None if credentials are not available.
    Sync function — call via run_in_executor in async context.
    """
    # Look for credentials path: env var first, then relative to this file's location,
    # then the scraper directory next to the project root.
    candidates = [
        os.environ.get("GOOGLE_SHEETS_CREDENTIALS", ""),
        str(Path(__file__).parent / "credentials.json"),
        str(Path(__file__).parent.parent.parent / "scraper-inmuebles" / "credentials.json"),
    ]
    creds_path = next((p for p in candidates if p and Path(p).exists()), None)
    if not creds_path:
        logger.warning("No service account credentials found for Google Sheets.")
        return None
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests
        scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token
    except Exception as exc:
        logger.error("Failed to get service account token: %s", exc)
        return None


async def _get_token_async() -> Optional[str]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_bearer_token)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_sheet_tab(
    tab_name: str,
    api_key: str = "",          # kept for backwards compat, ignored if service account works
    sheet_id: str = SHEET_ID_DEFAULT,
) -> List[list]:
    """
    Fetch all rows from a single Google Sheet tab.
    Prefers service account auth; falls back to API key if provided.
    Returns rows with header row removed.
    """
    token = await _get_token_async()

    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
        f"/values/{tab_name}"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if token:
                response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            elif api_key:
                response = await client.get(url + f"?key={api_key}")
            else:
                logger.warning("No auth available for Google Sheets.")
                return []

            response.raise_for_status()
            data = response.json()

        rows = data.get("values", [])
        if not rows:
            logger.info("Tab '%s' returned no data.", tab_name)
            return []

        # Skip header row
        return rows[1:]

    except httpx.HTTPStatusError as exc:
        logger.error(
            "HTTP error fetching tab '%s': %s %s",
            tab_name, exc.response.status_code, exc.response.text[:200],
        )
        return []
    except Exception as exc:
        logger.error("Error fetching tab '%s': %s", tab_name, exc)
        return []


_TITLE_KEYWORDS = [
    "for sale", "for rent", "en venta", "en renta", "warehouse", "bedroom",
    "recámara", "recamara", "m2", "m²", "$", "house", "casa ", "apartment",
    "departamento", "office", "oficina",
]


def _clean_neighborhood(colonia: str, municipio: str) -> str:
    """
    Detects when colonia is actually a listing title (PINCALI used to store title here).
    Returns empty string so the UI falls back to municipio.
    """
    if not colonia:
        return ""
    col_lower = colonia.lower()
    # If too long or contains listing-title keywords → it's not a neighborhood name
    if len(colonia) > 80 or any(kw in col_lower for kw in _TITLE_KEYWORDS):
        return ""
    return colonia


def parse_sheet_row(row: list, source_name: str) -> Dict:
    """
    Parse a raw sheet row into a dict compatible with AIComparable fields.
    Column order matches scraper config.py HEADERS_PROPIEDADES.
    """
    col = {name: _cell(row, i) for i, name in enumerate(SHEET_COLUMNS)}

    municipio = col.get("municipio") or ""
    colonia_raw = col.get("colonia") or ""

    return {
        "source":             col.get("portal_origen") or source_name,
        "source_url":         col.get("url_original") or "",
        "title":              col.get("titulo") or "",
        "neighborhood":       _clean_neighborhood(colonia_raw, municipio),
        "municipality":       municipio,
        "state":              col.get("estado") or "",
        "price":              _parse_price(col.get("precio")),
        "construction_area":  _parse_area(col.get("m2_construccion")),
        "land_area":          _parse_area(col.get("m2_terreno")),
        "bedrooms":           _parse_int(col.get("recamaras")),
        "bathrooms":          _parse_float(col.get("banos")),
        "property_type":      col.get("tipo_propiedad") or "",
        "listing_type":       col.get("tipo_operacion") or "venta",
        "image_url":          None,
        "ai_provider":        "google_sheets",
    }


async def search_comparables_from_sheets(
    location: str,
    property_type: str,
    construction_area: float,
    land_area: float,
    listing_type: str = "venta",
    max_results: int = 10,
) -> List[Dict]:
    """
    Fetch comparables from Google Sheets and filter/rank by location and area.
    """
    sheet_id = os.environ.get("GOOGLE_SHEETS_ID", SHEET_ID_DEFAULT).strip()
    api_key  = os.environ.get("GOOGLE_SHEETS_API_KEY", "").strip()

    try:
        consolidado_rows = await fetch_sheet_tab("CONSOLIDADO", api_key, sheet_id)
        rows_by_source: Dict[str, List[list]] = {}

        if consolidado_rows:
            rows_by_source["CONSOLIDADO"] = consolidado_rows
        else:
            logger.info("CONSOLIDADO empty — fetching individual tabs.")
            individual_tabs = [t for t in SHEET_TABS if t != "CONSOLIDADO"]
            results = await asyncio.gather(
                *[fetch_sheet_tab(tab, api_key, sheet_id) for tab in individual_tabs],
                return_exceptions=True,
            )
            for tab, result in zip(individual_tabs, results):
                if isinstance(result, list):
                    rows_by_source[tab] = result
                else:
                    logger.error("Error fetching tab '%s': %s", tab, result)

        all_parsed: List[Dict] = []
        for source_name, rows in rows_by_source.items():
            for row in rows:
                try:
                    all_parsed.append(parse_sheet_row(row, source_name))
                except Exception as exc:
                    logger.debug("Skipping unparseable row in '%s': %s", source_name, exc)

        if not all_parsed:
            return []

        location_lower = location.strip().lower()
        listing_type_lower = listing_type.strip().lower()

        filtered: List[Dict] = []
        for row in all_parsed:
            if row["price"] <= 0:
                continue
            municipality_lower = (row["municipality"] or "").lower()
            state_lower = (row["state"] or "").lower()
            if (
                location_lower not in municipality_lower
                and location_lower not in state_lower
                and municipality_lower not in location_lower
                and state_lower not in location_lower
            ):
                continue
            if property_type and not _property_types_match(property_type, row["property_type"]):
                continue
            row_listing = (row["listing_type"] or "").lower()
            if row_listing and listing_type_lower and row_listing != listing_type_lower:
                continue
            filtered.append(row)

        if not filtered:
            return []

        # ── CUS del sujeto (Coeficiente de Utilización del Suelo) ─────────────
        # CUS = m2_construccion / m2_terreno
        # Se usa para seleccionar comparables con intensidad de uso similar.
        subj_const  = construction_area if construction_area and construction_area > 0 else 0.0
        subj_land   = land_area if land_area and land_area > 0 else 0.0
        subj_cus    = subj_const / subj_land if subj_const > 0 and subj_land > 0 else None

        reference_area = subj_const if subj_const > 0 else subj_land

        # ── Filtro duro de área y CUS ─────────────────────────────────────────
        # Tolerancias: área ±50%, CUS ±35% (cuando ambos datos están disponibles)
        AREA_TOL = 0.50
        CUS_TOL  = 0.35

        has_area, no_area = [], []
        for row in filtered:
            row_const = row.get("construction_area") or 0.0
            row_land  = row.get("land_area") or 0.0
            row_area  = row_const if row_const > 0 else row_land

            if row_area <= 0:
                no_area.append(row)   # sin área → rank last, no descartar
                continue

            # Filtro de área absoluta: ±50% del área de referencia del sujeto
            if reference_area > 0:
                if not (reference_area * (1 - AREA_TOL) <= row_area <= reference_area * (1 + AREA_TOL)):
                    continue  # área muy diferente → descartar

            # Filtro de CUS: solo cuando sujeto y comparable tienen ambas superficies
            if subj_cus is not None and row_const > 0 and row_land > 0:
                row_cus = row_const / row_land
                if abs(row_cus - subj_cus) / max(subj_cus, 0.01) > CUS_TOL:
                    continue  # CUS muy diferente → descartar

            has_area.append(row)

        filtered = has_area + no_area

        # ── Score combinado: área + CUS ───────────────────────────────────────
        def similarity_score(row: Dict) -> float:
            row_const = row.get("construction_area") or 0.0
            row_land  = row.get("land_area") or 0.0
            row_area  = row_const if row_const > 0 else row_land

            if row_area <= 0 or reference_area <= 0:
                return 0.0

            # Score de área (0–1)
            denom      = max(row_area, reference_area, 1.0)
            area_score = 1.0 - abs(row_area - reference_area) / denom

            # Score de CUS (0–1), solo cuando calculable
            if subj_cus is not None and row_const > 0 and row_land > 0:
                row_cus   = row_const / row_land
                cus_diff  = abs(row_cus - subj_cus) / max(subj_cus, 0.01)
                cus_score = max(0.0, 1.0 - cus_diff)
                return area_score * 0.55 + cus_score * 0.45

            return area_score

        filtered.sort(key=similarity_score, reverse=True)
        return filtered[:max_results]

    except Exception as exc:
        logger.error("Unexpected error in search_comparables_from_sheets: %s", exc)
        return []
