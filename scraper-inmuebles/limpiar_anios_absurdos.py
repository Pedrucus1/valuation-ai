"""Unset de anio_construccion absurdo (0, negativo, <1800 o >2028) en mercado_props.

Origen: agentes que ponen el AÑO en el campo de antigüedad (CYT age=2026 → 0)
o antigüedades grandes mal interpretadas (PCOM age=2005 → año 21).
Uso: python limpiar_anios_absurdos.py [--dry-run]
"""
import os
import sys
from datetime import datetime
from collections import Counter
from dotenv import load_dotenv
from pymongo import MongoClient

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME", "propvalu")]["mercado_props"]

q = {"$or": [{"anio_construccion": {"$type": "number", "$lt": 1800}},
             {"anio_construccion": {"$type": "number", "$gt": 2028}}]}

n = col.count_documents(q)
print(f"Docs con anio absurdo (<1800 o >2028): {n}")
print("Por portal y valor:")
c = Counter((d["portal_origen"], d["anio_construccion"])
            for d in col.find(q, {"portal_origen": 1, "anio_construccion": 1}))
for (p, a), cnt in c.most_common(15):
    print(f"  {p} anio={a}: {cnt}")

if "--dry-run" in sys.argv:
    sys.exit(0)

res = col.update_many(q, {
    "$unset": {"anio_construccion": ""},
    "$set": {"anio_absurdo_limpiado": datetime.now().isoformat()},
})
print(f"Limpiados: {res.modified_count}")
