"""Diagnostico: año=2026 por portal y fecha enriched."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME","propvalu")]["mercado_props"]

print("=== año=2026 por portal y mes enriched ===")
pipe = [
    {"$match": {"anio_construccion": 2026}},
    {"$group": {"_id": {"portal": "$portal_origen", "mes": {"$substr": [{"$ifNull": ["$enriched_at", ""]}, 0, 7]}}, "n": {"$sum": 1}}},
    {"$sort": {"_id.portal": 1, "_id.mes": 1}}
]
for d in col.aggregate(pipe):
    print(f"  {d['_id']['portal']} / {d['_id']['mes']}: {d['n']}")

total = col.count_documents({"anio_construccion": 2026})
print(f"\nTotal año=2026: {total}")

# Muestra 5 ejemplos con URL para inspección manual
print("\nEjemplos PINCALI con año=2026:")
for d in col.find({"anio_construccion": 2026, "portal_origen": "PINCALI"},
                  {"url_original": 1, "enriched_at": 1, "_id": 0}).limit(5):
    print(f"  {d.get('enriched_at','?')[:16]} | {d.get('url_original','')[:80]}")
