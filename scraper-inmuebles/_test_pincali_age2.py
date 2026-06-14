import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI', 'anio_construccion': None, 'recamaras': {'$ne': None}}).limit(20))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

checked = 0
for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    html = r.text

    # Buscar schema.org JSON-LD
    soup = BeautifulSoup(html, 'lxml')
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            d = json.loads(tag.string or '{}')
            txt = json.dumps(d)
            if 'year' in txt.lower() or 'age' in txt.lower() or 'built' in txt.lower():
                print(f'JSON-LD keys con year/age: {[k for k in (d if isinstance(d,dict) else {}).keys()]}')
                for k,v in (d if isinstance(d,dict) else {}).items():
                    if 'year' in k.lower() or 'age' in k.lower() or 'built' in k.lower():
                        print(f'  {k}: {v}')
        except: pass

    # Buscar en todo el HTML el patrón de edad
    age_patterns = [
        r'[Aa]ge[:\s]+(\d+)\s*(?:year|yr|año)?',
        r'[Aa]ntiquit[y]\s*[:\s]+(\d+)',
        r'(\d+)\s+[Yy]ears?\s+[Oo]ld',
        r'[Yy]ear\s+[Bb]uilt[:\s]+(\d{4})',
        r'[Aa]ntig[üu]edad[:\s]+(\d+)',
        r'"yearBuilt"\s*:\s*(\d+)',
        r'"age"\s*:\s*(\d+)',
    ]
    found_any = False
    for pat in age_patterns:
        m = re.search(pat, html)
        if m:
            print(f'URL: {url[:60]}')
            print(f'  [{pat[:30]}] → {m.group(0)[:50]}')
            found_any = True

    if not found_any:
        print(f'URL: {url[:60]} — SIN dato de edad/año en HTML')
    checked += 1
    if checked >= 3: break
