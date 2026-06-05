"""Newsletter: suscripción pública + administración de suscriptores."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import os
import google.generativeai as genai
import asyncio

from core.email import send_email

from core.db import db
from core.auth import require_admin
from core.ratelimit import limiter

router = APIRouter(prefix="/api")


@router.post("/newsletter/subscribe")
@limiter.limit("5/minute")
async def newsletter_subscribe(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()[:200]
    if not email or "@" not in email:
        raise HTTPException(400, "Email inválido")
    existing = await db["newsletter_subscribers"].find_one({"email": email})
    if existing:
        if not existing.get("activo", True):
            await db["newsletter_subscribers"].update_one({"email": email}, {"$set": {"activo": True}})
        return {"ok": True, "message": "Ya estás suscrito"}
    doc = {
        "subscriber_id": uuid.uuid4().hex,
        "email": email,
        "nombre": ((body.get("nombre") or "").strip()[:120] or None),
        "rol": str(body.get("rol", "public"))[:40],
        "activo": True,
        "fecha_suscripcion": datetime.now(timezone.utc).isoformat(),
    }
    await db["newsletter_subscribers"].insert_one(doc)
    return {"ok": True, "subscriber_id": doc["subscriber_id"]}


@router.post("/newsletter/unsubscribe")
async def newsletter_unsubscribe(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "Email requerido")
    await db["newsletter_subscribers"].update_one({"email": email}, {"$set": {"activo": False}})
    return {"ok": True}


@router.get("/admin/newsletter/subscribers")
async def admin_newsletter_subscribers(request: Request, skip: int = 0, limit: int = 50, activo: str = "", rol: str = ""):
    await require_admin(request)
    query = {}
    if activo == "true":
        query["activo"] = True
    elif activo == "false":
        query["activo"] = False
    if rol:
        query["rol"] = rol
    total = await db["newsletter_subscribers"].count_documents(query)
    docs = await db["newsletter_subscribers"].find(query, {"_id": 0}).sort("fecha_suscripcion", -1).skip(skip).limit(limit).to_list(limit)
    activos = await db["newsletter_subscribers"].count_documents({"activo": True})
    return {"total": total, "activos": activos, "items": docs}


@router.delete("/admin/newsletter/subscribers/{subscriber_id}")
async def admin_newsletter_unsubscribe(subscriber_id: str, request: Request):
    await require_admin(request)
    await db["newsletter_subscribers"].update_one({"subscriber_id": subscriber_id}, {"$set": {"activo": False}})
    return {"ok": True}

async def process_email_campaign(subject: str, html_content: str, recipients: list, campaign_id: str):
    success_count = 0
    error_count = 0
    errors = []
    
    for email in recipients:
        try:
            # We send emails one by one to avoid exposing other recipients and to handle throttling
            send_email([email], subject, html_content)
            success_count += 1
        except Exception as e:
            error_count += 1
            errors.append({"email": email, "error": str(e)})
        
        # Throttling: wait 1 second between emails
        await asyncio.sleep(1)
        
    await db["email_logs"].insert_one({
        "campaign_id": campaign_id,
        "subject": subject,
        "recipients_count": len(recipients),
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors,
        "fecha": datetime.now(timezone.utc).isoformat()
    })

@router.post("/admin/newsletter/send")
async def admin_newsletter_send(request: Request, background_tasks: BackgroundTasks):
    await require_admin(request)
    body = await request.json()
    subject = body.get("subject")
    html_content = body.get("html_content")
    audience = body.get("audience", [])  # List of roles or "all"
    
    if not subject or not html_content:
        raise HTTPException(400, "Subject and HTML content are required")
        
    query = {"activo": True}
    if "all" not in audience and audience:
        query["rol"] = {"$in": audience}
        
    subscribers = await db["newsletter_subscribers"].find(query, {"email": 1}).to_list(None)
    recipients = [sub["email"] for sub in subscribers]
    
    if not recipients:
        raise HTTPException(400, "No valid recipients found for this audience")
        
    campaign_id = uuid.uuid4().hex
    
    background_tasks.add_task(process_email_campaign, subject, html_content, recipients, campaign_id)
    
    return {"ok": True, "message": "Campaign started", "campaign_id": campaign_id, "recipients_count": len(recipients)}

@router.post("/admin/newsletter/generate-text")
async def admin_newsletter_generate_text(request: Request):
    await require_admin(request)
    body = await request.json()
    prompt = body.get("prompt")
    tipo = body.get("tipo", "body") # "subject" or "body"
    
    if not prompt:
        raise HTTPException(400, "Prompt is required")
        
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_instruction = "Eres un experto en email marketing para bienes raíces."
    if tipo == "subject":
        full_prompt = f"{system_instruction} Genera 3 opciones de asuntos atractivos (cortos y persuasivos) para un correo basado en esto:\n{prompt}\nSolo devuelve los asuntos."
    else:
        full_prompt = f"{system_instruction} Escribe el cuerpo de un correo persuasivo, profesional y en formato HTML básico (usando <p>, <br>, <strong>, etc.) basado en esto:\n{prompt}\nNo incluyas etiquetas <html> o <body>."
        
    try:
        response = model.generate_content(full_prompt)
        return {"ok": True, "generated_text": response.text}
    except Exception as e:
        raise HTTPException(500, f"Error generating text: {str(e)}")
