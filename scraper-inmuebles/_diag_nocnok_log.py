"""Analiza resultados del log de NOCNOK."""
import re, os, glob
os.chdir(os.path.dirname(os.path.abspath(__file__)))

logs = sorted(glob.glob("logs/enrich_nocnok_20260612*.log"))
if not logs:
    print("No log found"); exit()

with open(logs[-1], "rb") as f:
    content = f.read().decode("utf-8", errors="replace")

sin_html = content.count("Sin HTML")
ok = content.count("✓")
http_err = len(re.findall(r"HTTP [45]\d\d", content))
print(f"Sin HTML: {sin_html} | exitos(✓): {ok} | HTTP 4xx/5xx: {http_err}")

# Muestra las primeras líneas de éxito
for line in content.split("\n"):
    if "✓" in line:
        print(f"  Exito: {line[50:150]}")
        break

# Última línea procesada antes del fin
lines = [l for l in content.split("\n") if "NOCNOK" in l and "/1490]" in l]
if lines:
    print(f"  Última prop: {lines[-1][50:120]}")
