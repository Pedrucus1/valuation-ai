# -*- coding: utf-8 -*-
# Auditoria SOLO-LECTURA de mercado_props. NO escribe a Mongo.
import sys, io, re, json, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pymongo import MongoClient
from collections import Counter, defaultdict

MONGO_URL="mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)
col = cli["propvalu"]["mercado_props"]

def num(v):
    try:
        if v is None: return None
        s=str(v).strip()
        if s in ("","None","none","null","nan","NaN","False","True"): return None
        return float(s)
    except: return None

def norm(s):
    return (str(s) if s is not None else "").strip()

# total
TOTAL = col.count_documents({})
print("TOTAL docs mercado_props:", TOTAL)

# residencial en venta
q_res = {"tipo_propiedad":{"$in":["casa","departamento"]}, "tipo_operacion":"venta"}
N = col.count_documents(q_res)
print("Casa/Depto en VENTA:", N)

# active filter check
print("activo distinct:", col.distinct("activo", q_res)[:10])

fields = ["precio","m2_construccion","m2_terreno","precio_m2","colonia","municipio",
          "portal_origen","portal","url_original","tipo_propiedad","tipo_operacion",
          "titulo","moneda","dup_intra","es_duplicado_secundario","es_maestro","grupo_id","activo"]

cur = col.find(q_res, projection=fields, batch_size=500)

ppm_vals=[]
absurd_low=[]   # <5000
absurd_high=[]  # >80000
m2c_low=[]      # <15
m2c_high=[]     # >2000
colonia_junk=[]
susp_price=[]
dup_resid=[]
no_ppm=0
moneda_bad=Counter()
by_portal_total=Counter()
by_portal_bad=Counter()
by_col_bad=Counter()
n_seen=0

JUNK_RE = re.compile(r"(for sale|house|apartment|\bstreet\b|\bave\b|\bblvd\b|\d{3,})", re.I)
def is_junk_colonia(c):
    c=norm(c)
    if not c: return False
    if JUNK_RE.search(c): return True
    if len(c) > 45: return True
    if c.count(",")>=2: return True
    return False

for d in cur:
    n_seen+=1
    portal = norm(d.get("portal_origen") or d.get("portal"))
    by_portal_total[portal]+=1
    precio=num(d.get("precio"))
    m2c=num(d.get("m2_construccion"))
    col_=norm(d.get("colonia"))
    url=norm(d.get("url_original"))
    mon=norm(d.get("moneda"))
    if mon and mon not in ("MXN","mxn",""): moneda_bad[mon]+=1
    # duplicados residuales
    if norm(d.get("es_duplicado_secundario")) in ("True","true","1") or norm(d.get("dup_intra")) in ("True","true","1"):
        dup_resid.append(d)
    # colonia junk
    if is_junk_colonia(col_):
        colonia_junk.append((col_,url,portal))
        by_col_bad[portal]+=1
    # ppm
    ppm=None
    if precio and m2c and m2c>0:
        ppm=precio/m2c
        ppm_vals.append(ppm)
    else:
        no_ppm+=1
    # m2c absurd
    if m2c is not None:
        if m2c<15: m2c_low.append((m2c,precio,ppm,url,portal))
        elif m2c>2000: m2c_high.append((m2c,precio,ppm,url,portal))
    # ppm ranges
    if ppm is not None:
        if ppm<5000:
            absurd_low.append((ppm,precio,m2c,col_,url,portal))
            by_portal_bad[portal]+=1
        elif ppm>80000:
            absurd_high.append((ppm,precio,m2c,col_,url,portal))
            by_portal_bad[portal]+=1
    # precio sospechoso: precio total muy bajo para venta residencial
    if precio is not None and precio < 300000:
        susp_price.append((precio,m2c,ppm,col_,url,portal,norm(d.get("tipo_propiedad"))))

print("\nProcesados:", n_seen)

# distribution
ppm_vals.sort()
def pct(p):
    if not ppm_vals: return None
    i=int(len(ppm_vals)*p)
    return ppm_vals[min(i,len(ppm_vals)-1)]
print("\n== DISTRIBUCION $/m2C (residencial venta, con precio&m2c validos:", len(ppm_vals),") ==")
for p in [0.001,0.01,0.05,0.10,0.25,0.50,0.75,0.90,0.95,0.99,0.999]:
    print(f"  p{p*100:6.1f}: {pct(p):,.0f}")

print("\n== PATRON 1: $/m2C fuera de rango ==")
print(f"  <5,000/m2C: {len(absurd_low)}  ({100*len(absurd_low)/N:.2f}% de residencial venta)")
print(f"  >80,000/m2C: {len(absurd_high)}  ({100*len(absurd_high)/N:.2f}%)")
print("  ej LOW:")
for r in sorted(absurd_low)[:8]:
    print(f"    ppm={r[0]:,.0f} precio={r[1]:,.0f} m2c={r[2]} col={r[3][:30]!r} portal={r[5]} {r[4]}")
print("  ej HIGH:")
for r in sorted(absurd_high,reverse=True)[:8]:
    print(f"    ppm={r[0]:,.0f} precio={r[1]:,.0f} m2c={r[2]} col={r[3][:30]!r} portal={r[5]} {r[4]}")

print("\n== PATRON 2: m2_construccion absurdo ==")
print(f"  m2c<15: {len(m2c_low)}  ({100*len(m2c_low)/N:.2f}%)")
print(f"  m2c>2000: {len(m2c_high)}  ({100*len(m2c_high)/N:.2f}%)")
for r in sorted(m2c_low)[:6]:
    print(f"    LOW m2c={r[0]} precio={r[1]} ppm={r[2]} portal={r[4]} {r[3]}")
for r in sorted(m2c_high,reverse=True)[:6]:
    print(f"    HIGH m2c={r[0]} precio={r[1]} ppm={r[2]} portal={r[4]} {r[3]}")

print("\n== PATRON 3: colonias basura ==")
print(f"  total: {len(colonia_junk)}  ({100*len(colonia_junk)/N:.2f}%)")
seen=set()
for c,u,p in colonia_junk:
    if c[:40] in seen: continue
    seen.add(c[:40])
    print(f"    {p}: {c[:55]!r} {u[:60]}")
    if len(seen)>=15: break

print("\n== PATRON 4: precio sospechosamente bajo (<300k) ==")
print(f"  total: {len(susp_price)}  ({100*len(susp_price)/N:.2f}%)")
for r in sorted(susp_price, key=lambda x:x[0])[:12]:
    print(f"    precio={r[0]:,.0f} m2c={r[1]} ppm={r[2]} tipo={r[6]} col={r[3][:25]!r} portal={r[5]} {r[4][:55]}")

print("\n== PATRON 5: duplicados marcados presentes en pool ==")
print(f"  con dup_intra/es_duplicado_secundario=True: {len(dup_resid)}")

print("\n== moneda != MXN ==", dict(moneda_bad))
print("no_ppm (sin precio o m2c):", no_ppm, f"({100*no_ppm/N:.2f}%)")

print("\n== concentracion por portal (residencial venta) ==")
for p,c in by_portal_total.most_common():
    bad=by_portal_bad[p]; cj=by_col_bad[p]
    print(f"  {p or '(vacio)'}: total={c} ppm_fuera_rango={bad} colonia_junk={cj}")
