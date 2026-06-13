"""Detecta selectores de tarjetas y token de EasyBroker API en PINCALI."""
import os, re, asyncio
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

URL = "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"

async def main():
    api_responses = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()

        # Capturar respuestas de la API de EasyBroker
        async def on_response(resp):
            if "easybroker" in resp.url and "properties" in resp.url:
                try:
                    body = await resp.text()
                    api_responses[resp.url] = body[:500]
                except:
                    pass

        page.on("response", on_response)

        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(4000)

        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # Detectar token EasyBroker en el HTML/JS
        token_match = re.search(r'["\']([A-Za-z0-9_\-]{20,60})["\']', html)
        eb_token = re.findall(r'easybroker[^"\']*["\']([^"\']{10,50})["\']', html, re.I)
        api_key = re.findall(r'api[_-]?key["\s:=]+["\']([^"\']{10,50})["\']', html, re.I)
        print(f"Posibles API keys en HTML: {api_key[:3]}")
        print(f"EasyBroker tokens: {eb_token[:3]}")

        # Selectores de tarjetas
        print("\nSelectores que matchean elementos con datos:")
        for sel in ["li[class*='property']", "li[class*='result']", "div[class*='property']",
                    "article", "[class*='PropertyCard']", "[class*='property-card']",
                    "li[class*='listing']", "div[class*='listing']", "div[class*='eb-']",
                    "[class*='eb-property']", "[data-property-id]", "[data-id]"]:
            items = soup.select(sel)
            if items:
                cls = items[0].get("class", [])
                print(f"  '{sel}': {len(items)} | class={cls[:2]}")

        # Mostrar estructura del primer resultado
        print("\nPrimeros 5 li con class:")
        for tag in soup.find_all("li")[:20]:
            cls = tag.get("class", [])
            if cls and len(tag.get_text(strip=True)) > 20:
                print(f"  class={cls} text={tag.get_text(strip=True)[:60]}")

        # API responses capturadas
        print(f"\nRespuestas API EasyBroker capturadas: {len(api_responses)}")
        for url, body in list(api_responses.items())[:2]:
            print(f"  {url[:100]}")
            print(f"  Body: {body[:200]}")

        await browser.close()

asyncio.run(main())
