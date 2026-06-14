import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'INMUEBLES24'}).limit(10))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
           'Accept-Language': 'es-MX,es;q=0.9', 'Accept': 'text/html,application/xhtml+xml'}

for s in samples:
    url = s.get('url_original','')
    if not url: continue
    r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
    has_dd = 'datadome' in r.text.lower() or 'dd_cookie' in r.text.lower()
    has_navent = 'label' in r.text and 'value' in r.text and 'antigüedad' in r.text.lower()
    labels = re.findall(r'"label"\s*:\s*"([^"]+)"[^}]*?"value"\s*:\s*"([^"]*)"', r.text, re.I)[:5]
    print(f'{r.status_code} dd={has_dd} navent_json={has_navent} | {url[:70]}')
    if labels:
        print(f'  label/value: {labels}')
    if r.status_code == 200 and not has_dd:
        break
