"""Frescura del inventario activo único: mes del último avistamiento."""
import os
from collections import Counter
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

base = {"activo": {"$ne": False}, "es_duplicado_secundario": {"$ne": True}}
meses = Counter()
for d in col.find(base, {"mongo_ts": 1, "fecha_scraping": 1, "enriched_at": 1,
                         "enrich_last_attempt": 1}):
    vistos = [str(d.get(k) or "") for k in
              ("mongo_ts", "fecha_scraping", "enriched_at", "enrich_last_attempt")]
    ultimo = max(vistos)
    meses[ultimo[:7] if ultimo else "(nunca)"] += 1

total = sum(meses.values())
print(f"Activos únicos: {total:,}\nÚltimo avistamiento (scrape O enrich):")
for m, n in sorted(meses.items()):
    print(f"  {m}: {n:,} ({100*n/total:.0f}%)")
