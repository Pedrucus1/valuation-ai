"""Regresión simple para el campo top-level ``municipio`` del catálogo."""
import json
from pathlib import Path

from core.colonias import norm_muni


CATALOGO = Path(__file__).resolve().parents[1] / "Modulo Drive IA" / "colonias_decada.json"


def main():
    datos = json.loads(CATALOGO.read_text(encoding="utf-8"))
    assert len(datos) == 4_749
    assert norm_muni("tlajomulco") == "tlajomulco de zuniga"
    assert norm_muni("tlaquepaque") == "san pedro tlaquepaque"

    no_normalizados = {
        nombre: registro.get("municipio")
        for nombre, registro in datos.items()
        if registro.get("municipio") is not None
        and registro["municipio"] != norm_muni(registro["municipio"])
    }
    assert not no_normalizados, f"Municipios no normalizados: {no_normalizados}"


if __name__ == "__main__":
    main()

