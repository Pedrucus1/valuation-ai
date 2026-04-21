"""
fix_colonias_consolidado.py — Limpia la columna colonia en CONSOLIDADO.

Problemas en datos existentes:
  - INMUEBLES24: "Marsella 123, Chapalita, Guadalajara, Jalisco"  → extrae "Chapalita"
  - PINCALI:     "Casa en venta en Chapalita, Zapopan"             → extrae "Chapalita"
  - VIVANUNCIOS: "Chapalita, Guadalajara"                          → extrae "Chapalita"
  - MITULA:      "Chapalita, Guadalajara"                          → extrae "Chapalita"
  - CASAS_Y_TERRENOS: ya limpio ✅

Uso:
  python fix_colonias_consolidado.py              — dry-run (no escribe)
  python fix_colonias_consolidado.py --apply      — aplica cambios
  python fix_colonias_consolidado.py --max 500    — limitar filas a procesar
"""

import argparse
import re
import sys
import time
from pathlib import Path

_BASE = Path(__file__).parent
sys.path.insert(0, str(_BASE))

import gspread
from google.oauth2.service_account import Credentials

SHEET_ID         = "1rEyGTh4v-W3yfQ9BvFkznyuyCMKfVZDBlGhmGeMdkPE"
CREDENTIALS_PATH = r"C:\Users\pedru\valuation-ai\scraper-inmuebles\credentials.json"
TAB_CONSOLIDADO  = "CONSOLIDADO"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

def get_ws():
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    gc = gspread.authorize(creds)
    return gc.open_by_key(SHEET_ID).worksheet(TAB_CONSOLIDADO)

# ── Columnas (0-based) ────────────────────────────────────────────────────────
COL_COLONIA   = 6
COL_MUNICIPIO = 7
COL_PORTAL    = 19

# ── Constantes de parsing ─────────────────────────────────────────────────────
_ESTADOS_MX = {
    "jalisco", "colima", "nayarit", "michoacán", "michoacan",
    "aguascalientes", "guanajuato", "sinaloa", "sonora", "estado de jalisco",
}
_PREFIJOS_CALLE = re.compile(
    r"^(av\.?|avenida|calle?|blvd\.?|boulevard|calz\.?|calzada|circuito|cto\.?|"
    r"carr\.?|carretera|paseo|privad[ao]\.?|cerrada|andador|diagonal|"
    r"prol\.?|prolongaci[oó]n|periferico|perif\.?)\b", re.I
)
# Patrones de títulos de listing ("Casa en venta en Chapalita")
_RE_EN_COLONIA = re.compile(
    r"\b(?:en|in)\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s]{3,40}?)(?:\s*,|\s*$|\s+with\b|\s+con\b|\s+de\s+venta|\s+jalisco|\s+zapopan|\s+guadalajara)", re.I
)
_PALABRAS_FALSAS = {"venta", "renta", "sale", "rent", "pre-sale", "preventa"}


def limpiar_colonia(colonia_raw: str, municipio: str) -> str:
    """
    Extrae solo el nombre de colonia de un string que puede contener
    calle, municipio, estado o título de listing.
    Retorna "" si no se puede determinar (no tocar).
    """
    if not colonia_raw or not colonia_raw.strip():
        return ""

    raw = colonia_raw.strip()
    mun_lower = municipio.strip().lower()

    # ── 1. Si no hay coma: puede ser colonia limpia o título de listing ────────
    if "," not in raw:
        # Título tipo "Casa en venta en Chapalita"
        m = _RE_EN_COLONIA.search(raw)
        if m and len(raw) > 20:
            candidato = m.group(1).strip()
            if candidato.lower() != mun_lower and candidato.lower() not in _ESTADOS_MX:
                return candidato
        return raw  # ya limpio o no identificable

    # ── 2. Hay comas: separar en partes ──────────────────────────────────────
    partes = [p.strip() for p in raw.split(",")]

    # Filtrar municipio y estados
    filtradas = [
        p for p in partes
        if p.lower() != mun_lower and p.lower() not in _ESTADOS_MX
    ]
    if not filtradas:
        return raw  # todo era municipio/estado, no tocar

    # ── 3. Si primer segmento es calle (tiene número o prefijo), tomar siguiente
    primera = filtradas[0]
    tiene_num = bool(re.search(r'\b\d{2,}\b', primera))
    es_calle  = tiene_num or bool(_PREFIJOS_CALLE.match(primera))

    if es_calle:
        if len(filtradas) > 1:
            return filtradas[1]
        return raw  # solo había calle, no podemos determinar colonia

    # ── 4. Primer segmento parece colonia ─────────────────────────────────────
    # Pero si es un título de listing, extraer la colonia interna
    m = _RE_EN_COLONIA.search(primera)
    if m and len(primera) > 15:
        candidato = m.group(1).strip()
        if candidato.lower() != mun_lower and candidato.lower() not in _ESTADOS_MX:
            return candidato

    return primera


def es_colonia_valida(texto: str) -> bool:
    """Rechaza resultados que claramente no son nombres de colonia."""
    if not texto or len(texto) < 4:
        return False
    # Primera letra minúscula = sigue siendo parte de una oración
    if texto[0].islower():
        return False
    if texto[0].isdigit():
        return False
    # Palabra sola que significa operación (falso positivo de regex "en Venta")
    if texto.strip().lower() in _PALABRAS_FALSAS:
        return False
    # Rechazar si es solo mayúsculas+números (parece código/ID)
    if re.match(r'^[A-Z0-9\s\-]+$', texto) and len(texto) < 20:
        return False
    # Rechazar si sigue siendo un título largo de listing
    if re.search(r'\b(for sale|for rent|en venta|en renta|warehouse|bodega|industrial|with pool|with garage)\b', texto, re.I):
        return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Aplicar cambios en Sheets (por defecto es dry-run)")
    parser.add_argument("--max", type=int, default=0, help="Máximo de filas a revisar (0=todas)")
    args = parser.parse_args()

    print(f"Conectando a Google Sheets...")
    ws = get_ws()

    print("Leyendo CONSOLIDADO...")
    todas = ws.get_all_values()
    encabezados = todas[0]
    filas = todas[1:]

    print(f"Total filas: {len(filas)}")

    cambios = []   # [(num_fila_1based, colonia_nueva)]
    sin_cambio = 0
    no_determinado = 0

    limite = args.max if args.max > 0 else len(filas)

    for i, fila in enumerate(filas[:limite], start=2):
        while len(fila) <= max(COL_COLONIA, COL_MUNICIPIO, COL_PORTAL):
            fila.append("")

        colonia_actual = fila[COL_COLONIA]
        municipio      = fila[COL_MUNICIPIO]
        portal         = fila[COL_PORTAL]

        colonia_limpia = limpiar_colonia(colonia_actual, municipio)

        if not colonia_limpia:
            no_determinado += 1
            continue

        if colonia_limpia != colonia_actual and es_colonia_valida(colonia_limpia):
            cambios.append((i, colonia_limpia, colonia_actual, portal))
        else:
            sin_cambio += 1

    print(f"\nResultados:")
    print(f"  Sin cambio necesario: {sin_cambio}")
    print(f"  No determinado:       {no_determinado}")
    print(f"  Con cambio:           {len(cambios)}")

    # Mostrar muestra de cambios
    print(f"\nMuestra de cambios (primeros 20):")
    for num_fila, nueva, anterior, portal in cambios[:20]:
        print(f"  Fila {num_fila:4d} [{portal:16s}]  '{anterior[:50]}' -> '{nueva[:40]}'")

    if not args.apply:
        print("\n[DRY-RUN] No se aplicaron cambios. Usa --apply para escribir.")
        return

    print(f"\nAplicando {len(cambios)} cambios en Sheets (batch)...")

    COL_LETRA = chr(ord('A') + COL_COLONIA)  # columna G
    BATCH = 500
    for idx in range(0, len(cambios), BATCH):
        grupo = cambios[idx:idx + BATCH]
        updates = [
            {"range": f"{COL_LETRA}{num_fila}", "values": [[nueva]]}
            for num_fila, nueva, anterior, portal in grupo
        ]
        ws.batch_update(updates, value_input_option="USER_ENTERED")
        aplicados = min(idx + BATCH, len(cambios))
        print(f"  {aplicados}/{len(cambios)} actualizadas...")
        time.sleep(3)  # evitar 429 entre batches

    print(f"\nListo. {len(cambios)} colonias corregidas en CONSOLIDADO.")


if __name__ == "__main__":
    main()
