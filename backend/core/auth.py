"""Autenticación de usuarios (sesión por cookie/Bearer)."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request, HTTPException

from core.db import db
from models import User


async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]

    if not session_token:
        return None

    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )

    if not session_doc:
        return None

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        return None

    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )

    if not user_doc:
        return None

    return User(**user_doc)


async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user


async def require_admin(request: Request):
    """Valida el token de admin (sesión rotatoria en la colección admins)."""
    token = request.headers.get("X-Admin-Token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token de administrador requerido")
    admin = await db.admins.find_one({"token": token, "activo": True}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return admin
