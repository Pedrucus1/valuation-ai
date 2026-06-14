import os, sys
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from datetime import datetime, timedelta

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
cutoff = (datetime.now() - timedelta(days=30)).isoformat()

portales = ["PROPIEDADES_COM","CASAS_Y_TERRENOS","INMUEBLES24","PINCALI","VIVANUNCIOS","MITULA","NOCNOK"]
falta_q = {"$or": [{"anio_construccion": {"$exists": False}}, {"anio_construccion": None},
                   {"m2_construccion": {"$in": [None, ""]}}]}

for p in portales:
    total = col.count_documents({'portal_origen': p, 'activo': {'$ne': False}})
    enriched = col.count_documents({'portal_origen': p, 'activo': {'$ne': False}, 'anio_construccion': {'$nin': [None, '']}})
    pendientes_real = col.count_documents({'portal_origen': p, 'activo': {'$ne': False},
        'es_duplicado_secundario': {'$ne': True},
        'enrich_last_attempt': {'$not': {'$gte': cutoff}}, **falta_q})
    bloqueados = col.count_documents({'portal_origen': p, 'enrich_last_attempt': {'$gte': cutoff}, **falta_q})
    pct = round(enriched/total*100) if total > 0 else 0
    print(f'{p:20s}  total={total:6d}  enriq={enriched:6d} ({pct:3d}%)  pendientes={pendientes_real:6d}  bloq_30d={bloqueados:5d}')
