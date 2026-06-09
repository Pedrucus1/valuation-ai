from pymongo import MongoClient
import json

MONGO_URL = "mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URL)
db = client['propvalu']

for portal in ['PINCALI', 'INMUEBLES24', 'PROPIEDADES_COM']:
    col = db[portal]
    total = col.count_documents({})
    con_anio = col.count_documents({'anio_construccion': {'$exists': True, '$ne': None}})
    con_m2t = col.count_documents({'m2_terreno': {'$exists': True, '$ne': None}})
    con_precio = col.count_documents({'precio': {'$exists': True, '$ne': None}})
    con_colonia = col.count_documents({'colonia': {'$exists': True, '$ne': None}})
    con_m2c = col.count_documents({'m2_construccion': {'$exists': True, '$ne': None}})

    pct = lambda n: f"{n*100//total if total else 0}%"
    print(f"\n=== {portal} (total: {total}) ===")
    print(f"  precio        : {con_precio} ({pct(con_precio)})")
    print(f"  colonia       : {con_colonia} ({pct(con_colonia)})")
    print(f"  m2_construccion: {con_m2c} ({pct(con_m2c)})")
    print(f"  m2_terreno    : {con_m2t} ({pct(con_m2t)})")
    print(f"  anio_construccion: {con_anio} ({pct(con_anio)})")

    # muestra con datos enriquecidos
    sample = list(col.find(
        {'anio_construccion': {'$exists': True, '$ne': None}},
        {'titulo':1,'precio':1,'colonia':1,'municipio':1,
         'm2_construccion':1,'m2_terreno':1,'anio_construccion':1,
         'tipo_propiedad':1,'operacion':1,'_id':0}
    ).limit(2))
    for d in sample:
        print(f"  >> {json.dumps(d, ensure_ascii=False, default=str)}")
