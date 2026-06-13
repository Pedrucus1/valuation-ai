"""PINCALI: de las que SÍ se enriquecieron hoy, ¿tienen anio_construccion?"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from collections import Counter

col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME","propvalu")]["mercado_props"]

# Enriquecidas hoy (12-jun)
q = {"portal_origen": "PINCALI", "enriched_at": {"$gte": "2026-06-12"}}
total = col.count_documents(q)
con_anio = col.count_documents({**q, "anio_construccion": {"$nin": [None, "", 0]}})
con_m2c  = col.count_documents({**q, "m2_construccion": {"$nin": [None, "", 0]}})
print(f"Enriquecidas hoy: {total} | con anio: {con_anio} | con m2c: {con_m2c}")

# Muestra 5 ejemplos con datos
print("\nEjemplos con anio:")
for d in col.find({**q, "anio_construccion": {"$nin": [None, "", 0]}},
                  {"anio_construccion": 1, "url_original": 1, "_id": 0}).limit(5):
    print(f"  {d['anio_construccion']} | {d['url_original'][:70]}")
