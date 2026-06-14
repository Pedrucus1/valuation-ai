import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None,
    'tipo_propiedad': {'$in': ['departamento','casa']}}).limit(30))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')

    # Buscar TODAS las ocurrencias de "New Construction" con su contexto HTML
    for tag in soup.find_all(string=re.compile('New Construction', re.I)):
        parent = tag.find_parent()
        gparent = parent.find_parent() if parent else None
        ctx = gparent.name + '>' + parent.name if gparent else parent.name if parent else '?'
        cls = parent.get('class', []) if parent else []
        href = parent.get('href', '') if parent else ''
        print(f'URL: {url[:60]}')
        print(f'  "<{ctx}>" class={cls} href={href[:40]!r}')
        print(f'  Texto: {(gparent or parent).get_text(strip=True)[:80] if (gparent or parent) else "?"}')
    break
