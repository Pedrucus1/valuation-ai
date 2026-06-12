"""Diagnóstico temporal: calidad de lo enriquecido el 10-jun + pendientes reales."""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from collections import Counter

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

print("=== 1. Enriquecidos el 10-jun por portal ===")
pipe = [{"$match": {"enriched_at": {"$gte": "2026-06-10"}}},
        {"$group": {"_id": "$portal_origen", "n": {"$sum": 1}}}]
for d in col.aggregate(pipe):
    print(f"  {d['_id']}: {d['n']}")

print("\n=== 2. PCOM enriquecidos 10-jun: m2c (fix size_house) ===")
q = {"portal_origen": "PROPIEDADES_COM", "enriched_at": {"$gte": "2026-06-10"}}
tot = col.count_documents(q)
con_m2c = col.count_documents({**q, "m2_construccion": {"$nin": [None, "", 0]}})
con_anio = col.count_documents({**q, "anio_construccion": {"$nin": [None, "", 0]}})
print(f"  total={tot} | con m2c={con_m2c} | con anio={con_anio}")

print("\n=== 3. Años escritos el 10-jun (detectar falso 2026) ===")
anios = Counter(d.get("anio_construccion") for d in col.find(
    {"enriched_at": {"$gte": "2026-06-10"}, "anio_construccion": {"$exists": True}},
    {"anio_construccion": 1}))
for a, n in sorted(anios.items(), key=lambda x: -x[1])[:10]:
    print(f"  {a}: {n}")

print("\n=== 4. NOCNOK tras re-scrape (yearBuilt fix) ===")
qn = {"portal_origen": "NOCNOK"}
totn = col.count_documents(qn)
conn = col.count_documents({**qn, "anio_construccion": {"$nin": [None, "", 0]}})
raros = col.count_documents({**qn, "anio_construccion": {"$gt": 0, "$lt": 1900}})
print(f"  total={totn} | con anio={conn} | anio<1900 sospechoso={raros}")
ej = [d["anio_construccion"] for d in col.find(
    {**qn, "anio_construccion": {"$nin": [None, "", 0]}},
    {"anio_construccion": 1, "_id": 0}).limit(8)]
print(f"  ejemplos: {ej}")

print("\n=== 5. Pendientes reales por portal (misma query del enricher) ===")
falta = {"$or": [{"anio_construccion": {"$exists": False}},
                 {"anio_construccion": None},
                 {"colonia": {"$in": [None, ""]}},
                 {"m2_construccion": {"$in": [None, ""]}}]}
for p in ["PROPIEDADES_COM", "INMUEBLES24", "CASAS_Y_TERRENOS", "PINCALI",
          "MITULA", "VIVANUNCIOS", "NOCNOK"]:
    n = col.count_documents({"portal_origen": p, "activo": {"$ne": False},
                             "es_duplicado_secundario": {"$ne": True}, **falta})
    print(f"  {p}: {n}")
