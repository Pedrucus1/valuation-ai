import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI', 'recamaras': {'$ne': None}}).limit(5))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    soup = BeautifulSoup(html, 'lxml')
    print(f'URL: {url[:70]}')

    # label/value (Navent JSON embedded?)
    labels = re.findall(r'"label"\s*:\s*"([^"]+)"[^}]*?"value"\s*:\s*"([^"]*)"', html, re.I)
    print(f'  label/value: {labels[:8]}')

    # Selectores CSS del enricher para PINCALI
    for sel in ['[data-qa*="surface"]','[data-qa*="rooms"]','[data-qa*="age"]',
                'li:contains("Construcción")','li:contains("Antigüedad")',
                '[class*="built"]','[class*="land"]']:
        try:
            tags = soup.select(sel)
            if tags:
                print(f'  {sel}: {[t.get_text(strip=True)[:40] for t in tags[:2]]}')
        except: pass

    # Regex genérica
    m2 = re.findall(r'(\d[\d,.]+)\s*m[²2]', html)
    edad = re.findall(r'(?:ntigüedad|Antiguedad|Age)[^\d]*(\d+)', html, re.I)
    anio = re.findall(r'(?:onstrucción|Construction|Built)[^\d]*(\d{4})', html, re.I)
    print(f'  m2={m2[:3]} edad={edad[:3]} anio={anio[:3]}')
    break
