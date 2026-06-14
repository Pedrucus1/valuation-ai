import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
urls = [s.get('url_original','') for s in col.find({'portal_origen':'VIVANUNCIOS'}).sort('fecha_scraping',-1).limit(5)]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}
for url in urls[:3]:
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    has_dd = 'datadome' in r.text.lower()
    has_nd = '__NEXT_DATA__' in r.text
    print(f'{r.status_code} dd={has_dd} nd={has_nd} | {url[:70]}')
    if has_nd and r.status_code == 200:
        data = json.loads(re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.S).group(1))
        pp = data.get('props',{}).get('pageProps',{})
        print('  pageProps keys:', list(pp.keys())[:8])
        ad = pp.get('ad') or pp.get('listing') or pp.get('result')
        if ad:
            print(f'  precio={ad.get("price")} m2={ad.get("surface_total") or ad.get("surface")} rec={ad.get("rooms")}')
