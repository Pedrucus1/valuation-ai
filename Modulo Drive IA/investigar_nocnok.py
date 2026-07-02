"""
investigar_nocnok.py — Tarea 1: Investiga listings NOCNOK/MITULA con $/m²C < 12000
en zonas de GDL. Re-fetchea URLs reales para comparar precio guardado vs precio real.
"""
import json, unicodedata, requests
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
BASE_URL  = "https://inmuebles.nocnok.com"

def main():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)
    col = cli["propvalu"]["mercado_props"]

    # ── 1. Sacar listings NOCNOK con $/m²C < 12000 ──────────────────────────────
    pipeline = [
        {"$match": {
            "portal_origen": "NOCNOK",
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "tipo_propiedad": {"$in": ["Casa", "Departamento"]},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000, "$lt": 5000000},
            "municipio": {"$regex": "guadalajara|zapopan|tlaquepaque|tlajomulco|tonala", "$options": "i"},
        }},
        {"$addFields": {
            "pm2c": {"$divide": ["$precio", "$m2_construccion"]}
        }},
        {"$match": {"pm2c": {"$lt": 12000}}},
        {"$sort":  {"pm2c": 1}},
        {"$limit": 12},
        {"$project": {"precio": 1, "m2_construccion": 1, "pm2c": 1, "colonia": 1,
                      "municipio": 1, "url_original": 1, "tipo_propiedad": 1, "_id": 0}},
    ]
    nocnok_bajos = list(col.aggregate(pipeline))
    print(f"\n=== NOCNOK listings con $/m²C < $12,000 (zonas GDL) ===")
    print(f"Encontrados: {len(nocnok_bajos)}\n")
    for d in nocnok_bajos:
        print(f"  precio={d['precio']:,.0f}  m2c={d['m2_construccion']:.0f}  pm2c=${d.get('pm2c',0):,.0f}"
              f"  col={d.get('colonia','')}  muni={d.get('municipio','')}  tipo={d.get('tipo_propiedad','')}")
        print(f"    url={d.get('url_original','')}")

    # ── 2. Re-fetchear URLs NOCNOK ──────────────────────────────────────────────
    print("\n=== Re-fetch de precios reales NOCNOK ===")
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    })

    # Obtener buildId
    build_id = None
    try:
        r = session.get(BASE_URL, timeout=20)
        import re
        m = re.search(r'"buildId"\s*:\s*"([^"]+)"', r.text)
        if m:
            build_id = m.group(1)
            print(f"buildId={build_id}")
    except Exception as e:
        print(f"Error obteniendo buildId: {e}")

    # Re-fetchear los primeros 4 con URL
    urls_check = [d for d in nocnok_bajos if d.get("url_original")][:4]
    for d in urls_check:
        url  = d["url_original"]
        prec_mongo = d["precio"]
        m2c_mongo  = d["m2_construccion"]
        pm2c_mongo = prec_mongo / m2c_mongo
        print(f"\n--- {url}")
        print(f"    MONGO: precio={prec_mongo:,.0f}  m2c={m2c_mongo:.0f}  pm2c=${pm2c_mongo:,.0f}")
        if build_id:
            try:
                path = url.replace(BASE_URL, "")
                next_url = f"{BASE_URL}/_next/data/{build_id}{path}.json"
                nr = session.get(next_url, timeout=15)
                if nr.status_code == 200:
                    prop = nr.json().get("pageProps", {}).get("property", {})
                    sale_price = prop.get("saleLocalPrice")
                    rent_price = prop.get("rentLocalPrice")
                    price_raw  = prop.get("price")
                    m2c_real   = prop.get("constructionSize")
                    print(f"    REAL: saleLocalPrice={sale_price}  rentLocalPrice={rent_price}  price={price_raw}  constructionSize={m2c_real}")
                    # Mostrar campos relevantes adicionales
                    for k in ("title","type","operationCode","settlement","county","state","yearBuilt"):
                        v = prop.get(k)
                        if v:
                            print(f"           {k}={v}")
                else:
                    print(f"    HTTP {nr.status_code}")
            except Exception as e:
                print(f"    Error: {e}")

    # ── 3. MITULA listings con $/m²C < 12000 ──────────────────────────────────
    print("\n=== MITULA listings con $/m²C < $12,000 (zonas GDL) ===")
    pipeline_m = [
        {"$match": {
            "portal_origen": "MITULA",
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "tipo_propiedad": {"$in": ["Casa", "casa", "Departamento", "departamento"]},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000, "$lt": 5000000},
            "municipio": {"$regex": "guadalajara|zapopan|tlaquepaque|tlajomulco|tonala", "$options": "i"},
        }},
        {"$addFields": {"pm2c": {"$divide": ["$precio", "$m2_construccion"]}}},
        {"$match": {"pm2c": {"$lt": 12000}}},
        {"$sort": {"pm2c": 1}},
        {"$limit": 6},
        {"$project": {"precio": 1, "m2_construccion": 1, "pm2c": 1, "colonia": 1,
                      "municipio": 1, "url_original": 1, "tipo_propiedad": 1, "_id": 0}},
    ]
    mitula_bajos = list(col.aggregate(pipeline_m))
    print(f"Encontrados: {len(mitula_bajos)}\n")
    for d in mitula_bajos:
        print(f"  precio={d['precio']:,.0f}  m2c={d['m2_construccion']:.0f}  pm2c=${d.get('pm2c',0):,.0f}"
              f"  col={d.get('colonia','')}  muni={d.get('municipio','')}")
        print(f"    url={d.get('url_original','')}")

    # Re-fetchear 2 URLs MITULA
    print("\n=== Re-fetch MITULA ===")
    mitula_check = [d for d in mitula_bajos if d.get("url_original")][:2]
    for d in mitula_check:
        url = d["url_original"]
        prec_mongo = d["precio"]
        m2c_mongo  = d["m2_construccion"]
        print(f"\n--- {url}")
        print(f"    MONGO: precio={prec_mongo:,.0f}  m2c={m2c_mongo:.0f}  pm2c=${prec_mongo/m2c_mongo:,.0f}")
        try:
            r = session.get(url, timeout=20, headers={"Accept": "text/html"})
            import re
            # Buscar price en schema.org JSON-LD
            m = re.search(r'"price"\s*:\s*"?(\d[\d,\.]*)"?', r.text)
            if m:
                price_real = float(m.group(1).replace(",",""))
                print(f"    REAL (JSON-LD price): {price_real:,.0f}")
            else:
                # Buscar en body
                prices = re.findall(r'\$\s*([\d,]+(?:\.\d+)?)', r.text[:5000])
                print(f"    Precios encontrados en HTML: {prices[:5]}")
        except Exception as e:
            print(f"    Error: {e}")

    # ── 4. Conteo global de basura ──────────────────────────────────────────────
    print("\n=== Conteo global de basura ($/m²C < 12,000) por portal ===")
    for portal in ["NOCNOK", "MITULA", "INMUEBLES24", "VIVANUNCIOS", "PROPIEDADES_COM"]:
        total = col.count_documents({
            "portal_origen": portal,
            "tipo_operacion": {"$regex": "venta", "$options": "i"},
            "m2_construccion": {"$gt": 30},
            "precio": {"$gt": 50000},
        })
        # Contar basura: precio/m2c < 12000
        pipeline_cnt = [
            {"$match": {
                "portal_origen": portal,
                "tipo_operacion": {"$regex": "venta", "$options": "i"},
                "m2_construccion": {"$gt": 30},
                "precio": {"$gt": 50000},
            }},
            {"$addFields": {"pm2c": {"$divide": ["$precio", "$m2_construccion"]}}},
            {"$match": {"pm2c": {"$lt": 12000}}},
            {"$count": "total"},
        ]
        basura_cnt = list(col.aggregate(pipeline_cnt))
        basura = basura_cnt[0]["total"] if basura_cnt else 0
        pct = 100*basura/total if total > 0 else 0
        print(f"  {portal:20s}: {basura:,}/{total:,} = {pct:.1f}% basura")

if __name__ == "__main__":
    main()
