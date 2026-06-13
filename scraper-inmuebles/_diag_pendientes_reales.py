"""Pendientes REALES del enricher (incluye filtro enrich_last_attempt)."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient
from datetime import datetime, timedelta

col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME","propvalu")]["mercado_props"]
cutoff = (datetime.now() - timedelta(days=30)).isoformat()

falta = {"$or": [{"anio_construccion": {"$exists": False}},
                 {"anio_construccion": None},
                 {"colonia": {"$in": [None, ""]}},
                 {"m2_construccion": {"$in": [None, ""]}}]}

print("Portal | pendientes_reales (con filtro) | faltan_datos (sin filtro)")
for p in ["INMUEBLES24", "CASAS_Y_TERRENOS", "PINCALI", "PROPIEDADES_COM", "VIVANUNCIOS", "NOCNOK"]:
    n_real = col.count_documents({
        "portal_origen": p, "activo": {"$ne": False},
        "es_duplicado_secundario": {"$ne": True},
        "enrich_last_attempt": {"$not": {"$gte": cutoff}},
        **falta
    })
    n_total = col.count_documents({"portal_origen": p, "activo": {"$ne": False},
                                   "es_duplicado_secundario": {"$ne": True}, **falta})
    print(f"  {p}: {n_real} / {n_total}")
