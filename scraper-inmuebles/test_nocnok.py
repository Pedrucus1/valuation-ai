"""Test rápido del scraper NOCNOK — 40 props (2 páginas venta Jalisco)."""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from scrapers.nocnok import scrapear_jalisco, _obtener_build_id, _detalle, SEARCH_URL, STATE_ID_JALISCO
import requests

load_dotenv()

# Conexión Mongo
client = MongoClient(os.getenv("MONGO_URL"))
col = client["propvalu"]["mercado_props"]

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://inmuebles.nocnok.com",
})

# 1. Verificar buildId
build_id = _obtener_build_id(session)
print(f"buildId: {build_id}")

# 2. Pedir 1 página de la API
r = session.get(SEARCH_URL, params={"stateId": STATE_ID_JALISCO, "operation": "sale", "pageNumber": 1})
items = r.json().get("data", [])
print(f"Items en pág 1: {len(items)}")

# 3. Pedir detalle del primer item
if items and build_id:
    item = items[0]
    print(f"\nPrimer item: {item['code']} | {item.get('location')} | {item.get('constructionSize')} | {item.get('price')}")
    detail = _detalle(session, item["url"], build_id)
    print(f"Detail county={detail.get('county')} settlement={detail.get('settlement')} yearBuilt={detail.get('yearBuilt')} salePrice={detail.get('saleLocalPrice')}")

# 4. Correr scraper con límite 40 props
print("\n=== Corriendo scraper (max 40 props) ===")
from scrapers.nocnok import scrapear_jalisco as _scrapear

# Parchar temporalmente para solo 2 páginas
import scrapers.nocnok as _mod
_orig_max = 40

n = _scrapear(col, max_props=40, delay=0.5)
print(f"\nTotal guardadas/actualizadas: {n}")

# Verificar en Mongo
total_nocnok = col.count_documents({"portal_origen": "NOCNOK"})
con_municipio = col.count_documents({"portal_origen": "NOCNOK", "municipio": {"$ne": ""}})
con_anio = col.count_documents({"portal_origen": "NOCNOK", "anio_construccion": {"$exists": True, "$ne": None}})
print(f"\nEn Mongo NOCNOK: {total_nocnok} total, {con_municipio} con municipio, {con_anio} con año")

# Muestra
sample = list(col.find({"portal_origen": "NOCNOK"}, {"titulo":1,"precio":1,"municipio":1,"colonia":1,"m2_construccion":1,"anio_construccion":1,"_id":0}).limit(3))
for s in sample:
    print(f"  >> {s}")
