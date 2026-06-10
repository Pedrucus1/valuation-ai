"""
scrapers/nocnok.py — Scraper para inmuebles.nocnok.com (Jalisco)

API JSON pura — sin Playwright ni CDP.
Endpoints:
  GET /api/properties/search?stateId=14&countyIds=ID&operation=sale|rent
                            &fromPrice=X&toPrice=Y&pageNumber=N
  GET /_next/data/{buildId}{path}.json  → yearBuilt, county, settlement

Parámetros verificados:
  stateId=14    → Jalisco  (único filtro geográfico nivel estado que funciona)
  countyIds=ID  → filtra por municipio
  fromPrice/toPrice → para municipios con >500 props (Zapopan, GDL)
  pageNumber    → paginación (pageSize fija en 20, cap hard en 25 páginas = 500 props)

Municipios cubier tos y sus countyIds:
  Guadalajara 570 | Zapopan 651 | San Pedro Tlaquepaque 629
  Tlajomulco de Zúñiga 628 | Tonalá 632 | Chapala 561 | Mazamitla 590
"""

import re
import time
import hashlib
import requests
from datetime import datetime
from loguru import logger as log

import config

BASE_URL = "https://inmuebles.nocnok.com"
SEARCH_URL = f"{BASE_URL}/api/properties/search"
PORTAL = "NOCNOK"
MAX_PAGES = 25  # límite hard del API

# countyId → nombre canónico (verificado con detail pages)
COUNTIES = {
    "570": "Guadalajara",
    "651": "Zapopan",
    "629": "San Pedro Tlaquepaque",
    "628": "Tlajomulco de Zúñiga",
    "632": "Tonalá",
    "561": "Chapala",
    "590": "Mazamitla",
}

# Para municipios que superan 500, dividir por precio (split en dos lotes)
# Rango para el lote bajo; lote alto = fromPrice=split+1 sin toPrice
PRICE_SPLIT = {
    "651": 3_500_000,   # Zapopan: 350 <=3.5M  478 >3.5M
    "570": 3_000_000,   # Guadalajara: 324 <=3M  214 >3M
}

_M2_RE = re.compile(r"([\d,\.]+)\s*m", re.I)
_PRECIO_RE = re.compile(r"([\d,]+(?:\.\d+)?)")


def _md5(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()


def _parsear_m2(s: str) -> float | None:
    if not s:
        return None
    m = _M2_RE.search(s)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


def _parsear_precio(s: str) -> float | None:
    if not s:
        return None
    m = _PRECIO_RE.search(s.replace(",", ""))
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def _obtener_build_id(session: requests.Session) -> str | None:
    try:
        r = session.get(BASE_URL, timeout=15)
        m = re.search(r'"buildId"\s*:\s*"([^"]+)"', r.text)
        if m:
            return m.group(1)
    except Exception as e:
        log.warning(f"[NOCNOK] No se pudo obtener buildId: {e}")
    return None


def _detalle(session: requests.Session, url: str, build_id: str) -> dict:
    """Llama al endpoint _next/data para obtener yearBuilt, county, settlement."""
    try:
        path = url.replace(BASE_URL, "")
        r = session.get(f"{BASE_URL}/_next/data/{build_id}{path}.json", timeout=15)
        if r.status_code != 200:
            return {}
        return r.json().get("pageProps", {}).get("property", {})
    except Exception as e:
        log.debug(f"[NOCNOK] Detalle error: {e}")
        return {}


def _mapear(search_item: dict, detail: dict) -> dict:
    url = search_item.get("url", "")

    precio = (detail.get("saleLocalPrice") or detail.get("rentLocalPrice")
              or _parsear_precio(search_item.get("price", "")))

    m2c = _parsear_m2(search_item.get("constructionSize") or detail.get("constructionSize", ""))
    m2t = _parsear_m2(search_item.get("lotSize") or detail.get("lotSize", ""))

    municipio = detail.get("county", "")
    colonia = detail.get("settlement", "")
    if not municipio:
        parts = [p.strip() for p in search_item.get("location", "").split(",")]
        colonia = parts[0] if parts else ""

    year_built = detail.get("yearBuilt", 0) or 0
    anio = None
    if year_built:
        yb = int(year_built)
        if 1 < yb < 150:          # edad en años (ej. 20 → año 2006)
            from datetime import date as _d
            anio = _d.today().year - yb
        elif yb > 1900:            # año directo
            anio = yb

    op_code = (detail.get("operationCode") or search_item.get("operation", "")).lower()
    tipo_op = "venta" if op_code in ("sale", "venta") else "renta" if op_code in ("rent", "renta") else op_code

    tipo_map = {
        "casa": "Casa", "house": "Casa",
        "departamento": "Departamento", "apartment": "Departamento",
        "terreno": "Terreno", "land": "Terreno",
        "local": "Local Comercial", "commercial": "Local Comercial",
        "oficina": "Oficina", "office": "Oficina",
        "bodega": "Bodega", "warehouse": "Bodega",
    }
    tipo_raw = (detail.get("type") or search_item.get("type", "")).lower()
    tipo_prop = tipo_map.get(tipo_raw, search_item.get("type", ""))

    fecha_str = detail.get("statusDate") or search_item.get("statusDate", "")
    try:
        fecha_pub = datetime.fromisoformat(fecha_str.replace("Z", "")) if fecha_str else None
    except Exception:
        fecha_pub = None

    geo = search_item.get("geolocation") or detail.get("geolocation") or {}

    return {
        "id_unico": _md5(url),
        "portal_origen": PORTAL,
        "url_original": url,
        "titulo": detail.get("title") or search_item.get("title", ""),
        "descripcion": (detail.get("description") or search_item.get("description", ""))[:500],
        "precio": precio,
        "moneda": "MXN",
        "tipo_operacion": tipo_op,
        "tipo_propiedad": tipo_prop,
        "colonia": colonia,
        "municipio": municipio,
        "estado": detail.get("state") or "Jalisco",
        "codigo_postal": detail.get("postalCode", ""),
        "calle_numero": (detail.get("street") or "").strip(),
        "recamaras": search_item.get("bedrooms") or detail.get("bedrooms"),
        "banos": search_item.get("bathrooms") or detail.get("bathrooms"),
        "estacionamientos": search_item.get("parkingSpaces") or detail.get("parkingSpaces"),
        "m2_construccion": m2c,
        "m2_terreno": m2t,
        "anio_construccion": anio,
        "lat": geo.get("lat"),
        "lon": geo.get("lon"),
        "nombre_agente": (detail.get("account") or search_item.get("account", {})).get("name", ""),
        "fecha_publicacion": fecha_pub,
        "fecha_scraping": datetime.utcnow(),
        "activo": True,
    }


def _paginar_lote(session, params: dict, mongo_col, build_id: str, delay: float) -> int:
    """Itera todas las páginas de una query y guarda en Mongo. Retorna props guardadas."""
    guardadas = 0
    for page in range(1, MAX_PAGES + 1):
        try:
            r = session.get(SEARCH_URL, params={**params, "pageNumber": page}, timeout=20)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            log.error(f"[NOCNOK] Error pág {page}: {e}")
            break

        items = data.get("data", [])
        paging = data.get("paging", {})
        actual_page = paging.get("pageNumber", page)

        if not items:
            break

        log.info(f"[NOCNOK] {params.get('countyIds','?')} op={params.get('operation')} "
                 f"pág={actual_page} — {len(items)} items")

        for item in items:
            url = item.get("url", "")
            if not url:
                continue
            detail = _detalle(session, url, build_id)
            time.sleep(delay)

            doc = _mapear(item, detail)
            try:
                res = mongo_col.update_one(
                    {"id_unico": doc["id_unico"]},
                    {"$set": doc},
                    upsert=True,
                )
                guardadas += 1 if (res.upserted_id or res.modified_count) else 0
            except Exception as e:
                log.error(f"[NOCNOK] Mongo error: {e}")

        # Si el API empezó a repetir páginas (cap), parar
        if actual_page < page:
            break

        time.sleep(delay)

    return guardadas


def scrapear_jalisco(mongo_col, delay: float = 0.8) -> int:
    """
    Descarga todas las propiedades de Jalisco (venta + renta) y las guarda en MongoDB.
    Divide municipios >500 en lotes por precio.
    """
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": BASE_URL,
    })

    build_id = _obtener_build_id(session)
    if not build_id:
        log.error("[NOCNOK] No se pudo obtener buildId — abortando")
        return 0
    log.info(f"[NOCNOK] buildId={build_id}")

    total = 0
    for operation in ("sale", "rent"):
        for county_id, county_name in COUNTIES.items():
            base_params = {
                "stateId": "14",
                "countyIds": county_id,
                "operation": operation,
            }

            if county_id in PRICE_SPLIT:
                split = PRICE_SPLIT[county_id]
                log.info(f"[NOCNOK] {county_name} op={operation} — dividiendo por precio (split={split:,})")
                # Lote bajo
                total += _paginar_lote(session, {**base_params, "toPrice": split}, mongo_col, build_id, delay)
                # Lote alto
                total += _paginar_lote(session, {**base_params, "fromPrice": split + 1}, mongo_col, build_id, delay)
            else:
                log.info(f"[NOCNOK] {county_name} op={operation}")
                total += _paginar_lote(session, base_params, mongo_col, build_id, delay)

    log.info(f"[NOCNOK] COMPLETADO total={total}")
    return total
