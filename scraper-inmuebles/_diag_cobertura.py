import os
from dotenv import load_dotenv
from pymongo import MongoClient
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=30000)[os.getenv("DB_NAME","propvalu")]["mercado_props"]
portales = ["PINCALI","CASAS_Y_TERRENOS","PROPIEDADES_COM","INMUEBLES24","VIVANUNCIOS","MITULA"]
base = {"activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True}}
print(f"{'Portal':<18}{'total':>8}{'c/anio':>8}{'%':>5}{'c/col':>8}{'%':>5}{'pend(enr)':>10}")
for p in portales:
    q={**base,"portal_origen":p}
    tot=col.count_documents(q)
    if tot==0: continue
    anio=col.count_documents({**q,"anio_construccion":{"$nin":[None,"",0]}})
    colo=col.count_documents({**q,"colonia":{"$nin":[None,""]}})
    pend=col.count_documents({**q,"$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"colonia":{"$in":[None,""]}}]})
    print(f"{p:<18}{tot:>8}{anio:>8}{100*anio//tot:>4}%{colo:>8}{100*colo//tot:>4}%{pend:>10}")
