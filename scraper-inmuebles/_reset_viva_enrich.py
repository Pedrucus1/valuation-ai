import os, sys
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']

# Contar cuántos tienen enrich_last_attempt
total = col.count_documents({'portal_origen': 'VIVANUNCIOS', 'activo': {'$ne': False}})
con_attempt = col.count_documents({'portal_origen': 'VIVANUNCIOS', 'activo': {'$ne': False}, 'enrich_last_attempt': {'$exists': True}})
faltan_edad = col.count_documents({'portal_origen': 'VIVANUNCIOS', 'activo': {'$ne': False},
    '$or': [{'anio_construccion': {'$exists': False}}, {'anio_construccion': None},
            {'m2_construccion': {'$in': [None, '']}}]})

print(f'Total VIVANUNCIOS activos: {total}')
print(f'Con enrich_last_attempt: {con_attempt}')
print(f'Sin edad o m2_const: {faltan_edad}')

resp = input('Resetear enrich_last_attempt para VIVANUNCIOS? (s/N): ').strip().lower()
if resp == 's':
    r = col.update_many({'portal_origen': 'VIVANUNCIOS'},
                        {'$unset': {'enrich_last_attempt': ''}})
    print(f'Reseteados: {r.modified_count}')
