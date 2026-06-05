import os, re, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from dotenv import load_dotenv
from pymongo import MongoClient
import requests
from bs4 import BeautifulSoup
import enricher as E
load_dotenv()
col = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=30000)[os.getenv("DB_NAME","propvalu")]["mercado_props"]
sess=requests.Session()

# ---- CYT: age=0 (sin dato) vs age>0 (FALSO NEG real) ----
print("===== CYT: distribucion de age en pendientes =====")
q={"portal_origen":"CASAS_Y_TERRENOS","activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
   "$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}
age0=agepos=nokey=fail=0; ejpos=[]
for d in col.find(q,{"url_original":1}).limit(120):
    url=d.get("url_original");
    if not url: continue
    try: html=E.fetch_detalle(url,"CASAS_Y_TERRENOS",sess)
    except: html=None
    if not html: fail+=1; continue
    m=re.search(r'"age"\s*:\s*(\d+)', html)
    if not m: nokey+=1; continue
    a=int(m.group(1))
    if a==0: age0+=1
    else: agepos+=1; ejpos.append((a,url[-45:]))
    if age0+agepos+nokey>=30: break
print(f"  age=0(sin dato)={age0}  age>0(DEBERIA extraer)={agepos}  sin_key={nokey}  fail={fail}")
for a,u in ejpos[:6]: print(f"    age={a} :: ...{u}")

# ---- MITULA: que trae la pagina ----
print("\n===== MITULA: contenido real de la pagina =====")
qm={"portal_origen":"MITULA","activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True}}
for d in col.find(qm,{"url_original":1}).limit(3):
    url=d.get("url_original")
    try: html=E.fetch_detalle(url,"MITULA",sess)
    except Exception as ex: html=f"ERR {ex}"
    if not html: print(f"  SIN HTML :: ...{url[-45:]}"); continue
    txt=BeautifulSoup(html,"lxml").get_text(" ",strip=True)
    has=[k for k in ["antig","construcc","año","recamar","baño","m2","superfic"] if re.search(k,txt,re.I)]
    print(f"  len={len(html)} señales={has} :: ...{url[-45:]}")
    snip=re.search(r'.{0,30}(antig|construcc|a[ñn]o).{0,40}', txt, re.I)
    if snip: print(f"     ctx: {snip.group(0)}")

# ---- PINCALI residencial (casa/departamento, NO bodega/local) ----
print("\n===== PINCALI residencial pendiente =====")
qp={"portal_origen":"PINCALI","activo":{"$ne":False},"es_duplicado_secundario":{"$ne":True},
    "tipo":{"$in":["casa","departamento"]},
    "$or":[{"anio_construccion":{"$exists":False}},{"anio_construccion":None},{"anio_construccion":0}]}
ex=cr=na=fa=0
for d in col.find(qp,{"url_original":1}).limit(12):
    url=d.get("url_original")
    try: html=E.fetch_detalle(url,"PINCALI",sess)
    except: html=None
    if not html: fa+=1; continue
    extr=E.extraer_datos_detalle(html,"PINCALI").get("año_construccion")
    txt=BeautifulSoup(html,"lxml").get_text(" ",strip=True)
    m=re.search(r'a[ñn]o\s+de\s+construcc\w*[:\s]*(\d{4})|antig[üu]edad[:\s]*(\d+)', txt, re.I)
    if extr: ex+=1; print(f"  EXTRAE {extr} :: ...{url[-40:]}")
    elif m: cr+=1; print(f"  **FALSO_NEG** crudo={m.group(0)[:30]} :: ...{url[-40:]}")
    else: na+=1
print(f"  -> extrae={ex} FALSO_NEG={cr} nada={na} fail={fa}")
