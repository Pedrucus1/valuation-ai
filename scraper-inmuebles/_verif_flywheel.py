import os, json
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from utils.cleaner import generar_id_unico
c = MongoClient(os.getenv('MONGO_URL'), serverSelectionTimeoutMS=30000, retryReads=True)
col = c[os.getenv('DB_NAME', 'propvalu')]['mercado_props']
u = json.load(open('/tmp/comp_ctx.json'))[0]['url']
uid = generar_id_unico(u)
n = col.count_documents({'url_original': u})
doc = col.find_one({'id_unico': uid}, {'origen_dato': 1, 'telefono': 1, 'recamaras': 1, 'colonia': 1, 'precio': 1, '_id': 0})
print('docs con esa url:', n, '(1 = sin duplicado)')
print('doc:', doc)
