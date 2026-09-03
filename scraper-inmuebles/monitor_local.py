"""
monitor_local.py — Rutina local de monitoreo del sistema de scraping.

Corre cada 10 minutos via Windows Task Scheduler.
Lee scraper_diagnostics de MongoDB y aplica fixes que solo se pueden
hacer localmente (levantar Chrome CDP, detectar scheduler colgado, etc.)

Uso manual:
    python monitor_local.py
"""

import os
import sys
import socket
import subprocess
import time
import traceback
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger

load_dotenv(Path(__file__).parent / ".env")

LOG_FILE = Path(__file__).parent / "logs" / "monitor_local.log"
LOG_FILE.parent.mkdir(exist_ok=True)

logger.remove()
if sys.stdout is not None:
    logger.add(sys.stdout, format="{time:HH:mm:ss} | {level} | {message}", level="INFO")
logger.add(LOG_FILE, rotation="5 MB", retention=5, level="DEBUG",
           format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")

# ─────────────────────────────────────────
# MongoDB
# ─────────────────────────────────────────

def _get_col(nombre: str):
    from pymongo import MongoClient
    client = MongoClient(os.getenv("MONGO_URL"), serverSelectionTimeoutMS=5000)
    return client[os.getenv("DB_NAME", "propvalu")][nombre]


def _marcar_resuelto(col, doc_id, fix_aplicado: str):
    col.update_one(
        {"_id": doc_id},
        {"$set": {"resuelto": True, "fix_aplicado": fix_aplicado,
                  "resuelto_por": "monitor_local", "resuelto_at": datetime.now().isoformat()}}
    )


def _agregar_nota(col, doc_id, nota: str):
    col.update_one(
        {"_id": doc_id},
        {"$set": {"nota_orquestador": nota, "nota_at": datetime.now().isoformat()}}
    )


def _insertar_diagnostico(col, portal: str, tipo_error: str, detalle: str):
    """Inserta un nuevo diagnóstico si no existe uno igual reciente (última hora)."""
    hace_1h = (datetime.now() - timedelta(hours=1)).isoformat()
    existe = col.find_one({
        "portal": portal, "tipo_error": tipo_error,
        "resuelto": False, "timestamp": {"$gte": hace_1h}
    })
    if not existe:
        col.insert_one({
            "portal": portal,
            "tipo_error": tipo_error,
            "resuelto": False,
            "requiere_intervencion": True,
            "detalle": detalle,
            "accion_tomada": "ninguna",
            "fix_aplicado": "",
            "resuelto_por": "",
            "timestamp": datetime.now().isoformat(),
        })
        logger.warning(f"[NUEVO DIAGNÓSTICO] {portal} — {tipo_error}: {detalle}")


# ─────────────────────────────────────────
# Chrome CDP helpers
# ─────────────────────────────────────────

# ─────────────────────────────────────────
# Notificaciones Windows
# ─────────────────────────────────────────

def _notificar_windows(titulo: str, mensaje: str):
    """Balloon tip via PowerShell WinForms — sin ventana visible."""
    titulo_ps = titulo.replace("'", "''")
    mensaje_ps = mensaje.replace("'", "''").replace("\n", " | ")
    ps_script = (
        f"Add-Type -AssemblyName System.Windows.Forms; "
        f"$n = New-Object System.Windows.Forms.NotifyIcon; "
        f"$n.Icon = [System.Drawing.SystemIcons]::Warning; "
        f"$n.Visible = $true; "
        f"$n.ShowBalloonTip(8000, '{titulo_ps}', '{mensaje_ps}', "
        f"[System.Windows.Forms.ToolTipIcon]::Warning); "
        f"Start-Sleep -Seconds 9; $n.Dispose()"
    )
    try:
        subprocess.Popen(
            ["powershell", "-WindowStyle", "Hidden", "-NonInteractive", "-Command", ps_script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=0x08000000,  # CREATE_NO_WINDOW
        )
        logger.info(f"[NOTIF] {titulo}")
    except Exception as e:
        logger.debug(f"Notificación Windows falló: {e}")


CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

CDP_CONFIG = {
    "PROPIEDADES_COM": {
        "puerto": 9222,
        "user_data_dir": r"C:\Users\pedru\chrome-debug-temp",
    },
    "INMUEBLES24": {
        "puerto": 9223,
        "user_data_dir": r"C:\Users\pedru\chrome-debug-i24",
    },
}


def _cdp_vivo(puerto: int) -> bool:
    try:
        s = socket.create_connection(("127.0.0.1", puerto), timeout=1)
        s.close()
        return True
    except OSError:
        return False


def _levantar_chrome(portal: str) -> bool:
    """Levanta Chrome CDP para el portal indicado. Retorna True si quedó activo."""
    cfg = CDP_CONFIG.get(portal)
    if not cfg:
        logger.warning(f"No hay config CDP para portal {portal}")
        return False

    puerto = cfg["puerto"]
    if _cdp_vivo(puerto):
        logger.info(f"Chrome CDP ya activo en puerto {puerto} ({portal})")
        return True

    if not Path(CHROME_EXE).exists():
        logger.error(f"Chrome no encontrado en {CHROME_EXE}")
        return False

    logger.info(f"Levantando Chrome CDP en puerto {puerto} para {portal}...")
    subprocess.Popen(
        [
            CHROME_EXE,
            f"--remote-debugging-port={puerto}",
            f"--user-data-dir={cfg['user_data_dir']}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-http2",
            "--disable-quic",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(10):
        time.sleep(1)
        if _cdp_vivo(puerto):
            logger.info(f"Chrome CDP listo en puerto {puerto} ({portal})")
            return True

    logger.error(f"Chrome CDP no levantó en puerto {puerto} ({portal})")
    return False


# ─────────────────────────────────────────
# Handlers por tipo de error
# ─────────────────────────────────────────

def handle_cloudflare_blocked(col, doc):
    portal = doc.get("portal", "")
    cfg = CDP_CONFIG.get(portal)
    if not cfg:
        _agregar_nota(col, doc["_id"], f"Portal {portal} no tiene config CDP local. Revisar manualmente.")
        return

    ok = _levantar_chrome(portal)
    if ok:
        _marcar_resuelto(col, doc["_id"],
                         f"Chrome CDP levantado en puerto {cfg['puerto']} por monitor_local")
        logger.info(f"[OK] {portal} cloudflare_blocked → Chrome CDP activo en {cfg['puerto']}")
    else:
        _agregar_nota(col, doc["_id"],
                      f"No se pudo levantar Chrome CDP en puerto {cfg['puerto']}. "
                      "Verificar que Chrome esté instalado o levantar manualmente.")


def handle_scheduler_colgado(col, doc):
    portal = doc.get("portal", "SISTEMA")
    # Revisar heartbeat para ver cuánto lleva sin latir
    try:
        hb_col = _get_col("scraper_heartbeat")
        ultimo = hb_col.find_one({"portal": portal}, sort=[("timestamp", -1)])
        if ultimo:
            ts = ultimo.get("timestamp", "")
            nota = (f"Último heartbeat de {portal}: {ts}. "
                    "Reiniciar scheduler manualmente: "
                    f"python scheduler.py --portal {portal} --pausa-min 1 --pausa-max 3")
        else:
            nota = f"Sin heartbeat registrado para {portal}. Scheduler nunca inició o colección vacía."
        _agregar_nota(col, doc["_id"], nota)
        logger.warning(f"[NOTA] {portal} scheduler_colgado — {nota}")
    except Exception as e:
        _agregar_nota(col, doc["_id"], f"Error revisando heartbeat: {e}")


def handle_buffer_atascado(col, doc):
    portal = doc.get("portal", "")
    nota = (f"Buffer atascado en {portal}. Revisar que scheduler.py esté corriendo. "
            "Comando: python scheduler.py --portal {portal} --pausa-min 1 --pausa-max 3")
    _agregar_nota(col, doc["_id"], nota)
    logger.warning(f"[NOTA] {portal} buffer_atascado — scheduler posiblemente detenido")


def handle_sheets_caida(col, doc):
    portal = doc.get("portal", "")
    nota = (f"5+ tareas pendientes de subir a Sheets en {portal}. "
            "Google Sheets API puede estar con rate limit o el scheduler detenido.")
    _agregar_nota(col, doc["_id"], nota)
    logger.warning(f"[NOTA] {portal} sheets_caida — {nota}")


def handle_proxy_fallando(col, doc):
    proxy_url = os.getenv("PROXY_URL", "")
    if not proxy_url:
        nota = "PROXY_URL no está configurado en .env. Agregar credenciales de IPRoyal."
    else:
        nota = f"Proxy configurado: {proxy_url[:40]}... Verificar créditos/sesión en geo.iproyal.com"
    _agregar_nota(col, doc["_id"], nota)
    logger.warning(f"[NOTA] proxy_fallando — {nota}")


def handle_bloqueo_duro(col, doc):
    portal = doc.get("portal", "")
    proxy_url = os.getenv("PROXY_URL", "")
    # Si no hay proxy, intentar levantar Chrome como alternativa
    if not proxy_url:
        ok = _levantar_chrome(portal)
        if ok:
            _marcar_resuelto(col, doc["_id"],
                             f"Chrome CDP levantado como alternativa al proxy en {portal}")
            return
        nota = "Sin proxy en .env y Chrome CDP no disponible. Agregar PROXY_URL o instalar Chrome."
    else:
        nota = (f"Proxy configurado pero bloqueo duro en {portal}. "
                "Posible IP bloqueada permanentemente. Considerar rotar sesión en IPRoyal.")
    _agregar_nota(col, doc["_id"], nota)
    logger.warning(f"[NOTA] {portal} bloqueo_duro — {nota}")


def handle_timeout(col, doc):
    portal = doc.get("portal", "")
    # Para portales Playwright: intentar levantar Chrome CDP como fix
    if portal in CDP_CONFIG:
        ok = _levantar_chrome(portal)
        if ok:
            _marcar_resuelto(col, doc["_id"],
                             f"Chrome CDP levantado en puerto {CDP_CONFIG[portal]['puerto']} tras timeout")
            return
    _agregar_nota(col, doc["_id"],
                  f"Timeout en {portal}. Chrome CDP no disponible o portal con rate-limit. "
                  "El orquestador remoto revisará el patrón.")


def handle_http_error(col, doc):
    portal = doc.get("portal", "")
    detalle = doc.get("detalle", "")
    if "403" in detalle or "429" in detalle:
        handle_bloqueo_duro(col, doc)
    else:
        _agregar_nota(col, doc["_id"],
                      f"Error HTTP en {portal}: {detalle}. Revisar si la URL cambió.")


HANDLERS = {
    "cloudflare_blocked": handle_cloudflare_blocked,
    "timeout":            handle_timeout,
    "http_403":           handle_http_error,
    "http_429":           handle_http_error,
    "http_4xx":           handle_http_error,
    "error":              handle_http_error,
    "scheduler_colgado":  handle_scheduler_colgado,
    "buffer_atascado":    handle_buffer_atascado,
    "sheets_caida":       handle_sheets_caida,
    "proxy_fallando":     handle_proxy_fallando,
    "bloqueo_duro":       handle_bloqueo_duro,
    "bloqueo_suave":      lambda col, doc: _agregar_nota(
        col, doc["_id"],
        "Bloqueo suave detectado localmente. El orquestador remoto revisará los selectores del scraper."
    ),
    "errores_consecutivos": lambda col, doc: _agregar_nota(
        col, doc["_id"],
        "Errores consecutivos detectados. El orquestador remoto revisará el patrón de error."
    ),
}


# ─────────────────────────────────────────
# Paso 2: detectar enricher colgado + auto-restart
# ─────────────────────────────────────────

PORTALES_ENRICHER = [
    "PROPIEDADES_COM", "CASAS_Y_TERRENOS", "INMUEBLES24",
    "PINCALI", "VIVANUNCIOS", "MITULA", "NOCNOK",
]
# Debe estar SINCRONIZADO con la query `falta` del enricher (enricher.py obtener_props_mongo).
# Si falta un campo aquí, el monitor sub-cuenta pendientes y cree que el enricher "terminó"
# cuando en realidad quedó trabajo → no lo reinicia. (Bug 30-jun: faltaba `precio` → 3,279
# comps de venta de PROPIEDADES_COM sin precio nunca se recuperaron porque el monitor no los veía.)
_FALTA_Q = {"$or": [
    {"anio_construccion": {"$exists": False}},
    {"anio_construccion": None},
    {"m2_construccion": {"$in": [None, ""]}},
    {"m2_terreno": {"$in": [None, ""]}},
    {"colonia": {"$in": [None, ""]}},
    {"precio": {"$in": [0, 0.0]}},
]}

# Directorio del enricher (carpeta principal, no esta carpeta antigua)
_ENRICHER_DIR = Path(r"C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\scraper-inmuebles")
_PYTHON = Path(r"C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe")

# Log por portal: _enr_{portal}.log en el directorio del enricher
def _log_path(portal: str) -> Path:
    return _ENRICHER_DIR / f"_enr_{portal.lower()}.log"

def _err_log_path(portal: str) -> Path:
    return _ENRICHER_DIR / f"_enr_{portal.lower()}_err.log"


def _pid_enricher(portal: str) -> int | None:
    """Devuelve el PID del proceso enricher para el portal, o None si no corre."""
    try:
        result = subprocess.run(
            ["powershell", "-NonInteractive", "-Command",
             f"Get-WmiObject Win32_Process | Where-Object {{$_.CommandLine -like '*enricher*--tab*{portal}*'}} | Select-Object -ExpandProperty ProcessId"],
            capture_output=True, text=True, timeout=10,
            creationflags=0x08000000,  # CREATE_NO_WINDOW — no abrir ventana de PowerShell en pantalla
        )
        pid_str = result.stdout.strip()
        return int(pid_str) if pid_str.isdigit() else None
    except Exception:
        return None


def _matar_enricher(portal: str):
    pid = _pid_enricher(portal)
    if pid:
        try:
            subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                           capture_output=True, timeout=10,
                           creationflags=0x08000000)  # CREATE_NO_WINDOW — sin ventana en pantalla
            logger.info(f"[RESTART] {portal} — proceso PID {pid} terminado")
        except Exception as e:
            logger.warning(f"[RESTART] No se pudo matar PID {pid}: {e}")


def _reiniciar_enricher(portal: str) -> bool:
    """Mata el proceso actual (si existe) y lanza uno nuevo. Retorna True si arrancó."""
    _matar_enricher(portal)
    time.sleep(2)

    log_out = open(_log_path(portal), "ab")
    log_err = open(_err_log_path(portal), "ab")

    try:
        p = subprocess.Popen(
            [str(_PYTHON), "-u", "enricher.py", "--mongo", "--tab", portal],
            cwd=str(_ENRICHER_DIR),
            stdout=log_out,
            stderr=log_err,
            creationflags=0x00000008,  # DETACHED_PROCESS
        )
        logger.info(f"[RESTART] {portal} — nuevo proceso PID {p.pid}")
        return True
    except Exception as e:
        logger.error(f"[RESTART] No se pudo lanzar enricher {portal}: {e}")
        return False
    finally:
        log_out.close()
        log_err.close()


def verificar_enrichers():
    """Detecta enrichers colgados y los reinicia automáticamente."""
    try:
        col      = _get_col("mercado_props")
        diag_col = _get_col("scraper_diagnostics")
        hace_2h  = (datetime.now() - timedelta(hours=2)).isoformat()
        hace_24h = (datetime.now() - timedelta(hours=24)).isoformat()
        hace_30d = (datetime.now() - timedelta(days=30)).isoformat()

        reiniciados = []
        for portal in PORTALES_ENRICHER:
            # ── Detección RÁPIDA (30-jun): log estancado >25 min con pendientes → reiniciar ya,
            # sin esperar las 2h de inactividad en Mongo. Cubre tanto CUELGUE (proceso vivo, log
            # parado) como CRASH (proceso muerto). El enricher de PCOM se colgaba cada ~100 items.
            logp = _log_path(portal)
            if logp.exists():
                mins_log = (time.time() - logp.stat().st_mtime) / 60
                if mins_log > 25:
                    pend_q = col.count_documents({
                        "portal_origen": portal, "activo": {"$ne": False},
                        "es_duplicado_secundario": {"$ne": True},
                        "duplicado": {"$ne": True},
                        "enrich_last_attempt": {"$not": {"$gte": hace_30d}},
                        **_FALTA_Q,
                    })
                    if pend_q > 0:
                        estado = f"vivo PID {_pid_enricher(portal)}" if _pid_enricher(portal) else "muerto"
                        logger.warning(f"[ENRICHER CUELGUE/MUERTO] {portal}: log estancado {mins_log:.0f}min "
                                       f"({estado}), {pend_q:,} pend → reiniciando")
                        if _reiniciar_enricher(portal):
                            reiniciados.append(f"{portal}: log {mins_log:.0f}min estancado → reiniciado")
                        continue

            # ¿Tuvo actividad del enricher en las últimas 24h?
            if col.count_documents({"portal_origen": portal,
                                    "enrich_last_attempt": {"$gte": hace_24h}}) == 0:
                continue  # Nunca arrancó o ya terminó hace más de 24h — skip

            # ¿Sigue activo en las últimas 2h?
            if col.count_documents({"portal_origen": portal,
                                    "enrich_last_attempt": {"$gte": hace_2h}}) > 0:
                continue  # OK, sigue corriendo

            # Inactivo >2h — ¿quedan pendientes?
            pendientes = col.count_documents({
                "portal_origen": portal,
                "activo": {"$ne": False},
                "es_duplicado_secundario": {"$ne": True},
                "duplicado": {"$ne": True},
                "enrich_last_attempt": {"$not": {"$gte": hace_30d}},
                **_FALTA_Q,
            })
            if pendientes == 0:
                continue  # Terminó limpiamente

            last = col.find_one(
                {"portal_origen": portal, "enrich_last_attempt": {"$exists": True}},
                {"enrich_last_attempt": 1},
                sort=[("enrich_last_attempt", -1)],
            )
            last_ts = last["enrich_last_attempt"] if last else ""
            mins = int((datetime.now() - datetime.fromisoformat(last_ts)).total_seconds() / 60) if last_ts else 0

            logger.warning(f"[ENRICHER COLGADO] {portal}: {pendientes:,} pendientes, inactivo {mins} min → reiniciando")
            ok = _reiniciar_enricher(portal)
            estado = "reiniciado" if ok else "fallo al reiniciar"
            reiniciados.append(f"{portal}: {pendientes:,} pend, {mins}min inactivo → {estado}")

            _insertar_diagnostico(
                diag_col, portal, "enricher_inactivo",
                f"{pendientes:,} pendientes; inactivo {mins} min; auto-restart: {estado}",
            )

        if reiniciados:
            _notificar_windows("🔄 Enricher reiniciado", "\n".join(reiniciados[:4]))
        else:
            logger.info("Enrichers: sin portales colgados con actividad reciente")

    except Exception as e:
        logger.warning(f"Error verificando enrichers: {e}")


# ─────────────────────────────────────────
# Paso 3: detectar scheduler colgado por heartbeat
# ─────────────────────────────────────────

def verificar_heartbeats():
    try:
        diag_col  = _get_col("scraper_diagnostics")
        hb_col    = _get_col("scraper_heartbeat")
        hace_2h   = (datetime.now() - timedelta(hours=2)).isoformat()

        # Portales conocidos
        portales = ["INMUEBLES24", "PROPIEDADES_COM", "PINCALI"]
        for portal in portales:
            ultimo = hb_col.find_one({"portal": portal}, sort=[("timestamp", -1)])
            if not ultimo:
                continue  # nunca inició, no es error de heartbeat

            ts = ultimo.get("timestamp", "")
            if ts < hace_2h:
                mins = int((datetime.now() - datetime.fromisoformat(ts)).total_seconds() / 60)
                _insertar_diagnostico(
                    diag_col, portal, "scheduler_colgado",
                    f"Sin heartbeat hace {mins} minutos (último: {ts})"
                )
    except Exception as e:
        logger.warning(f"Error verificando heartbeats: {e}")


# ─────────────────────────────────────────
# Loop principal
# ─────────────────────────────────────────

_FLAG = Path(__file__).parent / "scrape_active.flag"

def _scrape_activo() -> bool:
    """True si hay un scrape en curso (run_mensual.ps1 crea el flag). El flag se ignora si
    tiene >48h (scrape abandonado/colgado) para no quedar activo 24/7 para siempre."""
    if not _FLAG.exists():
        return False
    edad_h = (time.time() - _FLAG.stat().st_mtime) / 3600
    return edad_h < 48


def run():
    logger.info("=" * 50)
    logger.info("Monitor local iniciado")

    try:
        _get_col("mercado_props")  # test conexión
    except Exception as e:
        logger.error(f"No se pudo conectar a MongoDB: {e}")
        return

    # Enrichers: monitorear siempre (no dependen del flag del scraper)
    try:
        verificar_enrichers()
    except Exception as e:
        logger.error(f"Error en verificar_enrichers: {e}")

    # Scraper diagnostics + heartbeats: solo durante scrape activo
    if not _scrape_activo():
        logger.info("Sin scrape activo (sin flag o >48h) — omitiendo diagnósticos del scraper.")
        logger.info("Monitor local finalizado")
        return

    try:
        col = _get_col("scraper_diagnostics")
    except Exception as e:
        logger.error(f"No se pudo conectar a scraper_diagnostics: {e}")
        return

    # Paso 1: procesar diagnósticos pendientes del scraper
    try:
        pendientes = list(col.find({"resuelto": False, "requiere_intervencion": True}))
        if not pendientes:
            logger.info("Sin diagnósticos pendientes. Todo OK.")
        else:
            logger.info(f"{len(pendientes)} diagnóstico(s) pendiente(s)")
            sin_handler = []
            for doc in pendientes:
                tipo   = doc.get("tipo_error", "desconocido")
                portal = doc.get("portal", "?")
                logger.info(f"  Procesando: {portal} — {tipo}")
                handler = HANDLERS.get(tipo)
                if handler:
                    try:
                        handler(col, doc)
                    except Exception as e:
                        logger.error(f"  Error en handler {tipo}: {e}")
                        logger.debug(traceback.format_exc())
                        sin_handler.append(f"{portal}: {tipo}")
                else:
                    _agregar_nota(col, doc["_id"],
                                  f"Tipo de error '{tipo}' sin handler local. Revisar manualmente.")
                    logger.warning(f"  Sin handler para tipo: {tipo}")
                    sin_handler.append(f"{portal}: {tipo}")

            if sin_handler:
                _notificar_windows(
                    titulo="⚠️ Scraper requiere atención",
                    mensaje="\n".join(sin_handler[:4])
                )
    except Exception as e:
        logger.error(f"Error procesando diagnósticos: {e}")

    # Paso 2: verificar heartbeats del scraper
    try:
        verificar_heartbeats()
    except Exception as e:
        logger.error(f"Error en verificar_heartbeats: {e}")

    logger.info("Monitor local finalizado")


if __name__ == "__main__":
    run()
