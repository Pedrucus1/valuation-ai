"""
orquestador_ia.py — Orquestador local con IA para auto-fix de scrapers.

Reemplaza el Claude Routine de claude.ai. Corre cada hora via Windows Task Scheduler.
Lee scraper_diagnostics de MongoDB, llama a la API de Anthropic con el código del
scraper afectado, aplica el fix propuesto y hace git push.

Uso manual:
    python orquestador_ia.py
    python orquestador_ia.py --dry-run   # muestra qué haría sin aplicar cambios
"""

import argparse
import json
import os
import subprocess
import sys
import traceback
from datetime import datetime, timedelta
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from loguru import logger

load_dotenv(Path(__file__).parent / ".env")

REPO_DIR   = Path(__file__).parent
LOG_FILE   = REPO_DIR / "logs" / "orquestador_ia.log"
LOG_FILE.parent.mkdir(exist_ok=True)

logger.remove()
if sys.stdout is not None:
    logger.add(sys.stdout, format="{time:HH:mm:ss} | {level} | {message}", level="INFO")
logger.add(LOG_FILE, rotation="5 MB", retention=10, level="DEBUG",
           format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")

# Tipos de error que requieren edición de código (el resto lo maneja monitor_local.py)
TIPOS_CON_FIX_CODIGO = {
    "bloqueo_suave",
    "errores_consecutivos",
    "url_changed",
    "timeout",
    "bloqueo_duro",
    "http_403",
    "http_429",
    "http_4xx",
    "error",
}

# Mapa portal → archivo scraper
SCRAPER_FILES = {
    "INMUEBLES24":      "scrapers/inmuebles24.py",
    "PROPIEDADES_COM":  "scrapers/propiedades_com.py",
    "PINCALI":          "scrapers/pincali.py",
    "VIVANUNCIOS":      "scrapers/vivanuncios.py",
    "CASAS_Y_TERRENOS": "scrapers/casas_y_terrenos.py",
    "MITULA":           "scrapers/mitula.py",
}

SYSTEM_PROMPT = """Eres un experto en scrapers de bienes raíces mexicanos. Tu tarea es analizar diagnósticos de error de scrapers y proponer fixes de código precisos y seguros.

Reglas críticas que DEBES seguir:
- INMUEBLES24: usa Chrome CDP puerto 9223 vía Playwright. NO usar proxy IPRoyal (Cloudflare lo bloquea).
- PROPIEDADES_COM: usa Node.js cdp_fetch.js vía subprocess en puerto 9222. NUNCA Playwright headless (Akamai lo bloquea). NUNCA websocket-client desde Python.
- VIVANUNCIOS: usa proxy IPRoyal. El precio en listado puede ser vacío (solo aparece en detalle).
- PINCALI, CASAS_Y_TERRENOS, MITULA: HTTP requests simples sin CDP.
- Selectores de propiedades.com: usar data-id semánticos, NO clases sc-xxx generadas.
- Enriquecedor: portales con __NEXT_DATA__ DEBEN hacer `return resultado` temprano tras parsear JSON exitoso.
- Schedulers: máximo 1 instancia por portal.

Formato de respuesta OBLIGATORIO (JSON puro, sin markdown):
{
  "diagnostico": "una línea explicando el problema identificado",
  "fix": {
    "archivo": "scrapers/nombre_portal.py",
    "old_string": "código exacto a reemplazar (mínimo 3 líneas de contexto)",
    "new_string": "código de reemplazo"
  },
  "confianza": "alta | media | baja",
  "nota": "explicación del cambio o 'sin_cambio' si no aplica fix"
}

Si el error no requiere cambio de código (ej. CDP caído, scheduler detenido) responde:
{
  "diagnostico": "descripción del problema",
  "fix": null,
  "confianza": "alta",
  "nota": "sin_cambio — razón por la que no aplica fix de código"
}
"""


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
        {"$set": {
            "resuelto": True,
            "fix_aplicado": fix_aplicado,
            "resuelto_por": "orquestador_ia",
            "resuelto_at": datetime.now().isoformat(),
        }}
    )


def _agregar_nota(col, doc_id, nota: str):
    col.update_one(
        {"_id": doc_id},
        {"$set": {"nota_orquestador": nota, "nota_at": datetime.now().isoformat()}}
    )


def obtener_pendientes(col) -> list:
    hace_24h = (datetime.now() - timedelta(hours=24)).isoformat()
    return list(col.find({
        "resuelto": False,
        "requiere_intervencion": True,
        "tipo_error": {"$in": list(TIPOS_CON_FIX_CODIGO)},
        "timestamp": {"$gte": hace_24h},
    }).sort("timestamp", -1).limit(5))


# ─────────────────────────────────────────
# Anthropic API
# ─────────────────────────────────────────

def llamar_claude(diagnostico: dict, codigo_scraper: str) -> dict | None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY no configurada en .env")
        return None

    client = anthropic.Anthropic(api_key=api_key)

    portal     = diagnostico.get("portal", "?")
    tipo_error = diagnostico.get("tipo_error", "?")
    detalle    = diagnostico.get("detalle", "")
    nota_prev  = diagnostico.get("nota_orquestador", "")
    timestamp  = diagnostico.get("timestamp", "")

    user_message = f"""Portal: {portal}
Tipo de error: {tipo_error}
Timestamp: {timestamp}
Detalle: {detalle}
Nota previa del monitor local: {nota_prev or "ninguna"}

Código actual del scraper ({SCRAPER_FILES.get(portal, "desconocido")}):
<codigo>
{codigo_scraper}
</codigo>

Analiza el error y propone el fix de código más seguro."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_message,
                            "cache_control": {"type": "ephemeral"},
                        }
                    ],
                }
            ],
        )
        raw = response.content[0].text.strip()
        logger.debug(f"Respuesta Claude: {raw[:300]}...")
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Claude no devolvió JSON válido: {e}\nRespuesta: {raw[:500]}")
        return None
    except Exception as e:
        logger.error(f"Error llamando a Claude API: {e}")
        return None


# ─────────────────────────────────────────
# Aplicar fix
# ─────────────────────────────────────────

def aplicar_fix(fix: dict, dry_run: bool) -> bool:
    archivo   = fix.get("archivo", "")
    old_str   = fix.get("old_string", "")
    new_str   = fix.get("new_string", "")

    if not archivo or not old_str or not new_str:
        logger.warning("Fix incompleto — faltan campos archivo/old_string/new_string")
        return False

    ruta = REPO_DIR / archivo
    if not ruta.exists():
        logger.error(f"Archivo no encontrado: {ruta}")
        return False

    contenido = ruta.read_text(encoding="utf-8")
    if old_str not in contenido:
        logger.warning(f"old_string no encontrado en {archivo} — puede que ya esté aplicado o cambió")
        return False

    nuevo_contenido = contenido.replace(old_str, new_str, 1)

    if dry_run:
        logger.info(f"[DRY-RUN] Aplicaría fix en {archivo}")
        logger.info(f"  OLD: {old_str[:100]}...")
        logger.info(f"  NEW: {new_str[:100]}...")
        return True

    ruta.write_text(nuevo_contenido, encoding="utf-8")
    logger.info(f"Fix aplicado en {archivo}")
    return True


# ─────────────────────────────────────────
# Git push
# ─────────────────────────────────────────

def git_commit_push(portal: str, tipo_error: str, dry_run: bool) -> bool:
    if dry_run:
        logger.info("[DRY-RUN] Haría git commit && git push")
        return True

    github_token = os.getenv("GITHUB_TOKEN", "")
    if not github_token:
        logger.error("GITHUB_TOKEN no configurado — no se puede hacer push")
        return False

    mensaje = f"fix({portal.lower()}): auto-fix {tipo_error} [{datetime.now().strftime('%Y-%m-%d %H:%M')}]"

    try:
        # Configurar remote con token
        remote_url = f"https://{github_token}@github.com/Pedrucus1/scraper-inmuebles.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", remote_url],
            cwd=REPO_DIR, check=True, capture_output=True
        )

        subprocess.run(
            ["git", "add", "-A"],
            cwd=REPO_DIR, check=True, capture_output=True
        )

        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=REPO_DIR, capture_output=True
        )
        if result.returncode == 0:
            logger.info("Sin cambios staged — nada que commitear")
            return False

        subprocess.run(
            ["git", "commit", "-m", mensaje],
            cwd=REPO_DIR, check=True, capture_output=True
        )
        subprocess.run(
            ["git", "push", "origin", "master"],
            cwd=REPO_DIR, check=True, capture_output=True
        )

        logger.info(f"Git push OK: {mensaje}")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Error en git: {e.stderr.decode() if e.stderr else e}")
        return False


# ─────────────────────────────────────────
# Loop principal
# ─────────────────────────────────────────

_FLAG = REPO_DIR / "scrape_active.flag"

def _scrape_activo() -> bool:
    """True si hay un scrape en curso (run_mensual.ps1 crea el flag). Se ignora si tiene >48h."""
    if not _FLAG.exists():
        return False
    import time as _time
    edad_h = (_time.time() - _FLAG.stat().st_mtime) / 3600
    return edad_h < 48


def run(dry_run: bool = False):
    logger.info("=" * 50)
    logger.info(f"Orquestador IA iniciado {'[DRY-RUN]' if dry_run else ''}")

    # Gating: solo actuar durante un scrape activo. Fuera de eso, salida inmediata.
    if not _scrape_activo():
        logger.info("Sin scrape activo (sin flag o >48h) — salida sin acción.")
        return

    try:
        col = _get_col("scraper_diagnostics")
    except Exception as e:
        logger.error(f"No se pudo conectar a MongoDB: {e}")
        return

    pendientes = obtener_pendientes(col)
    if not pendientes:
        logger.info("Sin diagnósticos pendientes con fix de código. Todo OK.")
        logger.info("Orquestador IA finalizado")
        return

    logger.info(f"{len(pendientes)} diagnóstico(s) para analizar")
    fixes_aplicados = 0

    for doc in pendientes:
        portal     = doc.get("portal", "?")
        tipo_error = doc.get("tipo_error", "?")
        logger.info(f"Procesando: {portal} — {tipo_error}")

        # Leer código del scraper
        archivo_rel = SCRAPER_FILES.get(portal)
        if not archivo_rel:
            _agregar_nota(col, doc["_id"], f"Portal {portal} no mapeado a archivo scraper")
            logger.warning(f"  Portal {portal} sin mapeo de archivo")
            continue

        ruta_scraper = REPO_DIR / archivo_rel
        if not ruta_scraper.exists():
            _agregar_nota(col, doc["_id"], f"Archivo {archivo_rel} no existe en repo local")
            logger.warning(f"  Archivo no encontrado: {ruta_scraper}")
            continue

        codigo = ruta_scraper.read_text(encoding="utf-8")

        # Llamar a Claude
        try:
            respuesta = llamar_claude(doc, codigo)
        except Exception as e:
            logger.error(f"  Error inesperado llamando Claude: {e}")
            logger.debug(traceback.format_exc())
            continue

        if not respuesta:
            _agregar_nota(col, doc["_id"], "Orquestador IA no pudo obtener respuesta de Claude API")
            continue

        diagnostico_ia = respuesta.get("diagnostico", "")
        fix            = respuesta.get("fix")
        confianza      = respuesta.get("confianza", "baja")
        nota           = respuesta.get("nota", "")

        logger.info(f"  Diagnóstico IA: {diagnostico_ia}")
        logger.info(f"  Confianza: {confianza} | Fix: {'sí' if fix else 'no'}")

        if not fix or nota == "sin_cambio" or "sin_cambio" in nota:
            _agregar_nota(col, doc["_id"],
                          f"IA: {diagnostico_ia}. Sin fix de código: {nota}")
            logger.info(f"  Sin cambio de código requerido: {nota}")
            continue

        if confianza == "baja":
            _agregar_nota(col, doc["_id"],
                          f"IA baja confianza — no se aplicó fix. Diagnóstico: {diagnostico_ia}. "
                          f"Fix propuesto guardado en nota. old='{fix.get('old_string','')[:100]}'")
            logger.warning(f"  Confianza baja — fix no aplicado para {portal}")
            continue

        # Aplicar fix
        ok = aplicar_fix(fix, dry_run)
        if not ok:
            _agregar_nota(col, doc["_id"],
                          f"IA propuso fix pero no se pudo aplicar. Diagnóstico: {diagnostico_ia}")
            continue

        # Git push
        pushed = git_commit_push(portal, tipo_error, dry_run)

        fix_desc = f"Fix código en {fix['archivo']} — {diagnostico_ia[:100]}"
        if pushed:
            _marcar_resuelto(col, doc["_id"], fix_desc + " [pushed]")
        else:
            _agregar_nota(col, doc["_id"], fix_desc + " [fix aplicado, push falló]")

        fixes_aplicados += 1

    logger.info(f"Fixes aplicados: {fixes_aplicados}/{len(pendientes)}")
    logger.info("Orquestador IA finalizado")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Orquestador IA de scrapers")
    parser.add_argument("--dry-run", action="store_true",
                        help="Muestra qué haría sin aplicar cambios ni hacer push")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
