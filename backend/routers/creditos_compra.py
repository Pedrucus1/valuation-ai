"""Compra de créditos prepago por transferencia bancaria (#191, sesión 2).

Sin integración bancaria real (bloqueado por trámites de la empresa): el cliente
sube su comprobante, un admin lo revisa contra su estado de cuenta y confirma
manualmente desde el panel — mismo patrón sin-pago-real que vault.py, pero aquí
además hay un paso de "comprobante" porque una transferencia no se puede validar
en el momento como una tarjeta simulada.

Los créditos comprados sirven para OPI y/o Flipping según el paquete (`tipo`):
ver core/creditos.saldo_efectivo / gastar_credito para el filtro por `uso`.
"""
import logging
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response, UploadFile, File, Form

from core.db import db
from core.auth import get_current_user, require_admin
from core.config import COMPROBANTES_DIR
from core.creditos import otorgar_credito, gastar_credito
from core.email import send_email
from models import CreditPurchase
from routers.auth import crear_usuario_investor_publico

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@propvalu.mx")

# Precios y tamaños de ejemplo — un solo lugar para ajustarlos cuando haya precios reales.
PAQUETES_CREDITOS = {
    "flip_1":  {"creditos": 1,  "precio": 380,  "tipo": "flipping", "label": "1 crédito · Flipping"},
    "chico":   {"creditos": 3,  "precio": 1100, "tipo": "mixto",    "label": "Chico · 3 créditos"},
    "mediano": {"creditos": 7,  "precio": 2400, "tipo": "mixto",    "label": "Mediano · 7 créditos"},
    "grande":  {"creditos": 15, "precio": 4800, "tipo": "mixto",    "label": "Grande · 15 créditos"},
}

DATOS_BANCARIOS = {
    "banco": os.environ.get("BANK_BANCO", "(pendiente de definir)"),
    "clabe": os.environ.get("BANK_CLABE", "(pendiente de definir)"),
    "beneficiario": os.environ.get("BANK_BENEFICIARIO", "(pendiente de definir)"),
}

ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_MB = 5


@router.post("/creditos/consumir")
async def consumir_credito(request: Request):
    """Gate llamado por el frontend antes de generar un reporte (Flipping u OPI
    pública). Solo aplica a public/investor — appraiser/realtor siguen con su
    sistema de planes/facturación mensual, sin tocar."""
    body = await request.json()
    uso = body.get("uso")
    if uso not in ("opi", "flipping"):
        raise HTTPException(400, "uso inválido")

    user = await get_current_user(request)
    if not user:
        # Visitante sin cuenta: nunca tiene créditos, directo a comprar.
        raise HTTPException(status_code=402, detail={"need_purchase": True})
    if user.role not in ("public", "investor"):
        return {"ok": True}

    ok = await gastar_credito(db, user.user_id, uso)
    if not ok:
        raise HTTPException(status_code=402, detail={"need_purchase": True})
    return {"ok": True}


@router.get("/creditos/paquetes")
async def listar_paquetes():
    return {"paquetes": PAQUETES_CREDITOS, "datos_bancarios": DATOS_BANCARIOS}


@router.post("/creditos/comprar")
async def comprar_creditos(request: Request, response: Response):
    body = await request.json()
    package_id = body.get("package_id")
    paquete = PAQUETES_CREDITOS.get(package_id)
    if not paquete:
        raise HTTPException(400, "Paquete inválido")

    user = await get_current_user(request)
    if user:
        user_id, nombre, email = user.user_id, user.name, user.email
    else:
        nombre = (body.get("nombre") or "").strip()[:120]
        email = (body.get("email") or "").strip().lower()
        if not nombre or "@" not in email:
            raise HTTPException(400, "Nombre y correo son requeridos")
        nuevo = await crear_usuario_investor_publico(response, nombre, email)
        user_id = nuevo["user_id"]

    compra = CreditPurchase(
        user_id=user_id,
        email=email,
        nombre=nombre,
        package_id=package_id,
        creditos=paquete["creditos"],
        monto=paquete["precio"],
        tipo=paquete["tipo"],
    )
    await db.credit_purchases.insert_one(compra.model_dump())

    return {
        "ok": True,
        "purchase_id": compra.purchase_id,
        "monto": compra.monto,
        "datos_bancarios": DATOS_BANCARIOS,
    }


@router.post("/creditos/compras/{purchase_id}/comprobante")
async def subir_comprobante(purchase_id: str, file: UploadFile = File(...)):
    compra = await db.credit_purchases.find_one({"purchase_id": purchase_id})
    if not compra:
        raise HTTPException(404, "Solicitud no encontrada")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "Tipo de archivo no permitido. Solo PDF, JPG, PNG.")
    contents = await file.read()
    if len(contents) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(400, f"El archivo supera {MAX_FILE_MB} MB.")

    ext = Path(file.filename).suffix or ".bin"
    doc_id = uuid.uuid4().hex
    dest = COMPROBANTES_DIR / f"{purchase_id}_{doc_id}{ext}"
    dest.write_bytes(contents)

    await db.credit_purchases.update_one(
        {"purchase_id": purchase_id},
        {"$set": {"estado": "pendiente_revision", "comprobante_doc_id": doc_id, "comprobante_path": str(dest)}},
    )

    try:
        send_email(
            [ADMIN_EMAIL],
            f"Nueva compra de créditos pendiente — {compra['nombre']}",
            f"<p>{compra['nombre']} ({compra['email']}) subió comprobante por "
            f"<strong>${compra['monto']:,.0f} MXN</strong> — paquete {compra['package_id']} "
            f"({compra['creditos']} créditos, {compra['tipo']}).</p>"
            f"<p>Revisa tu estado de cuenta y confirma desde el panel de admin.</p>",
        )
    except Exception as e:
        logger.warning(f"comprobante compra {purchase_id}: no se pudo avisar a admin: {e}")

    return {"ok": True}


@router.get("/admin/creditos/comprobante/{purchase_id}")
async def admin_ver_comprobante(purchase_id: str, request: Request):
    await require_admin(request)
    compra = await db.credit_purchases.find_one({"purchase_id": purchase_id})
    if not compra or not compra.get("comprobante_path"):
        raise HTTPException(404, "Comprobante no encontrado")
    path = Path(compra["comprobante_path"])
    if not path.exists():
        raise HTTPException(404, "Archivo no disponible en disco")
    from fastapi.responses import FileResponse
    return FileResponse(path=str(path), filename=path.name)


@router.get("/admin/creditos/compras")
async def admin_listar_compras(request: Request, estado: str = ""):
    await require_admin(request)
    filtro = {"estado": estado} if estado else {}
    compras = await db.credit_purchases.find(filtro, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"compras": compras}


@router.post("/admin/creditos/compras/{purchase_id}/confirmar")
async def admin_confirmar_compra(purchase_id: str, request: Request):
    admin = await require_admin(request)
    compra = await db.credit_purchases.find_one({"purchase_id": purchase_id})
    if not compra:
        raise HTTPException(404, "Solicitud no encontrada")
    if compra["estado"] == "pagado":
        return {"ok": True}

    # tipo del paquete ("mixto"/"flipping") -> uso del ledger ("cualquiera"/"flipping"),
    # ver core/creditos.saldo_efectivo: solo "cualquiera" cuenta para OPI.
    uso_ledger = "cualquiera" if compra["tipo"] == "mixto" else compra["tipo"]
    await otorgar_credito(
        db, compra["user_id"], compra["creditos"],
        origen="compra_transferencia", expira_en=None, uso=uso_ledger,
    )
    await db.credit_purchases.update_one(
        {"purchase_id": purchase_id},
        {"$set": {
            "estado": "pagado",
            "confirmado_en": datetime.now(timezone.utc).isoformat(),
            "confirmado_por": admin.get("email", "admin"),
        }},
    )

    try:
        send_email(
            [compra["email"]],
            "Tus créditos ya están activos — PropValu",
            f"<p>Hola {compra['nombre']},</p>"
            f"<p>Confirmamos tu pago y ya tienes <strong>{compra['creditos']} créditos</strong> "
            f"disponibles en tu cuenta PropValu.</p>",
        )
    except Exception as e:
        logger.warning(f"confirmar compra {purchase_id}: no se pudo avisar a cliente: {e}")

    return {"ok": True}


@router.post("/admin/creditos/compras/{purchase_id}/rechazar")
async def admin_rechazar_compra(purchase_id: str, request: Request):
    await require_admin(request)
    result = await db.credit_purchases.update_one(
        {"purchase_id": purchase_id},
        {"$set": {"estado": "rechazado"}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Solicitud no encontrada")
    return {"ok": True}
