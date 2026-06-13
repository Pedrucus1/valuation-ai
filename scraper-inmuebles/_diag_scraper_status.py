"""Estado general del scraper: inventario y fechas de último scrape."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME","propvalu")]["mercado_props"]

total    = col.count_documents({})
activos  = col.count_documents({"activo": {"$ne": False}})
inact    = col.count_documents({"activo": False})
dups     = col.count_documents({"es_duplicado_secundario": True})
unicos   = col.count_documents({"activo": {"$ne": False}, "es_duplicado_secundario": {"$ne": True}})
print(f"Total: {total:,} | Activos: {activos:,} | Inactivos(404): {inact:,}")
print(f"Duplicados secundarios: {dups:,} | Inventario real: {unicos:,}")

print("\nÚltimo scrape por portal (props activas):")
pipe = [
    {"$match": {"activo": {"$ne": False}}},
    {"$group": {"_id": "$portal_origen",
                "ultimo": {"$max": "$fecha_scraping"},
                "total": {"$sum": 1}}},
    {"$sort": {"_id": 1}}
]
for d in col.aggregate(pipe):
    print(f"  {str(d['_id']):22} {d['total']:6,}  | {str(d['ultimo'])[:10]}")
