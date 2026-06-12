"""Verificar si el regex de obra nueva matchea texto de UI en una página PINCALI real."""
import re
import requests
from bs4 import BeautifulSoup

url = "https://www.pincali.com/en/home/casa-en-renta-jardines-de-san-ignacio-zapopan"
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=30)
print(f"HTTP {r.status_code}, {len(r.text)} bytes")
soup = BeautifulSoup(r.text, "html.parser")
texto = soup.get_text(separator=" ", strip=True)

patron = (r"a\s+estrenar|obra\s+nuev[ao]|\bnuev[ao]\s+(?:construcci|desarrollo|proyecto)"
          r"|en\s+construcci[óo]n\b|preventa\b")
hits = re.findall(patron, texto, re.I)
print(f"Matches del regex: {hits[:10]}")
for m in re.finditer(patron, texto, re.I):
    ini = max(0, m.start() - 60)
    print(f"  ...{texto[ini:m.end()+60]}...")
    break
