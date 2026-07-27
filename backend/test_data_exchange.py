"""#133 Data Exchange — parseo + validación por tipo. Corre:
python test_data_exchange.py  (sin pytest; usa openpyxl instalado)."""
from datetime import date
from core.data_exchange import (
    normalizar_fila, validar_fila, normalizar_tipo, id_unico_data_exchange,
    parse_upload, generar_plantilla_xlsx, descuento_por_calidad, clave_direccion,
    fila_a_doc_pool, fila_a_doc_crm,
)


def test_descuento_por_calidad_tramos():
    assert descuento_por_calidad(0) == 0
    assert descuento_por_calidad(5) == 20
    assert descuento_por_calidad(20) == 35
    assert descuento_por_calidad(80) == 50


def test_clave_direccion_colapsa():
    assert clave_direccion("  Av  Patria  1200 ") == clave_direccion("av patria 1200")


def test_casa_completa_valida():
    f = normalizar_fila({
        "tipo": "Casa", "direccion": "Av X 1", "colonia": "Centro", "municipio": "Zapopan",
        "precio": "$3,500,000", "anio": "2015", "m2_construccion": "180", "m2_terreno": "200",
        "recamaras": "3", "banos": "2", "medios_banos": "1", "estacionamientos": "2",
        "niveles": "2", "conservacion": "Bueno",
    })
    assert f["tipo"] == "casa" and f["precio"] == 3500000.0 and f["anio"] == 2015
    assert validar_fila(f) == []


def test_casa_incompleta_reporta_faltantes():
    f = normalizar_fila({"tipo": "casa", "direccion": "X", "colonia": "C",
                         "municipio": "M", "precio": "100"})
    faltan = validar_fila(f)
    assert "m² construcción" in faltan and "Recámaras" in faltan
    assert "Año de construcción o Edad" in faltan


def test_terreno_no_pide_construccion():
    f = normalizar_fila({"tipo": "Terreno", "direccion": "Lote 4", "colonia": "Sur",
                         "municipio": "Tlajomulco", "precio": "900000", "m2_terreno": "300"})
    assert validar_fila(f) == []          # terreno válido sin recámaras/año/m2c


def test_edad_se_convierte_a_anio():
    f = normalizar_fila({"tipo": "casa", "edad": "10"})
    assert f["anio"] == date.today().year - 10
    # año explícito válido tiene prioridad sobre edad
    f2 = normalizar_fila({"tipo": "casa", "anio": "2000", "edad": "10"})
    assert f2["anio"] == 2000
    # año absurdo se ignora
    assert normalizar_fila({"tipo": "casa", "anio": "3"})["anio"] is None


def test_tipo_invalido():
    f = normalizar_fila({"tipo": "mansión galáctica", "precio": "1"})
    assert f["tipo"] is None
    assert validar_fila(f) and "inválido" in validar_fila(f)[0]


def test_id_unico_estable_y_distinto():
    a = id_unico_data_exchange("inmoA", "Av Patria 1200")
    assert a == id_unico_data_exchange("inmoA", " av patria 1200 ")   # normaliza
    assert a != id_unico_data_exchange("inmoB", "Av Patria 1200")     # por inmobiliaria


def test_roundtrip_plantilla():
    # La plantilla generada se debe poder re-parsear (encabezados reconocidos).
    filas = parse_upload(generar_plantilla_xlsx(), "plantilla.xlsx")
    assert len(filas) == 1                      # solo la fila de ejemplo
    f = normalizar_fila(filas[0])
    assert f["tipo"] == "casa" and validar_fila(f) == []


def test_csv_tambien_parsea():
    csv_txt = ("Tipo de propiedad,Dirección,Colonia,Municipio,Precio de salida (MXN),m² terreno\n"
               "Terreno,Lote 9,Norte,Zapopan,800000,250\n").encode("utf-8")
    filas = parse_upload(csv_txt, "inv.csv")
    assert len(filas) == 1 and validar_fila(normalizar_fila(filas[0])) == []


def test_link_se_normaliza_y_pasa_a_pool():
    f = normalizar_fila({"tipo": "casa", "direccion": "Av X 1", "colonia": "C", "municipio": "M",
                         "precio": "100", "anio": "2020", "link": "  https://ejemplo.com/prop-1  "})
    assert f["link"] == "https://ejemplo.com/prop-1"
    doc = fila_a_doc_pool(f, "uid1", portal_origen="MANUAL_ZONA", fuente="captura_manual_zona",
                           colonia_fuente="manual_zona", inmobiliaria_id=None, ahora="2026-07-27T00:00:00",
                           link_verificado=True)
    assert doc["url_original"] == "https://ejemplo.com/prop-1" and doc["link_verificado"] is True


def test_fila_sin_link_no_agrega_campo_url():
    f = normalizar_fila({"tipo": "casa", "direccion": "Av X 1", "colonia": "C", "municipio": "M",
                         "precio": "100", "anio": "2020"})
    doc = fila_a_doc_pool(f, "uid2", portal_origen="DATA_EXCHANGE", fuente="data_exchange",
                           colonia_fuente="data_exchange", inmobiliaria_id="inmoA", ahora="2026-07-27T00:00:00")
    assert "url_original" not in doc


def test_fila_a_doc_crm_shape():
    f = normalizar_fila({"tipo": "departamento", "direccion": "Torre 1", "colonia": "C", "municipio": "M",
                         "precio": "2000000", "anio": "2018", "recamaras": "2"})
    doc = fila_a_doc_crm(f, "userX", origen="captura_manual_realtor", ahora="2026-07-27T00:00:00")
    assert doc["user_id"] == "userX" and doc["tipo"] == "Departamento" and doc["antiguedad"] == 8


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn(); print("ok", name)
    print("OK #133 data_exchange")
