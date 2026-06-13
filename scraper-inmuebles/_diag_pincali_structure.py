"""Inspecciona la estructura del contenedor de propiedades en PINCALI."""
import os, re, asyncio
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

URL = "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await ctx.new_page()
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(4000)

        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # Encontrar primer link de propiedad y subir en el DOM
        first_link = soup.find("a", href=re.compile(r"/en/home/"))
        if first_link:
            print("=== Ancestros del primer link de propiedad ===")
            node = first_link
            for i in range(6):
                node = node.parent
                if not node:
                    break
                cls = node.get("class", [])
                print(f"  Nivel {i+1}: <{node.name} class='{' '.join(cls[:3])}'> {node.get_text(strip=True)[:60]}")

        # Buscar contenedor que tenga muchos links /en/home/
        print("\n=== Contenedor con más links de propiedad ===")
        best = None
        best_count = 0
        for div in soup.find_all(["div", "ul", "section"]):
            links = div.find_all("a", href=re.compile(r"/en/home/"), recursive=False)
            if len(links) > best_count:
                best_count = len(links)
                best = div
        if best:
            cls = best.get("class", [])
            print(f"  <{best.name} class='{' '.join(cls)}'> con {best_count} links directos")

        # Mostrar un card completo (primera tarjeta)
        # Buscar li o div que contenga: link + precio + area
        print("\n=== Estructura de primera tarjeta (texto) ===")
        links_prop = soup.find_all("a", href=re.compile(r"/en/home/"))
        if links_prop:
            card = links_prop[0].find_parent(["li","article","div"])
            if card:
                print(f"  Padre inmediato: <{card.name} class={card.get('class',[])}> ")
                print(f"  Texto: {card.get_text(separator='|', strip=True)[:200]}")

        # Ver si hay paginación / total
        total_match = re.search(r'([\d,]+)\s+(?:Houses?|Casas?|properties|propiedades)', html, re.I)
        if total_match:
            print(f"\nTotal mencionado en HTML: {total_match.group(0)}")

    await browser.close()

asyncio.run(main())
