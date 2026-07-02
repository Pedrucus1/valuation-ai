"""
Refetch de URLs NOCNOK Monumental para confirmar si precio guardado == precio real.
"""
import json, requests, re

BASE_URL = "https://inmuebles.nocnok.com"

URLS = [
    ("https://inmuebles.nocnok.com/propiedad/casa-en-venta/jalisco/guadalajara/monumental-id-mx23-pb8218",
     640_000, 102, "Monumental GDL"),
    ("https://inmuebles.nocnok.com/propiedad/casa-en-venta/jalisco/guadalajara/monumental-id-mx24-vv9876",
     595_000, 155, "Monumental GDL"),
    ("https://inmuebles.nocnok.com/propiedad/casa-en-venta/jalisco/guadalajara/monumental-id-nn-guc457",
     1_106_200, 158, "Monumental GDL"),
]

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0", "Accept": "application/json"})

# Get buildId
build_id = None
try:
    r = session.get(BASE_URL, timeout=20)
    m = re.search(r'"buildId"\s*:\s*"([^"]+)"', r.text)
    if m: build_id = m.group(1)
except Exception as e:
    print(f"Error buildId: {e}")
print(f"buildId={build_id}\n")

for url, precio_mongo, m2c_mongo, zona in URLS:
    print(f"=== {zona}: {url}")
    print(f"    MONGO: precio={precio_mongo:,}  m2c={m2c_mongo}  pm2c=${precio_mongo/m2c_mongo:,.0f}")
    if build_id:
        try:
            path = url.replace(BASE_URL, "")
            nurl = f"{BASE_URL}/_next/data/{build_id}{path}.json"
            nr = session.get(nurl, timeout=15)
            if nr.status_code == 200:
                prop = nr.json().get("pageProps", {}).get("property", {})
                sale = prop.get("saleLocalPrice")
                csize = prop.get("constructionSize")
                print(f"    REAL: saleLocalPrice={sale}  constructionSize={csize}")
                discrepancy = ""
                if sale and abs(float(str(sale).replace(",","")) - precio_mongo) / precio_mongo > 0.01:
                    discrepancy = f"  *** PRECIO DISCREPANTE! API={sale} vs MONGO={precio_mongo}"
                elif sale:
                    discrepancy = "  [precio COINCIDE con Mongo]"
                print(f"    {discrepancy}")
                # Additional price fields
                for k in ("salePrice", "rentLocalPrice", "price", "totalValue", "pricePerSqm"):
                    v = prop.get(k)
                    if v and v != sale: print(f"    {k}={v}")
            else:
                print(f"    HTTP {nr.status_code}")
                # Try HTML
                hr = session.get(url, timeout=20, headers={"Accept": "text/html"})
                nd = re.search(r'id="__NEXT_DATA__"[^>]*>([^<]+)<', hr.text)
                if nd:
                    ndj = json.loads(nd.group(1))
                    prop2 = ndj.get("props", {}).get("pageProps", {}).get("property", {})
                    sale2 = prop2.get("saleLocalPrice")
                    csize2 = prop2.get("constructionSize")
                    print(f"    __NEXT_DATA__: saleLocalPrice={sale2}  constructionSize={csize2}")
                    if sale2:
                        try:
                            sale2_num = float(str(sale2).replace(",","").replace("MXN","").strip())
                            diff_pct = abs(sale2_num - precio_mongo) / precio_mongo * 100
                            print(f"    diff vs Mongo: {diff_pct:.1f}%")
                        except: pass
        except Exception as e:
            print(f"    Error: {e}")
    print()
