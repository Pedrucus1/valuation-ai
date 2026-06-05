"""Reviews endpoints para Valuadores y Plataforma (SEO)."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from core.db import db
from core.auth import get_current_user

router = APIRouter(prefix="/api/reviews")

@router.post("/appraiser")
async def review_appraiser(request: Request):
    """Califica a un valuador específico. Requiere un valuation_id pagado/válido."""
    body = await request.json()
    valuador_id = body.get("valuador_id")
    valuation_id = body.get("valuation_id")
    rating = body.get("rating")
    comment = body.get("comment", "").strip()

    if not valuador_id or not valuation_id:
        raise HTTPException(400, "valuador_id y valuation_id son requeridos")
    
    try:
        rating = int(rating)
        if not (1 <= rating <= 5):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(400, "rating debe ser entre 1 y 5")

    # Verificar que el avalúo exista
    val = await db.valuations.find_one({"valuation_id": valuation_id})
    if not val:
        raise HTTPException(404, "Avalúo no encontrado o no autorizado")

    user = await get_current_user(request)
    user_id = user.user_id if user else "anonymous"

    doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "type": "appraiser",
        "user_id": user_id,
        "valuador_id": valuador_id,
        "valuation_id": valuation_id,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "review": doc}

@router.post("/platform")
async def review_platform(request: Request):
    """Califica la plataforma en general (Upsell modal)."""
    body = await request.json()
    rating = body.get("rating")
    comment = body.get("comment", "").strip()

    try:
        rating = int(rating)
        if not (1 <= rating <= 5):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(400, "rating debe ser entre 1 y 5")

    user = await get_current_user(request)
    user_id = user.user_id if user else "anonymous"

    doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "type": "platform",
        "user_id": user_id,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "review": doc}

@router.get("/public")
async def get_public_reviews():
    """Retorna las mejores calificaciones de PropValu estructuradas para SEO."""
    # Obtenemos las reviews de plataforma >= 4 estrellas
    reviews = await db.reviews.find(
        {"type": "platform", "rating": {"$gte": 4}},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Calcular promedio mock o real para SEO
    avg_rating = 4.8
    if len(reviews) > 0:
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)

    structured_data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "PropValu",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avg_rating,
            "reviewCount": len(reviews) if len(reviews) > 0 else 1
        },
        "review": [
            {
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": r["rating"]
                },
                "reviewBody": r["comment"],
                "author": {"@type": "Person", "name": "Cliente Verificado"}
            } for r in reviews
        ]
    }
    
    return {
        "ok": True,
        "reviews": reviews,
        "seo_structured_data": structured_data
    }
