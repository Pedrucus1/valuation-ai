import os, re
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']

# Registros con texto (no número) en anio_construccion
for portal in ['PINCALI','MITULA','CASAS_Y_TERRENOS','INMUEBLES24','VIVANUNCIOS']:
    q = {'portal_origen': portal, 'anio_construccion': {'$type': 'string'}}
    total = col.count_documents(q)
    estrenar = col.count_documents({'portal_origen': portal,
        'anio_construccion': {'$regex': 'estrenar|preventa|nueva|new|constru', '$options': 'i'}})
    if total:
        print(f'{portal}: {total} con string en anio_construccion ({estrenar} con "a estrenar/nueva")')
        ejs = list(col.find(q, {'anio_construccion':1, 'url_original':1}).limit(5))
        for e in ejs:
            print(f'  anio="{e.get("anio_construccion")}" | {e.get("url_original","")[:60]}')
