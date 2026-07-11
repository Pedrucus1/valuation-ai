"""Auth y sesión: OAuth Emergent, registro/login propio, perfil, billing."""
import uuid
from datetime import datetime, timezone, timedelta
import httpx

from fastapi import APIRouter, Request, Response, HTTPException
import jwt
import os

from core.db import db
from core.auth import get_current_user, require_auth, pwd_context
from core.ratelimit import limiter
from core.email import send_email
from models import RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest

router = APIRouter(prefix="/api")

# Secreto para firmar el JWT de recuperación (idealmente en .env)
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-propvalu-reset-12345")
JWT_ALGORITHM = "HS256"


@router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requerido")
    
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Session inválida")
    
    auth_data = auth_response.json()
    
    existing_user = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "public",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    # Token también en el body: el frontend lo guarda y lo manda como Bearer.
    # Necesario porque la cookie cross-dominio (Vercel↔Railway) la bloquean los
    # navegadores; el Bearer no depende de cookies y funciona en todos.
    user_doc["session_token"] = session_token
    return user_doc

@router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user.model_dump()

@router.put("/auth/profile")
async def update_profile(request: Request):
    user = await require_auth(request)
    body = await request.json()
    allowed = {
        "name", "phone", "estado", "municipio", "municipios",
        "profesion_base", "profesion_base_otro", "num_cedula_base", "num_cedula_valuador",
        "q_web_perfil",
        "q_experiencia", "q_equipo", "q_oficina", "q_dir_oficina", "q_maps_url",
        "q_tiempo_entrega", "q_seguro_rc", "q_unidad_valuacion",
        "q_software", "q_idiomas",
        "services", "servicios_otros", "peritajes_tipos", "peritajes_otros",
        "redes_sociales", "galardones", "asociacion", "cursos",
        "q_anos_mercado", "q_tipo_operaciones", "q_cartera_propiedades", "q_crm",
    }
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="Sin campos válidos para actualizar")
    await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "hashed_password": 0})
    return updated

@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Sesión cerrada"}

@router.post("/auth/upgrade-role")
async def upgrade_role(request: Request):
    user = await require_auth(request)
    # Ya es valuador: no-op (no reseteamos su KYC).
    if user.role == "appraiser":
        return {"message": "Ya eres valuador", "role": "appraiser"}
    # Solo public -> appraiser (auto-alta). Un realtor/super_admin NO cambia rol
    # por aquí. Arranca con KYC pendiente: ser appraiser no da privilegios reales
    # hasta que admin ratifique el KYC.
    if user.role != "public":
        raise HTTPException(status_code=403, detail="Tu cuenta no puede cambiar de rol por esta vía")
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "appraiser", "kyc_status": "pending"}}
    )
    return {"message": "Rol actualizado a valuador", "role": "appraiser"}

@router.get("/auth/billing-summary")
async def billing_summary(request: Request):
    user = await require_auth(request)
    now = datetime.now(timezone.utc)

    # Día del corte = día del mes en que se registró (1-28)
    cycle_day = min(user.created_at.day, 28)

    # Próxima fecha de corte
    year, month = now.year, now.month
    if now.day >= cycle_day:
        month += 1
        if month > 12:
            month = 1
            year += 1
    try:
        next_cutoff = datetime(year, month, cycle_day, tzinfo=timezone.utc)
    except ValueError:
        import calendar
        last = calendar.monthrange(year, month)[1]
        next_cutoff = datetime(year, month, last, tzinfo=timezone.utc)

    days_to_cutoff = (next_cutoff.date() - now.date()).days

    # Inicio del ciclo actual
    if now.day >= cycle_day:
        cy, cm = now.year, now.month
    else:
        cm = now.month - 1
        cy = now.year
        if cm == 0:
            cm = 12
            cy -= 1
    try:
        cycle_start = datetime(cy, cm, cycle_day, tzinfo=timezone.utc)
    except ValueError:
        import calendar
        last = calendar.monthrange(cy, cm)[1]
        cycle_start = datetime(cy, cm, last, tzinfo=timezone.utc)

    # Ganancias del ciclo actual desde colección encargos
    encargos_ciclo = await db["encargos"].find({
        "valuador_id": user.user_id,
        "fecha_completado": {"$gte": cycle_start.isoformat()},
    }).to_list(500)
    earnings = sum(e.get("comision_valuador", 0) for e in encargos_ciclo if e.get("pago_realizado"))
    pending_earnings = sum(e.get("comision_valuador", 0) for e in encargos_ciclo if not e.get("pago_realizado"))

    # Costo del plan
    PLAN_COSTS = {
        "starter": 1200, "pro": 3000, "premium": 6500,
        "inmobiliaria_lite5": 1400, "inmobiliaria_lite10": 2700,
        "inmobiliaria_pro20": 5200, "inmobiliaria_premier": 7500,
    }
    plan_cost = PLAN_COSTS.get(user.plan or "", 0)
    balance = earnings - plan_cost  # negativo = debe pagar diferencia

    return {
        "cycle_day": cycle_day,
        "next_cutoff": next_cutoff.date().isoformat(),
        "days_to_cutoff": days_to_cutoff,
        "cycle_start": cycle_start.date().isoformat(),
        "earnings_this_cycle": earnings,
        "pending_earnings": pending_earnings,
        "plan_cost": plan_cost,
        "balance": earnings - plan_cost,
        "billing_preference": user.billing_preference or "ask_monthly",
        "billing_status": user.billing_status or "active",
    }

@router.put("/auth/billing-preference")
async def update_billing_preference(request: Request):
    user = await require_auth(request)
    body = await request.json()
    pref = body.get("billing_preference")
    if pref not in ("auto", "manual", "ask_monthly"):
        raise HTTPException(status_code=400, detail="Preferencia inválida")
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"billing_preference": pref}}
    )
    return {"billing_preference": pref}

@router.put("/auth/plan")
async def update_plan(request: Request):
    user = await require_auth(request)
    body = await request.json()
    plan = body.get("plan")
    credits = body.get("credits", 0)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan requerido")
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"plan": plan, "credits": credits}}
    )
    return {"plan": plan, "credits": credits}

@router.post("/auth/register")
@limiter.limit("10/minute")
async def register_email(request: Request, data: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    if data.role not in ("appraiser", "realtor"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = pwd_context.hash(data.password)

    new_user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "picture": None,
        "role": data.role,
        "phone": data.phone,
        "company_name": data.company_name,
        "estado": data.estado,
        "municipio": data.municipio,
        "municipios": data.municipios,
        "modo_perfil": data.modo_perfil,
        "services": data.services,
        "servicios_otros": data.servicios_otros,
        "peritajes_tipos": data.peritajes_tipos,
        "peritajes_otros": data.peritajes_otros,
        # Cuestionario perfil completo
        "q_experiencia": data.q_experiencia,
        "q_equipo": data.q_equipo,
        "q_oficina": data.q_oficina,
        "q_dir_oficina": data.q_dir_oficina,
        "q_maps_url": data.q_maps_url,
        "q_tiempo_entrega": data.q_tiempo_entrega,
        "q_seguro_rc": data.q_seguro_rc,
        "q_unidad_valuacion": data.q_unidad_valuacion,
        "q_software": data.q_software,
        "q_idiomas": data.q_idiomas,
        "profesion_base": data.profesion_base,
        "profesion_base_otro": data.profesion_base_otro,
        "num_cedula_base": data.num_cedula_base,
        "num_cedula_valuador": data.num_cedula_valuador,
        # Inmobiliaria
        "inmobiliaria_tipo": data.inmobiliaria_tipo,
        "asociacion": data.asociacion,
        "cursos": data.cursos,
        "num_asesores": data.num_asesores,
        "empresa_afiliada": data.empresa_afiliada,
        "q_anos_mercado": data.q_anos_mercado,
        "q_tipo_operaciones": data.q_tipo_operaciones,
        "q_cartera_propiedades": data.q_cartera_propiedades,
        "q_crm": data.q_crm,
        "verificacion_pendiente": data.verificacion_pendiente,
        "estados": data.estados,
        "cobertura_municipios": data.cobertura_municipios,
        "redes_sociales": data.redes_sociales,
        "galardones": data.galardones,
        "hashed_password": hashed_pw,
        "kyc_status": "pending",
        "credits": 0,
        "plan": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)

    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    user_out = {k: v for k, v in new_user.items() if k not in ("hashed_password", "_id")}
    return user_out

@router.post("/auth/login")
@limiter.limit("10/minute")
async def login_email(request: Request, data: LoginRequest, response: Response):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    hashed = user_doc.get("hashed_password", "")
    if not hashed or not pwd_context.verify(data.password, hashed):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    user_id = user_doc["user_id"]
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    user_out = {k: v for k, v in user_doc.items() if k not in ("hashed_password",)}
    return user_out


@router.post("/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        # El usuario pidió que reportemos si el correo no existe en lugar de simular éxito
        raise HTTPException(status_code=404, detail="Este correo no está registrado en el sistema")

    # Generar Token JWT válido por 15 minutos
    expiration = datetime.now(timezone.utc) + timedelta(minutes=15)
    token_data = {
        "sub": user_doc["user_id"],
        "email": user_doc["email"],
        "exp": expiration,
        "type": "reset_password"
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Construir enlace de recuperación
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    # Crear correo en texto plano y HTML básico
    subject = "Recuperación de Contraseña - PropValu"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1B4332;">PropValu</h2>
        <p>Hola {user_doc.get('name', 'usuario')},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace expirará en 15 minutos por tu seguridad:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #52B788; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer mi contraseña</a>
        </div>
        <p style="font-size: 14px; color: #666;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="font-size: 12px; color: #666; word-break: break-all;">{reset_link}</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      </body>
    </html>
    """

    # Enviar correo (en background para no bloquear la respuesta HTTP)
    try:
        send_email([data.email], subject, html_content)
    except Exception as e:
        print(f"Error enviando email: {e}")
        raise HTTPException(status_code=500, detail="Error enviando el correo de recuperación")

    return {"message": "Correo de recuperación enviado exitosamente"}


@router.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest):
    # Validar el token
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=400, detail="Token inválido")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Token corrupto")
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace de recuperación ha expirado. Por favor solicita uno nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="El enlace de recuperación no es válido.")

    # Buscar usuario
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Hashear nueva contraseña
    hashed_pw = pwd_context.hash(data.new_password)
    
    # Actualizar en BD y cerrar todas sus sesiones activas por seguridad
    await db.users.update_one({"user_id": user_id}, {"$set": {"hashed_password": hashed_pw}})
    await db.user_sessions.delete_many({"user_id": user_id})

    return {"message": "Contraseña actualizada exitosamente"}
