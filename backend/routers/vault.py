"""Bóveda de respaldo (#185): solicitud de guardado pagado de un avalúo público.

MVP sin Stripe (bloqueado por N3/N4 — falta SAPI constituida): solo captura la solicitud
(plan + correo) como lead/waitlist. No cobra nada real. El envío de confirmación por correo
es best-effort — si SMTP no está configurado, solo se loggea, nunca rompe la solicitud.
"""
import logging
from fastapi import APIRouter, HTTPException, Request

from core.db import db
from core.email import send_email
from models import VaultRequest, VaultRequestIn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

PLANES_BOVEDA = {6: 50, 12: 80, 18: 120, 36: 170, 120: 195}


@router.post("/valuations/{valuation_id}/vault-request")
async def crear_solicitud_boveda(valuation_id: str, body: VaultRequestIn, request: Request):
    if body.plan_meses not in PLANES_BOVEDA:
        raise HTTPException(400, f"Plan inválido. Opciones: {sorted(PLANES_BOVEDA)} meses")

    valuation = await db["valuations"].find_one({"valuation_id": valuation_id}, {"_id": 0, "valuation_id": 1})
    if not valuation:
        raise HTTPException(404, "Avalúo no encontrado")

    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Correo inválido")

    monto = PLANES_BOVEDA[body.plan_meses]  # server-side, nunca confiar en el del cliente
    vault_req = VaultRequest(
        valuation_id=valuation_id,
        nombre=(body.nombre or "").strip()[:120],
        email=email,
        plan_meses=body.plan_meses,
        monto=monto,
    )
    await db["vault_requests"].insert_one(vault_req.model_dump())

    try:
        send_email(
            [email],
            "Recibimos tu solicitud de respaldo — PropValu",
            f"<p>Hola{f' {vault_req.nombre}' if vault_req.nombre else ''},</p>"
            f"<p>Recibimos tu solicitud de respaldo por <strong>${monto} MXN</strong> "
            f"(plan de {body.plan_meses} meses) para tu avalúo.</p>"
            f"<p>Te avisaremos por este correo en cuanto el pago esté disponible.</p>",
        )
    except Exception as e:
        logger.warning(f"vault-request: no se pudo enviar confirmación a {email}: {e}")

    return {"ok": True, "message": "Solicitud registrada", "monto": monto}
