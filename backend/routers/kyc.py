"""KYC: gestión admin (aprobar/rechazar/ratificar/ver) y subida de documentos del usuario."""
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form

from core.db import db
from core.auth import require_admin, require_auth
from core.config import KYC_DIR

router = APIRouter(prefix="/api")


@router.get("/admin/kyc")
async def admin_kyc_list(request: Request, tipo: str = ""):
    await require_admin(request)
    filtro: Dict[str, Any] = {"kyc_status": {"$in": ["pending", "under_review", "approved", "rejected"]}}
    if tipo:
        filtro["role"] = tipo
    usuarios = await db.users.find(filtro, {"_id": 0, "hashed_password": 0}).to_list(200)
    # Adjuntar documentos subidos
    for u in usuarios:
        docs = await db.kyc_docs.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(20)
        u["documentos"] = docs
    return {"usuarios": usuarios}

@router.post("/admin/kyc/{user_id}/aprobar")
async def admin_kyc_aprobar(user_id: str, request: Request):
    await require_admin(request)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "approved", "kyc_aprobado_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}

@router.post("/admin/kyc/{user_id}/rechazar")
async def admin_kyc_rechazar(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    motivo = body.get("motivo", "")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "rejected", "kyc_motivo_rechazo": motivo, "kyc_rechazado_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}

@router.post("/admin/kyc/{user_id}/solicitar-info")
async def admin_kyc_solicitar(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    mensaje = body.get("mensaje", "")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "under_review", "kyc_solicitud_info": mensaje}}
    )
    return {"ok": True}

@router.post("/admin/kyc/ratificar/{doc_id}")
async def admin_kyc_ratificar(doc_id: str, request: Request):
    await require_admin(request)
    result = await db.kyc_docs.update_one(
        {"doc_id": doc_id},
        {"$set": {"estado": "ratificado", "ratificado_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"ok": True}

@router.get("/admin/kyc/doc/{doc_id}")
async def admin_kyc_ver_documento(doc_id: str, request: Request):
    await require_admin(request)
    doc = await db.kyc_docs.find_one({"doc_id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no disponible en disco")
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(path),
        media_type=doc.get("content_type", "application/octet-stream"),
        filename=doc.get("filename", "documento"),
    )

# ============== KYC UPLOAD (usuario) ==============

ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_MB = 5

@router.post("/kyc/upload")
async def kyc_upload(
    request: Request,
    doc_tipo: str = Form(...),
    file: UploadFile = File(...),
):
    user = await require_auth(request)
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo PDF, JPG, PNG.")
    contents = await file.read()
    if len(contents) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El archivo supera {MAX_FILE_MB} MB.")

    user_dir = KYC_DIR / user.user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".bin"
    filename = f"{doc_tipo}_{uuid.uuid4().hex[:8]}{ext}"
    dest = user_dir / filename
    dest.write_bytes(contents)

    doc_record = {
        "doc_id": uuid.uuid4().hex,
        "user_id": user.user_id,
        "doc_tipo": doc_tipo,
        "filename": filename,
        "path": str(dest),
        "size_bytes": len(contents),
        "content_type": file.content_type,
        "subido_at": datetime.now(timezone.utc).isoformat(),
        "estado": "subido",
    }
    await db.kyc_docs.replace_one(
        {"user_id": user.user_id, "doc_tipo": doc_tipo},
        doc_record,
        upsert=True,
    )
    return {"ok": True, "doc_id": doc_record["doc_id"], "filename": filename}

@router.get("/kyc/mis-documentos")
async def kyc_mis_docs(request: Request):
    user = await require_auth(request)
    docs = await db.kyc_docs.find({"user_id": user.user_id}, {"_id": 0, "path": 0}).to_list(20)
    return {"documentos": docs}

@router.get("/kyc/documento/{doc_id}")
async def kyc_ver_propio_doc(doc_id: str, request: Request):
    user = await require_auth(request)
    doc = await db.kyc_docs.find_one({"doc_id": doc_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no disponible")
    from fastapi.responses import FileResponse
    return FileResponse(path=str(path), media_type=doc.get("content_type", "application/octet-stream"), filename=doc.get("filename", "documento"))

@router.post("/kyc/solicitar-entrevista")
async def kyc_solicitar_entrevista(request: Request):
    user = await require_auth(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "kyc_status": "under_review",
            "entrevista_solicitada_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    # TODO: enviar email de confirmación vía SendGrid
    # TODO: enviar WhatsApp de confirmación vía Twilio
    return {"ok": True, "mensaje": "Solicitud recibida. Te contactaremos para agendar la videollamada."}
