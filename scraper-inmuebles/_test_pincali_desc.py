import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None,
    'tipo_propiedad': 'departamento'}).limit(30))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')

    # Buscar contenedor principal del inmueble (antes del carrusel de similares)
    for sel in ['[class*="property-detail"]','[class*="listing-detail"]','[class*="property__detail"]',
                'main','article','[class*="description"]','[class*="about"]','[data-property]',
                'section[class*="property"]','[class*="property-info"]']:
        tag = soup.select_one(sel)
        if tag:
            txt = tag.get_text(' ', strip=True)[:300]
            if any(k in txt.lower() for k in ['estrenar','preventa','nueva','new build','brand new']):
                print(f'  [{sel}] TIENE obra-nueva: {txt[:150]}')
            elif len(txt) > 50:
                print(f'  [{sel}] OK: {txt[:100]}')
            break

    # Título h1
    h1 = soup.find('h1')
    if h1:
        print(f'  h1: {h1.get_text(strip=True)[:100]}')

    # Schema.org description
    import json
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            d = json.loads(tag.string or '{}')
            desc = d.get('description','')
            if desc and any(k in desc.lower() for k in ['estrenar','preventa','nueva','new build']):
                print(f'  JSON-LD desc NUEVA: {desc[:150]}')
        except: pass
    break
