import os
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from datetime import datetime, timedelta

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
cutoff30 = (datetime.now() - timedelta(days=30)).isoformat()
cutoff2d = (datetime.now() - timedelta(days=2)).isoformat()

falta_q = {"$or": [{"anio_construccion": {"$exists": False}}, {"anio_construccion": None},
                   {"m2_construccion": {"$in": [None, ""]}}]}

portales = ["PROPIEDADES_COM","CASAS_Y_TERRENOS","INMUEBLES24","PINCALI","VIVANUNCIOS","MITULA","NOCNOK"]
print(f"{'Portal':<20} {'Total':>6} {'Enriq':>6} {'%':>4} {'Pend':>6} {'Bloq30d':>7} {'UltEnrich':>12}")
print("-"*75)
for p in portales:
    total = col.count_documents({'portal_origen': p, 'activo': {'$ne': False}})
    enriched = col.count_documents({'portal_origen': p, 'activo': {'$ne': False},
        'anio_construccion': {'$nin': [None, '', 0]}})
    pendientes = col.count_documents({'portal_origen': p, 'activo': {'$ne': False},
        'es_duplicado_secundario': {'$ne': True},
        'enrich_last_attempt': {'$not': {'$gte': cutoff30}}, **falta_q})
    bloq = col.count_documents({'portal_origen': p, 'enrich_last_attempt': {'$gte': cutoff30}, **falta_q})
    # Última actividad del enricher
    last = col.find_one({'portal_origen': p, 'enrich_last_attempt': {'$exists': True}},
                        {'enrich_last_attempt': 1}, sort=[('enrich_last_attempt', -1)])
    last_ts = last['enrich_last_attempt'][:16] if last else 'nunca'
    pct = round(enriched/total*100) if total > 0 else 0
    print(f"{p:<20} {total:>6} {enriched:>6} {pct:>3}% {pendientes:>6} {bloq:>7} {last_ts:>12}")

print()
# Total activos
tot = col.count_documents({'activo': {'$ne': False}})
dup = col.count_documents({'es_duplicado_secundario': True})
print(f"Total activos: {tot:,}  |  Duplicados secundarios: {dup:,}  |  Únicos: {tot-dup:,}")
