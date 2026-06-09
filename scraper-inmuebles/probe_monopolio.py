import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.monopolio.com.mx/",
}

bases = ["https://prod.api.monopolio.com.mx", "https://hexa.prod.monopolio.com.mx"]
paths = ["/v1/properties", "/v2/properties", "/properties", "/v1/search", "/search",
         "/v1/listings", "/listings", "/v1/inmuebles", "/inmuebles",
         "/properties/search", "/v1/properties/search"]

for base in bases:
    print(f"\n=== {base} ===")
    for path in paths:
        try:
            r = requests.get(f"{base}{path}", headers=headers, timeout=8,
                             params={"state": "jalisco", "limit": 5})
            print(f"  {path} = {r.status_code} len={len(r.content)}")
            if r.status_code == 200:
                print(f"    >> {r.text[:200]}")
        except Exception as e:
            print(f"  {path} = ERR: {str(e)[:60]}")
