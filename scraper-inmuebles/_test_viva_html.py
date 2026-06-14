import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
# Tomar URLs de Guadalajara activas
samples = list(col.find({'portal_origen':'VIVANUNCIOS', 'municipio': {'$in': ['Guadalajara','Zapopan','Tlaquepaque']}}).limit(5))

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}

for s in samples[:2]:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    print(f'{r.status_code} | {url[:70]}')
    if r.status_code != 200: continue
    soup = BeautifulSoup(r.text, 'lxml')
    if soup.title: print(f'  Title: {soup.title.string[:60]}')
    # Schema.org
    for tag in soup.select('script[type="application/ld+json"]'):
        try:
            d = json.loads(tag.string)
            if isinstance(d, dict) and ('price' in str(d) or 'offers' in str(d)):
                print(f'  JSON-LD: {json.dumps(d)[:300]}')
        except: pass
    # Precios en HTML
    prices = re.findall(r'\$\s*[\d,.]+', r.text)
    print(f'  Precios en HTML: {prices[:5]}')
    # Buscar data-price o class con precio
    price_tags = soup.select('[class*=price], [class*=Price], [data-price]')
    for t in price_tags[:3]:
        print(f'  PriceTag: {t.get_text(strip=True)[:50]}')
    # NEXT_DATA
    nd = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.S)
    if nd:
        data = json.loads(nd.group(1))
        pp = data.get('props',{}).get('pageProps',{})
        print(f'  NEXT_DATA keys: {list(pp.keys())[:8]}')
