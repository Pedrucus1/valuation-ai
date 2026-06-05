import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from dotenv import load_dotenv
from pymongo import MongoClient
import requests
import enricher as E
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=30000)[os.getenv("DB_NAME","propvalu")]["mercado_props"]
sess=requests.Session()
PEND={"$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}
for t in ["departamento","local","oficina","bodega","casa"]:
    q={"portal_origen":"INMUEBLES24","activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
       "url_original":{"$regex":t}, **PEND}
    for d in col.find(q,{"url_original":1}).limit(2):
        url=d.get("url_original")
        try: html=E.fetch_detalle(url,"INMUEBLES24",sess)
        except Exception as ex: print(f"{t}: ERR {ex}"); continue
        if not html: print(f"{t}: SIN HTML"); continue
        m=re.search(r'"label"\s*:\s*"antig[üu]edad"[^}]*?"value"\s*:\s*"([^"]*)"', html, re.I)
        val=m.group(1) if m else None
        extr=E.extraer_datos_detalle(html,"INMUEBLES24").get("año_construccion")
        # buscar TODAS las apariciones de antiguedad en el html por si hay otra estructura
        alt=re.findall(r'antig[üu]edad["\s:]{0,6}([^",}<]{0,20})', html, re.I)
        print(f"{t:<12} value_json={val!r}  extrae={extr}  alt_hits={alt[:3]}")
