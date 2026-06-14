import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI', 'recamaras': {'$ne': None}}).limit(10))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url or '/en/home/' not in url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')
    print(f'URL: {url[:70]}')

    # Buscar elementos con keywords de año/m2/antigüedad en inglés
    kws = ['Year','Built','Construction','Age','Antiquity','Interior','Lot','Land','Size','Surface']
    for kw in kws:
        tags = [t for t in soup.find_all(string=re.compile(kw, re.I)) if t.strip()]
        if tags:
            # Mostrar el texto del elemento padre
            parents = [t.find_parent().get_text(strip=True)[:60] for t in tags[:2]]
            print(f'  [{kw}]: {parents}')

    # Buscar data-qa attrs
    for tag in soup.select('[data-qa]')[:20]:
        qa = tag.get('data-qa','')
        txt = tag.get_text(strip=True)[:40]
        if txt and any(k in qa.lower() for k in ['surface','rooms','age','year','land','built']):
            print(f'  data-qa={qa}: {txt}')
    break
