"""
Google Sheets Comparables Fetcher for PropValu
Reads real estate listings scraped into a Google Sheet and returns
AIComparable-compatible dicts for use in the valuation pipeline.
"""

import logging
import os
import re
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

# Column order expected from the scraper output
SHEET_COLUMNS = [
    "title",
    "price",
    "neighborhood",
    "municipality",
    "state",
    "construction_area",
    "land_area",
    "bedrooms",
    "bathrooms",
    "property_type",
    "listing_type",
    "source_url",
]

# Property type synonym groups (lowercase)
PROPERTY_TYPE_SYNONYMS: Dict[str, List[str]] = {
    "casa": ["casa", "casa en condominio", "casa condominio", "casa habitacion",
             "casa habitación", "residencia"],
    "departamento": ["departamento", "depto", "dept", "apartamento", "apto"],
    "terreno": ["terreno", "lote", "predio", "solar"],
    "local comercial": ["local comercial", "local", "comercial"],
    "oficina": ["oficina", "despacho"],
    "bodega": ["bodega", "almacén", "almacen"],
    "nave industrial": ["nave industrial", "nave", "industrial"],
}


def _normalize_property_type(raw: str) -> str:
    """Return the canonical property type key for a raw string, or the original."""
    raw_lower = raw.strip().lower()
    for canonical, synonyms in PROPERTY_TYPE_SYNONYMS.items():
        if any(raw_lower == s or raw_lower.startswith(s) for s in synonyms):
            return canonical
    return raw.strip()


def _property_types_match(search_type: str, row_type: str) -> bool:
    """Return True when search_type and row_type resolve to the same canonical type."""
    return _normalize_property_type(search_type) == _normalize_property_type(row_type)


def _parse_price(raw) -> float:
    """Parse a price value to float, stripping currency symbols and separators."""
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
    """Parse an area value to float."""
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
    """Safe cell accessor — returns None when column is absent."""
    try:
        val = row[index]
        return val if val != "" else None
    except IndexError:
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_sheet_tab(
    tab_name: str,
    api_key: str,
    sheet_id: str = SHEET_ID_DEFAULT,
) -> List[list]:
    """
    Fetch all rows from a single Google Sheet tab via Sheets API v4.

    Returns a list of rows (list of lists), with the header row removed.
    Returns [] on any error.
    """
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}"
        f"/values/{tab_name}?key={api_key}"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
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
    except Exception as exc:  # noqa: BLE001
        logger.error("Error fetching tab '%s': %s", tab_name, exc)
        return []


def parse_sheet_row(row: list, source_name: str) -> Dict:
    """
    Parse a raw sheet row into a dict compatible with AIComparable fields.

    Expected column order: title, price, neighborhood, municipality, state,
    construction_area, land_area, bedrooms, bathrooms, property_type,
    listing_type, source_url
    """
    col = {name: _cell(row, i) for i, name in enumerate(SHEET_COLUMNS)}

    return {
        "source": source_name,
        "source_url": col["source_url"] or "",
        "title": col["title"] or "",
        "neighborhood": col["neighborhood"] or "",
        "municipality": col["municipality"] or "",
        "state": col["state"] or "",
        "price": _parse_price(col["price"]),
        "construction_area": _parse_area(col["construction_area"]),
        "land_area": _parse_area(col["land_area"]),
        "bedrooms": _parse_int(col["bedrooms"]),
        "bathrooms": _parse_float(col["bathrooms"]),
        "property_type": col["property_type"] or "",
        "listing_type": col["listing_type"] or "venta",
        "image_url": None,
        "ai_provider": "google_sheets",
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
    Main entry point: fetch comparables from Google Sheets and filter/rank them.

    Reads GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID from the environment.
    Returns a list of dicts compatible with AIComparable fields.
    """
    api_key = os.environ.get("GOOGLE_SHEETS_API_KEY", "").strip()
    if not api_key:
        logger.warning(
            "GOOGLE_SHEETS_API_KEY not set — skipping Google Sheets comparables."
        )
        return []

    sheet_id = os.environ.get("GOOGLE_SHEETS_ID", SHEET_ID_DEFAULT).strip()

    try:
        # Try CONSOLIDADO first; fall back to all individual tabs
        rows_by_source: Dict[str, List[list]] = {}

        consolidado_rows = await fetch_sheet_tab("CONSOLIDADO", api_key, sheet_id)
        if consolidado_rows:
            rows_by_source["CONSOLIDADO"] = consolidado_rows
        else:
            logger.info("CONSOLIDADO empty or unavailable — fetching individual tabs.")
            import asyncio
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

        # Parse every row
        all_parsed: List[Dict] = []
        for source_name, rows in rows_by_source.items():
            for row in rows:
                try:
                    parsed = parse_sheet_row(row, source_name)
                    all_parsed.append(parsed)
                except Exception as exc:  # noqa: BLE001
                    logger.debug("Skipping unparseable row in '%s': %s", source_name, exc)

        if not all_parsed:
            logger.info("No rows parsed from sheets.")
            return []

        # Filter
        location_lower = location.strip().lower()
        listing_type_lower = listing_type.strip().lower()

        filtered: List[Dict] = []
        for row in all_parsed:
            # Price must be positive
            if row["price"] <= 0:
                continue

            # Location match: municipality or state (partial, case-insensitive)
            municipality_lower = (row["municipality"] or "").lower()
            state_lower = (row["state"] or "").lower()
            if (
                location_lower not in municipality_lower
                and location_lower not in state_lower
                and municipality_lower not in location_lower
                and state_lower not in location_lower
            ):
                continue

            # Property type match
            if property_type and not _property_types_match(
                property_type, row["property_type"]
            ):
                continue

            # Listing type match (lenient: if row has no listing_type, accept it)
            row_listing = (row["listing_type"] or "").lower()
            if row_listing and listing_type_lower and row_listing != listing_type_lower:
                continue

            filtered.append(row)

        if not filtered:
            logger.info(
                "No comparables matched location='%s', property_type='%s'.",
                location,
                property_type,
            )
            return []

        # Score by construction_area proximity
        reference_area = construction_area if construction_area and construction_area > 0 else land_area

        def area_score(row: Dict) -> float:
            row_area = row.get("construction_area") or row.get("land_area") or 0.0
            if row_area <= 0 or reference_area <= 0:
                return 0.0
            denom = max(row_area, reference_area, 1.0)
            return 1.0 - abs(row_area - reference_area) / denom

        filtered.sort(key=area_score, reverse=True)

        return filtered[:max_results]

    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error in search_comparables_from_sheets: %s", exc)
        return []
