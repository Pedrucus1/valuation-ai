"""Usa Playwright para interceptar requests de red en Monopolio."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    requests_captured = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        async def on_request(request):
            url = request.url
            if any(x in url for x in ["api.monopolio", "hexa.prod", "prod.api"]):
                requests_captured.append({
                    "url": url[:200],
                    "method": request.method,
                    "headers": dict(list(request.headers.items())[:5]),
                })

        async def on_response(response):
            url = response.url
            if any(x in url for x in ["api.monopolio", "hexa.prod"]) and response.status == 200:
                try:
                    body = await response.text()
                    print(f"\n=== RESPONSE 200: {url[:120]} ===")
                    print(body[:500])
                except:
                    pass

        page.on("request", on_request)
        page.on("response", on_response)

        print("Navegando a /busqueda/propiedades-en-venta ...")
        await page.goto("https://www.monopolio.com.mx/busqueda/propiedades-en-venta", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(5)

        print(f"\n=== {len(requests_captured)} requests a API capturadas ===")
        for r in requests_captured[:10]:
            print(f"  {r['method']} {r['url']}")
            if r.get("headers"):
                for k, v in list(r["headers"].items())[:3]:
                    print(f"    {k}: {v[:80]}")

        await browser.close()

asyncio.run(main())
