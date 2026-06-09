"""
scheduler.py — Ejecuta el scraping de inmuebles24 de forma espaciada
para no levantar sospechas en Cloudflare.

Estrategia:
- Una tarea = una combinación (zona × operacion × tipo_propiedad)
- Entre tareas: pausa aleatoria de PAUSA_MIN a PAUSA_MAX minutos
- Guarda el progreso en progress.json para poder reanudar
- Al completar todas las tareas, guarda resultados en Google Sheets

Uso:
    python scheduler.py            # ejecutar todo
    python scheduler.py --reset    # borrar progreso y empezar de cero
    python scheduler.py --status   # ver qué falta por scrapear

PROXIES (opcional):
    Si tienes un proveedor de proxies residenciales rotativos,
    agrega PROXY_URL en el .env con el formato:
    PROXY_URL=http://usuario:password@proxy.proveedor.com:puerto
    Los proxies rotativos residenciales (Brightdata, Smartproxy, Oxylabs)
    evitan bloqueos por IP. Sin proxy la IP de tu computadora/servidor
    puede quedar bloqueada temporalmente después de ~4 páginas seguidas.
"""

import sys
import io
import json
import time
import random
import argparse
import traceback
from datetime import datetime
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import config
from utils.logger import get_logger
from utils.sheets import SheetsClient

log = get_logger("SCHEDULER")

# ─────────────────────────────────────────
# Configuración del scheduler
# ─────────────────────────────────────────
PAUSA_MIN = 12   # minutos mínimos entre tareas
PAUSA_MAX = 22   # minutos máximos entre tareas
PROGRESS_FILE = Path(__file__).parent / "progress.json"

# Buffer local — datos scrapeados que aún no se han subido a Sheets
BUFFER_DIR = Path(__file__).parent / "buffer"
BUFFER_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────
# Generar lista completa de tareas
# ─────────────────────────────────────────

def generar_tareas() -> list[dict]:
    """
    Genera todas las combinaciones (portal × zona × operacion × tipo).
    Orden aleatorio para que el patrón no sea predecible.
    """
    from scrapers.inmuebles24 import TIPOS_URL as TIPOS_I24
    from scrapers.pincali import TIPOS_URL as TIPOS_PINCALI
    from scrapers.propiedades_com import TIPOS_URL as TIPOS_PCOM

    # Portales con múltiples tipos de propiedad en URL separadas
    portales_con_tipos = [
        ("INMUEBLES24",      TIPOS_I24),
        ("PINCALI",          TIPOS_PINCALI),
        ("PROPIEDADES_COM",  TIPOS_PCOM),
    ]

    # Portales que no tienen URL por tipo — una tarea = zona × operacion
    portales_simples = [
        "VIVANUNCIOS",
        "MITULA",
        "CASAS_Y_TERRENOS",
    ]

    tareas = []

    for portal_nombre, tipos_url in portales_con_tipos:
        for zona in config.ZONAS:
            for operacion in config.TIPOS_OPERACION:
                for tipo in tipos_url.keys():
                    tareas.append({
                        "id":        f"{portal_nombre}_{zona['municipio']}_{operacion}_{tipo}",
                        "portal":    portal_nombre,
                        "zona":      zona["municipio"],
                        "operacion": operacion,
                        "tipo":      tipo,
                        "estado":    "pendiente",
                        "props":     0,
                        "error":     "",
                        "timestamp": "",
                    })

    for portal_nombre in portales_simples:
        for zona in config.ZONAS:
            for operacion in config.TIPOS_OPERACION:
                tareas.append({
                    "id":        f"{portal_nombre}_{zona['municipio']}_{operacion}",
                    "portal":    portal_nombre,
                    "zona":      zona["municipio"],
                    "operacion": operacion,
                    "tipo":      "todas",
                    "estado":    "pendiente",
                    "props":     0,
                    "error":     "",
                    "timestamp": "",
                })

    # Mezclar para que el orden sea impredecible
    random.shuffle(tareas)
    return tareas


# ─────────────────────────────────────────
# Persistencia de progreso
# ─────────────────────────────────────────

def cargar_progreso() -> list[dict]:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            existentes = json.load(f)
        # Agregar tareas nuevas que no existan aún (e.g. portales recién añadidos)
        ids_existentes = {t["id"] for t in existentes}
        todas_esperadas = generar_tareas()
        nuevas = [t for t in todas_esperadas if t["id"] not in ids_existentes]
        if nuevas:
            log.info(f"Se agregan {len(nuevas)} tareas nuevas al progreso existente")
            existentes.extend(nuevas)
            guardar_progreso(existentes)
        return existentes
    return []

def guardar_progreso(tareas: list[dict]):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(tareas, f, ensure_ascii=False, indent=2)

def mostrar_status(tareas: list[dict], portal: str = None):
    if portal:
        tareas = [t for t in tareas if t["portal"] == portal.upper()]
    completadas  = [t for t in tareas if t["estado"] == "completada"]
    pendientes   = [t for t in tareas if t["estado"] == "pendiente"]
    errores      = [t for t in tareas if t["estado"] == "error"]
    bloqueadas   = [t for t in tareas if t["estado"] == "bloqueado"]
    sospechosas  = [t for t in completadas if t.get("props", 0) == 0]
    total_props  = sum(t["props"] for t in completadas)

    print(f"\nProgreso: {len(completadas)}/{len(tareas)} tareas completadas")
    print(f"  Pendientes : {len(pendientes)}")
    print(f"  Completadas: {len(completadas)}")
    print(f"  Bloqueadas : {len(bloqueadas)}")
    print(f"  Errores    : {len(errores)}")
    print(f"  Props total: {total_props:,}")

    if bloqueadas:
        print(f"\n⛔ Tareas BLOQUEADAS (portal rechazó la solicitud):")
        for t in bloqueadas:
            print(f"  - {t['id']}")
            print(f"    {t.get('error','')[:100]}")

    if errores:
        print(f"\n❌ Tareas con error:")
        for t in errores[:5]:
            print(f"  - {t['id']}: {t['error'][:80]}")

    if sospechosas:
        print(f"\n⚠️  Completadas con 0 props ({len(sospechosas)}) — revisar si son zonas vacías o bloqueo suave:")
        for t in sospechosas[:10]:
            print(f"  - {t['id']}")

    if pendientes:
        print(f"\nPróximas tareas:")
        for t in pendientes[:5]:
            print(f"  - {t['id']}")
        if len(pendientes) > 5:
            print(f"  ... y {len(pendientes)-5} más")


# ─────────────────────────────────────────
# Ejecutar una tarea individual
# ─────────────────────────────────────────

def _buffer_path(tarea_id: str) -> Path:
    """Ruta del archivo de buffer para una tarea."""
    safe_id = tarea_id.replace("/", "_").replace(" ", "_")
    return BUFFER_DIR / f"{safe_id}.json"


def _guardar_buffer(tarea_id: str, propiedades: list):
    """Persiste las propiedades scrapeadas en disco antes de subir a Sheets."""
    path = _buffer_path(tarea_id)
    path.write_text(json.dumps(propiedades, ensure_ascii=False), encoding="utf-8")


def _leer_buffer(tarea_id: str) -> list:
    """Lee propiedades del buffer local."""
    path = _buffer_path(tarea_id)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def _borrar_buffer(tarea_id: str):
    """Elimina el buffer de una tarea una vez subida a Sheets."""
    path = _buffer_path(tarea_id)
    if path.exists():
        path.unlink()


def _subir_buffer_a_sheets(tarea: dict, sheets: SheetsClient) -> bool:
    """
    Intenta subir las propiedades del buffer a Sheets.
    Retorna True si tuvo éxito.
    """
    from scrapers.inmuebles24 import Inmuebles24Scraper
    SCRAPERS_MAP_TABS = {
        "INMUEBLES24":      config.TAB_INMUEBLES24,
        "PINCALI":          config.TAB_PINCALI,
        "VIVANUNCIOS":      config.TAB_VIVANUNCIOS,
        "MITULA":           config.TAB_MITULA,
        "CASAS_Y_TERRENOS": config.TAB_CASAS_Y_TERRENOS,
    }
    propiedades = _leer_buffer(tarea["id"])
    if not propiedades:
        return True  # buffer vacío = nada que subir

    portal = tarea["portal"]
    tab = SCRAPERS_MAP_TABS.get(portal, config.TAB_INMUEBLES24)

    try:
        stats = sheets.upsert_propiedades(propiedades, tab)
        sheets.upsert_propiedades(propiedades, config.TAB_CONSOLIDADO)
        log.info(f"Buffer subido: {stats['nuevas']} nuevas, {stats['actualizadas']} actualizadas")
        _borrar_buffer(tarea["id"])
        return True
    except Exception as e:
        log.warning(f"Fallo subir buffer a Sheets (se reintentará): {e}")
        return False


def reintentar_buffers_pendientes(tareas: list[dict], sheets: SheetsClient):
    """
    Al arrancar el scheduler, reintenta subir a Sheets cualquier tarea
    que quedó en estado 'scraped' (datos en buffer, no en Sheets).
    """
    scraped = [t for t in tareas if t["estado"] == "scraped"]
    if not scraped:
        return

    log.info(f"Reintentando {len(scraped)} tareas con datos en buffer...")
    for tarea in scraped:
        ok = _subir_buffer_a_sheets(tarea, sheets)
        if ok:
            tarea["estado"] = "completada"
            log.info(f"  ✅ {tarea['id']} subida exitosamente")
        else:
            log.warning(f"  ⚠️  {tarea['id']} sigue sin poder subirse")

    guardar_progreso(tareas)


def ejecutar_tarea(tarea: dict, sheets: SheetsClient) -> int:
    """
    Ejecuta el scraping de una sola combinación portal/zona/operacion/tipo.
    Retorna el número de propiedades obtenidas.
    """
    from scrapers.inmuebles24 import Inmuebles24Scraper
    from scrapers.pincali import PincaliScraper
    from scrapers.vivanuncios import VivanunciosScraper
    from scrapers.mitula import MitulaScraper
    from scrapers.casas_y_terrenos import CasasYTerrenosScraper
    from scrapers.propiedades_com import PropiedadesComScraper

    SCRAPERS_MAP = {
        "INMUEBLES24":      (Inmuebles24Scraper,      config.TAB_INMUEBLES24),
        "PINCALI":          (PincaliScraper,          config.TAB_PINCALI),
        "VIVANUNCIOS":      (VivanunciosScraper,      config.TAB_VIVANUNCIOS),
        "MITULA":           (MitulaScraper,           config.TAB_MITULA),
        "CASAS_Y_TERRENOS": (CasasYTerrenosScraper,   config.TAB_CASAS_Y_TERRENOS),
        "PROPIEDADES_COM":  (PropiedadesComScraper,   config.TAB_PROPIEDADES_COM),
    }

    portal    = tarea.get("portal", "INMUEBLES24")
    municipio = tarea["zona"]
    operacion = tarea["operacion"]
    tipo      = tarea["tipo"]

    log.info(f"Tarea: {portal} | {municipio} | {operacion} | {tipo}")

    scraper_clase, tab = SCRAPERS_MAP.get(portal, (Inmuebles24Scraper, config.TAB_INMUEBLES24))

    def _normalizar(s: str) -> str:
        """Corrige strings doblemente codificados (UTF-8 bytes como Latin-1)."""
        try:
            return s.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return s

    mun_norm = _normalizar(municipio)
    zona_obj = next(
        (z for z in config.ZONAS if z["municipio"] == mun_norm or z["municipio"] == municipio),
        None,
    )
    if not zona_obj:
        raise ValueError(f"Zona no encontrada: {municipio}")

    config_backup_zonas = config.ZONAS
    config_backup_ops   = config.TIPOS_OPERACION
    config.ZONAS           = [zona_obj]
    config.TIPOS_OPERACION = [operacion]

    try:
        scraper = scraper_clase()
        scraper.tipos_propiedad = [tipo]
        resultado = scraper.ejecutar()
        propiedades = resultado["propiedades"]

        if propiedades:
            # 1. Buffer local — nunca se pierden datos
            _guardar_buffer(tarea["id"], propiedades)

            # 2. MongoDB PRIMERO — sin rate limits, almacenamiento primario
            _guardar_en_mongo(propiedades, portal)

            # 3. Google Sheets — secundario, falla silenciosa si 429
            ok = _subir_buffer_a_sheets(tarea, sheets)
            if not ok:
                # Datos seguros en MongoDB y buffer — no bloquear la tarea
                log.warning(f"Sheets falló (datos en MongoDB y buffer): {tarea['id']}")
                # NO raise — la tarea se marca completada igual (MongoDB tiene los datos)

        return len(propiedades)

    finally:
        config.ZONAS           = config_backup_zonas
        config.TIPOS_OPERACION = config_backup_ops


# ─────────────────────────────────────────
# MongoDB — almacenamiento primario de propiedades
# ─────────────────────────────────────────

def _get_mongo_col():
    """Retorna la colección mercado_props. Lanza excepción si no conecta."""
    import os
    from pymongo import MongoClient
    from dotenv import load_dotenv
    load_dotenv()
    client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"),
                         serverSelectionTimeoutMS=5000)
    return client[os.getenv("DB_NAME", "propvalu")]["mercado_props"]


def _guardar_en_mongo(propiedades: list, portal: str) -> dict:
    """
    Upsert de propiedades en MongoDB (mercado_props).
    Clave: id_unico (hash MD5 de URL). Sin rate limit.
    Retorna {nuevas, actualizadas}.
    """
    if not propiedades:
        return {"nuevas": 0, "actualizadas": 0}
    try:
        col = _get_mongo_col()
        from datetime import datetime, timezone
        nuevas = actualizadas = 0
        for prop in propiedades:
            uid = prop.get("id_unico") or prop.get("url_original", "")
            if not uid:
                continue
            doc = {**prop, "portal": portal, "mongo_ts": datetime.now(timezone.utc).isoformat()}
            result = col.update_one({"id_unico": uid}, {"$set": doc}, upsert=True)
            if result.upserted_id:
                nuevas += 1
            elif result.modified_count:
                actualizadas += 1
        log.info(f"MongoDB mercado_props: {nuevas} nuevas, {actualizadas} actualizadas")
        return {"nuevas": nuevas, "actualizadas": actualizadas}
    except Exception as e:
        log.warning(f"MongoDB fallo (no crítico): {e}")
        return {"nuevas": 0, "actualizadas": 0}


def sync_mongo_a_sheets(sheets: SheetsClient):
    """
    Sincroniza propiedades de MongoDB → Google Sheets.
    Uso: python scheduler.py --sync-sheets
    Útil cuando Sheets tuvo 429 y los datos quedaron solo en Mongo.
    """
    try:
        col = _get_mongo_col()
        # Propiedades pendientes de sync (sin sheets_ts o más recientes que última sync)
        pending = list(col.find({"sheets_synced": {"$ne": True}}, {"_id": 0}).limit(500))
        if not pending:
            log.info("sync-sheets: todo ya sincronizado.")
            return
        log.info(f"sync-sheets: {len(pending)} propiedades pendientes...")
        SCRAPERS_MAP_TABS = {
            "INMUEBLES24":      config.TAB_INMUEBLES24,
            "PINCALI":          config.TAB_PINCALI,
            "VIVANUNCIOS":      config.TAB_VIVANUNCIOS,
            "MITULA":           config.TAB_MITULA,
            "CASAS_Y_TERRENOS": config.TAB_CASAS_Y_TERRENOS,
            "PROPIEDADES_COM":  config.TAB_PROPIEDADES_COM,
        }
        # Agrupar por portal para un upsert por tab
        from collections import defaultdict
        por_portal = defaultdict(list)
        for p in pending:
            por_portal[p.get("portal", "INMUEBLES24")].append(p)

        for portal, props in por_portal.items():
            tab = SCRAPERS_MAP_TABS.get(portal, config.TAB_INMUEBLES24)
            try:
                sheets.upsert_propiedades(props, tab)
                sheets.upsert_propiedades(props, config.TAB_CONSOLIDADO)
                ids = [p["id_unico"] for p in props if p.get("id_unico")]
                col.update_many({"id_unico": {"$in": ids}}, {"$set": {"sheets_synced": True}})
                log.info(f"  {portal}: {len(props)} props sincronizadas a Sheets")
            except Exception as e:
                log.warning(f"  {portal}: Sheets falló ({e}) — datos seguros en MongoDB")
    except Exception as e:
        log.error(f"sync-sheets error: {e}")


# ─────────────────────────────────────────
# Reporte a MongoDB (no-blocking)
# ─────────────────────────────────────────

PORTAL_NOMBRES = {
    "INMUEBLES24":      "Inmuebles24",
    "PINCALI":          "Pincali",
    "VIVANUNCIOS":      "Vivanuncios",
    "MITULA":           "Mitula",
    "CASAS_Y_TERRENOS": "CasasyTerrenos",
}

def _reportar_a_mongo(tareas: list[dict]):
    """Guarda resumen de la ejecución en MongoDB. Falla silenciosamente."""
    try:
        import os
        from pymongo import MongoClient
        from dotenv import load_dotenv
        load_dotenv()
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        db_name   = os.getenv("DB_NAME", "propvalu")
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
        db = client[db_name]

        ahora = datetime.now().isoformat()
        portales_ids = list(PORTAL_NOMBRES.keys())

        portales_status = []
        logs = []
        for pid in portales_ids:
            pts = [t for t in tareas if t["portal"] == pid]
            completadas = [t for t in pts if t["estado"] == "completada"]
            errores_list = [t for t in pts if t["estado"] == "error"]
            pendientes = [t for t in pts if t["estado"] == "pendiente"]
            total_props = sum(t["props"] for t in completadas)
            ultima_ts = max((t["timestamp"] for t in completadas if t["timestamp"]), default=ahora)

            if errores_list and not completadas:
                estado = "error"
            elif errores_list:
                estado = "parcial"
            else:
                estado = "ok"

            portales_status.append({
                "id":          pid.lower(),
                "nombre":      PORTAL_NOMBRES[pid],
                "completadas": total_props,
                "pendientes":  len(pendientes),
                "errores":     len(errores_list),
                "estado":      estado,
                "ultima":      ultima_ts,
            })

            if errores_list:
                primer_error = errores_list[0]
                logs.append({
                    "ts":    primer_error["timestamp"][:19].replace("T", " ")[11:],
                    "msg":   f"{PORTAL_NOMBRES[pid]}: {primer_error['error'][:120]}",
                    "nivel": "error",
                })
            elif completadas:
                logs.append({
                    "ts":    ultima_ts[:19].replace("T", " ")[11:],
                    "msg":   f"{PORTAL_NOMBRES[pid]}: {total_props} propiedades procesadas",
                    "nivel": "ok",
                })

        total_completadas = sum(p["completadas"] for p in portales_status)
        total_errores     = sum(p["errores"]     for p in portales_status)
        if total_errores and not total_completadas:
            estado_global = "error"
        elif total_errores:
            estado_global = "parcial"
        else:
            estado_global = "ok"

        logs.append({"ts": ahora[11:19], "msg": "Ciclo de scraping completado", "nivel": "info"})

        db.scraper_status.update_one(
            {"_id": "status"},
            {"$set": {
                "ultima_ejecucion": ahora,
                "estado_global":    estado_global,
                "portales":         portales_status,
                "total_propiedades": total_completadas,
                "nuevas_hoy":        total_completadas,
            }},
            upsert=True,
        )

        # Guardar logs (mantener últimos 50)
        for entry in logs:
            db.scraper_logs.insert_one(entry)
        count = db.scraper_logs.count_documents({})
        if count > 50:
            oldest = list(db.scraper_logs.find({}, {"_id": 1}).sort("_id", 1).limit(count - 50))
            db.scraper_logs.delete_many({"_id": {"$in": [d["_id"] for d in oldest]}})

        client.close()
        log.info("Estado del scraper guardado en MongoDB")
    except Exception as e:
        log.warning(f"No se pudo reportar a MongoDB (no crítico): {e}")


# ─────────────────────────────────────────
# Loop principal
# ─────────────────────────────────────────

def run(reset: bool = False, portal: str = None):
    # Cargar o crear progreso
    if reset or not PROGRESS_FILE.exists():
        tareas = generar_tareas()
        guardar_progreso(tareas)
        log.info(f"Progreso inicializado: {len(tareas)} tareas")
    else:
        tareas = cargar_progreso()
        log.info(f"Progreso cargado: {len(tareas)} tareas totales")

    # Filtrar por portal si se especificó
    if portal:
        portal = portal.upper()
        pendientes = [t for t in tareas if t["estado"] == "pendiente" and t["portal"] == portal]
        log.info(f"Filtrando solo portal: {portal}")
    else:
        pendientes = [t for t in tareas if t["estado"] == "pendiente"]
    log.info(f"Tareas pendientes: {len(pendientes)}")

    # Conectar a Sheets (no-fatal — MongoDB es primario ahora)
    log.info("Conectando a Google Sheets...")
    try:
        sheets = SheetsClient()
    except Exception as e:
        log.warning(f"Google Sheets no disponible ({e}) — continuando solo con MongoDB")
        sheets = None

    if sheets is None:
        # Monkey-patch para que el resto del código no explote sin Sheets
        class _FakeSheets:
            def upsert_propiedades(self, *a, **kw): return {"nuevas":0,"actualizadas":0}
        sheets = _FakeSheets()

    # Reintentar buffers pendientes de sesiones anteriores
    reintentar_buffers_pendientes(tareas, sheets)
    # Recargar tareas por si cambió el estado de algún 'scraped'
    tareas = cargar_progreso()
    if portal:
        pendientes = [t for t in tareas if t["estado"] == "pendiente" and t["portal"] == portal]
    else:
        pendientes = [t for t in tareas if t["estado"] == "pendiente"]

    if not pendientes:
        log.info("Todas las tareas completadas.")
        mostrar_status(tareas)
        return

    # Banner
    print(f"\n{'='*60}")
    print(f"  SCHEDULER INMUEBLES24")
    print(f"  Inicio   : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Pendientes: {len(pendientes)} tareas")
    print(f"  Pausa     : {PAUSA_MIN}-{PAUSA_MAX} min entre tareas")
    print(f"  Proxy     : {'SI - ' + config.PROXY_URL[:30] if hasattr(config, 'PROXY_URL') and config.PROXY_URL else 'NO (IP directa)'}")
    print(f"{'='*60}\n")

    completadas_esta_sesion = 0

    for idx, tarea in enumerate(tareas):
        if tarea["estado"] != "pendiente":
            continue
        if portal and tarea["portal"] != portal:
            continue

        # Verificar desde disco que otra instancia no la tomó ya
        tareas_disco = cargar_progreso()
        tarea_disco = next((t for t in tareas_disco if t["id"] == tarea["id"]), None)
        if tarea_disco and tarea_disco["estado"] != "pendiente":
            log.info(f"Tarea ya procesada por otra instancia, saltando: {tarea['id']}")
            tarea["estado"] = tarea_disco["estado"]
            continue

        print(f"\n[{completadas_esta_sesion+1}/{len(pendientes)}] {tarea['id']}")

        try:
            props = ejecutar_tarea(tarea, sheets)
            tarea["estado"]    = "completada"
            tarea["props"]     = props
            tarea["timestamp"] = datetime.now().isoformat()
            completadas_esta_sesion += 1
            log.info(f"Completada: {props} props")

        except Exception as e:
            err_str = str(e)
            # Si hay datos en buffer, es fallo de Sheets — no de scraping
            if _buffer_path(tarea["id"]).exists():
                tarea["estado"] = "scraped"
                tarea["error"]  = f"Sheets pendiente: {err_str[:150]}"
                log.warning(f"Datos en buffer, Sheets pendiente: {tarea['id']}")
            elif err_str.startswith("[BLOQUEO]"):
                tarea["estado"] = "bloqueado"
                tarea["error"]  = err_str[:200]
                log.error(f"BLOQUEO en tarea {tarea['id']}: {err_str}")
            else:
                tarea["estado"] = "error"
                tarea["error"]  = err_str[:200]
                log.error(f"Error en tarea {tarea['id']}: {e}")
                traceback.print_exc()
            tarea["timestamp"] = datetime.now().isoformat()

        # Recargar desde disco y aplicar cambio para no pisar otros procesos
        tareas = cargar_progreso()
        for t in tareas:
            if t["id"] == tarea["id"]:
                t["estado"]    = tarea["estado"]
                t["props"]     = tarea.get("props", 0)
                t["error"]     = tarea.get("error", "")
                t["timestamp"] = tarea.get("timestamp", "")
                break
        guardar_progreso(tareas)

        # Ver si quedan más pendientes (del portal filtrado si aplica)
        restantes = [t for t in tareas if t["estado"] == "pendiente"
                     and (not portal or t["portal"] == portal)]
        if not restantes:
            break

        # Pausa aleatoria antes de la siguiente tarea
        pausa_min = PAUSA_MIN * 60
        pausa_max = PAUSA_MAX * 60
        espera = random.uniform(pausa_min, pausa_max)
        prox = datetime.fromtimestamp(time.time() + espera).strftime("%H:%M:%S")
        print(f"  Siguiente tarea a las {prox} (en {espera/60:.1f} min)")
        time.sleep(espera)

    # Resumen final
    mostrar_status(tareas)
    total_props = sum(t["props"] for t in tareas if t["estado"] == "completada")
    log.info(f"Sesion terminada. Props totales en Sheets: {total_props:,}")
    _reportar_a_mongo(tareas)

    # Auto-enricher: si se corrió un portal específico y terminó sin pendientes, enriquecer
    if portal:
        restantes_portal = [t for t in tareas if t["estado"] == "pendiente" and t["portal"] == portal]
        if not restantes_portal:
            import subprocess as _sp
            python = sys.executable
            log.info(f"Scraping de {portal} completo — lanzando enricher automáticamente...")
            print(f"\n{'='*50}")
            print(f"Scraping de {portal} terminado. Iniciando enricher...")
            print(f"{'='*50}\n")
            _sp.run([python, "enricher.py", "--tab", portal, "--mongo"], check=False)


# ─────────────────────────────────────────
# Entrada
# ─────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scheduler de scraping espaciado")
    parser.add_argument("--reset",       action="store_true", help="Borrar progreso y empezar de cero")
    parser.add_argument("--status",      action="store_true", help="Mostrar estado actual sin ejecutar")
    parser.add_argument("--sync-sheets", action="store_true", help="Sincronizar MongoDB → Sheets (propiedades pendientes)")
    parser.add_argument("--portal", type=str, default=None,
                        help="Filtrar solo un portal (ej: INMUEBLES24, PINCALI, VIVANUNCIOS, MITULA, CASAS_Y_TERRENOS, NOCNOK)")
    args = parser.parse_args()

    if args.status:
        tareas = cargar_progreso()
        if tareas:
            mostrar_status(tareas, portal=args.portal)
        else:
            print("No hay progreso guardado. Corre sin --status para iniciar.")
    elif args.sync_sheets:
        print("Sincronizando MongoDB → Google Sheets...")
        try:
            sheets = SheetsClient()
            sync_mongo_a_sheets(sheets)
        except Exception as e:
            print(f"Error: {e}")
    elif args.portal and args.portal.upper() == "NOCNOK":
        # NOCNOK usa API JSON — no necesita el sistema de zonas ni enricher separado
        import os
        from dotenv import load_dotenv
        from pymongo import MongoClient
        from scrapers.nocnok import scrapear_jalisco
        load_dotenv()
        col = MongoClient(os.getenv("MONGO_URL"))["propvalu"]["mercado_props"]
        print("=== NOCNOK scraper iniciando ===")
        n = scrapear_jalisco(col)
        print(f"=== NOCNOK terminado: {n} props ===")
    else:
        run(reset=args.reset, portal=args.portal)
