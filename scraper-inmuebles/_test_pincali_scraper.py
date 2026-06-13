"""Prueba rápida del scraper PINCALI actualizado — 1 zona, 1 tipo."""
import os, sys
sys.path.insert(0, ".")
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from scrapers.pincali import PincaliScraper

s = PincaliScraper()
zona = {"municipio": "Guadalajara", "estado": "Jalisco", "_tipo_actual": "casas"}
props = s._scrapear_zona_operacion(zona, "venta")
print(f"Props extraídas: {len(props)}")
if props:
    p = props[0]
    print(f"  URL: {p.get('url_original','')[:70]}")
    print(f"  Precio: {p.get('precio_raw')}")
    print(f"  Tipo: {p.get('tipo_propiedad')} | Rec: {p.get('recamaras')} | m2c: {p.get('m2_construccion')}")
    print(f"  Colonia: {p.get('colonia','')[:50]}")
    print(f"  portal_origen: {p.get('portal_origen')}")
