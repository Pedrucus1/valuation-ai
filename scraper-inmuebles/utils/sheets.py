"""
utils/sheets.py — Integración con Google Sheets via gspread.
Crea pestañas automáticamente, hace upsert de propiedades
y marca como inactivas las que ya no aparecen en el portal.
"""

import time
import random
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
from loguru import logger


def _con_retry(fn, max_intentos=5, espera_base=10):
    """Reintenta fn() si recibe 429, con espera exponencial + jitter."""
    for intento in range(max_intentos):
        try:
            return fn()
        except gspread.exceptions.APIError as e:
            if "429" in str(e) and intento < max_intentos - 1:
                espera = espera_base * (2 ** intento) + random.uniform(1, 5)
                logger.warning(f"Sheets 429 — reintentando en {espera:.0f}s (intento {intento+1}/{max_intentos})")
                time.sleep(espera)
            else:
                raise

import config
from utils.cleaner import propiedad_a_fila

# Permisos necesarios para leer/escribir Sheets y Drive
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Columna del id_unico en la hoja (A=1, índice 0-based = 0)
# HEADERS: id_unico(0) titulo(1) precio(2) moneda(3) tipo_op(4) tipo_prop(5)
#          colonia(6) municipio(7) estado(8) recamaras(9) banos(10)
#          m2_const(11) m2_terreno(12) estac(13) año_const(14) desc(15)
#          url(16) nombre_agente(17) fecha_pub(18) portal(19) fecha_scraping(20) activo(21)
COL_ID_UNICO       = 0
COL_ACTIVO         = 21   # Columna V (índice 0-based)
COL_FECHA_SCRAPING = 20   # Columna U


class SheetsClient:
    """
    Cliente para interactuar con Google Sheets.
    Maneja autenticación, creación de pestañas y escritura de datos.
    """

    def __init__(self):
        creds = Credentials.from_service_account_file(
            config.CREDENTIALS_PATH,
            scopes=SCOPES,
        )
        self.gc = gspread.authorize(creds)
        self.spreadsheet = self.gc.open_by_key(config.GOOGLE_SHEET_ID)
        logger.bind(portal="SHEETS").info("Conexión a Google Sheets establecida ✓")

        # Crear pestañas si no existen y expandir headers si faltan columnas
        self._inicializar_pestanas()
        self._expandir_headers_si_faltan()

    def _inicializar_pestanas(self):
        """Crea las pestañas requeridas si aún no existen en el spreadsheet."""
        log = logger.bind(portal="SHEETS")
        tabs_existentes = {ws.title for ws in self.spreadsheet.worksheets()}

        for tab in config.TODAS_LAS_TABS:
            if tab not in tabs_existentes:
                ws = self.spreadsheet.add_worksheet(title=tab, rows=10000, cols=30)
                # Agregar encabezados según el tipo de pestaña
                if tab == config.TAB_LOG:
                    ws.append_row(config.HEADERS_LOG)
                else:
                    ws.append_row(config.HEADERS_PROPIEDADES)
                log.info(f"Pestaña '{tab}' creada con encabezados")
            else:
                log.debug(f"Pestaña '{tab}' ya existe")

    def _expandir_headers_si_faltan(self):
        """
        Verifica que cada pestaña de propiedades tenga los 22 encabezados correctos.
        Si fue creada con una versión anterior (19 columnas, hasta fecha_publicacion),
        actualiza la fila 1 completa con los headers actuales para evitar el error
        APIError [400]: tried writing to column [T].
        """
        log = logger.bind(portal="SHEETS")
        n_esperado = len(config.HEADERS_PROPIEDADES)

        for tab in config.TODAS_LAS_TABS:
            if tab == config.TAB_LOG:
                continue
            try:
                ws = self._get_ws(tab)
                primera_fila = _con_retry(lambda ws=ws: ws.row_values(1))
                if len(primera_fila) < n_esperado:
                    _con_retry(lambda ws=ws: ws.update("A1", [config.HEADERS_PROPIEDADES], value_input_option="USER_ENTERED"))
                    log.info(
                        f"Tab '{tab}': headers expandidos "
                        f"{len(primera_fila)} → {n_esperado} columnas ✓"
                    )
                time.sleep(1)
            except Exception as e:
                log.warning(f"Tab '{tab}': no se pudieron verificar headers: {e}")

    def _get_ws(self, tab_name: str) -> gspread.Worksheet:
        """Obtiene una pestaña por nombre."""
        return self.spreadsheet.worksheet(tab_name)

    def _cargar_ids_existentes(self, ws: gspread.Worksheet) -> tuple[dict, set]:
        """
        Lee id_unico (col A) + precio (col C) + m2c (col L) + municipio (col H).
        Retorna (dict id_unico→fila, set de content_keys para dedup por contenido).
        Content key: municipio|m2c|precio_redondeado — detecta misma propiedad con URL distinta.
        """
        # Una sola llamada: obtener columnas A, C, H, L (1,3,8,12) — evita Sheets quota
        try:
            data = _con_retry(lambda: ws.get_all_values())
        except Exception:
            return {}, set()

        ids_map = {}
        content_keys = set()
        for idx, row in enumerate(data):
            if idx == 0:  # header
                continue
            id_val = row[0] if len(row) > 0 else ''
            if id_val:
                ids_map[id_val] = idx + 1
            # Content key: municipio(7) + m2c(11) + precio_bucket(2)
            try:
                muni  = (row[7] if len(row) > 7 else '').lower().strip()
                m2c   = int(float((row[11] if len(row) > 11 else '') or 0))
                precio = float((row[2] if len(row) > 2 else '').replace(',','').replace('$','') or 0)
                # Precio en bucket de 2% para tolerancia de redondeo
                p_bucket = round(precio / max(precio * 0.02, 1))
                if muni and m2c > 0 and precio > 0:
                    content_keys.add(f"{muni}|{m2c}|{p_bucket}")
            except (ValueError, TypeError):
                pass
        return ids_map, content_keys

    @staticmethod
    def _content_key(prop: dict) -> str:
        """Genera clave de contenido para dedup: municipio|m2c|precio_bucket."""
        muni   = (prop.get('municipio') or '').lower().strip()
        m2c    = int(float(prop.get('m2_construccion') or 0))
        precio = float(prop.get('precio') or 0)
        p_bucket = round(precio / max(precio * 0.02, 1))
        return f"{muni}|{m2c}|{p_bucket}" if (muni and m2c > 0 and precio > 0) else ''

    def upsert_propiedades(
        self,
        propiedades: list[dict],
        tab_name: str,
    ) -> dict[str, int]:
        """
        Inserta propiedades nuevas y actualiza las existentes en la pestaña indicada.
        Dedup doble: por id_unico (URL) y por contenido (municipio+m2c+precio ±2%).
        Retorna estadísticas: {nuevas, actualizadas, duplicados_contenido}.
        """
        # Sheets CORTADO (30-jun-2026): Mongo es la fuente única. No-op reversible (ENABLE_SHEETS=1
        # para re-habilitar). Retorna forma normal para no romper a los callers ni el flujo de buffer.
        if not config.ENABLE_SHEETS:
            return {"nuevas": 0, "actualizadas": 0, "duplicados_contenido": 0}
        if not propiedades:
            return {"nuevas": 0, "actualizadas": 0, "duplicados_contenido": 0}

        log = logger.bind(portal=tab_name)
        ws = self._get_ws(tab_name)
        ids_existentes, content_keys_existentes = self._cargar_ids_existentes(ws)

        filas_nuevas = []
        updates_batch = []
        actualizadas = 0
        dups_contenido = 0
        # content keys de propiedades ya agregadas en ESTE batch (evita dupes entre sí)
        batch_content_keys = set()

        for prop in propiedades:
            fila = propiedad_a_fila(prop)
            id_unico = prop["id_unico"]
            ck = self._content_key(prop)

            if id_unico in ids_existentes:
                num_fila = ids_existentes[id_unico]
                updates_batch.append({
                    "range": f"A{num_fila}:W{num_fila}",
                    "values": [fila],
                })
                actualizadas += 1
            elif ck and (ck in content_keys_existentes or ck in batch_content_keys):
                # Misma propiedad con URL diferente (multi-agente, re-scraping)
                dups_contenido += 1
            else:
                filas_nuevas.append(fila)
                if ck:
                    batch_content_keys.add(ck)

        if dups_contenido:
            log.debug(f"{dups_contenido} propiedades omitidas por duplicado de contenido")

        # Batch update para filas existentes (1 sola llamada API vs N llamadas)
        if updates_batch:
            _con_retry(lambda: ws.batch_update(updates_batch, value_input_option="USER_ENTERED"))

        # Append sin table_range: evita que el API detecte la tabla como 19 cols
        # y bloquee escribir en columna T+ (el bug que causaba el [400])
        if filas_nuevas:
            _con_retry(lambda: ws.append_rows(filas_nuevas, value_input_option="USER_ENTERED"))
            log.info(f"{len(filas_nuevas)} propiedades nuevas escritas en '{tab_name}'")

        if actualizadas:
            log.info(f"{actualizadas} propiedades actualizadas en '{tab_name}'")

        return {"nuevas": len(filas_nuevas), "actualizadas": actualizadas, "duplicados_contenido": dups_contenido}

    def marcar_inactivas(self, ids_activos: set[str], tab_name: str) -> int:
        """
        Marca como activo=FALSE las propiedades que ya no aparecen en el portal.

        Args:
            ids_activos: conjunto de id_unico que SÍ aparecieron en el scraping
            tab_name: pestaña a revisar

        Returns:
            Número de propiedades marcadas como inactivas
        """
        ws = self._get_ws(tab_name)
        ids_en_hoja = self._cargar_ids_existentes(ws)
        inactivas = 0

        for id_unico, num_fila in ids_en_hoja.items():
            if id_unico and id_unico not in ids_activos:
                # Marcar columna S (activo) como FALSE
                ws.update_cell(num_fila, COL_ACTIVO + 1, "FALSE")
                inactivas += 1

        if inactivas:
            logger.bind(portal=tab_name).info(
                f"{inactivas} propiedades marcadas como inactivas"
            )
        return inactivas

    def actualizar_consolidado(self, todas_propiedades: list[dict]) -> dict[str, int]:
        """
        Actualiza la pestaña CONSOLIDADO con todas las propiedades de todos
        los portales, eliminando duplicados por url_original.

        Args:
            todas_propiedades: lista unificada de todas las propiedades normalizadas

        Returns:
            estadísticas de escritura
        """
        if not todas_propiedades:
            return {"nuevas": 0, "actualizadas": 0}

        # Deduplicar por id_unico (que es hash de URL)
        visto = {}
        for prop in todas_propiedades:
            id_ = prop["id_unico"]
            if id_ not in visto:
                visto[id_] = prop

        unicas = list(visto.values())
        logger.bind(portal="CONSOLIDADO").info(
            f"Consolidando {len(todas_propiedades)} props → {len(unicas)} únicas "
            f"({len(todas_propiedades) - len(unicas)} duplicados eliminados)"
        )

        return self.upsert_propiedades(unicas, config.TAB_CONSOLIDADO)

    def append_fila_log(self, fila: list):
        """Agrega una fila a la pestaña LOG."""
        ws = self._get_ws(config.TAB_LOG)
        _con_retry(lambda: ws.append_row(fila, value_input_option="USER_ENTERED"))
