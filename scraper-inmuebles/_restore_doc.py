import os, json
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup
import requests
from enricher import fetch_detalle
from utils.cleaner import generar_id_unico

URL = "https://www.casasyterrenos.com/propiedad/casa-venta-villa-verona-villa-verona-zapopan-jal-3825987"
c = MongoClient(os.getenv('MONGO_URL'), serverSelectionTimeoutMS=30000, retryReads=True)
col = c[os.getenv('DB_NAME', 'propvalu')]['mercado_props']

html = fetch_detalle(URL, 'CASAS_Y_TERRENOS', requests.Session())
data = json.loads(BeautifulSoup(html, 'lxml').find('script', id='__NEXT_DATA__').string)
prop = data.get('props', {}).get('pageProps', {}).get('property', {})
colonia = prop.get('neighborhood') or prop.get('county') or ''
precio = prop.get('sellingPrice') or 0
print('real colonia:', colonia, '| precio:', precio)

uid = generar_id_unico(URL)
col.update_one({'id_unico': uid},
               {'$set': {'colonia': colonia, 'precio': precio},
                '$unset': {'origen_dato': '', 'enriched_at': ''}})
print('restaurado:', col.find_one({'id_unico': uid}, {'colonia': 1, 'precio': 1, 'origen_dato': 1, '_id': 0}))
