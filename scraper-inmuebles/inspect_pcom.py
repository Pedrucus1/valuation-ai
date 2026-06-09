import subprocess, json, re, sys

URL = "https://propiedades.com/inmuebles/casa-en-renta-c-reforma-2529-ladron-de-guevara-ladron-de-guevara-44600-guadalajara-jal-sn-ladron-de-guevara-jalisco-30408132"
CDP_JS = r"C:\Users\pedru\valuation-ai\scraper-inmuebles\scrapers\cdp_fetch.js"

result = subprocess.run(["node", CDP_JS, URL, "9333"], capture_output=True, timeout=40)
result.stdout = result.stdout.decode("utf-8", errors="replace")
html = result.stdout

nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
if not nd:
    print("No __NEXT_DATA__. HTML len:", len(html))
    sys.exit(1)

data = json.loads(nd.group(1))

def dig(obj, *keys):
    for k in keys:
        if isinstance(obj, dict): obj = obj.get(k, {})
        else: return {}
    return obj

amenities = dig(data, "props","pageProps","initialState","Property","property","results","amenities")
print("=== amenities ===")
for k, v in amenities.items():
    print(f"  {k!r}: {v!r}")
