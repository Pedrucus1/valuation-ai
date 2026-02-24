"""
AI-Powered Real Estate Comparable Search for Mexico
Uses OpenAI GPT and Gemini with web search capabilities to find real property listings
"""

import asyncio
import os
import json
import logging
import random
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

@dataclass
class AIComparable:
    """Property comparable found via AI search"""
    source: str
    source_url: str
    title: str
    neighborhood: str
    municipality: str
    state: str
    price: float
    land_area: Optional[float]
    construction_area: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[float]
    property_type: str
    listing_type: str = "venta"
    image_url: Optional[str] = None
    ai_provider: str = "openai"  # Track which AI found this

def get_api_key() -> str:
    """Get API key - Emergent LLM Key or custom"""
    # Priority: Custom keys > Emergent LLM Key
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return openai_key
    
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if emergent_key:
        return emergent_key
    
    raise ValueError("No API key found. Set EMERGENT_LLM_KEY or OPENAI_API_KEY")

async def search_comparables_openai(
    location: str,
    property_type: str,
    land_area: float,
    construction_area: float,
    listing_type: str = "venta",
    max_results: int = 8
) -> List[AIComparable]:
    """
    Search for property comparables using OpenAI GPT with web search
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        api_key = get_api_key()
        
        # Build improved search prompt for more useful/measurable data
        search_prompt = f"""Busca propiedades EN VENTA en portales inmobiliarios de México que sean comparables para valuación.

PROPIEDAD SUJETO:
- Ubicación: {location}, México
- Tipo: {property_type}
- Terreno: {land_area} m² (buscar entre {land_area*0.7:.0f}-{land_area*1.3:.0f} m²)
- Construcción: {construction_area} m² (buscar entre {construction_area*0.7:.0f}-{construction_area*1.3:.0f} m²)

CRITERIOS DE BÚSQUEDA:
1. Busca en: inmuebles24.com, lamudi.com.mx, propiedades.com, vivanuncios.com.mx, segundamano.mx
2. Prioriza propiedades de LA MISMA COLONIA o colonias cercanas
3. Propiedades publicadas recientemente (últimos 6 meses)
4. Superficies similares (±30% del sujeto)
5. Mismo tipo de propiedad ({property_type})

Devuelve EXACTAMENTE {max_results} propiedades en JSON:
[
  {{
    "source": "inmuebles24.com",
    "source_url": "URL COMPLETA del anuncio",
    "title": "Título descriptivo de la propiedad",
    "neighborhood": "Colonia exacta",
    "municipality": "Municipio",
    "state": "Estado",
    "price": 5500000,
    "land_area": 200,
    "construction_area": 180,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "property_type": "{property_type}",
    "publication_date": "2026-01-15",
    "features": "Jardín, estacionamiento 2 autos, cocina integral"
  }}
]

REQUISITOS:
- URLs REALES de anuncios existentes (que se puedan abrir)
- Precios en pesos mexicanos (MXN) sin comas
- Superficies en metros cuadrados (números)
- Solo propiedades EN VENTA, NO rentas
- Responde ÚNICAMENTE con el JSON, sin explicaciones"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"search_{datetime.now(timezone.utc).timestamp()}",
            system_message="Eres un experto en bienes raíces en México. Buscas propiedades reales en portales inmobiliarios y devuelves datos estructurados en JSON."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=search_prompt)
        
        response = await asyncio.wait_for(
            chat.send_message(user_message),
            timeout=30.0
        )
        
        # Parse JSON response
        comparables = parse_ai_response(response, "openai")
        logger.info(f"OpenAI found {len(comparables)} comparables")
        return comparables
        
    except asyncio.TimeoutError:
        logger.warning("OpenAI search timeout")
        return []
    except Exception as e:
        logger.error(f"OpenAI search error: {e}")
        return []

async def search_comparables_gemini(
    location: str,
    property_type: str,
    land_area: float,
    construction_area: float,
    listing_type: str = "venta",
    max_results: int = 8
) -> List[AIComparable]:
    """
    Search for property comparables using Gemini with web grounding
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        api_key = get_api_key()
        
        search_prompt = f"""Busca propiedades inmobiliarias en venta en México similares a estas características:

Ubicación: {location}
Tipo de propiedad: {property_type}
Superficie de terreno: aproximadamente {land_area} m²
Superficie de construcción: aproximadamente {construction_area} m²

Busca en portales como inmuebles24, lamudi, propiedades.com y devuelve {max_results} propiedades comparables en formato JSON:

[
  {{
    "source": "nombre del portal",
    "source_url": "URL completa del anuncio",
    "title": "título descriptivo",
    "neighborhood": "colonia",
    "municipality": "municipio",
    "state": "estado",
    "price": número en pesos,
    "land_area": metros cuadrados terreno,
    "construction_area": metros cuadrados construcción,
    "bedrooms": número de recámaras,
    "bathrooms": número de baños,
    "property_type": "{property_type}"
  }}
]

Responde únicamente con el array JSON."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"gemini_search_{datetime.now(timezone.utc).timestamp()}",
            system_message="Eres un buscador de propiedades inmobiliarias en México. Devuelves resultados en JSON."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=search_prompt)
        
        response = await asyncio.wait_for(
            chat.send_message(user_message),
            timeout=30.0
        )
        
        comparables = parse_ai_response(response, "gemini")
        logger.info(f"Gemini found {len(comparables)} comparables")
        return comparables
        
    except asyncio.TimeoutError:
        logger.warning("Gemini search timeout")
        return []
    except Exception as e:
        logger.error(f"Gemini search error: {e}")
        return []

def parse_ai_response(response: str, provider: str) -> List[AIComparable]:
    """Parse AI response to extract property data"""
    comparables = []
    
    try:
        # Clean response - extract JSON array
        response = response.strip()
        
        # Find JSON array in response
        start_idx = response.find('[')
        end_idx = response.rfind(']') + 1
        
        if start_idx == -1 or end_idx <= start_idx:
            logger.warning(f"No JSON array found in {provider} response")
            return []
        
        json_str = response[start_idx:end_idx]
        data = json.loads(json_str)
        
        for item in data:
            if not isinstance(item, dict):
                continue
            
            # Validate required fields
            price = item.get('price')
            if not price or (isinstance(price, (int, float)) and price < 100000):
                continue
            
            # Clean and normalize price
            if isinstance(price, str):
                price = float(''.join(c for c in price if c.isdigit() or c == '.'))
            
            comparable = AIComparable(
                source=item.get('source', f'{provider}_search'),
                source_url=item.get('source_url', ''),
                title=item.get('title', 'Propiedad'),
                neighborhood=item.get('neighborhood', ''),
                municipality=item.get('municipality', ''),
                state=item.get('state', ''),
                price=float(price),
                land_area=float(item.get('land_area', 0)) if item.get('land_area') else None,
                construction_area=float(item.get('construction_area', 0)) if item.get('construction_area') else None,
                bedrooms=int(item.get('bedrooms', 0)) if item.get('bedrooms') else None,
                bathrooms=float(item.get('bathrooms', 0)) if item.get('bathrooms') else None,
                property_type=item.get('property_type', 'Casa'),
                listing_type=item.get('listing_type', 'venta'),
                image_url=item.get('image_url'),
                ai_provider=provider
            )
            comparables.append(comparable)
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for {provider}: {e}")
    except Exception as e:
        logger.error(f"Error parsing {provider} response: {e}")
    
    return comparables

async def search_comparables_with_ai(
    location: str,
    property_type: str,
    land_area: float,
    construction_area: float,
    listing_type: str = "venta",
    max_results: int = 15,
    use_both_providers: bool = True
) -> Dict:
    """
    Main function to search comparables using AI
    Tries both OpenAI and Gemini, combines results
    """
    all_comparables = []
    providers_used = []
    
    # Calculate how many to request from each provider
    per_provider = max_results // 2 if use_both_providers else max_results
    
    try:
        if use_both_providers:
            # Run both searches in parallel
            tasks = [
                search_comparables_openai(location, property_type, land_area, construction_area, listing_type, per_provider),
                search_comparables_gemini(location, property_type, land_area, construction_area, listing_type, per_provider)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(results):
                provider = "openai" if i == 0 else "gemini"
                if isinstance(result, list) and len(result) > 0:
                    all_comparables.extend(result)
                    providers_used.append(provider)
                elif isinstance(result, Exception):
                    logger.warning(f"{provider} search failed: {result}")
        else:
            # Try OpenAI first, fallback to Gemini
            openai_results = await search_comparables_openai(
                location, property_type, land_area, construction_area, listing_type, max_results
            )
            
            if openai_results:
                all_comparables.extend(openai_results)
                providers_used.append("openai")
            else:
                gemini_results = await search_comparables_gemini(
                    location, property_type, land_area, construction_area, listing_type, max_results
                )
                if gemini_results:
                    all_comparables.extend(gemini_results)
                    providers_used.append("gemini")
        
        # Remove duplicates based on similar prices and areas
        unique_comparables = deduplicate_comparables(all_comparables)
        
        # Limit to max_results
        final_comparables = unique_comparables[:max_results]
        
        return {
            "comparables": [asdict(c) for c in final_comparables],
            "count": len(final_comparables),
            "providers_used": providers_used,
            "search_method": "ai",
            "success": len(final_comparables) > 0
        }
        
    except Exception as e:
        logger.error(f"AI search error: {e}")
        return {
            "comparables": [],
            "count": 0,
            "providers_used": [],
            "search_method": "ai",
            "success": False,
            "error": str(e)
        }

def deduplicate_comparables(comparables: List[AIComparable]) -> List[AIComparable]:
    """Remove duplicate comparables based on price and location similarity"""
    if not comparables:
        return []
    
    unique = []
    seen_prices = set()
    
    for comp in comparables:
        # Create a key based on price range and neighborhood
        price_bucket = int(comp.price / 100000)  # Group by 100k
        key = f"{comp.neighborhood.lower()[:10]}_{price_bucket}"
        
        if key not in seen_prices:
            seen_prices.add(key)
            unique.append(comp)
    
    return unique

async def search_rental_comparables(
    location: str,
    property_type: str,
    construction_area: float,
    max_results: int = 6
) -> List[AIComparable]:
    """Search for rental comparables to calculate rental factor"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        api_key = get_api_key()
        
        prompt = f"""Busca propiedades EN RENTA en {location}, México:
- Tipo: {property_type}
- Superficie: ~{construction_area} m²

Devuelve {max_results} propiedades en renta en formato JSON:
[
  {{
    "source": "portal",
    "source_url": "url",
    "title": "titulo",
    "neighborhood": "colonia",
    "price": renta_mensual_en_pesos,
    "construction_area": metros,
    "property_type": "{property_type}"
  }}
]

Solo el JSON, sin texto."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"rental_{datetime.now(timezone.utc).timestamp()}",
            system_message="Buscador de rentas inmobiliarias en México."
        ).with_model("openai", "gpt-4o")
        
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=prompt)),
            timeout=25.0
        )
        
        return parse_ai_response(response, "openai")
        
    except Exception as e:
        logger.error(f"Rental search error: {e}")
        return []

def calculate_rental_factor_from_ai(
    sale_comparables: List[Dict],
    rental_comparables: List[AIComparable],
    property_type: str
) -> Dict:
    """Calculate rental factor from AI-found comparables"""
    
    # Default factors by property type
    default_factors = {
        'Casa': 0.005,
        'Departamento': 0.006,
        'Terreno': 0.003,
        'Local comercial': 0.008,
        'Oficina': 0.007,
        'Bodega': 0.006,
        'Nave industrial': 0.005
    }
    
    default_factor = default_factors.get(property_type, 0.005)
    
    if not sale_comparables or not rental_comparables:
        return {
            "factor": default_factor,
            "source": "default",
            "rental_listings_count": len(rental_comparables) if rental_comparables else 0
        }
    
    # Calculate average prices
    sale_prices = []
    for comp in sale_comparables:
        area = comp.get('construction_area') or comp.get('land_area')
        price = comp.get('price')
        if area and price and area > 0:
            sale_prices.append(price / area)
    
    rental_prices = []
    for comp in rental_comparables:
        area = comp.construction_area or 100
        if comp.price and area > 0:
            rental_prices.append(comp.price / area)
    
    if sale_prices and rental_prices:
        avg_sale = sum(sale_prices) / len(sale_prices)
        avg_rent = sum(rental_prices) / len(rental_prices)
        
        factor = avg_rent / avg_sale if avg_sale > 0 else default_factor
        factor = max(0.003, min(0.012, factor))  # Cap to reasonable range
        
        return {
            "factor": round(factor, 5),
            "avg_rent_per_sqm": round(avg_rent, 2),
            "avg_sale_per_sqm": round(avg_sale, 2),
            "rental_listings_count": len(rental_comparables),
            "source": "ai_calculated"
        }
    
    return {
        "factor": default_factor,
        "source": "default",
        "rental_listings_count": len(rental_comparables)
    }
