"""
utils/logger.py — Sistema de logging en consola y Google Sheets.
Usa loguru para formato rico en consola y guarda un registro
de cada ejecución en la pestaña LOG de la hoja.
"""

import sys
import io
from datetime import datetime
from loguru import logger as _logger
from pathlib import Path
import config

# Forzar UTF-8 en la salida estándar (necesario en Windows con cp1252)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ─────────────────────────────────────────
# Configurar loguru
# ─────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Eliminar el handler por defecto de loguru
_logger.remove()

# Handler de consola con colores
_logger.add(
    sys.stdout,
    level=config.LOG_LEVEL,
    format=(
        "<green>{time:HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{extra[portal]: <20}</cyan> | "
        "{message}"
    ),
    colorize=True,
)

# Handler de archivo general (rotación diaria)
_logger.add(
    LOGS_DIR / "scraper_{time:YYYY-MM-DD}.log",
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {extra[portal]: <20} | {message}",
    rotation="00:00",      # Rotar a medianoche
    retention="30 days",   # Guardar 30 días
    encoding="utf-8",
)

# Handler de errores separado
_logger.add(
    LOGS_DIR / "errores.log",
    level="ERROR",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {extra[portal]: <20} | {message}",
    rotation="1 week",
    retention="3 months",
    encoding="utf-8",
)

# Logger base con contexto vacío
logger = _logger.bind(portal="SISTEMA")


def get_logger(portal: str):
    """Retorna un logger con el nombre del portal como contexto."""
    return _logger.bind(portal=portal)


def banner_inicio():
    """Muestra el banner de inicio con fecha y hora."""
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linea = "═" * 60
    print(f"\n{linea}")
    print(f"  🏠 SCRAPER INMUEBLES MÉXICO")
    print(f"  Inicio: {ahora}")
    print(f"  Portales: inmuebles24, vivanuncios, propiedades.com")
    print(f"           mitula, casasyterrenos")
    print(f"{linea}\n")


def banner_portal(nombre_portal: str):
    """Muestra un separador visual al iniciar cada portal."""
    linea = "─" * 50
    print(f"\n{linea}")
    print(f"  Iniciando {nombre_portal}...")
    print(f"{linea}")


def banner_resumen(resultados: list[dict], duracion_total: float):
    """
    Muestra el resumen final al terminar todos los portales.

    Args:
        resultados: lista de dicts con resultados por portal
        duracion_total: segundos totales de ejecución
    """
    linea = "═" * 60
    print(f"\n{linea}")
    print(f"  📊 RESUMEN FINAL")
    print(f"{linea}")

    total_propiedades = 0
    total_nuevas = 0
    total_duplicados = 0
    total_errores = 0

    for r in resultados:
        estado = "✅" if r.get("errores", 0) == 0 else "⚠️"
        print(
            f"  {estado} {r['portal']:<25} "
            f"{r.get('total', 0):>5} props  "
            f"({r.get('nuevas', 0)} nuevas)"
        )
        total_propiedades += r.get("total", 0)
        total_nuevas += r.get("nuevas", 0)
        total_duplicados += r.get("duplicados", 0)
        total_errores += r.get("errores", 0)

    print(f"{linea}")
    print(f"  Total propiedades : {total_propiedades}")
    print(f"  Propiedades nuevas: {total_nuevas}")
    print(f"  Duplicados omitidos: {total_duplicados}")
    print(f"  Errores totales   : {total_errores}")
    print(f"  Tiempo total      : {duracion_total:.1f}s ({duracion_total/60:.1f} min)")
    print(f"{linea}\n")


# ─────────────────────────────────────────
# Registro en Google Sheets (LOG tab)
# ─────────────────────────────────────────

def registrar_en_sheets(sheets_client, entrada_log: dict):
    """
    Guarda una entrada en la pestaña LOG de Google Sheets.

    Args:
        sheets_client: instancia de SheetsClient
        entrada_log: dict con campos definidos en config.HEADERS_LOG
    """
    try:
        fila = [
            entrada_log.get("fecha_hora", datetime.now().isoformat()),
            entrada_log.get("portal", ""),
            entrada_log.get("zona", ""),
            entrada_log.get("paginas_procesadas", 0),
            entrada_log.get("propiedades_encontradas", 0),
            entrada_log.get("propiedades_nuevas", 0),
            entrada_log.get("propiedades_actualizadas", 0),
            entrada_log.get("errores", 0),
            round(entrada_log.get("duracion_segundos", 0), 1),
            entrada_log.get("estado", "OK"),
        ]
        sheets_client.append_fila_log(fila)
    except Exception as e:
        logger.error(f"No se pudo guardar en LOG de Sheets: {e}")
