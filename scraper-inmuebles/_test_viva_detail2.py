import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'VIVANUNCIOS'}).limit(10))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    soup = BeautifulSoup(r.text, 'lxml')
    title = soup.title.string if soup.title else ''
    print(f'\nURL: {url[:70]}')
    print(f'Title: {title[:80]}')

    # Navent platform usa __NEXT_DATA__ — buscar de otra forma si no está
    nd_tag = soup.find('script', id='__NEXT_DATA__')
    if nd_tag and nd_tag.string:
        data = json.loads(nd_tag.string)
        pp = data.get('props',{}).get('pageProps',{})
        print(f'NEXT_DATA pageProps keys: {list(pp.keys())[:10]}')
        # Navent: los datos están en 'ad' o 'listing'
        for k in pp:
            v = pp[k]
            if isinstance(v, dict) and len(v) > 3:
                print(f'  {k}: {list(v.keys())[:8]}')
    else:
        # Buscar JSON embebido con precios
        scripts = soup.select('script:not([src])')
        for sc in scripts:
            txt = sc.string or ''
            if 'price' in txt.lower() and len(txt) > 100 and len(txt) < 50000:
                try:
                    m = re.search(r'\{.*"price".*\}', txt, re.S)
                    if m:
                        print(f'Script con price: {txt[:200]}')
                        break
                except: pass
        # Selectores directos
        for sel in ['[class*=price]','[class*=Price]','[data-price]','[class*=surface]','[class*=rooms]']:
            tags = soup.select(sel)
            if tags:
                print(f'{sel}: {[t.get_text(strip=True)[:30] for t in tags[:3]]}')
    break
