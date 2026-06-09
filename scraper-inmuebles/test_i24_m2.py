"""Test: verifica extracción m2_construccion de INMUEBLES24 detail pages."""
import re, asyncio, sys
sys.path.insert(0, ".")
from enricher import fetch_detalle, extraer_datos_detalle
import requests

# URL de una casa (más probable que tenga m2 construccion que un local)
URLS = [
    "https://www.inmuebles24.com/propiedades/clasificado/veclocin-oficinas-en-venta-en-las-aguilas-zapopan-jalisco-146014027.html",
    "https://www.inmuebles24.com/propiedades/clasificado/alclcain-renta-casa-parque-virreyes-residencial-148967752.html",
]

session = requests.Session()

for url in URLS:
    print(f"\n=== {url[-60:]} ===")
    html = fetch_detalle(url, "INMUEBLES24", session)
    if not html:
        print("  SIN HTML")
        continue

    # mostrar todos los label/value del JSON
    matches = re.findall(r'"label"\s*:\s*"([^"]+)"\s*,\s*"value"\s*:\s*"([^"]*)"', html, re.I)
    print(f"  label/value pairs: {len(matches)}")
    for label, val in matches:
        print(f"    {label!r}: {val!r}")

    datos = extraer_datos_detalle(html, "INMUEBLES24")
    print(f"  Extraído: {datos}")
