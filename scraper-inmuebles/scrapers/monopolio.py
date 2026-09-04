"""
scrapers/monopolio.py — Scraper puntual para monopolio.com.mx

A diferencia de los demás portales, Monopolio NO tiene un método de búsqueda por
colonia confiable todavía (slugs de municipio resuelven a ubicaciones incorrectas —
comprobado en vivo: /busqueda/casas-en-venta/jalisco/el-arenal devolvió 189 resultados,
todos de Xochimilco CDMX; el sitemap de vecindarios tampoco incluye colonias chicas
como El Roble). Ver BACKLOG #118/N10.

Lo que SÍ funciona sin bloqueo (no hay Cloudflare/Akamai, robots.txt permite /busqueda):
la página de detalle de cada propiedad es 100% SSR (Next.js) — trae todos los campos
(precio, m2, recámaras, baños, colonia/municipio/estado, año) en un bloque
self.__next_f.push(...) embebido en el HTML, sin necesidad de browser ni JS.

Este scraper recibe URLs de propiedad EXPLÍCITAS (pasadas por el usuario o guardadas
por otro proceso) y las inserta en mercado_props — mismo patrón que
buscar_comparables_browser.js (uso puntual/on-demand, no batch por zona).

Uso: python scrapers/monopolio.py <url1> <url2> ...
"""

import hashlib
import re
import sys
from datetime import datetime, timezone

import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "es-MX,es;q=0.9",
}

_TIPO = {"house": "casa", "apartment": "departamento", "land": "terreno"}
_OPERACION = {"for-sale": "venta", "for-rent": "renta"}


def _num(m, cast=float):
    if not m or m.group(1) in (None, "null"):
        return None
    try:
        return cast(m.group(1))
    except ValueError:
        return None


def extraer_propiedad(url: str) -> dict | None:
    r = requests.get(url, headers=HEADERS, timeout=20)
    if not r.ok:
        return None
    html = r.text.replace('\\"', '"')

    precio = _num(re.search(r'"priceAmount":([\d.]+)', html))
    if not precio:
        return None
    m2_construccion = _num(re.search(r'"constructionSurface":([\d.]+)', html))
    m2_terreno = _num(re.search(r'"terrainSurface":([\d.]+)', html))
    recamaras = _num(re.search(r'"bedrooms":(\d+)', html), int)
    banos = _num(re.search(r'"bathrooms":(\d+)', html), int)
    estacionamientos = _num(re.search(r'"parkingLots":(\d+)', html), int)
    anio = _num(re.search(r'"builtYear":(\d+)', html), int)
    tipo_raw = re.search(r'"propertyType":"([^"]+)"', html)
    op_raw = re.search(r'"operation":"([^"]+)"', html)

    breadcrumbs = re.search(r'\[\{"type":"state".*?\],"dataUpdateCount"', html)
    estado = municipio = colonia = ""
    if breadcrumbs:
        for tipo, nombre in re.findall(r'"type":"(\w+)","id":"[^"]*","name":"([^"]+)"', breadcrumbs.group(0)):
            if tipo == "state":
                estado = nombre.title()
            elif tipo == "municipality":
                municipio = nombre.title()
            elif tipo == "neighborhood":
                colonia = nombre.title()

    return {
        "id_unico": hashlib.md5(url.encode()).hexdigest(),
        "url_original": url,
        "portal_origen": "MONOPOLIO",
        "tipo_propiedad": _TIPO.get(tipo_raw.group(1) if tipo_raw else "", "casa"),
        "tipo_operacion": _OPERACION.get(op_raw.group(1) if op_raw else "", "venta"),
        "precio": precio,
        "m2_construccion": m2_construccion,
        "m2_terreno": m2_terreno,
        "recamaras": recamaras,
        "banos": banos,
        "estacionamientos": estacionamientos,
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
        print(f"[OK] {doc['colonia']}, {doc['municipio']} — ${doc['precio']:,.0f} — {doc['m2_construccion']}m² — {url}")

    print(f"\n=== {insertados} nuevas, {actualizados} actualizadas, {fallidos} fallidas ===")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scrapers/monopolio.py <url1> <url2> ...")
        sys.exit(1)
    main(sys.argv[1:])
