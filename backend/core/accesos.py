"""Helpers de accesos autorizados (cortesía / pruebas). Compartidos entre el
router de accesos y el consumo de cupo en la generación de reporte."""
from datetime import datetime, timezone

ACCESO_CATEGORIAS = {"interno", "valuador", "inmobiliaria"}
ACCESO_MODALIDADES = {"solo_valuacion", "con_valuador", "con_visita"}


def _acceso_estado(doc: dict) -> str:
    """inactivo | expirado | agotado | activo (en ese orden de prioridad)."""
    if not doc.get("activo", True):
        return "inactivo"
    exp = doc.get("fecha_expiracion")
    if exp:
        try:
            fecha = datetime.fromisoformat(str(exp))
            if fecha.tzinfo is None:
                fecha = fecha.replace(tzinfo=timezone.utc)
            if fecha < datetime.now(timezone.utc):
                return "expirado"
        except (ValueError, TypeError):
            pass
    if not doc.get("acceso_total"):
        if doc.get("usados", 0) >= doc.get("avaluos_gratis", 0):
            return "agotado"
    return "activo"


def _acceso_publico(doc: dict) -> dict:
    """Forma resumida para el frontend de checkout."""
    estado = _acceso_estado(doc)
    restantes = None
    if not doc.get("acceso_total"):
        restantes = max(0, int(doc.get("avaluos_gratis", 0)) - int(doc.get("usados", 0)))
    return {
        "autorizado": estado == "activo",
        "estado": estado,
        "categoria": doc.get("categoria"),
        "modalidad": doc.get("modalidad"),
        "acceso_total": bool(doc.get("acceso_total")),
        "avaluos_gratis": doc.get("avaluos_gratis", 0),
        "usados": doc.get("usados", 0),
        "restantes": restantes,
        "expira": doc.get("fecha_expiracion"),
        "nota": doc.get("nota"),
    }
