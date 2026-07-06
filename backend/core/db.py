"""Conexión a MongoDB (cliente único compartido por toda la app)."""
import os
import certifi
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# backend/core/db.py -> backend/ ; el .env vive en backend/
_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where(), maxPoolSize=50, minPoolSize=0)
db = client[os.environ["DB_NAME"]]
