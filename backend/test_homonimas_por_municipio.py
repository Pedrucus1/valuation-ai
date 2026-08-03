"""Prueba ejecutable sin framework para la lectura por municipio."""
from core.colonias import _indice, decada_de


def main():
    _indice.cache_clear()

    zapopan = decada_de("colinas de san javier", "zapopan")
    guadalajara = decada_de("colinas de san javier", "guadalajara")
    assert zapopan["decada_ref"] == "1960s"
    assert guadalajara["decada_ref"] != zapopan["decada_ref"] or (
        guadalajara["fuente"],
        guadalajara["confianza_puntos"],
        guadalajara["url"],
    ) != (
        zapopan["fuente"],
        zapopan["confianza_puntos"],
        zapopan["url"],
    )

    decada, _, _ = _indice()
    antes = decada["chapalita"]
    assert "por_municipio" not in antes
    normal = decada_de("chapalita")
    for campo in ("decada_ref", "decadas", "fuente", "confianza",
                  "confianza_puntos"):
        assert normal[campo] == antes[campo], (campo, normal[campo], antes[campo])

    # Los llamadores existentes sin municipio conservan el registro base.
    base = decada_de("colinas de san javier")
    assert base["decada_ref"] == "1960s"
    assert base["_ambiguo"] is True

    print("OK: lectura municipal, distinción de homónimos y fallback")


if __name__ == "__main__":
    main()
