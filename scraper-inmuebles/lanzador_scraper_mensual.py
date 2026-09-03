"""
lanzador_scraper_mensual.py
Lanza el scraper mensual en un dia ALEATORIO entre el 2 y el 10 de cada mes,
para que los portales no vean una fecha fija. La tarea de Windows corre este
script cada dia del 2 al 10; el script decide con azar si le toca HOY.

Distribucion uniforme: prob de correr hoy = 1/(dias restantes en la ventana).
Garantiza exactamente 1 corrida por mes, a mas tardar el dia 10.

La tarea programada lo invoca con:
  python.exe lanzador_scraper_mensual.py
(sin PowerShell, sin politica de ejecucion).
"""
import random
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

DIR = Path(__file__).resolve().parent
LOG = DIR / "scraper_mensual.log"
STATE = DIR / "scraper_last_run.txt"
FLAG = DIR / "scrape_active.flag"  # monitor_local.py lo lee para saber si hay scrape en curso

VENTANA_INI, VENTANA_FIN = 2, 10


def log(msg: str) -> None:
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S}  {msg}\n")


def main() -> None:
    hoy = date.today()
    dia = hoy.day
    ym = hoy.strftime("%Y-%m")

    # Fuera de la ventana (por seguridad; la tarea ya la limita)
    if dia < VENTANA_INI or dia > VENTANA_FIN:
        return

    # Ya corrio este mes
    if STATE.exists() and STATE.read_text(encoding="utf-8").strip() == ym:
        return

    # Dado uniforme: 1/(dias restantes). El dia 10 corre si o si.
    restantes = VENTANA_FIN - dia + 1
    prob = 1.0 / restantes
    roll = random.random()
    if dia != VENTANA_FIN and roll >= prob:
        log(f"Dia {dia}: no le toco (roll={roll:.3f} prob={prob:.3f})")
        return

    # Le toca HOY: marcar antes de correr (evita doble arranque)
    STATE.write_text(ym, encoding="utf-8")
    log(f"Dia {dia}: ARRANCA scraper mensual ({ym})")
    FLAG.write_text(datetime.now().isoformat(), encoding="utf-8")
    try:
        r = subprocess.run(
            [sys.executable, str(DIR / "scheduler.py")],
            cwd=str(DIR),
            capture_output=True,
            text=True,
        )
        log(f"scheduler.py termino (exit={r.returncode})")
        if r.stderr.strip():
            log(f"stderr: {r.stderr.strip()[:500]}")
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: {e}")
    finally:
        FLAG.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
