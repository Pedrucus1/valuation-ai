"""
scrapers/vivanuncios_detalle.py — Scraper puntual para páginas de DETALLE de vivanuncios.com.mx

A diferencia de vivanuncios.py (que scrapea LISTADOS y necesita Playwright por el
antibot de esa vista), la página de detalle de un anuncio individual es 100% SSR
sin bloqueo — confirmado en vivo con requests plano. Trae un bloque JS embebido
(var ad = {...}) con precio y ubicación exactos (locationId con jerarquía
zona→ciudad→provincia); el m² y recámaras/baños se leen del texto visible
(mismo criterio que vivanuncios.py._extraer_tarjeta, reusado tal cual).

Uso: python scrapers/vivanuncios_detalle.py <url1> <url2> ...
"""

import hashlib
import re
import sys
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "es-MX,es;q=0.9",
}

_TIPO_URL = {
    "casa": "casa", "terreno": "terreno", "departamento": "departamento",
    "casa-en-condominio": "casa", "casa-uso-de-suelo": "casa",
}


def _tipo_de_url(url: str) -> str:
    m = re.search(r"/a-venta-([a-z-]+)/", url)
    slug = m.group(1) if m else ""
    for k, v in _TIPO_URL.items():
        if slug == k:
            return v
    return "terreno" if "terreno" in slug else "casa"


def extraer_propiedad(url: str) -> dict | None:
    r = requests.get(url, headers=HEADERS, timeout=20)
    if not r.ok:
        return None
    html = r.text

    m = re.search(r"'price':\s*'[A-Za-z]*\s*([\d,]+)'", html)
    if not m:
        return None
    precio = float(m.group(1).replace(",", ""))

    loc = re.search(
        r'\'location\':\s*\{"locationId":"[^"]*","name":"([^"]+)","label":"ZONA".*?'
        r'"name":"([^"]+)","label":"CIUDAD".*?"name":"([^"]+)","label":"PROVINCIA"',
        html,
    )
    colonia = loc.group(1) if loc else ""
    municipio = loc.group(2) if loc else ""
    estado = loc.group(3) if loc else "Jalisco"

    soup = BeautifulSoup(html, "lxml")
    texto = soup.get_text(separator=" ", strip=True).lower()

    tipo = _tipo_de_url(url)

    # Bloque de specs justo bajo el precio ("14535 m² lote 600 m² constr. 3 baños 5 estac.
    # 4 rec. ... 15 años") — mucho más confiable que buscar "m²" suelto en la descripción
    # libre (esa sí puede traer el m² del LOTE hablando de la construcción, o viceversa;
    # bug real 03-sep: "3032 m²" del lote se colaba como m² de construcción).
    m2_const = m2_terreno = recamaras = banos = anio = None
    mm = re.search(r"([\d,]+(?:\.\d+)?)\s*m[²2]\s*lote", texto)
    if mm:
        m2_terreno = float(mm.group(1).replace(",", ""))
    mm = re.search(r"([\d,]+(?:\.\d+)?)\s*m[²2]\s*constr", texto)
    if mm:
        m2_const = float(mm.group(1).replace(",", ""))
    mm = re.search(r"(\d+)\s*rec\.", texto)
    if mm:
        recamaras = int(mm.group(1))
    mm = re.search(r"(\d+)\s*ba[ñn]os\b", texto)
    if mm:
        banos = int(mm.group(1))
    mm = re.search(r"(\d{1,3})\s*a[ñn]os\b", texto)
    if mm:
        anio = datetime.now().year - int(mm.group(1))

    if tipo == "terreno":
        m2_const = None
    elif not m2_const and not m2_terreno:
        # Ni "m² constr." ni "m² lote" en el bloque de specs — último recurso: cualquier
        # m² suelto en el texto (menos confiable, pero mejor que dejarlo vacío).
        mm = re.search(r"([\d,]+(?:\.\d+)?)\s*m[²2]", texto)
        if mm:
            m2_const = float(mm.group(1).replace(",", ""))

    # Terrenos: algunos anunciantes capturan el precio POR M² en vez del total (real:
    # "Venta MN 1,800" en un lote de 1,566m² — $1,800 no es un precio total plausible de
    # nada, pero sí un $/m² de tierra normal en la zona; ×m² da ~$2.8M, coherente con otros
    # terrenos reales de El Roble). Se re-interpreta como $/m² solo cuando el total literal
    # es implausible Y hay m²t para escalarlo — nunca se inventa el dato, solo se reinterpreta
    # con la unidad correcta.
    if tipo == "terreno" and m2_terreno and 0 < precio < 50000:
        precio = precio * m2_terreno
    if not (precio > 50000):
        return None

    return {
        "id_unico": hashlib.md5(url.encode()).hexdigest(),
        "url_original": url,
        "portal_origen": "VIVANUNCIOS",
        "tipo_propiedad": tipo,
        "tipo_operacion": "venta",
        "precio": precio,
        "m2_construccion": m2_const,
        "m2_terreno": m2_terreno,
        "recamaras": recamaras,
        "banos": banos,
        "anio_construccion": anio,
        "colonia": colonia,
        "municipio": municipio,
        "estado": estado,
        "moneda": "MXN",
        "fecha_scraping": datetime.now(timezone.utc).isoformat(),
        "activo": True,
    }


def main(urls: list[str]):
    import db_target

    col = db_target.get_mercado_props()
    insertados = actualizados = fallidos = 0
    for url in urls:
        doc = extraer_propiedad(url.strip())
        if not doc:
            print(f"[FALLO] {url}")
            fallidos += 1
            continue
        res = col.update_one({"id_unico": doc["id_unico"]}, {"$set": doc}, upsert=True)
        if res.upserted_id:
            insertados += 1
        else:
            actualizados += 1
        print(f"[OK] {doc['tipo_propiedad']} — {doc['colonia']}, {doc['municipio']} — "
              f"${doc['precio']:,.0f} — {doc.get('m2_construccion') or doc.get('m2_terreno')}m² — {url}")

    print(f"\n=== {insertados} nuevas, {actualizados} actualizadas, {fallidos} fallidas ===")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scrapers/vivanuncios_detalle.py <url1> <url2> ...")
        sys.exit(1)
    main(sys.argv[1:])
