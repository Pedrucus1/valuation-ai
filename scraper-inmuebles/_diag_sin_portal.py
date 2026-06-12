"""¿Qué son los 5,169 docs sin portal_origen?"""
import os
from urllib.parse import urlparse
from collections import Counter
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

q = {"activo": {"$ne": False}, "es_duplicado_secundario": {"$ne": True},
     "$or": [{"portal_origen": {"$exists": False}}, {"portal_origen": {"$in": [None, ""]}}]}

print("Dominio de url_original:")
dom = Counter()
campos = Counter()
con_campo_portal = Counter()
for d in col.find(q, {"url_original": 1, "portal": 1, "fecha_scraping": 1, "mongo_ts": 1}).limit(6000):
    u = d.get("url_original") or ""
    dom[urlparse(u).netloc if u else "(sin url)"] += 1
    if d.get("portal"):
        con_campo_portal[d["portal"]] += 1
    ts = d.get("mongo_ts") or str(d.get("fecha_scraping") or "")
    campos[str(ts)[:7]] += 1

for k, v in dom.most_common(10):
    print(f"  {k}: {v}")
print("\nCampo 'portal' (legacy, sin _origen):")
for k, v in con_campo_portal.most_common(10):
    print(f"  {k}: {v}")
print("\nMes de inserción/scrape:")
for k, v in sorted(campos.items()):
    print(f"  {k}: {v}")
