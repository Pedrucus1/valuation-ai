import os, sys, requests, re
sys.path.insert(0, '.')
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']
samples = list(col.find({'portal_origen':'PINCALI'}).limit(5))
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'}

UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)

for s in samples:
    url_orig = s.get('url_original','')
    if not url_orig: continue
    uuid_m = UUID_RE.search(url_orig)
    if not uuid_m: continue
    uuid = uuid_m.group(0)
    url_esp = f"https://www.pincali.com/inmueble/propiedad-{uuid}?locale_changed=true"

    print(f'Original: {url_orig[:80]}')
    r1 = requests.get(url_orig, headers=headers, timeout=15, allow_redirects=True)
    print(f'  English URL: {r1.status_code} ({len(r1.text)}b)')

    r2 = requests.get(url_esp, headers=headers, timeout=15, allow_redirects=True)
    print(f'  Spanish URL: {r2.status_code} ({len(r2.text)}b)')

    # Si la inglesa funciona, verificar que trae datos de edad/m2
    if r1.status_code == 200 and len(r1.text) > 5000:
        m2 = re.findall(r'(\d[\d,.]+)\s*m[²2]', r1.text)
        edad = re.findall(r'"label"\s*:\s*"[Aa]ntig[üu]edad"[^}]*?"value"\s*:\s*"([^"]*)"', r1.text)
        print(f'  English: m2={m2[:3]} edad={edad[:2]}')
    break
