"""Verifica paginación y estructura de tarjetas en PINCALI."""
import os, re, asyncio
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()

        # Página 1
        url1 = "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"
        await page.goto(url1, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        soup1 = BeautifulSoup(await page.content(), "html.parser")

        cards = soup1.select("div.property__component")
        print(f"Tarjetas en pag 1: {len(cards)}")

        # Datos de la primera tarjeta
        if cards:
            c = cards[0]
            link = c.find("a", href=re.compile(r"/en/home/"))
            precio_tag = c.find(class_=re.compile(r"price|precio", re.I))
            texto = c.get_text(separator="|", strip=True)
            print(f"  URL: {link.get('href','') if link else 'N/A'}")
            print(f"  Texto tarjeta: {texto[:200]}")

        # Buscar links de paginación
        pag_links = soup1.find_all("a", href=re.compile(r"\?page=|\bpage=\d"))
        print(f"\nLinks de paginacion encontrados: {len(pag_links)}")
        for a in pag_links[:5]:
            print(f"  {a.get('href','')}")

        # Probar URL de pag 2
        url2 = url1 + "?page=2"
        await page.goto(url2, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        soup2 = BeautifulSoup(await page.content(), "html.parser")
        cards2 = soup2.select("div.property__component")
        print(f"\nTarjetas en pag 2 ({url2[-15:]}): {len(cards2)}")

        # Ver tipos de propiedad disponibles en English
        print("\nTipos de URL que funcionan (probando):")
        tipos = [
            ("houses","sale"), ("apartments","sale"), ("land","sale"),
            ("houses","rent"), ("apartments","rent"),
        ]
        for tipo, op in tipos:
            test_url = f"https://www.pincali.com/en/properties/{tipo}-for-{op}-in-guadalajara-jalisco"
            await page.goto(test_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(1000)
            title = await page.title()
            print(f"  {tipo}-for-{op}: {title[:60]}")

        await browser.close()

asyncio.run(main())
