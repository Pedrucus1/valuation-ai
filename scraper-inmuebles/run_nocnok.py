"""Runner standalone para scraper NOCNOK."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
from pymongo import MongoClient
from scrapers.nocnok import scrapear_jalisco

load_dotenv()
client = MongoClient(os.getenv("MONGO_URL"))
col = client["propvalu"]["mercado_props"]

print("=== NOCNOK scraper iniciando ===")
n = scrapear_jalisco(col, delay=0.8)
print(f"=== NOCNOK scraper terminado: {n} props ===")
