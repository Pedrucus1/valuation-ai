"""tipo_por_slug: deriva el tipo del slug PINCALI (fix del bug 'todo local').
Corre: python test_tipo_slug.py"""
from utils.cleaner import tipo_por_slug

CASOS = [
    # (url, tipo esperado)
    ("https://www.pincali.com/inmueble/departamento-en-renta-en-alada-valle-real-d287be8d", "departamento"),
    ("https://www.pincali.com/en/home/casa-en-venta-zapopan-parques-tesistan-4-recamaras", "casa"),
    ("https://www.pincali.com/en/home/hermosa-casa-en-venta-o-renta-en-bugambilias", "casa"),  # tipo no al inicio
    ("https://www.pincali.com/inmueble/terreno-en-venta-en-tlajomulco", "terreno"),
    ("https://www.pincali.com/inmueble/local-comercial-en-renta-plaza-andares", "local"),
    ("https://www.pincali.com/inmueble/oficina-en-renta-torre-corporativa", "oficina"),
    ("https://www.pincali.com/inmueble/bodega-industrial-en-venta-el-salto", "local"),
    ("https://www.pincali.com/en/home/xyz-sin-tipo-123", None),
    ("", None),
]


def test_casos():
    for url, esperado in CASOS:
        got = tipo_por_slug(url)
        assert got == esperado, f"{url!r} → {got!r}, esperaba {esperado!r}"


if __name__ == "__main__":
    test_casos()
    print("OK tipo_por_slug")
