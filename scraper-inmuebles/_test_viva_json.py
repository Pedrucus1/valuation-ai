import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'VIVANUNCIOS', 'recamaras': {'$ne': None}}).limit(10))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text
    # Buscar label/value pattern (Navent embedded JSON)
    labels = re.findall(r'"label"\s*:\s*"([^"]+)"[^}]*?"value"\s*:\s*"([^"]*)"', html, re.I)
    print(f'URL: {url[:70]}')
    print(f'  label/value pairs: {labels[:10]}')
    # Buscar antigüedad específicamente
    m = re.search(r'"label"\s*:\s*"antig[üu]edad"[^}]*?"value"\s*:\s*"([^"]*)"', html, re.I)
    print(f'  antigüedad: {m.group(1) if m else None}')
    # Buscar whatsApp
    mt = re.search(r'"whatsApp"\s*:\s*"([0-9 +]{8,20})"', html)
    print(f'  whatsApp: {mt.group(1) if mt else None}')
    break
