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
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Request, Response, UploadFile, File, Form

from core.db import db
from core.auth import get_current_user, require_admin
from core.config import COMPROBANTES_DIR
from core.creditos import otorgar_credito, gastar_credito
from core.email import send_email
from core.ratelimit import client_key
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

BONO_PRIMERA_COMPRA = 5  # créditos extra al confirmar la primera compra pagada de un usuario
MAX_PROMO_POR_IP = 1  # decisión del negocio: 1 por oficina/red, aunque bloquee compañeros legítimos


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

    # Bono de primera compra: se checa ANTES de insertar esta compra como pagada,
    # así "primera" es realmente la primera vez que este user_id paga algo.
    es_primera_compra = await db.credit_purchases.count_documents(
        {"user_id": compra["user_id"], "estado": "pagado"}
    ) == 0

    await otorgar_credito(
        db, compra["user_id"], compra["creditos"],
        origen="compra_transferencia", expira_en=None, uso=uso_ledger,
    )
    if es_primera_compra:
        await otorgar_credito(
            db, compra["user_id"], BONO_PRIMERA_COMPRA,
            origen="bono_primera_compra", expira_en=None, uso=uso_ledger,
        )
    await db.credit_purchases.update_one(
        {"purchase_id": purchase_id},
        {"$set": {
            "estado": "pagado",
            "confirmado_en": datetime.now(timezone.utc).isoformat(),
            "confirmado_por": admin.get("email", "admin"),
        }},
    )

    bono_html = (
        f"<p>Como es tu primera compra, te regalamos <strong>{BONO_PRIMERA_COMPRA} créditos extra</strong> 🎉</p>"
        if es_primera_compra else ""
    )
    try:
        send_email(
            [compra["email"]],
            "Tus créditos ya están activos — PropValu",
            f"<p>Hola {compra['nombre']},</p>"
            f"<p>Confirmamos tu pago y ya tienes <strong>{compra['creditos']} créditos</strong> "
            f"disponibles en tu cuenta PropValu.</p>{bono_html}",
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


# --- Códigos de prueba (#194) ---------------------------------------------
# Créditos gratis para enganchar usuarios nuevos, sin pasar por transferencia.
# Cuádruple bloqueo anti-abuso (evita "cambio de correo y vuelvo a canjear"),
# cada capa cubre lo que la otra no — ninguna es perfecta sola, juntas suben
# el costo de abusar un código de 2 créditos muy por arriba de lo que vale:
#   - Por CUENTA: `promo_redimidos` en el doc de user, independiente de cuántos
#     créditos le queden — evita re-canjear tras gastarlos.
#   - Por RED: `promo_ips_usadas`, tope `MAX_PROMO_POR_IP=1` — mismo IP (o XFF
#     real detrás de Railway, ver core.ratelimit.client_key) no puede canjear
#     dos veces. Decisión explícita del negocio: 1 código por oficina/red, aun
#     sabiendo que puede bloquear a un compañero legítimo en la misma oficina.
#     No es a prueba de: IP dinámica (reiniciar el router cambia la IP) ni de
#     cambiar de red (ej. wifi de oficina -> datos móviles del celular).
#   - Por NAVEGADOR: cookie `pv_promo` de un año — cubre "otro correo, misma
#     red pública/compartida" donde el bloqueo por IP no sirve. No sobrevive
#     modo incógnito ni borrar cookies.
#   - Por TELÉFONO: `promo_telefonos_usados` — sin sesión, el teléfono es
#     obligatorio para canjear. No se verifica por SMS (fuera de alcance para
#     2 créditos), así que se puede escribir cualquier número, pero ya no
#     alcanza con un email desechable: cada "usuario nuevo" fabricado necesita
#     también un teléfono nuevo, lo que sube la fricción de escalar el abuso.
# El código en sí tiene su propio tope `max_usos` para limitar cuánta gente en
# total puede usarlo. Créditos otorgados via otorgar_credito(origen="promo_trial")
# — mismo ledger que compras reales, gastar_credito no distingue el origen.

@router.post("/creditos/promo")
async def canjear_promo(request: Request, response: Response):
    body = await request.json()
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Código requerido")

    promo = await db.promo_codes.find_one({"code": code})
    if not promo or not promo.get("activo"):
        raise HTTPException(404, "Código inválido")
    if promo.get("expira_en") and datetime.now(timezone.utc) > datetime.fromisoformat(promo["expira_en"]):
        raise HTTPException(400, "Código expirado")
    if promo["usados"] >= promo["max_usos"]:
        raise HTTPException(400, "Código agotado")

    if request.cookies.get("pv_promo"):
        raise HTTPException(400, "Ya se usó un código de prueba en este navegador")

    ip = client_key(request)
    if await db.promo_ips_usadas.count_documents({"ip": ip}) >= MAX_PROMO_POR_IP:
        raise HTTPException(400, "Ya se usó un código de prueba desde esta conexión")

    user = await get_current_user(request)
    telefono = None
    if user:
        user_id, nombre, email = user.user_id, user.name, user.email
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "promo_redimidos": 1}) or {}
    else:
        nombre = (body.get("nombre") or "").strip()[:120]
        email = (body.get("email") or "").strip().lower()
        telefono = "".join(c for c in (body.get("telefono") or "") if c.isdigit())
        if not nombre or "@" not in email:
            raise HTTPException(400, "Nombre y correo son requeridos")
        if len(telefono) < 10:
            raise HTTPException(400, "Teléfono a 10 dígitos requerido")
        if await db.promo_telefonos_usados.find_one({"telefono": telefono}):
            raise HTTPException(400, "Ya se usó un código de prueba con este teléfono")
        nuevo = await crear_usuario_investor_publico(response, nombre, email, telefono)
        user_id = nuevo["user_id"]
        user_doc = {}

    if user_doc.get("promo_redimidos"):
        raise HTTPException(400, "Ya usaste un código de prueba antes")

    dias_vigencia_credito = int(promo.get("dias_vigencia_credito") or 0)
    expira_credito = (
        (datetime.now(timezone.utc) + timedelta(days=dias_vigencia_credito)).isoformat()
        if dias_vigencia_credito > 0 else None
    )
    await otorgar_credito(
        db, user_id, promo["creditos"],
        origen="promo_trial", expira_en=expira_credito, uso=promo.get("uso", "flipping"),
    )
    await db.users.update_one({"user_id": user_id}, {"$addToSet": {"promo_redimidos": code}})
    await db.promo_codes.update_one({"code": code}, {"$inc": {"usados": 1}})
    await db.promo_ips_usadas.insert_one({
        "ip": ip, "user_id": user_id, "code": code,
        "usado_en": datetime.now(timezone.utc).isoformat(),
    })
    if telefono:
        await db.promo_telefonos_usados.insert_one({
            "telefono": telefono, "user_id": user_id, "code": code,
            "usado_en": datetime.now(timezone.utc).isoformat(),
        })
    response.set_cookie(
        key="pv_promo", value="1",
        httponly=True, secure=True, samesite="none",
        path="/", max_age=365 * 24 * 60 * 60,
    )

    return {"ok": True, "creditos": promo["creditos"]}


@router.get("/admin/creditos/promo")
async def admin_listar_promo(request: Request):
    await require_admin(request)
    codigos = await db.promo_codes.find({}, {"_id": 0}).sort("creado_en", -1).to_list(200)
    return {"codigos": codigos}


@router.post("/admin/creditos/promo")
async def admin_crear_promo(request: Request):
    admin = await require_admin(request)
    body = await request.json()
    code = (body.get("code") or "").strip().upper()
    creditos = int(body.get("creditos") or 0)
    if not code or creditos <= 0:
        raise HTTPException(400, "Código y créditos (>0) son requeridos")
    if await db.promo_codes.find_one({"code": code}):
        raise HTTPException(400, "Ese código ya existe")

    ahora = datetime.now(timezone.utc)
    dias_codigo = int(body.get("dias_vigencia_codigo") or 0)

    await db.promo_codes.insert_one({
        "code": code,
        "creditos": creditos,
        "uso": body.get("uso", "flipping"),
        "max_usos": int(body.get("max_usos") or 100),
        "usados": 0,
        "activo": True,
        # Vigencia del código: hasta cuándo se puede canjear (None = sin límite).
        "expira_en": (ahora + timedelta(days=dias_codigo)).isoformat() if dias_codigo > 0 else None,
        # Vigencia del crédito UNA VEZ canjeado, en días desde el canje (no desde la creación
        # del código — cada quien que canjee tiene su propia ventana, ver canjear_promo).
        # None/0 = el crédito no vence.
        "dias_vigencia_credito": int(body.get("dias_vigencia_credito") or 0),
        "creado_en": ahora.isoformat(),
        "creado_por": admin.get("email", "admin"),
    })
    return {"ok": True}


@router.post("/admin/creditos/promo/{code}/desactivar")
async def admin_desactivar_promo(code: str, request: Request):
    await require_admin(request)
    result = await db.promo_codes.update_one({"code": code.upper()}, {"$set": {"activo": False}})
    if result.matched_count == 0:
        raise HTTPException(404, "Código no encontrado")
    return {"ok": True}


# Campos editables después de creado — vigencias y topes, no el código en sí
# (cambiar `code` rompería enlaces ya repartidos) ni `creditos`/`uso` de canjes
# ya hechos (esos ya se otorgaron con el valor de ese momento, sin retroactividad).
CAMPOS_EDITABLES_PROMO = {"creditos", "uso", "max_usos", "dias_vigencia_codigo", "dias_vigencia_credito"}


@router.post("/admin/creditos/promo/{code}/editar")
async def admin_editar_promo(code: str, request: Request):
    await require_admin(request)
    body = await request.json()
    cambios = {k: v for k, v in body.items() if k in CAMPOS_EDITABLES_PROMO and v is not None}
    if not cambios:
        raise HTTPException(400, "Nada que editar")

    if "creditos" in cambios:
        cambios["creditos"] = int(cambios["creditos"])
    if "max_usos" in cambios:
        cambios["max_usos"] = int(cambios["max_usos"])
    if "dias_vigencia_credito" in cambios:
        cambios["dias_vigencia_credito"] = int(cambios["dias_vigencia_credito"])
    if "dias_vigencia_codigo" in cambios:
        dias = int(cambios.pop("dias_vigencia_codigo"))
        cambios["expira_en"] = (
            (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat() if dias > 0 else None
        )

    result = await db.promo_codes.update_one({"code": code.upper()}, {"$set": cambios})
    if result.matched_count == 0:
        raise HTTPException(404, "Código no encontrado")
    return {"ok": True}
