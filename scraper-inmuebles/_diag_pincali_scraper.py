"""Diagnostica por qué el scraper de PINCALI devuelve 0 props."""
import os, glob
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Leer log del scraper de PINCALI
logs = ["logs/scraper_PINCALI.log"]
for lf in logs:
    if not os.path.exists(lf):
        print(f"No existe: {lf}")
        continue
    with open(lf, "rb") as f:
        content = f.read().decode("utf-8", errors="replace")
    lines = content.splitlines()
    print(f"=== {lf} (últimas 40 líneas) ===")
    for l in lines[-40:]:
        print(l)
