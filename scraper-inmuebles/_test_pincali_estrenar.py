import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
# Más muestra para encontrar una "nueva"
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None}).limit(100))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

NUEVA_RE = re.compile(r'a\s+estrenar|obra\s+nueva|nuevo\s+desarrollo|en\s+construcci[oó]n|preventa\b|brand[- ]new|new[- ]build', re.I)

found = 0
for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=12, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')

    # Solo buscar en descripción acotada
    desc_tag = soup.select_one('[class*="description"], [id*="description"]')
    h1_tag = soup.find('h1')
    desc_txt = (desc_tag.get_text(' ', strip=True) if desc_tag else '') + ' ' + (h1_tag.get_text(strip=True) if h1_tag else '')

    if NUEVA_RE.search(desc_txt):
        print(f'NUEVA encontrada: {url[:70]}')
        print(f'  h1: {h1_tag.get_text(strip=True)[:80] if h1_tag else "?"}')
        print(f'  desc: {desc_txt[:200]}')
        found += 1
        if found >= 2: break

if not found:
    print('No se encontró ninguna "a estrenar" en la muestra de 100 — el dato lo pone el agente raramente')
