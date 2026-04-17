"""
Resetea las tareas de uno o más portales a 'pendiente' en progress.json.
Uso: python reset_portal.py MITULA CASAS_Y_TERRENOS
"""
import json
import sys
from pathlib import Path

PROGRESS_FILE = Path(__file__).parent / "progress.json"

portales = [p.upper() for p in sys.argv[1:]]
if not portales:
    print("Uso: python reset_portal.py PORTAL1 PORTAL2 ...")
    sys.exit(1)

if not PROGRESS_FILE.exists():
    print("No existe progress.json")
    sys.exit(1)

tareas = json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
reseteadas = 0
for t in tareas:
    if t["portal"] in portales:
        t["estado"] = "pendiente"
        t["props"] = 0
        t["error"] = ""
        t["timestamp"] = ""
        reseteadas += 1

PROGRESS_FILE.write_text(json.dumps(tareas, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Reseteadas {reseteadas} tareas de {portales}")
