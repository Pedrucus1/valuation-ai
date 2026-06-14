import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
# Buscar props PINCALI que probablemente sean nuevas (sin año, tipo departamento/casa nuevo)
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None,
    'tipo_propiedad': {'$in': ['departamento','casa']}}).limit(30))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

found_new = 0
for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')

    # ¿Dice "New Construction", "a estrenar", "estrenar", "preventa"?
    new_patterns = re.findall(r'(?:New\s+Construction|a\s+estrenar|obra\s+nueva|preventa|estrenar)', html, re.I)
    if not new_patterns:
        continue

    print(f'\nURL: {url[:70]}')
    print(f'  Patrones nuevos en HTML: {list(set(new_patterns))[:5]}')

    # Buscar el contexto del campo de año/edad
    for sel in ['li:contains("Year Built")', 'li:contains("Age")', 'li:contains("Antigüedad")',
                '[class*="year"]', '[class*="age"]', 'li:contains("New Construction")']:
        try:
            tags = soup.select(sel)
            if tags:
                print(f'  [{sel}]: {[t.get_text(strip=True)[:60] for t in tags[:2]]}')
        except: pass

    # Buscar en las li de características
    lis = soup.select('ul li')
    for li in lis:
        txt = li.get_text(strip=True)
        if any(k in txt.lower() for k in ['year','built','age','new','estrenar','antigü']):
            print(f'  <li>: {txt[:80]}')

    found_new += 1
    if found_new >= 3:
        break

if found_new == 0:
    print('No se encontraron propiedades nuevas en la muestra')
