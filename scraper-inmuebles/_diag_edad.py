import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from dotenv import load_dotenv
from pymongo import MongoClient
import requests
from bs4 import BeautifulSoup
import enricher as E
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=30000)[os.getenv("DB_NAME","propvalu")]["mercado_props"]

def muestra(portal, n=10):
    q={"portal_origen":portal,"activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
       "$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}
    return [d["url_original"] for d in col.find(q,{"url_original":1}).limit(n*5) if d.get("url_original")][:n]

sess=requests.Session()
PAT=[r"antig[üu]edad", r"a[ñn]o\s+de\s+construcci", r"construido\s+en\s+\d{4}",
     r"\d+\s*a[ñn]os?\s+de\s+(?:antig|construc)", r"year[_ ]?built", r"a[ñn]os?\s+de\s+antig"]
for portal in ["PINCALI","CASAS_Y_TERRENOS","MITULA"]:
    print(f"\n===== {portal} =====")
    ok=fetchfail=extrae=crudo_tiene=nada=0
    for url in muestra(portal):
        try: html=E.fetch_detalle(url, portal, sess)
        except Exception as ex: html=None
        if not html: fetchfail+=1; continue
        ok+=1
        extr=E.extraer_datos_detalle(html, portal).get("año_construccion")
        txt=BeautifulSoup(html,"lxml").get_text(" ",strip=True)
        hits=[]
        for p in PAT:
            m=re.search(p+r"[^\d]{0,12}(\d{1,4})", txt, re.I)
            if m: hits.append(m.group(0)[:45])
        mj=re.search(r'"(?:age|year_?built|antig[üu]edad)"\s*:\s*"?(\d{1,4})', html, re.I)
        if mj: hits.append("json:"+mj.group(0)[:30])
        if extr: extrae+=1; tag="EXTRAE  "
        elif hits: crudo_tiene+=1; tag="**FALSO_NEG**"
        else: nada+=1; tag="nada    "
        print(f"  {tag} extr={extr} hits={hits[:3]} :: ...{url[-55:]}")
    print(f"  -> fetched={ok} fail={fetchfail} | extrae={extrae} FALSO_NEG={crudo_tiene} nada={nada}")
