import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
# Buscar props SIN año extraído aún para ver qué tienen
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None, 'recamaras': {'$ne': None}}).limit(10))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')

    # Buscar textos con Age, Antiquity, años, year
    kws = ['Age','Antiquity','Antique','years old','year','Year','antigüedad','Antigüedad','años']
    found = []
    for kw in kws:
        for t in soup.find_all(string=re.compile(re.escape(kw), re.I)):
            parent_txt = t.find_parent().get_text(strip=True)[:80] if t.find_parent() else ''
            if parent_txt and parent_txt not in found:
                found.append(parent_txt)
    print(f'URL: {url[:70]}')
    print(f'  Age-related: {found[:5]}')
    break
