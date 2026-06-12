"""Radiografía del inventario real de mercado_props: crudo vs útil."""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

total = col.count_documents({})
inactivos = col.count_documents({"activo": False})
dup_sec = col.count_documents({"es_duplicado_secundario": True})
dup_y_inactivo = col.count_documents({"activo": False, "es_duplicado_secundario": True})
activos_unicos = col.count_documents({"activo": {"$ne": False},
                                      "es_duplicado_secundario": {"$ne": True}})
print(f"Total crudo:                 {total:,}")
print(f"  Inactivos (404/eliminados): {inactivos:,}")
print(f"  Duplicados secundarios:     {dup_sec:,} (de los cuales {dup_y_inactivo:,} también inactivos)")
print(f"  ACTIVOS ÚNICOS (inventario): {activos_unicos:,}")

base = {"activo": {"$ne": False}, "es_duplicado_secundario": {"$ne": True}}
venta = col.count_documents({**base, "tipo_operacion": "venta"})
renta = col.count_documents({**base, "tipo_operacion": "renta"})
otro = activos_unicos - venta - renta
print(f"\nDel inventario activo único:")
print(f"  Venta: {venta:,} | Renta: {renta:,} | Sin operación/otro: {otro:,}")

print(f"\nPor portal (activos únicos):")
pipe = [{"$match": base}, {"$group": {"_id": "$portal_origen", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}}]
for d in col.aggregate(pipe):
    print(f"  {d['_id']}: {d['n']:,}")

# Cuántos siguen sin poder evaluarse para dedup (sin colonia o sin m²)
no_eval = col.count_documents({**base, "$or": [{"colonia": {"$in": [None, ""]}},
                                               {"$and": [{"m2_construccion": {"$in": [None, "", 0]}},
                                                         {"m2_terreno": {"$in": [None, "", 0]}}]}]})
print(f"\nNo evaluables para dedup (sin colonia o sin ningún m²): {no_eval:,} "
      f"({100*no_eval/activos_unicos:.1f}% del inventario)")

# Frescura: cuántos no se han visto en el último scrape mensual
visto_jun = col.count_documents({**base, "mongo_ts": {"$gte": "2026-06-01"}})
print(f"Vistos por el scraper en junio: {visto_jun:,} de {activos_unicos:,} "
      f"(el resto puede estar vendido/retirado sin detectar)")
