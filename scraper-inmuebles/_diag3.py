import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from dotenv import load_dotenv
from pymongo import MongoClient
import requests
from bs4 import BeautifulSoup
import enricher as E
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=30000)[os.getenv("DB_NAME","propvalu")]["mercado_props"]
sess=requests.Session()
# distintos valores de 'tipo' en PINCALI pendientes
print("tipos PINCALI pendientes:", col.distinct("tipo", {"portal_origen":"PINCALI",
   "$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]})[:15])

qp={"portal_origen":"PINCALI","activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
    "url_original":{"$regex":"/(casa|departamento|venta)"},
    "$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}
ex=cr=na=fa=0
for d in col.find(qp,{"url_original":1}).limit(14):
    url=d.get("url_original")
    if any(k in url for k in ["bodega","local","oficina","terreno","nave"]): continue
    try: html=E.fetch_detalle(url,"PINCALI",sess)
    except: html=None
    if not html: fa+=1; continue
    extr=E.extraer_datos_detalle(html,"PINCALI").get("año_construccion")
    txt=BeautifulSoup(html,"lxml").get_text(" ",strip=True)
    m=re.search(r'(a[ñn]o\s+de\s+construcc\w*[:\s]*\d{4}|antig[üu]edad[:\s]*\d+\s*a[ñn]os|construcc\w*[:\s]*\d{4})', txt, re.I)
    if extr: ex+=1; print(f"  EXTRAE {extr} :: ...{url[-42:]}")
    elif m: cr+=1; print(f"  **FALSO_NEG** '{m.group(0)[:35]}' :: ...{url[-42:]}")
    else: na+=1; print(f"  nada (sin año en pág) :: ...{url[-42:]}")
print(f"  -> extrae={ex} FALSO_NEG={cr} nada={na} fail={fa}")
