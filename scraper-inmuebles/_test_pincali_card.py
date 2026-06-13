"""Debug: texto raw de tarjeta PINCALI para arreglar precio."""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import requests
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.pincali.com/",
}
url = "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"
r = requests.get(url, headers=headers, timeout=20)
soup = BeautifulSoup(r.text, "lxml")
cards = soup.select("div.property__component")
print(f"Tarjetas: {len(cards)}")
c = cards[0]
# Texto con pipe
print(f"\nTexto pipe: {c.get_text(separator='|', strip=True)[:300]}")
# Buscar precio en el HTML de la tarjeta
print(f"\nHTML precio (primeros 500):")
# Buscar elemento con precio
for tag in c.find_all(True):
    t = tag.get_text(strip=True)
    if re.search(r"\d{3,}[,\d]*", t) and len(t) < 30:
        print(f"  <{tag.name} class={tag.get('class',[])}> {t!r}")
