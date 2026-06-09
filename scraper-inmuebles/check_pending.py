from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()

client = MongoClient(os.getenv("MONGO_URL"))
col = client["propvalu"]["mercado_props"]

falta = {"$or": [
    {"anio_construccion": {"$exists": False}},
    {"anio_construccion": None},
    {"colonia": {"$in": [None, ""]}},
    {"m2_construccion": {"$in": [None, ""]}}
]}

for portal in ["PINCALI", "INMUEBLES24", "PROPIEDADES_COM"]:
    q = {**falta, "portal_origen": portal}
    n = col.count_documents(q)
    total = col.count_documents({"portal_origen": portal})
    print(f"{portal}: {n:,} pendientes de {total:,} total")
