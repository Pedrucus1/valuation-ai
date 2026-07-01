# -*- coding: utf-8 -*-
# Auditoria SOLO-LECTURA de mercado_props. NO escribe a Mongo.
import sys, io, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pymongo import MongoClient
from collections import Counter, defaultdict

MONGO_URL="mongodb+srv://PropValu:Avaluos.%2345%23.@cluster0.9eliadx.mongodb.net/?appName=Cluster0"
cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=60000, socketTimeoutMS=180000)
db = cli["propvalu"]
col = db["mercado_props"]

print("== SAMPLE DOC / FIELDS ==")
doc = col.find_one()
if doc:
    print("Keys:", sorted(doc.keys()))
    print(json.dumps({k:(str(v)[:80]) for k,v in doc.items()}, ensure_ascii=False, indent=1))

# discover field names for price / area / type / operation / colonia / portal / url
print("\n== DISTINCT-ISH probes ==")
def sample_keys():
    keys=Counter()
    for d in col.find({}, limit=2000):
        for k in d.keys(): keys[k]+=1
    return keys
sk = sample_keys()
print("Field freq (top 60 of 2000 docs):")
for k,c in sk.most_common(60):
    print(f"  {k}: {c}")
