"""Autenticación de administradores: login (bootstrap/migración perezosa) y /me."""
import os
import hmac
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from core.db import db
from core.auth import require_admin, pwd_context, new_admin_token_expiry
from core.ratelimit import limiter

router = APIRouter(prefix="/api")

ADMIN_SECRET = os.environ.get("ADMIN_SECRET")
if not ADMIN_SECRET:
    raise RuntimeError("ADMIN_SECRET no está definida en las variables de entorno")


class AdminLoginRequest(BaseModel):
    email: str
    password: str


def _matches_admin_secret(password: str) -> bool:
    """Comparación timing-safe contra ADMIN_SECRET (S2)."""
    return hmac.compare_digest(password.encode("utf-8"), ADMIN_SECRET.encode("utf-8"))


@router.post("/admin/auth/login")
@limiter.limit("10/minute")
async def admin_login(request: Request, data: AdminLoginRequest):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin:
        # Bootstrap del superadmin desde env (solo si aún no existe). Se guarda YA
        # con hash bcrypt: no se vuelve a usar ADMIN_SECRET para este admin (S1).
        if data.email == os.environ.get("ADMIN_EMAIL", "admin@propvalu.mx") and _matches_admin_secret(data.password):
            token = f"adm_{uuid.uuid4().hex}"
            doc = {
                "admin_id": f"adm_{uuid.uuid4().hex[:8]}",
                "email": data.email,
                "nombre": "Super Admin",
                "rol": "superadmin",
                "hashed_password": pwd_context.hash(data.password),
                "token": token,
                "token_expires_at": new_admin_token_expiry(),
                "activo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.admins.insert_one(doc)
            return {k: v for k, v in doc.items() if k not in ("_id", "hashed_password")}
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    stored_hash = admin.get("hashed_password")
    if stored_hash:
        if not pwd_context.verify(data.password, stored_hash):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    else:
        # Admin legacy sin hash: migración perezosa. Acepta ADMIN_SECRET una sola
        # vez y guarda el hash; a partir de ahí ya no hay secreto compartido (S1).
        if not _matches_admin_secret(data.password):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        await db.admins.update_one(
            {"email": data.email},
            {"$set": {"hashed_password": pwd_context.hash(data.password)}},
        )

    token = f"adm_{uuid.uuid4().hex}"
    expiry = new_admin_token_expiry()
    await db.admins.update_one(
        {"email": data.email},
        {"$set": {"token": token, "token_expires_at": expiry}},
    )
    return {
        **{k: v for k, v in admin.items() if k not in ("_id", "hashed_password")},
        "token": token,
        "token_expires_at": expiry,
    }


@router.get("/admin/auth/me")
async def admin_me(request: Request):
    admin = await require_admin(request)
    return admin
