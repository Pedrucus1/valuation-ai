"""Ver cómo PINCALI expone edad/año en página de detalle — propiedad residencial."""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient
import requests
from bs4 import BeautifulSoup
from enricher import _pincali_url_espanol

col = MongoClient(os.getenv("MONGO_URL"))[os.getenv("DB_NAME","propvalu")]["mercado_props"]

# Buscar CASAS residenciales de PINCALI sin año
urls = [d["url_original"] for d in
        col.find({"portal_origen": "PINCALI", "anio_construccion": {"$exists": False},
                  "activo": {"$ne": False},
                  "tipo_propiedad": {"$in": ["casa", "departamento"]}},
                 {"url_original": 1}).limit(5)]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
for url in urls:
    url_es = _pincali_url_espanol(url)
    print(f"\n--- {url_es[:80]} ---")
    try:
        r = requests.get(url_es, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Buscar todos los li de la sección de features
        hits = []
        for tag in soup.find_all(["li", "span", "div", "p", "dt", "dd"]):
            t = tag.get_text(strip=True)
            if re.search(r"antig[üu]edad|a[ñn]o.*construcc|year.*built|age|antiguedad|\baños?\b|\bedad\b", t, re.I) and len(t) < 80:
                hits.append(f"  [{tag.name}] {t!r}")
        if hits:
            for h in hits[:8]:
                print(h)
        else:
            print("  (sin match de edad/año)")
            # Mostrar todos los li para ver estructura
            lis = [li.get_text(strip=True) for li in soup.find_all("li") if len(li.get_text(strip=True)) < 60]
            print(f"  LIs disponibles: {lis[:15]}")
    except Exception as e:
        print(f"  ERROR: {e}")
