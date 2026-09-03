"""
geocode_colonias.py — Geocodifica colonias de mercado_props usando Nominatim
y guarda resultados en db.mercado_geo.

Uso:
    python geocode_colonias.py          # geocodifica colonias pendientes
    python geocode_colonias.py --stats  # muestra cuantas estan geocodificadas
"""
import asyncio, certifi, os, time, sys, re, argparse
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "PropValu/1.0 (propvalu.mx)"}
DELAY = 1.1  # Nominatim: max 1 req/seg


def geocode(colonia: str, municipio: str) -> dict | None:
    """Geocodifica una colonia usando Nominatim. Retorna {lat, lng} o None."""
    queries = [
        f"{colonia}, {municipio}, Jalisco, Mexico",
        f"{municipio}, Jalisco, Mexico",  # fallback al municipio
    ]
    for q in queries:
        try:
            r = requests.get(NOMINATIM_URL, params={"q": q, "format": "json", "limit": 1},
                             headers=HEADERS, timeout=10)
            data = r.json()
            if data:
                return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"]),
                        "display_name": data[0].get("display_name", "")}
        except Exception as e:
            print(f"  Error geocodificando '{q}': {e}")
        time.sleep(DELAY)
    return None


def es_colonia_valida(nombre: str) -> bool:
    if not nombre or len(nombre) < 3 or len(nombre) > 50:
        return False
    # Filtrar titulos de anuncios (simbolos, palabras clave de anuncios)
    patron_invalido = re.compile(
        r'[!?*$%@#]|\.{3}|http|www|bed|bath|sqft|promo|oport|luxury|premium|'
        r'gated|delivery|opportunity|residence|apartment|development|project|'
        r'bedroom|bathroom|garage|parking|pool|garden|terrace',
        re.IGNORECASE
    )
    if patron_invalido.search(nombre):
        return False
    # Solo letras, numeros, espacios, comas, puntos, guiones
    if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑü0-9 ,.\-/]+$', nombre):
        return False
    return True


async def main(solo_stats: bool = False):
    mongo_url = os.environ["MONGO_URL"]
    db_name   = os.environ.get("DB_NAME", "propvalu")
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]
    col_props = db["mercado_props"]
    col_geo   = db["mercado_geo"]

    # Indices
    await col_geo.create_index("colonia_key", unique=True)
    await col_geo.create_index([("lat", 1), ("lng", 1)])

    if solo_stats:
        total_geo = await col_geo.count_documents({})
        ok = await col_geo.count_documents({"lat": {"$ne": None}})
        print(f"\nmercado_geo: {total_geo} colonias geocodificadas ({ok} con coordenadas)\n")
        # Muestra algunas
        sample = await col_geo.find({"lat": {"$ne": None}}, {"_id": 0, "colonia": 1, "municipio": 1, "lat": 1, "lng": 1}).limit(10).to_list(10)
        for s in sample:
            print(f"  {s['colonia'][:35]:<35} {s['municipio']:<20} {s['lat']:.4f}, {s['lng']:.4f}")
        client.close()
        return

    # Obtener colonias unicas validas con 5+ propiedades
    pipeline = [
        {"$match": {"activo": True}},
        {"$group": {
            "_id": {"$toLower": "$colonia"},
            "municipio": {"$first": "$municipio"},
            "total": {"$sum": 1},
        }},
        {"$match": {"total": {"$gte": 5}}},
        {"$sort": {"total": -1}},
        {"$limit": 1500},
    ]
    todas = await col_props.aggregate(pipeline).to_list(1500)
    validas = [(r["_id"], r["municipio"], r["total"]) for r in todas if es_colonia_valida(r["_id"])]
    print(f"\n{len(validas)} colonias validas a geocodificar\n")

    # Cuales ya estan en mercado_geo
    ya_geocodificadas = {d["colonia_key"] async for d in col_geo.find({}, {"colonia_key": 1})}
    pendientes = [(c, m, t) for c, m, t in validas if c not in ya_geocodificadas]
    print(f"{len(pendientes)} pendientes de geocodificar ({len(ya_geocodificadas)} ya listas)\n")

    if not pendientes:
        print("Nada que geocodificar.")
        client.close()
        return

    for i, (colonia, municipio, total) in enumerate(pendientes):
        pct = int((i + 1) / len(pendientes) * 100)
        print(f"[{pct:>3}%] {colonia[:40]:<40} ({municipio}) ...", end=" ", flush=True)

        result = geocode(colonia, municipio)
        doc = {
            "colonia_key": colonia,
            "colonia": colonia,
            "municipio": municipio,
            "total_props": total,
            "lat": result["lat"] if result else None,
            "lng": result["lng"] if result else None,
            "geocodificado": result is not None,
        }
        await col_geo.update_one(
            {"colonia_key": colonia},
            {"$set": doc},
            upsert=True,
        )
        if result:
            print(f"{result['lat']:.4f}, {result['lng']:.4f}")
        else:
            print("sin resultado")

        time.sleep(DELAY)

    total_ok = await col_geo.count_documents({"lat": {"$ne": None}})
    print(f"\nListo. {total_ok} colonias con coordenadas en mercado_geo.\n")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(solo_stats=args.stats))
