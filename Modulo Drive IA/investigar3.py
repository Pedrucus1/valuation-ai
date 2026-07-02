"""
investigar3.py — Diagnóstico granular NOCNOK
"""
import json, requests, re
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
BASE_URL  = "https://inmuebles.nocnok.com"

def main():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)
    col = cli["propvalu"]["mercado_props"]

    # ── 1. ¿Qué tipo_propiedad tiene NOCNOK? ────────────────────────────────────
    print("=== NOCNOK: tipos de propiedad (venta) ===")
    pipeline = [
        {"$match": {"portal_origen": "NOCNOK", "tipo_operacion": {"$regex": "venta", "$options": "i"}}},
        {"$group": {"_id": "$tipo_propiedad", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    tipos_nocnok = list(col.aggregate(pipeline))
    for d in tipos_nocnok:
        print(f"  tipo='{d['_id']}'  count={d['count']}")

    # ── 2. NOCNOK: todos los tipos con pm2c < 12,000 ───────────────────────────
    print("\n=== NOCNOK: $/m²C < 12,000 — todos los tipos (sin filtro tipo_propiedad) ===")
    pipeline2 = [
        {"$match": {
            "portal_origen": "NOCNOK",
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000},
        }},
        {"$addFields": {"pm2c": {"$divide": ["$precio", "$m2_construccion"]}}},
        {"$match": {"pm2c": {"$lt": 12000}}},
        {"$group": {"_id": "$tipo_propiedad", "count": {"$sum": 1}, "avg_pm2c": {"$avg": "$pm2c"}}},
        {"$sort": {"count": -1}},
    ]
    for d in col.aggregate(pipeline2):
        print(f"  tipo='{d['_id']}'  count={d['count']}  avg_pm2c=${d['avg_pm2c']:,.0f}")

    # ── 3. Buscar Monumental directamente ─────────────────────────────────────
    print("\n=== Buscando Monumental + NOCNOK directamente ===")
    samples = list(col.find({
        "portal_origen": "NOCNOK",
        "colonia": {"$regex": "monumental", "$options": "i"},
    }, {"precio": 1, "m2_construccion": 1, "colonia": 1, "municipio": 1,
        "tipo_propiedad": 1, "url_original": 1, "_id": 0}).limit(5))
    for d in samples:
        pm2c = d["precio"] / d["m2_construccion"] if d.get("m2_construccion") else "N/A"
        print(f"  pm2c=${pm2c if isinstance(pm2c,str) else f'{pm2c:,.0f}'}  precio={d.get('precio',0):,.0f}  "
              f"m2c={d.get('m2_construccion',0):.0f}  tipo={d.get('tipo_propiedad','')}  "
              f"col={d.get('colonia','')}  muni={d.get('municipio','')}")
        print(f"    url={d.get('url_original','')}")

    # ── 4. Muestra de NOCNOK con pm2c < 12,000 (todos los tipos) ───────────────
    print("\n=== NOCNOK: 8 ejemplos con pm2c < 12,000 ===")
    pipeline4 = [
        {"$match": {
            "portal_origen": "NOCNOK",
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000},
        }},
        {"$addFields": {"pm2c": {"$divide": ["$precio", "$m2_construccion"]}}},
        {"$match": {"pm2c": {"$lt": 12000}}},
        {"$sort": {"pm2c": 1}},
        {"$limit": 10},
        {"$project": {"precio": 1, "m2_construccion": 1, "m2_terreno": 1, "pm2c": 1,
                      "colonia": 1, "municipio": 1, "url_original": 1, "tipo_propiedad": 1, "_id": 0}},
    ]
    examples = list(col.aggregate(pipeline4))
    for d in examples:
        print(f"  pm2c=${d.get('pm2c',0):,.0f}  precio={d['precio']:,.0f}  m2c={d.get('m2_construccion',0):.0f}"
              f"  m2t={d.get('m2_terreno',0):.0f}  tipo={d.get('tipo_propiedad','')}  "
              f"col={d.get('colonia','')}  muni={d.get('municipio','')}")
        print(f"    url={d.get('url_original','')}")

    # ── 5. Re-fetch 3 URLs NOCNOK ──────────────────────────────────────────────
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
    except: pass

    print(f"\n=== Re-fetch NOCNOK urls (buildId={build_id}) ===")
    for d in examples[:4]:
        url = d.get("url_original", "")
        if not url: continue
        prec_mongo = d["precio"]
        m2c_mongo  = d.get("m2_construccion", 0)
        print(f"\n--- {url}")
        print(f"    MONGO: precio={prec_mongo:,.0f}  m2c={m2c_mongo:.0f}  pm2c=${prec_mongo/m2c_mongo if m2c_mongo else 0:,.0f}")
        if build_id:
            try:
                path = url.replace(BASE_URL, "")
                nurl = f"{BASE_URL}/_next/data/{build_id}{path}.json"
                nr = session.get(nurl, timeout=15)
                if nr.status_code == 200:
                    prop = nr.json().get("pageProps", {}).get("property", {})
                    sale = prop.get("saleLocalPrice")
                    rent = prop.get("rentLocalPrice")
                    price = prop.get("price")
                    csize = prop.get("constructionSize")
                    lsize = prop.get("lotSize")
                    print(f"    REAL: saleLocalPrice={sale}  rentLocalPrice={rent}  price={price}")
                    print(f"          constructionSize={csize}  lotSize={lsize}")
                    print(f"          type={prop.get('type')}  county={prop.get('county')}  settlement={prop.get('settlement')}")
                    # buscar cualquier campo de precio
                    for k, v in prop.items():
                        if "price" in k.lower() or "amount" in k.lower() or "value" in k.lower():
                            print(f"          {k}={v}")
                else:
                    print(f"    HTTP {nr.status_code}")
                    # Fallback: HTML
                    hr = session.get(url, timeout=20, headers={"Accept": "text/html,*/*"})
                    nd = re.search(r'id="__NEXT_DATA__"[^>]*>([^<]+)<', hr.text)
                    if nd:
                        try:
                            ndj = json.loads(nd.group(1))
                            prop2 = ndj.get("props", {}).get("pageProps", {}).get("property", {})
                            print(f"    __NEXT_DATA__: saleLocalPrice={prop2.get('saleLocalPrice')}  price={prop2.get('price')}")
                            print(f"    __NEXT_DATA__: constructionSize={prop2.get('constructionSize')}")
                        except: pass
            except Exception as e:
                print(f"    Error: {e}")

    # ── 6. MITULA: distribución más granular y casos extremos ──────────────────
    print("\n=== MITULA: 5 casos con m2c > 1000 ===")
    extremos = list(col.find({
        "portal_origen": "MITULA",
        "m2_construccion": {"$gt": 1000},
        "tipo_operacion": {"$regex": "venta", "$options": "i"},
    }, {"precio": 1, "m2_construccion": 1, "m2_terreno": 1, "colonia": 1,
        "municipio": 1, "url_original": 1, "titulo": 1, "_id": 0}).limit(5))
    for d in extremos:
        m2c = d.get("m2_construccion", 0)
        prec = d.get("precio", 0)
        print(f"  m2c={m2c:.0f}  m2t={d.get('m2_terreno',0):.0f}  precio={prec:,.0f}  pm2c=${prec/m2c if m2c else 0:,.0f}")
        print(f"    titulo={d.get('titulo','')}  col={d.get('colonia','')}  muni={d.get('municipio','')}")
        print(f"    url={d.get('url_original','')}")

    # ── 7. ¿Qué pasa si divido m2c MITULA por 100? ────────────────────────────
    print("\n=== MITULA: si m2c/100, ¿tiene sentido? ===")
    for d in extremos:
        m2c = d.get("m2_construccion", 0)
        prec = d.get("precio", 0)
        m2c_corr = m2c / 100
        print(f"  m2c_orig={m2c:.0f}  m2c/100={m2c_corr:.1f}  pm2c_corr=${prec/m2c_corr if m2c_corr else 0:,.0f}  precio={prec:,.0f}")

if __name__ == "__main__":
    main()
