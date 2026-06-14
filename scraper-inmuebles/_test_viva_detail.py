import os, sys, requests, re, json
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
from bs4 import BeautifulSoup

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'VIVANUNCIOS'}).limit(8))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    if r.status_code != 200: continue
    soup = BeautifulSoup(r.text, 'lxml')

    # NEXT_DATA (Navent platform)
    nd_tag = soup.find('script', id='__NEXT_DATA__')
    if nd_tag and nd_tag.string:
        data = json.loads(nd_tag.string)
        pp = data.get('props',{}).get('pageProps',{})
        ad = pp.get('ad') or pp.get('listing') or pp.get('result') or {}
        if not ad:
            # buscar recursivamente
            for key in pp:
                v = pp[key]
                if isinstance(v, dict) and ('price' in v or 'surface' in v):
                    ad = v
                    break
        print(f'URL: {url[:60]}')
        print(f'  NEXT_DATA keys: {list(pp.keys())[:8]}')
        if ad:
            print(f'  precio={ad.get("price")} m2t={ad.get("surface_total")} m2c={ad.get("surface")} rec={ad.get("rooms")} anio={ad.get("property_age") or ad.get("age")}')
        break
    else:
        # HTML plano
        title = soup.title.string if soup.title else ''
        # Buscar schema.org
        for tag in soup.select('script[type="application/ld+json"]'):
            try:
                d = json.loads(tag.string)
                if 'price' in str(d).lower():
                    print(f'URL: {url[:60]}')
                    print(f'  JSON-LD: {json.dumps(d)[:400]}')
                    break
            except: pass
        # Buscar m2 y recámaras en HTML
        m2 = re.findall(r'([\d,]+)\s*m[²2]', r.text)
        rec = re.findall(r'(\d+)\s*(?:recámara|habitación|cuarto|dormitorio)', r.text, re.I)
        anio = re.findall(r'(?:año|construid[ao]|antigüedad)[^\d]*(\d{4})', r.text, re.I)
        print(f'URL: {url[:60]}')
        print(f'  m2={m2[:3]} rec={rec[:2]} anio={anio[:2]}')
        break
