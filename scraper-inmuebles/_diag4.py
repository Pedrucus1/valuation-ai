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
TIPOS=["departamento","local","oficina","bodega","casa"]
PEND={"$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}

def detect_anio_raw(html, portal):
    # señales de que la PAGINA trae edad (independiente del extractor)
    if portal in ("INMUEBLES24","VIVANUNCIOS"):
        m=re.search(r'"label"\s*:\s*"antig[üu]edad"[^}]*?"value"\s*:\s*"([^"]+)"', html, re.I)
        return m.group(1) if m else None
    if portal=="CASAS_Y_TERRENOS":
        m=re.search(r'"age"\s*:\s*(\d+)', html); return ("age="+m.group(1)) if m else None
    txt=BeautifulSoup(html,"lxml").get_text(" ",strip=True)
    m=re.search(r'(a[ñn]o\s+de\s+construcc\w*[:\s]*\d{4}|antig[üu]edad[:\s]*\d+|construido\s+en\s+\d{4})', txt, re.I)
    return m.group(0)[:30] if m else None

for portal in ["PINCALI","CASAS_Y_TERRENOS","INMUEBLES24"]:
    print(f"\n===== {portal} por tipo (de pendientes) =====")
    for t in TIPOS:
        q={"portal_origen":portal,"activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
           "url_original":{"$regex":t}, **PEND}
        urls=[d["url_original"] for d in col.find(q,{"url_original":1}).limit(20) if d.get("url_original")][:5]
        if not urls: print(f"  {t:<12}: (sin pendientes)"); continue
        ext=raw=fail=0
        for url in urls:
            try: html=E.fetch_detalle(url,portal,sess)
            except: html=None
            if not html: fail+=1; continue
            e=E.extraer_datos_detalle(html,portal).get("año_construccion")
            r=detect_anio_raw(html,portal)
            if e: ext+=1
            elif r and "age=0" not in str(r): raw+=1
        print(f"  {t:<12}: n={len(urls)} extraidos={ext} crudo_tiene_pero_no_extrae={raw} fail={fail}")
