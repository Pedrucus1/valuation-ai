"""Prueba URLs de listado de PINCALI + detecta API interna."""
import os, asyncio, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from playwright.async_api import async_playwright

URLS = [
    "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco",
    "https://www.pincali.com/en/search?operationType=SALE&propertyType=HOUSE&location=Guadalajara",
    "https://www.pincali.com/en/home/houses-for-sale-in-guadalajara",
]

async def main():
    api_calls = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()

        # Capturar llamadas de red
        def on_request(req):
            if any(x in req.url for x in ["api", "search", "properties", "graphql", "query"]):
                api_calls.append(req.url)

        page.on("request", on_request)

        for url in URLS:
            api_calls.clear()
            try:
                await page.goto(url, wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(2000)
                size = len(await page.content())
                title = await page.title()
                final_url = page.url
                print(f"\nURL: {url}")
                print(f"  Final: {final_url}")
                print(f"  Size: {size} | Title: {title}")

                # Ver tarjetas
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(await page.content(), "html.parser")
                for sel in ["li[class*='property']", "article", "[class*='PropertyCard']",
                            "[class*='property-card']", "[class*='listing']", "li[class*='result']"]:
                    items = soup.select(sel)
                    if items:
                        print(f"  Selector '{sel}': {len(items)} items")

                # API calls interesantes
                for ac in api_calls[:5]:
                    print(f"  API: {ac[:120]}")
            except Exception as e:
                print(f"  ERROR: {e}")

        await browser.close()

asyncio.run(main())
