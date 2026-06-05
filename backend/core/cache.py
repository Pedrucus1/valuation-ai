"""Caché en memoria simple (TTL y tamaño máximo) para endpoints de mercado."""
from typing import Any
from cachetools import TTLCache

# Caché limitada a 1000 elementos, expiran en 30 minutos (1800s)
_mercado_cache = TTLCache(maxsize=1000, ttl=1800)

def _cache_get(key: str):
    return _mercado_cache.get(key)

def _cache_set(key: str, data: Any):
    _mercado_cache[key] = data

