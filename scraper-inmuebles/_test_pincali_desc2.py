import os, sys, requests, re, json
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

    print(f'URL: {url[:70]}')
    # JSON-LD description (schema.org — acotada al inmueble, no navegación)
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            d = json.loads(tag.string or '{}')
            if d.get('description'):
                print(f'  JSON-LD desc: {d["description"][:200]}')
        except: pass

    # Título h1 (siempre del inmueble)
    h1 = soup.find('h1')
    if h1: print(f'  h1: {h1.get_text(strip=True)[:100]}')

    # Buscar divs/sections con clase que contengan la descripción del agente
    for sel in ['[class*="description"]','[class*="about"]','[id*="description"]',
                '[class*="details"]','[class*="info"]']:
        tags = soup.select(sel)
        for t in tags[:2]:
            txt = t.get_text(' ', strip=True)
            if len(txt) > 80 and len(txt) < 2000:
                if any(k in txt.lower() for k in ['venta','renta','metro','colonia','recámara','baño']):
                    print(f'  [{sel}]: {txt[:200]}')
                    break
    break
