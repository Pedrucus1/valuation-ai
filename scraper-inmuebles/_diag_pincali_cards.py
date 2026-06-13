"""Inspecciona estructura de tarjetas de PINCALI y busca API token."""
import os, re, asyncio, json
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

URL = "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"

async def main():
    eb_api_calls = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()

        async def on_request(req):
            if "easybroker.com/v1" in req.url or "api.easybroker" in req.url:
                eb_api_calls.append({"url": req.url, "headers": dict(req.headers)})

        page.on("request", on_request)
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(4000)

        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # Mostrar clases únicas de div[class*='eb-']
        print("=== Clases eb-* ===")
        eb_classes = {}
        for tag in soup.select("div[class*='eb-']"):
            for c in tag.get("class", []):
                if c.startswith("eb-"):
                    eb_classes[c] = eb_classes.get(c, 0) + 1
        for c, n in sorted(eb_classes.items(), key=lambda x: -x[1])[:15]:
            print(f"  .{c}: {n}")

        # Inspeccionar los [data-id] - ver cuáles son propiedades
        print("\n=== [data-id] items ===")
        data_ids = soup.select("[data-id]")
        for tag in data_ids[:5]:
            print(f"  <{tag.name} data-id={tag.get('data-id')} class={tag.get('class',[])}> text={tag.get_text(strip=True)[:60]}")

        # Buscar eb-property o similar
        print("\n=== Posibles tarjetas de propiedad ===")
        for sel in ["[class*='eb-property']", "[class*='property-card']",
                    "[class*='eb-card']", "div[class*='eb-listing']",
                    "li[class*='eb-']", "article[class*='eb-']"]:
            items = soup.select(sel)
            if items:
                print(f"  '{sel}': {len(items)} | class={items[0].get('class',[])} | text={items[0].get_text(strip=True)[:50]}")

        # Buscar precio + URL en el HTML para confirmar que los datos están
        links_propiedades = soup.find_all("a", href=re.compile(r"/en/(home|property|inmueble)/"))
        print(f"\nLinks a propiedades individuales: {len(links_propiedades)}")
        for a in links_propiedades[:3]:
            print(f"  {a.get('href','')}")

        # API calls a EasyBroker v1
        print(f"\n=== API calls a EasyBroker v1: {len(eb_api_calls)} ===")
        for call in eb_api_calls[:3]:
            print(f"  URL: {call['url'][:100]}")
            auth = call['headers'].get('x-authorization') or call['headers'].get('authorization', '')
            if auth:
                print(f"  Auth: {auth[:60]}")

        # Buscar token en el HTML fuente
        token_patterns = [
            r'x-authorization["\s:]+["\']([^"\']{10,60})["\']',
            r'Authorization["\s:]+["\']Bearer\s+([^"\']{10,60})["\']',
            r'easybroker[^"\']*token["\s:=]+["\']([^"\']{10,60})["\']',
            r'"token"\s*:\s*"([a-zA-Z0-9_\-]{20,60})"',
        ]
        print("\n=== Tokens en HTML fuente ===")
        for pat in token_patterns:
            m = re.findall(pat, html, re.I)
            if m:
                print(f"  {pat[:50]}: {m[:2]}")

        await browser.close()

asyncio.run(main())
