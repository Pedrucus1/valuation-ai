import os
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from datetime import datetime, timedelta

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
now = datetime.now()
cutoff1h = (now - timedelta(hours=1)).isoformat()
cutoff1d = (now - timedelta(days=1)).isoformat()
cutoff3d = (now - timedelta(days=3)).isoformat()

recent_1h = col.count_documents({'portal_origen': 'INMUEBLES24', 'enrich_last_attempt': {'$gte': cutoff1h}})
recent_1d = col.count_documents({'portal_origen': 'INMUEBLES24', 'enrich_last_attempt': {'$gte': cutoff1d}})
total_3d  = col.count_documents({'portal_origen': 'INMUEBLES24', 'enrich_last_attempt': {'$gte': cutoff3d}})
enriched  = col.count_documents({'portal_origen': 'INMUEBLES24', 'activo': {'$ne': False},
                                  'anio_construccion': {'$nin': [None, '', 0]}})
last = col.find_one({'portal_origen': 'INMUEBLES24', 'enrich_last_attempt': {'$exists': True}},
                    {'enrich_last_attempt': 1}, sort=[('enrich_last_attempt', -1)])

print(f'Procesadas última 1h:  {recent_1h}')
print(f'Procesadas último 1d:  {recent_1d}')
print(f'Procesadas últimos 3d: {total_3d}')
print(f'Total con año: {enriched}')
print(f'Último enrich_last_attempt: {last["enrich_last_attempt"] if last else "nunca"}')
