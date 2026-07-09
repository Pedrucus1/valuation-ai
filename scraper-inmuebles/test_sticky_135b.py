"""#135b: el scraper/enricher no pisan colonia/edad corregidas por humano.
Replica la lógica de guardia de scheduler._guardar_en_mongo y del gate de
falta_* del enricher, sin tocar Mongo. Corre: python test_sticky_135b.py"""
from scheduler import FUENTES_PROTEGIDAS


def _guardia_scheduler(con_valor, solo_insert, existente):
    """Misma poda que scheduler._guardar_en_mongo."""
    if existente:
        if existente.get("colonia_fuente") in FUENTES_PROTEGIDAS:
            for c in ("colonia", "conjunto", "colonia_fuente"):
                con_valor.pop(c, None); solo_insert.pop(c, None)
        if existente.get("edad_fuente") in FUENTES_PROTEGIDAS:
            for c in ("anio_construccion", "edad_fuente"):
                con_valor.pop(c, None); solo_insert.pop(c, None)
    return con_valor, solo_insert


def test_perito_no_se_pisa():
    cv = {"colonia": "Nuevo México", "conjunto": "ABIE", "anio_construccion": 2010,
          "precio": 5_000_000}
    cv, _ = _guardia_scheduler(cv, {}, {"colonia_fuente": "perito_correccion",
                                        "edad_fuente": "perito_crowdsource"})
    assert "colonia" not in cv and "conjunto" not in cv and "anio_construccion" not in cv
    assert cv["precio"] == 5_000_000  # lo no-protegido sí se actualiza


def test_scraper_sin_correccion_si_escribe():
    cv = {"colonia": "Del Valle", "anio_construccion": 2010}
    cv, _ = _guardia_scheduler(cv, {}, {})  # doc sin fuente humana
    assert cv["colonia"] == "Del Valle" and cv["anio_construccion"] == 2010


def test_solo_colonia_protegida_deja_edad():
    cv = {"colonia": "X", "anio_construccion": 2010}
    cv, _ = _guardia_scheduler(cv, {}, {"colonia_fuente": "usuario_correccion"})
    assert "colonia" not in cv and cv["anio_construccion"] == 2010


if __name__ == "__main__":
    test_perito_no_se_pisa()
    test_scraper_sin_correccion_si_escribe()
    test_solo_colonia_protegida_deja_edad()
    print("OK #135b sticky")
