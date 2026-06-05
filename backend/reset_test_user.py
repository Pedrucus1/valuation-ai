import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.propvalu_db
    
    # Buscar una inmobiliaria existente
    user = await db.users.find_one({"role": "inmobiliaria"})
    
    if user:
        new_password = "password123"
        hashed = pwd_context.hash(new_password)
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"hashed_password": hashed}})
        print(f"Usuario Inmobiliaria: {user['email']}")
        print(f"Password temporal: {new_password}")
    else:
        # Crear uno si no existe
        new_password = "password123"
        hashed = pwd_context.hash(new_password)
        await db.users.insert_one({
            "email": "test@inmobiliaria.com",
            "hashed_password": hashed,
            "role": "inmobiliaria",
            "name": "Inmobiliaria Test"
        })
        print("Usuario Inmobiliaria: test@inmobiliaria.com")
        print("Password temporal: password123")

asyncio.run(main())
