import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
# Tomar una casa con recámaras
samples = list(col.find({'portal_origen':'VIVANUNCIOS', 'recamaras': {'$ne': None}}).limit(5))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    soup = BeautifulSoup(r.text, 'lxml')
    print(f'URL: {url[:70]}')
    print(f'Title: {soup.title.string[:80] if soup.title else "?"}')

    # Precio
    price_tags = soup.select('[class*=price]')
    for t in price_tags[:3]:
        txt = t.get_text(strip=True)
        if txt: print(f'  precio tag: {txt[:60]}')

    # Características: m², recámaras, baños, estac, año
    for sel in ['[class*=surface],[class*=Surface]','[class*=rooms],[class*=Rooms]',
                '[class*=bath],[class*=Bath]','[class*=park],[class*=garage]',
                '[class*=age],[class*=year],[class*=Year]','[class*=feature],[class*=Feature]']:
        tags = soup.select(sel)
        vals = [t.get_text(strip=True)[:40] for t in tags if t.get_text(strip=True)][:3]
        if vals: print(f'  {sel.split(",")[0]}: {vals}')

    # Texto completo para regex
    texto = soup.get_text(' ', strip=True)
    m2_m = re.search(r'(\d[\d,.]+)\s*m[²2]', texto)
    rec_m = re.search(r'(\d+)\s*(?:recámara|habitación|dormitorio)', texto, re.I)
    ban_m = re.search(r'(\d+)\s*baño', texto, re.I)
    anio_m = re.search(r'(?:año de construcción|construido en|antigüedad)[^\d]*(\d{4}|\d+\s*años)', texto, re.I)
    print(f'  m2={m2_m.group(1) if m2_m else None} rec={rec_m.group(1) if rec_m else None} ban={ban_m.group(1) if ban_m else None} anio={anio_m.group(1) if anio_m else None}')
    break
