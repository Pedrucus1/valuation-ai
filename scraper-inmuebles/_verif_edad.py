"""Verificación: ¿qué exponen las páginas de detalle sobre EDAD/antigüedad?
Fetchea pocas páginas por portal (NO corre el enricher completo) y reporta:
 - edad/age cruda del portal
 - año que extraería el enricher
 - si el texto menciona 'años'/'antigüedad'
"""
import json, re
import requests
from bs4 import BeautifulSoup
from enricher import fetch_detalle, extraer_datos_detalle
from utils.sheets import SheetsClient
import config

COL_URL = 16
N_POR_PORTAL = 4
PORTALES = ["PROPIEDADES_COM", "INMUEBLES24", "PINCALI", "VIVANUNCIOS", "CASAS_Y_TERRENOS", "MITULA"]

sc = SheetsClient()
session = requests.Session()


def raw_age(html, portal):
    """Saca el campo de edad CRUDO del __NEXT_DATA__ donde aplique."""
    try:
        soup = BeautifulSoup(html, "lxml")
        nd = soup.find("script", id="__NEXT_DATA__")
        if not nd:
            return "(sin __NEXT_DATA__)"
        data = json.loads(nd.string)
        if portal == "PROPIEDADES_COM":
            am = (data.get("props", {}).get("pageProps", {}).get("initialState", {})
                  .get("Property", {}).get("property", {}).get("results", {}).get("amenities", {}))
            return f"amenities.age={am.get('age')!r}"
        if portal == "CASAS_Y_TERRENOS":
            ft = data.get("props", {}).get("pageProps", {}).get("property", {}).get("features", {})
            return f"features.age={ft.get('age')!r}"
    except Exception as e:
        return f"(parse err: {e})"
    return "(n/a)"


for tab in PORTALES:
    ws = sc._get_ws(tab)
    rows = ws.get_all_values()
    urls = [r[COL_URL] for r in rows[1:] if len(r) > COL_URL and r[COL_URL].strip()][:N_POR_PORTAL]
    print(f"\n===== {tab} ({len(urls)} muestras) =====")
    for url in urls:
        try:
            html = fetch_detalle(url, tab, session)
            if not html:
                print(f"  [SIN HTML] {url[:55]}")
                continue
            datos = extraer_datos_detalle(html, tab)
            texto = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
            menciona = bool(re.search(r"\b\d+\s*años?\b|antig[üu]edad|year\s*built|construido\s+en", texto, re.I))
            print(f"  raw[{raw_age(html, tab)}] | extrae año={datos.get('año_construccion')} | texto-menciona-edad={menciona} | {url[:50]}")
        except Exception as e:
            print(f"  [ERR {e}] {url[:55]}")
