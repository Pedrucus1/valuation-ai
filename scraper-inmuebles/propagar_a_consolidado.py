"""
propagar_a_consolidado.py — Copia campos enriquecidos (m2_const, m2_terreno,
año_construccion, nombre_agente, fecha_publicacion) desde los tabs de portal al
CONSOLIDADO, emparejando por id_unico. Llena SOLO celdas vacías en CONSOLIDADO
(additivo, nunca sobreescribe).

Por qué existe: el enricher actualiza los tabs de portal, pero CONSOLIDADO se
arma desde las props recién scrapeadas (sin enriquecer) → lo enriquecido nunca
llegaba al CONSOLIDADO (que es lo que lee el motor). Correr DESPUÉS del enricher.

Uso:
  python propagar_a_consolidado.py            # dry-run: solo cuenta
  python propagar_a_consolidado.py --apply    # escribe en CONSOLIDADO
"""
import sys
from collections import defaultdict
from utils.sheets import SheetsClient
import config

COL_ID, COL_M2C, COL_M2T, COL_ANO, COL_AGENTE, COL_FPUB = 0, 11, 12, 14, 17, 18
CAMPOS = [("m2_const", COL_M2C), ("m2_terreno", COL_M2T), ("año", COL_ANO),
          ("agente", COL_AGENTE), ("fecha_pub", COL_FPUB)]
PORTALES = ["PROPIEDADES_COM", "CASAS_Y_TERRENOS", "INMUEBLES24", "PINCALI", "VIVANUNCIOS", "MITULA"]
APPLY = "--apply" in sys.argv


def col_letter(idx):  # 0-based -> A1 letra (válido <26)
    return chr(65 + idx)


def main():
    sc = SheetsClient()
    cons = sc._get_ws(config.TAB_CONSOLIDADO)
    cons_rows = cons.get_all_values()
    print(f"CONSOLIDADO: {len(cons_rows)-1:,} filas")

    # id_unico -> índice de fila (1-based en la hoja) y valores actuales
    id2row = {}
    for i, r in enumerate(cons_rows[1:], start=2):
        if r and len(r) > COL_ID and r[COL_ID]:
            id2row[r[COL_ID]] = i

    updates = []           # (row_1based, col_idx, value)
    por_campo = defaultdict(int)
    sin_match = 0

    for tab in PORTALES:
        try:
            ws = sc._get_ws(tab)
            rows = ws.get_all_values()
        except Exception as e:
            print(f"  {tab}: ERROR {e}")
            continue
        tab_updates = 0
        for r in rows[1:]:
            if len(r) <= COL_ID or not r[COL_ID]:
                continue
            crow = id2row.get(r[COL_ID])
            if not crow:
                sin_match += 1
                continue
            cons_r = cons_rows[crow - 1]
            for nombre, col in CAMPOS:
                val = r[col].strip() if len(r) > col else ""
                cval = cons_r[col].strip() if len(cons_r) > col else ""
                if val and not cval:
                    updates.append((crow, col, val))
                    por_campo[nombre] += 1
                    tab_updates += 1
        print(f"  {tab:<18}: {tab_updates:,} celdas a llenar")

    print(f"\nSin match en CONSOLIDADO: {sin_match:,}")
    print("Celdas a llenar por campo:", dict(por_campo))
    print(f"TOTAL celdas: {len(updates):,}")

    if not APPLY:
        print("\n(dry-run — usar --apply para escribir)")
        return

    # Escribir en lotes (batch_update) para no pegarle a los rate limits
    print("\nAplicando...")
    batch = []
    escritas = 0
    for crow, col, val in updates:
        a1 = f"{col_letter(col)}{crow}"
        batch.append({"range": a1, "values": [[val]]})
        if len(batch) >= 500:
            cons.batch_update(batch)
            escritas += len(batch)
            print(f"  {escritas:,}/{len(updates):,}")
            batch = []
    if batch:
        cons.batch_update(batch)
        escritas += len(batch)
    print(f"Listo: {escritas:,} celdas escritas en CONSOLIDADO")


if __name__ == "__main__":
    main()
