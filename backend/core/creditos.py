"""Ledger de créditos con expiración. Reemplaza el int plano `credits` como
fuente de verdad del saldo — mismo patrón de core/accesos.py (fecha ISO +
comparación tz-aware), sin cron en este stack: el saldo se calcula al vuelo
filtrando expirados en cada lectura (ver saldo_efectivo, usado en
core/auth.get_current_user para que /auth/me y toda sesión reflejen el saldo
real sin tocar cada endpoint que lee `user.credits`).

Dos orígenes, cada uno con su propia regla de vigencia (política confirmada
por el usuario, antes solo documentada en copy del frontend sin backend):
  - "gamificacion": 1 avalúo gratis cada META puntos de verificación de zona
    (routers/gamificacion.py). Vigencia: 3 meses calendario desde que se otorga.
  - "pago_mensual": créditos del plan pagado / asignado por admin. Vigencia:
    fin del mes en curso — NO ruedan al siguiente mes. Cada asignación
    REEMPLAZA la anterior de este origen (no se acumulan).

Migración: usuarios sin `creditos_ledger` (todos los existentes al desplegar
esto) no se tocan — su saldo sigue siendo el int legado `credits` tal cual,
sin fecha de expiración, hasta su PRÓXIMA asignación real (gamificación o
renovación de plan), momento en que empiezan a tener ledger y el int legado
deja de leerse. Decisión: no penalizar saldo actual de nadie con una
migración masiva; se cierra la brecha hacia adelante.
"""
from datetime import datetime, timezone


def _parse_fecha(fecha):
    if not fecha:
        return None
    dt = datetime.fromisoformat(str(fecha))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def saldo_efectivo(user_doc: dict) -> int:
    """Suma de créditos vigentes (no expirados) del ledger. Si el usuario aún
    no tiene `creditos_ledger` (pre-migración), cae al int legado `credits`."""
    ledger = user_doc.get("creditos_ledger")
    if ledger is None:
        return int(user_doc.get("credits") or 0)
    ahora = datetime.now(timezone.utc)
    total = 0
    for g in ledger:
        exp = _parse_fecha(g.get("expira_en"))
        if exp is None or exp >= ahora:
            total += int(g.get("monto", 0))
    return total


def _mas_meses(dt: datetime, n: int) -> datetime:
    mes = dt.month - 1 + n
    anio = dt.year + mes // 12
    mes = mes % 12 + 1
    return dt.replace(year=anio, month=mes)


def expira_en_meses(n: int = 3) -> str:
    """ISO del momento en que expira un crédito otorgado HOY, n meses calendario adelante."""
    return _mas_meses(datetime.now(timezone.utc), n).isoformat()


def fin_de_mes() -> str:
    """ISO de fin del mes en curso (medianoche del día 1 del mes siguiente, UTC)."""
    inicio_mes = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return _mas_meses(inicio_mes, 1).isoformat()


async def otorgar_credito(db, user_id: str, monto: int, origen: str, expira_en: str):
    """Agrega UNA entrada aditiva al ledger. Usado por gamificación (cada
    tramo de META puntos es un crédito nuevo, no reemplaza los anteriores)."""
    entrada = {
        "monto": monto,
        "otorgado_en": datetime.now(timezone.utc).isoformat(),
        "expira_en": expira_en,
        "origen": origen,
    }
    await db.users.update_one({"user_id": user_id}, {"$push": {"creditos_ledger": entrada}})


async def establecer_creditos_mensuales(db, user_id: str, monto: int):
    """Fija el crédito del plan/pago mensual: REEMPLAZA cualquier entrada
    previa de origen 'pago_mensual' (no se acumulan) y expira al fin del mes
    en curso. Refresca también el int legado `credits` (solo compat/lectura
    directa en Mongo; el saldo real lo da saldo_efectivo)."""
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "creditos_ledger": 1})
    ledger = [g for g in (user_doc or {}).get("creditos_ledger") or [] if g.get("origen") != "pago_mensual"]
    if monto:
        ledger.append({
            "monto": monto,
            "otorgado_en": datetime.now(timezone.utc).isoformat(),
            "expira_en": fin_de_mes(),
            "origen": "pago_mensual",
        })
    await db.users.update_one({"user_id": user_id}, {"$set": {"creditos_ledger": ledger, "credits": monto}})
