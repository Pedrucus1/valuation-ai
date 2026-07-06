import os
from dotenv import load_dotenv; load_dotenv()
"""
investigar2.py — Diagnóstico más profundo NOCNOK y MITULA
"""
import json, requests, re
from pymongo import MongoClient

MONGO_URL = os.environ["MONGO_URL"]
BASE_URL  = "https://inmuebles.nocnok.com"

def main():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)
    col = cli["propvalu"]["mercado_props"]

    # ── 1. NOCNOK: entender por qué 0 resultados con municipio GDL ──────────────
    print("=== NOCNOK: ¿Qué municipios tiene? ===")
    pipeline = [
        {"$match": {"portal_origen": "NOCNOK", "tipo_operacion": {"$regex": "venta", "$options": "i"}}},
        {"$group": {"_id": "$municipio", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    for d in col.aggregate(pipeline):
        print(f"  municipio='{d['_id']}'  count={d['count']}")

    # ── 2. NOCNOK: muestra de basura sin filtro municipio ──────────────────────
    print("\n=== NOCNOK listings con $/m²C < 12,000 (sin filtro municipio) ===")
    pipeline2 = [
        {"$match": {
            "portal_origen": "NOCNOK",
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "tipo_propiedad": {"$in": ["Casa", "Departamento"]},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000, "$lt": 5000000},
        }},
        {"$addFields": {"pm2c": {"$divide": ["$precio", "$m2_construccion"]}}},
        {"$match": {"pm2c": {"$lt": 12000}}},
        {"$sort": {"pm2c": 1}},
        {"$limit": 10},
        {"$project": {"precio": 1, "m2_construccion": 1, "pm2c": 1, "colonia": 1,
                      "municipio": 1, "url_original": 1, "tipo_propiedad": 1, "_id": 0}},
    ]
    nocnok_bajos = list(col.aggregate(pipeline2))
    print(f"Encontrados: {len(nocnok_bajos)}\n")
    for d in nocnok_bajos:
        print(f"  pm2c=${d.get('pm2c',0):,.0f}  precio={d['precio']:,.0f}  m2c={d['m2_construccion']:.0f}"
              f"  col={d.get('colonia','')}  muni={d.get('municipio','')}")
        print(f"    url={d.get('url_original','')}")

    # ── 3. Re-fetch NOCNOK URLs ──────────────────────────────────────────────────
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    })
    build_id = None
    try:
        r = session.get(BASE_URL, timeout=20)
        m = re.search(r'"buildId"\s*:\s*"([^"]+)"', r.text)
        if m: build_id = m.group(1)
        print(f"\nbuildId={build_id}")
    except Exception as e:
        print(f"Error buildId: {e}")

    urls_check = [d for d in nocnok_bajos if d.get("url_original")][:4]
    for d in urls_check:
        url = d["url_original"]
        prec_mongo = d["precio"]
        m2c_mongo  = d["m2_construccion"]
        print(f"\n--- NOCNOK: {url}")
        print(f"    MONGO: precio={prec_mongo:,.0f}  m2c={m2c_mongo:.0f}  pm2c=${prec_mongo/m2c_mongo:,.0f}")
        if build_id:
            try:
                path  = url.replace(BASE_URL, "")
                nurl  = f"{BASE_URL}/_next/data/{build_id}{path}.json"
                nr    = session.get(nurl, timeout=20)
                if nr.status_code == 200:
                    prop = nr.json().get("pageProps", {}).get("property", {})
                    print(f"    REAL saleLocalPrice={prop.get('saleLocalPrice')}  "
                          f"rentLocalPrice={prop.get('rentLocalPrice')}  "
                          f"price={prop.get('price')}")
                    print(f"    constructionSize={prop.get('constructionSize')}  "
                          f"lotSize={prop.get('lotSize')}  type={prop.get('type')}")
                    print(f"    county={prop.get('county')}  settlement={prop.get('settlement')}")
                    # Buscar cualquier campo de precio
                    for k in ("pricePerSquareFoot","pricePerSquareMeter","totalArea","builtArea"):
                        if prop.get(k): print(f"    {k}={prop.get(k)}")
                else:
                    print(f"    HTTP {nr.status_code}")
                    # Try fetching the HTML page instead
                    hr = session.get(url, timeout=20, headers={"Accept": "text/html,*/*"})
                    prices = re.findall(r'\$\s*([\d,]+)', hr.text[:10000])
                    print(f"    Precios en HTML: {prices[:6]}")
                    # Look for price in __NEXT_DATA__
                    nd = re.search(r'__NEXT_DATA__[^>]*>([^<]+)<', hr.text)
                    if nd:
                        try:
                            ndj = json.loads(nd.group(1))
                            prop2 = ndj.get("props", {}).get("pageProps", {}).get("property", {})
                            if prop2:
                                print(f"    __NEXT_DATA__ saleLocalPrice={prop2.get('saleLocalPrice')}")
                                print(f"    __NEXT_DATA__ constructionSize={prop2.get('constructionSize')}")
                        except: pass
            except Exception as e:
                print(f"    Error: {e}")

    # ── 4. MITULA: entender el bug m2c gigante ──────────────────────────────────
    print("\n=== MITULA: ¿Qué valores de m2c tiene para los casos raros? ===")
    # Buscar el listing de m2c=58850 y fetchar la URL
    mitula_raro = col.find_one({
        "portal_origen": "MITULA",
        "m2_construccion": {"$gt": 10000},
    }, {"precio": 1, "m2_construccion": 1, "m2_terreno": 1, "colonia": 1,
        "municipio": 1, "url_original": 1, "recamaras": 1, "titulo": 1})
    if mitula_raro:
        print(f"  Ejemplo m2c gigante: m2c={mitula_raro['m2_construccion']}  precio={mitula_raro['precio']}")
        print(f"  titulo={mitula_raro.get('titulo')}  colonia={mitula_raro.get('colonia')}")
        url = mitula_raro.get("url_original", "")
        print(f"  url={url}")
        if url:
            try:
                hr = session.get(url, timeout=20, headers={
                    "Accept": "text/html,*/*",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                })
                # Buscar floorSize en JSON-LD
                m2_matches = re.findall(r'"value"\s*:\s*(\d+)', hr.text[:20000])
                print(f"  floorSize values en JSON-LD: {m2_matches[:10]}")
                # Buscar precio real
                price_matches = re.findall(r'"price"\s*:\s*"?([\d,\.]+)"?', hr.text[:20000])
                print(f"  price values: {price_matches[:5]}")
                # Buscar m2 en texto visible
                m2_text = re.findall(r'([\d,]+)\s*m[²2]', hr.text[:20000])
                print(f"  m² en texto: {m2_text[:8]}")
            except Exception as e:
                print(f"  Error fetch: {e}")

    # ── 5. Distribución de m2c MITULA ──────────────────────────────────────────
    print("\n=== MITULA: distribución de m2_construccion ===")
    pipeline3 = [
        {"$match": {"portal_origen": "MITULA", "m2_construccion": {"$gt": 0}}},
        {"$bucket": {
            "groupBy": "$m2_construccion",
            "boundaries": [0, 50, 100, 200, 300, 500, 1000, 5000, 100000],
            "default": "other",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    for d in col.aggregate(pipeline3):
        print(f"  m2c bucket {d['_id']}: {d['count']} docs")

if __name__ == "__main__":
    main()
