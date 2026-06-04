"""
core/metrics.py — Métricas básicas en memoria (#66.5).

Sin dependencias externas (no Prometheus): un registro liviano que el
middleware HTTP alimenta por request y que el endpoint /api/metrics expone
como JSON. Pensado para una sola instancia (Railway 1 réplica); si se escala
a 2+ réplicas cada una reporta lo suyo (los contadores NO se agregan entre
instancias — para eso haría falta Prometheus/StatsD).

Lo que mide:
  - Conteo de requests por (método, ruta-plantilla, clase de status 2xx/4xx/5xx)
  - Latencia por ruta: suma, conteo, máximo (avg = suma/conteo)
  - Total de errores (status >= 500)
  - Uptime del proceso
"""

import time
from collections import defaultdict
from threading import Lock

_STARTED_AT = time.time()
_lock = Lock()

# (method, route, status_class) -> count
_req_count: dict = defaultdict(int)
# route -> [suma_ms, conteo, max_ms]
_latency: dict = defaultdict(lambda: [0.0, 0, 0.0])
_errors_total = 0


def _status_class(status: int) -> str:
    return f"{status // 100}xx"


def record(method: str, route: str, status: int, dur_ms: float) -> None:
    """Registra un request. Llamado por el middleware HTTP tras cada respuesta."""
    global _errors_total
    with _lock:
        _req_count[(method, route, _status_class(status))] += 1
        lat = _latency[route]
        lat[0] += dur_ms
        lat[1] += 1
        if dur_ms > lat[2]:
            lat[2] = dur_ms
        if status >= 500:
            _errors_total += 1


def snapshot() -> dict:
    """Devuelve una foto serializable de las métricas acumuladas."""
    with _lock:
        requests = [
            {"method": m, "route": r, "status": sc, "count": c}
            for (m, r, sc), c in sorted(_req_count.items(), key=lambda kv: -kv[1])
        ]
        latency = {
            route: {
                "count": cnt,
                "avg_ms": round(suma / cnt, 1) if cnt else 0.0,
                "max_ms": round(mx, 1),
            }
            for route, (suma, cnt, mx) in sorted(
                _latency.items(), key=lambda kv: -(kv[1][0] / kv[1][1] if kv[1][1] else 0)
            )
        }
        total_req = sum(_req_count.values())
        return {
            "uptime_seconds": round(time.time() - _STARTED_AT, 1),
            "requests_total": total_req,
            "errors_total": _errors_total,
            "error_rate": round(_errors_total / total_req, 4) if total_req else 0.0,
            "requests": requests,
            "latency_by_route": latency,
        }


def uptime_seconds() -> float:
    return round(time.time() - _STARTED_AT, 1)
