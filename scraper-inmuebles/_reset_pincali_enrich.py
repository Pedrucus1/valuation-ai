import os
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from datetime import datetime, timedelta

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
cutoff = (datetime.now() - timedelta(hours=4)).isoformat()
r = col.update_many(
    {'portal_origen': 'PINCALI', 'enrich_last_attempt': {'$gte': cutoff}},
    {'$unset': {'enrich_last_attempt': ''}}
)
print(f'Reseteados hoy (URL rota): {r.modified_count}')
# Cuántos quedan pendientes ahora
cutoff30 = (datetime.now() - timedelta(days=30)).isoformat()
falta = {'$or': [{'anio_construccion': {'$exists': False}}, {'anio_construccion': None},
                 {'m2_construccion': {'$in': [None, '']}}]}
pend = col.count_documents({'portal_origen': 'PINCALI', 'activo': {'$ne': False},
    'es_duplicado_secundario': {'$ne': True},
    'enrich_last_attempt': {'$not': {'$gte': cutoff30}}, **falta})
print(f'Pendientes PINCALI ahora: {pend}')
