"""¿Los 5,169 CYT sin portal_origen duplican listings CYT existentes?
CYT incluye el id numérico del anuncio al final de la URL → comparar ids."""
import os
import re
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]


def listing_id(url):
    m = re.search(r"-(\d{5,})/?$", url or "")
    return m.group(1) if m else None


nuevos = {}
for d in col.find({"portal_origen": {"$in": [None, ""]}, "portal": "CASAS_Y_TERRENOS"},
                  {"url_original": 1, "id_unico": 1}):
    lid = listing_id(d.get("url_original"))
    if lid:
        nuevos[lid] = d["id_unico"]
print(f"Nuevos con id numérico extraíble: {len(nuevos)} de 5,169")

viejos = set()
for d in col.find({"portal_origen": "CASAS_Y_TERRENOS"}, {"url_original": 1}):
    lid = listing_id(d.get("url_original"))
    if lid:
        viejos.add(lid)
print(f"Viejos CYT con id numérico: {len(viejos)}")

solape = set(nuevos) & viejos
print(f"SOLAPE (mismo anuncio, URL distinta): {len(solape)}")
print(f"Genuinamente nuevos: {len(nuevos) - len(solape)}")
