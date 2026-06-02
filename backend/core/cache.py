"""Caché en memoria simple (TTL) para endpoints de mercado."""
import time as _time
from typing import Any, Dict

_mercado_cache: Dict[str, Any] = {}
_CACHE_TTL = 1800  # 30 min


def _cache_get(key: str):
    entry = _mercado_cache.get(key)
    if entry and (_time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data: Any):
    _mercado_cache[key] = {"data": data, "ts": _time.time()}
