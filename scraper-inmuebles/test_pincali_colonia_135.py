"""#135: guardia SEPOMEX para el breadcrumb PINCALI. El último nodo a veces es
el municipio ("San Pedro") → NO debe pasar como colonia. Corre:
python test_pincali_colonia_135.py  (usa el sepomex_v2.json real)."""
from enricher import _colonia_valida_sepomex, _sepomex_colonias_por_muni


def test_municipio_no_es_colonia():
    # Nombres de municipio nunca deben validar como colonia de otro municipio.
    for m in ("San Pedro", "Tlaquepaque", "Guadalajara", "Zapopan"):
        assert not _colonia_valida_sepomex(m, "Tlaquepaque"), m


def test_colonia_real_valida():
    idx = _sepomex_colonias_por_muni()
    assert idx, "sepomex_v2.json no cargó"
    una = next(iter(idx["zapopan"]))          # colonia real de Zapopan
    assert _colonia_valida_sepomex(una, "Zapopan")
    assert _colonia_valida_sepomex(una, "ZAPOPAN")   # insensible a acentos/caso


def test_colonia_de_otro_municipio_no_valida():
    idx = _sepomex_colonias_por_muni()
    una = next(iter(idx["zapopan"]))
    # una colonia de Zapopan no debe validar contra Guadalajara (salvo homónima)
    if una not in idx.get("guadalajara", set()):
        assert not _colonia_valida_sepomex(una, "Guadalajara")


if __name__ == "__main__":
    test_municipio_no_es_colonia()
    test_colonia_real_valida()
    test_colonia_de_otro_municipio_no_valida()
    print("OK #135 guardia sepomex")
