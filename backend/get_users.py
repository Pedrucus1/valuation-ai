from pymongo import MongoClient
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
client = MongoClient("mongodb+srv://pedrucus_db_user:NVZdQbvYCHRL9a3s@cluster1.avle5ez.mongodb.net/?appName=Cluster1")
db = client.propvalu_db

user = db.users.find_one({"role": "inmobiliaria"})

if user:
    new_password = "password123"
    hashed = pwd_context.hash(new_password)
    db.users.update_one({"_id": user["_id"]}, {"$set": {"hashed_password": hashed}})
    print(f"Usuario Inmobiliaria: {user['email']}")
    print(f"Password temporal: {new_password}")
else:
    new_password = "password123"
    hashed = pwd_context.hash(new_password)
    db.users.insert_one({
        "email": "test@inmobiliaria.com",
        "hashed_password": hashed,
        "role": "inmobiliaria",
        "name": "Inmobiliaria Test"
    })
    print("Usuario Inmobiliaria: test@inmobiliaria.com")
    print("Password temporal: password123")
