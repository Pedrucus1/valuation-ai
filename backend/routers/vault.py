"""Bóveda de respaldo (#185): solicitud + "pago" ficticio + recuperación de un avalúo público.

Sin Stripe real (bloqueado por N3/N4 — falta SAPI constituida): el "pago" es simulado, mismo
patrón que ya usa el resto de la app (ValuationForm.jsx, ProCheckoutPage.jsx) — no se mueve
dinero real, solo se marca la solicitud como pagada. El envío de correo es best-effort — si
SMTP no está configurado, solo se loggea, nunca rompe la solicitud.
"""
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request

from core.auth import require_admin
from core.db import db
from core.email import send_email
from core.ratelimit import limiter
from models import VaultRequest, VaultRequestIn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# meses -> precio MXN. 0 = plan gratis (gancho, no pasa por el paso de "pago").
PLANES_BOVEDA = {3: 0, 12: 50, 36: 110, 60: 150, 120: 195}

# Precio placeholder — pagar UN avalúo suelto sin comprar un plan de respaldo completo.
# No expira (igual que el plan de 10 años), pero sin recordatorios ni el resto del servicio
# de bóveda — por eso va por debajo de PLANES_BOVEDA[120]=$195, no por encima.
PRECIO_DESCARGA_SUELTA = 79

DIAS_AVISO_PRE_EXPIRACION = 30


def _label_plan(meses: int) -> str:
    if meses < 12:
        return f"{meses} meses"
    anios = meses // 12
    return "1 año" if anios == 1 else f"{anios} años"


@router.post("/valuations/{valuation_id}/vault-request")
async def crear_solicitud_boveda(valuation_id: str, body: VaultRequestIn, request: Request):
    tipo = body.tipo if body.tipo in ("plan", "descarga_suelta") else "plan"
    if tipo == "plan":
        if body.plan_meses not in PLANES_BOVEDA:
            raise HTTPException(400, f"Plan inválido. Opciones: {sorted(PLANES_BOVEDA)} meses")
        monto = PLANES_BOVEDA[body.plan_meses]  # server-side, nunca confiar en el del cliente
    else:
        monto = PRECIO_DESCARGA_SUELTA
    if not body.acepta_terminos:
        raise HTTPException(400, "Debes aceptar los términos para continuar")

    valuation = await db["valuations"].find_one({"valuation_id": valuation_id}, {"_id": 0, "valuation_id": 1})
    if not valuation:
        raise HTTPException(404, "Avalúo no encontrado")

    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Correo inválido")

    vault_req = VaultRequest(
        valuation_id=valuation_id,
        nombre=(body.nombre or "").strip()[:120],
        email=email,
        tipo=tipo,
        plan_meses=body.plan_meses if tipo == "plan" else 0,
        monto=monto,
        acepta_terminos_en=datetime.now(timezone.utc),
    )
    await db["vault_requests"].insert_one(vault_req.model_dump())

    return {"ok": True, "vault_request_id": vault_req.vault_request_id, "monto": monto}


@router.post("/vault-requests/{vault_request_id}/confirmar-pago")
async def confirmar_pago_boveda(vault_request_id: str):
    """Marca la solicitud como pagada. Gratis o pagado, el flujo es el mismo desde aquí —
    el frontend ya hizo (o se saltó, si es gratis) el paso de checkout simulado antes de llamar."""
    vault_req = await db["vault_requests"].find_one({"vault_request_id": vault_request_id})
    if not vault_req:
        raise HTTPException(404, "Solicitud no encontrada")
    if vault_req["estado"] == "pagado":
        return {"ok": True, "expira_en": vault_req.get("expira_en")}

    es_suelta = vault_req.get("tipo") == "descarga_suelta"
    # Descarga suelta: pagaste ESE avalúo, no una suscripción — no vence, sin recordatorios.
    expira_en = None if es_suelta else datetime.now(timezone.utc) + timedelta(days=vault_req["plan_meses"] * 30)
    await db["vault_requests"].update_one(
        {"vault_request_id": vault_request_id},
        {"$set": {"estado": "pagado", "expira_en": expira_en}},
    )

    try:
        saludo = f"Hola {vault_req['nombre']}," if vault_req.get("nombre") else "Hola,"
        if es_suelta:
            cuerpo_plan = "<p>Ya tienes acceso permanente a este avalúo — no vence.</p>"
        else:
            cuerpo_plan = (
                f"<p>Tu respaldo quedó activo por <strong>{_label_plan(vault_req['plan_meses'])}</strong>, "
                f"hasta el <strong>{expira_en.strftime('%d/%m/%Y')}</strong>.</p>"
                f"<p>Te recordaremos cada año y antes de que venza, para que nunca lo pierdas.</p>"
            )
        send_email(
            [vault_req["email"]],
            "Tu respaldo está activo — PropValu",
            f"<p>{saludo}</p>{cuerpo_plan}"
            f"<p>Para recuperarlo en cualquier momento, entra a propvalu.com/recuperar con este correo.</p>",
        )
    except Exception as e:
        logger.warning(f"confirmar-pago: no se pudo enviar confirmación a {vault_req['email']}: {e}")

    return {"ok": True, "expira_en": expira_en}


async def enviar_recordatorios_boveda():
    """Job del scheduler (server.py, gateado por ENABLE_SCHEDULER=1 — mismo patrón que
    scrape_mensual/sync_sheets). Corre diario: manda un recordatorio ANUAL (aniversario de
    fecha_solicitud) y uno PRE-EXPIRACIÓN (30 días antes de expira_en) por respaldo activo,
    sin duplicar (recordatorios_enviados). Best-effort — si SMTP no está configurado, solo
    loggea, no revienta el job."""
    hoy = datetime.now(timezone.utc).date()
    enviados = 0
    async for vr in db["vault_requests"].find({"estado": "pagado"}):
        claves_nuevas = []
        expira_en = vr.get("expira_en")
        fecha_solicitud = vr.get("fecha_solicitud")
        ya_enviados = set(vr.get("recordatorios_enviados") or [])
        saludo = f"Hola {vr['nombre']}," if vr.get("nombre") else "Hola,"

        # Pre-expiración: 30 días antes, una sola vez.
        if expira_en:
            dias_restantes = (expira_en.date() - hoy).days
            if 0 <= dias_restantes <= DIAS_AVISO_PRE_EXPIRACION and "pre_expiracion" not in ya_enviados:
                try:
                    send_email(
                        [vr["email"]],
                        "Tu respaldo está por vencer — PropValu",
                        f"<p>{saludo}</p>"
                        f"<p>Tu respaldo vence el <strong>{expira_en.strftime('%d/%m/%Y')}</strong> "
                        f"({dias_restantes} días). Renuévalo antes para no perder el acceso.</p>",
                    )
                except Exception as e:
                    logger.warning(f"recordatorio pre-expiración a {vr['email']}: {e}")
                claves_nuevas.append("pre_expiracion")

        # Anual: aniversario de fecha_solicitud, una vez por año calendario.
        if fecha_solicitud:
            anios_transcurridos = hoy.year - fecha_solicitud.date().year
            if anios_transcurridos >= 1:
                clave_anio = f"anual_{hoy.year}"
                aniversario_hoy = (hoy.month, hoy.day) == (fecha_solicitud.date().month, fecha_solicitud.date().day)
                if aniversario_hoy and clave_anio not in ya_enviados:
                    try:
                        send_email(
                            [vr["email"]],
                            "Recordatorio de tu respaldo — PropValu",
                            f"<p>{saludo}</p>"
                            f"<p>Han pasado {anios_transcurridos} año(s) desde que guardaste tu respaldo "
                            f"en PropValu. Sigue activo — entra a propvalu.com/recuperar con este correo "
                            f"cuando lo necesites.</p>",
                        )
                    except Exception as e:
                        logger.warning(f"recordatorio anual a {vr['email']}: {e}")
                    claves_nuevas.append(clave_anio)

        if claves_nuevas:
            await db["vault_requests"].update_one(
                {"vault_request_id": vr["vault_request_id"]},
                {"$addToSet": {"recordatorios_enviados": {"$each": claves_nuevas}}},
            )
            enviados += len(claves_nuevas)
    logger.info(f"[vault] recordatorios: {enviados} enviados")


@router.get("/vault/recuperar")
@limiter.limit("10/minute")
async def buscar_boveda(request: Request, email: str = ""):
    correo = (email or "").strip().lower()
    if not correo or "@" not in correo:
        raise HTTPException(400, "Correo inválido")

    reqs = await db["vault_requests"].find(
        {"email": correo, "estado": "pagado"}, {"_id": 0}
    ).to_list(50)
    if not reqs:
        return {"items": []}

    items = []
    for r in reqs:
        val = await db["valuations"].find_one(
            {"valuation_id": r["valuation_id"]},
            {"_id": 0, "property_data": 1},
        )
        prop = (val or {}).get("property_data", {})
        items.append({
            "valuation_id": r["valuation_id"],
            "municipio": prop.get("municipality"),
            "colonia": prop.get("neighborhood"),
            "direccion": prop.get("street_address"),
            "expira_en": r["expira_en"],
        })
    return {"items": items}


@router.get("/vault/recuperar/{valuation_id}")
@limiter.limit("10/minute")
async def recuperar_reporte(valuation_id: str, request: Request, email: str = ""):
    correo = (email or "").strip().lower()
    if not correo:
        raise HTTPException(400, "Correo requerido")

    # Nunca confiar en el valuation_id solo — revalidar dueño+pago antes de devolver el HTML.
    vault_req = await db["vault_requests"].find_one(
        {"valuation_id": valuation_id, "email": correo, "estado": "pagado"}
    )
    if not vault_req:
        raise HTTPException(404, "No encontramos un respaldo activo con ese correo para este avalúo")

    val = await db["valuations"].find_one({"valuation_id": valuation_id}, {"_id": 0, "report_html": 1})
    if not val or not val.get("report_html"):
        raise HTTPException(404, "El reporte ya no está disponible")

    return {"report_html": val["report_html"]}


@router.get("/admin/vault-requests")
async def admin_listar_boveda(request: Request, estado: str = ""):
    await require_admin(request)
    filtro = {"estado": estado} if estado else {}
    items = await db["vault_requests"].find(filtro, {"_id": 0}).sort("fecha_solicitud", -1).to_list(500)

    total_pagados = await db["vault_requests"].count_documents({"estado": "pagado"})
    ingresos = 0
    ingresos_suelta = 0
    async for vr in db["vault_requests"].find({"estado": "pagado"}, {"_id": 0, "monto": 1, "tipo": 1}):
        ingresos += vr.get("monto") or 0
        if vr.get("tipo") == "descarga_suelta":
            ingresos_suelta += vr.get("monto") or 0

    return {
        "items": items,
        "totales": {
            "pagados": total_pagados, "ingresos": ingresos, "total": len(items),
            "ingresos_descarga_suelta": ingresos_suelta,
        },
    }
