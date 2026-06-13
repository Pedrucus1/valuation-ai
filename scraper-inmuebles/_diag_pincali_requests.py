"""Prueba si PINCALI listado en inglés funciona con requests (sin Playwright)."""
import os, re, time
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.pincali.com/",
}

session = requests.Session()
session.headers.update(HEADERS)

for page_n, url in [
    (1, "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco"),
    (2, "https://www.pincali.com/en/properties/houses-for-sale-in-guadalajara-jalisco?page=2"),
    (1, "https://www.pincali.com/en/properties/apartments-for-sale-in-guadalajara-jalisco"),
    (1, "https://www.pincali.com/en/properties/houses-for-rent-in-guadalajara-jalisco"),
    (1, "https://www.pincali.com/en/properties/houses-for-sale-in-zapopan-jalisco"),
]:
    r = session.get(url, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    cards = soup.select("div.property__component")
    title = soup.title.string if soup.title else "?"
    print(f"  [{r.status_code}] {url[-60:]} | cards={len(cards)} | {title[:50]}")
    time.sleep(2)
