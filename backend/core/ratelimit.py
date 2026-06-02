"""Rate limiting compartido (slowapi). Limiter único para toda la app.

Detrás del proxy de Railway/Vercel el IP del cliente viene en X-Forwarded-For;
`request.client.host` sería el del proxy (todos compartirían cubeta). Por eso
la key usa el primer IP de XFF cuando existe.
"""
from slowapi import Limiter
from starlette.requests import Request


def client_key(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "anon"


limiter = Limiter(key_func=client_key)
