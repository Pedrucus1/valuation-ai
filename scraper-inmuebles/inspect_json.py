import asyncio, re, json
from playwright.async_api import async_playwright

I24_URL = "https://www.inmuebles24.com/propiedades/clasificado/alclcain-renta-casa-parque-virreyes-residencial-148967752.html"

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(headless=True)
        pg = await br.new_page()
        await pg.goto(I24_URL, timeout=30000, wait_until="networkidle")
        html = await pg.content()
        await br.close()

    # label/value Navent
    matches = re.findall(r'"label"\s*:\s*"([^"]+)"\s*,\s*"value"\s*:\s*"([^"]*)"', html, re.I)
    print(f"label/value pairs encontrados: {len(matches)}")
    for label, val in matches[:30]:
        print(f"  {label!r}: {val!r}")

    # superficie en texto plano
    hits = re.findall(r'(?:superficie|construcci[oó]n|m[²2]\s*(?:const|cub|tot))[^\n<]{0,80}', html, re.I)
    print(f"\nHits texto superficie: {len(hits)}")
    for h in hits[:10]:
        print(f"  {h.strip()}")

asyncio.run(main())
