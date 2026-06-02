"""Admin — valuadores (listado) y reportes/ingresos."""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Request

from core.db import db
from core.auth import require_admin

router = APIRouter(prefix="/api")


@router.get("/admin/valuadores")
async def admin_valuadores_list(request: Request, q: str = "", kyc: str = "", plan: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"role": "appraiser"}
    if q:
        filtro["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"municipio": {"$regex": q, "$options": "i"}},
        ]
    if kyc:
        filtro["kyc_status"] = kyc
    if plan:
        filtro["plan"] = plan
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).to_list(200)
    # Agregar conteo de valuaciones y quejas por valuador
    for u in usuarios:
        u["total_valuaciones"] = await db.valuations.count_documents({"user_id": u["user_id"]})
        u["total_quejas"] = await db.feedback.count_documents({
            "valuador_id": u["user_id"],
            "tipo": "queja_valuador"
        })
        u["ads_activos"]   = await db.anuncios.count_documents({"user_id": u["user_id"], "estado": "aprobado"})
        u["ads_pendientes"] = await db.anuncios.count_documents({"user_id": u["user_id"], "estado": "pendiente"})
        # Calificación promedio de reseñas del directorio (perfil_id = email)
        resenas_v = await db.resenas.find({"perfil_id": u["email"]}).to_list(500)
        u["calificacion_promedio"] = round(sum(r["calificacion"] for r in resenas_v) / len(resenas_v), 1) if resenas_v else 0.0
        u["total_resenas"] = len(resenas_v)
    return {"valuadores": usuarios, "total": len(usuarios)}


@router.get("/admin/reportes")
async def admin_reportes(request: Request):
    await require_admin(request)

    # Transacciones de pagos (colección payments, puede estar vacía)
    pagos = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    # Resumen de valuaciones completadas por mes (últimos 6 meses)
    hoy = datetime.now(timezone.utc)
    meses = []
    for i in range(5, -1, -1):
        # Inicio y fin del mes i meses atrás
        mes_dt = datetime(hoy.year, hoy.month, 1, tzinfo=timezone.utc) - timedelta(days=30 * i)
        mes_inicio = datetime(mes_dt.year, mes_dt.month, 1, tzinfo=timezone.utc)
        if mes_dt.month == 12:
            mes_fin = datetime(mes_dt.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            mes_fin = datetime(mes_dt.year, mes_dt.month + 1, 1, tzinfo=timezone.utc)

        label = mes_inicio.strftime("%b %Y")
        count = await db.valuations.count_documents({
            "status": "completed",
            "created_at": {
                "$gte": mes_inicio.isoformat(),
                "$lt": mes_fin.isoformat(),
            }
        })
        meses.append({"mes": label, "valuaciones": count})

    # Totales generales
    total_valuaciones = await db.valuations.count_documents({"status": "completed"})
    total_usuarios = await db.users.count_documents({})
    total_valuadores = await db.users.count_documents({"role": "appraiser", "kyc_status": "approved"})

    return {
        "resumen_meses": meses,
        "transacciones": pagos,
        "totales": {
            "valuaciones_completadas": total_valuaciones,
            "usuarios": total_usuarios,
            "valuadores_activos": total_valuadores,
        }
    }
