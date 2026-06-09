"""Prueba el endpoint /properties/public de Monopolio con coordenadas de GDL."""
import requests, json

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.monopolio.com.mx/busqueda/propiedades-en-venta",
    "Origin": "https://www.monopolio.com.mx",
}

# Coordenadas GDL centro
LAT_GDL = 20.6597
LON_GDL = -103.3496

# 1. Lookup del estado y municipio para Jalisco
print("=== Lookup Jalisco ===")
r = requests.get(
    "https://hexa.prod.monopolio.com.mx/api/lookup",
    params={"level": "state", "latitude": LAT_GDL, "longitude": LON_GDL},
    headers=headers, timeout=10
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(json.dumps(data, ensure_ascii=False, indent=2)[:400])
    state_id = data.get("data", {}).get("id")
    print(f"state_id: {state_id}")

# 2. Probar /properties/public con GDL
print("\n=== /properties/public searchLevel=state Jalisco ===")
r2 = requests.get(
    "https://prod.api.monopolio.com.mx/properties/public",
    params={
        "searchLevel": "state",
        "latitude": LAT_GDL,
        "longitude": LON_GDL,
        "page": 1,
        "perPage": 5,
    },
    headers=headers, timeout=15
)
print(f"Status: {r2.status_code}")
if r2.status_code == 200:
    data2 = r2.json()
    print(f"pagination: {data2.get('pagination')}")
    items = data2.get("items", [])
    print(f"items: {len(items)}")
    if items:
        print("Primer item keys:", list(items[0].keys()))
        print(json.dumps(items[0], ensure_ascii=False, indent=2)[:600])
else:
    print(r2.text[:300])

# 3. searchLevel=municipality
print("\n=== /properties/public searchLevel=municipality GDL ===")
r3 = requests.get(
    "https://prod.api.monopolio.com.mx/properties/public",
    params={"searchLevel": "municipality", "latitude": LAT_GDL, "longitude": LON_GDL, "page": 1, "perPage": 5},
    headers=headers, timeout=15
)
print(f"Status: {r3.status_code}")
if r3.status_code == 200:
    data3 = r3.json()
    print(f"pagination: {data3.get('pagination')}")
