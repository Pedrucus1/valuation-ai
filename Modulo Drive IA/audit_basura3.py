import os
from dotenv import load_dotenv; load_dotenv()
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pymongo import MongoClient
from collections import Counter
MONGO_URL=os.environ["MONGO_URL"]
col = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)["propvalu"]["mercado_props"]
def num(v):
    try:
        s=str(v).strip()
        if s in ("","None","none","null","nan","NaN","False","True"): return None
        return float(s)
    except: return None
q={"tipo_propiedad":{"$in":["casa","departamento"]},"tipo_operacion":"venta"}
cur=col.find(q,projection=["precio","m2_construccion","moneda","colonia","municipio","portal_origen"],batch_size=500)
hi_bkts=Counter(); lo_bkts=Counter(); usd_ppm=[]
hi_thresh=[80000,100000,120000,150000,200000,300000,500000,1000000]
lo_thresh=[1000,2000,3000,4000,5000,6000,8000]
N=0
for d in cur:
    p=num(d.get("precio")); m=num(d.get("m2_construccion"))
    if not p or not m or m<=0: continue
    ppm=p/m; N+=1
    mon=str(d.get("moneda")).strip()
    if mon=="USD": usd_ppm.append(ppm)
    for t in hi_thresh:
        if ppm>t: hi_bkts[t]+=1
    for t in lo_thresh:
        if ppm<t: lo_bkts[t]+=1
print("N con ppm:",N)
print("\nHIGH: docs con ppm > umbral (y % del pool)")
for t in hi_thresh: print(f"  >{t:>9,}: {hi_bkts[t]:5d}  {100*hi_bkts[t]/N:.2f}%")
print("\nLOW: docs con ppm < umbral")
for t in lo_thresh: print(f"  <{t:>6,}: {lo_bkts[t]:5d}  {100*lo_bkts[t]/N:.2f}%")
print(f"\nUSD docs con ppm: {len(usd_ppm)}  (ejemplo ppm si tratado como MXN):", [round(x) for x in sorted(usd_ppm)[:5]])

# Monumental example
print("\n== COLONIA 'Monumental' (contiene) ==")
mon=list(col.find({"tipo_propiedad":{"$in":["casa","departamento"]},"tipo_operacion":"venta","colonia":{"$regex":"Monumental","$options":"i"}},projection=["precio","m2_construccion","colonia","portal_origen","url_original"]))
print("total:",len(mon))
rows=[]
for d in mon:
    p=num(d.get("precio")); m=num(d.get("m2_construccion"))
    ppm=p/m if p and m else None
    rows.append((ppm,p,m,str(d.get("colonia"))[:35],d.get("portal_origen"),str(d.get("url_original"))[:55]))
for r in sorted(rows,key=lambda x:(x[0] is None,x[0] or 0)):
    print(f"  ppm={r[0] and round(r[0]):>10} p={r[1]} m2c={r[2]} col={r[3]!r} {r[4]} {r[5]}")
