"""Verifica % de props con precio en PINCALI scraper."""
import os, re, sys
sys.path.insert(0, ".")
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import requests
from bs4 import BeautifulSoup

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Referer": "https://www.pincali.com/"}
r = requests.get("https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco", headers=headers, timeout=20)
soup = BeautifulSoup(r.text, "lxml")
cards = soup.select("div.property__component")

con_precio = sin_precio = 0
for c in cards:
    ptag = c.select_one("div.price, [class='price'], [class*='price__']")
    txt = ptag.get_text(strip=True) if ptag else c.get_text(separator="|", strip=True)
    m = re.search(r"\$\s*([\d,]+)", txt)
    if m:
        con_precio += 1
    else:
        sin_precio += 1
        # Mostrar 1 ejemplo sin precio
        if sin_precio == 1:
            print(f"Ejemplo sin precio: {c.get_text(separator='|', strip=True)[:150]}")
            if ptag:
                print(f"  price_tag: {ptag.get_text(strip=True)!r}")

print(f"\nTotal: {len(cards)} | Con precio: {con_precio} | Sin precio: {sin_precio}")
