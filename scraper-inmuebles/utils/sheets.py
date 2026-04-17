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

    def _cargar_ids_existentes(self, ws: gspread.Worksheet) -> dict[str, int]:
        """
        Lee todos los id_unico existentes en la hoja y retorna
        un dict {id_unico: numero_fila_1based}.
        """
        # Obtener toda la columna A (id_unico) de una sola llamada a la API
        ids_col = _con_retry(lambda: ws.col_values(COL_ID_UNICO + 1))  # gspread usa índice 1-based
        return {id_: idx + 1 for idx, id_ in enumerate(ids_col) if id_ and idx > 0}

    def upsert_propiedades(
        self,
        propiedades: list[dict],
        tab_name: str,
    ) -> dict[str, int]:
        """
        Inserta propiedades nuevas y actualiza las existentes en la pestaña indicada.
        Retorna estadísticas: {nuevas, actualizadas}.

        Args:
            propiedades: lista de dicts normalizados (salida de cleaner.normalizar_propiedad)
            tab_name: nombre de la pestaña destino
        """
        if not propiedades:
            return {"nuevas": 0, "actualizadas": 0}

        log = logger.bind(portal=tab_name)
        ws = self._get_ws(tab_name)
        ids_existentes = self._cargar_ids_existentes(ws)

        filas_nuevas = []
        updates_batch = []  # Para batch_update — evita 429 de quota
        actualizadas = 0

        for prop in propiedades:
            fila = propiedad_a_fila(prop)
            id_unico = prop["id_unico"]

            if id_unico in ids_existentes:
                num_fila = ids_existentes[id_unico]
                updates_batch.append({
                    "range": f"A{num_fila}:V{num_fila}",
                    "values": [fila],
                })
                actualizadas += 1
            else:
                filas_nuevas.append(fila)

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

        return {"nuevas": len(filas_nuevas), "actualizadas": actualizadas}

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
