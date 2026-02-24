"""
Real Estate Web Scraper for Mexican Property Portals
Scrapes inmuebles24, lamudi, vivanuncios, propiedades.com
"""

import asyncio
import aiohttp
from bs4 import BeautifulSoup
import re
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
import random

logger = logging.getLogger(__name__)

@dataclass
class ScrapedProperty:
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
    listing_type: str  # venta or renta
    image_url: Optional[str] = None

# User agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

def parse_price(price_str: str) -> Optional[float]:
    """Extract numeric price from string"""
    if not price_str:
        return None
    # Remove currency symbols, commas, and text
    clean = re.sub(r'[^\d.]', '', price_str.replace(',', ''))
    try:
        return float(clean) if clean else None
    except ValueError:
        return None

def parse_area(area_str: str) -> Optional[float]:
    """Extract area in m² from string"""
    if not area_str:
        return None
    match = re.search(r'([\d,]+(?:\.\d+)?)\s*m', area_str.replace(',', ''))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None

def normalize_property_type(text: str) -> str:
    """Normalize property type to standard categories"""
    text_lower = text.lower()
    if 'departamento' in text_lower or 'depto' in text_lower or 'apartamento' in text_lower:
        return 'Departamento'
    elif 'casa' in text_lower:
        return 'Casa'
    elif 'terreno' in text_lower or 'lote' in text_lower:
        return 'Terreno'
    elif 'local' in text_lower or 'comercial' in text_lower:
        return 'Local comercial'
    elif 'oficina' in text_lower:
        return 'Oficina'
    elif 'bodega' in text_lower:
        return 'Bodega'
    elif 'nave' in text_lower or 'industrial' in text_lower:
        return 'Nave industrial'
    return 'Casa'  # Default

async def scrape_inmuebles24(session: aiohttp.ClientSession, location: str, property_type: str, listing_type: str = "venta") -> List[ScrapedProperty]:
    """Scrape inmuebles24.com"""
    properties = []
    
    # Map property types to inmuebles24 categories
    type_map = {
        'Casa': 'casas',
        'Departamento': 'departamentos',
        'Terreno': 'terrenos',
        'Local comercial': 'locales-comerciales',
        'Oficina': 'oficinas',
        'Bodega': 'bodegas',
        'Nave industrial': 'naves-industriales'
    }
    
    prop_category = type_map.get(property_type, 'inmuebles')
    location_slug = location.lower().replace(' ', '-').replace(',', '')
    
    url = f"https://www.inmuebles24.com/{prop_category}-en-{listing_type}-en-{location_slug}.html"
    
    try:
        async with session.get(url, headers=get_headers(), timeout=aiohttp.ClientTimeout(total=15)) as response:
            if response.status != 200:
                logger.warning(f"inmuebles24 returned {response.status} for {url}")
                return properties
            
            html = await response.text()
            soup = BeautifulSoup(html, 'lxml')
            
            # Find property cards
            cards = soup.select('div[data-qa="posting PROPERTY"]') or soup.select('.posting-card')
            
            for card in cards[:15]:  # Limit to 15 per source
                try:
                    # Extract data
                    title_elem = card.select_one('a.posting-title, .posting-title a, h2 a')
                    price_elem = card.select_one('.price, [data-qa="POSTING_CARD_PRICE"]')
                    location_elem = card.select_one('.posting-location, [data-qa="POSTING_CARD_LOCATION"]')
                    
                    if not price_elem:
                        continue
                    
                    price = parse_price(price_elem.get_text())
                    if not price or price < 100000:  # Filter unrealistic prices
                        continue
                    
                    # Get link
                    link = title_elem.get('href', '') if title_elem else ''
                    if link and not link.startswith('http'):
                        link = f"https://www.inmuebles24.com{link}"
                    
                    # Extract areas
                    features = card.select('.posting-main-features li, .main-features span')
                    land_area = None
                    construction_area = None
                    bedrooms = None
                    bathrooms = None
                    
                    for feat in features:
                        text = feat.get_text().lower()
                        if 'terreno' in text or 'total' in text:
                            land_area = parse_area(text)
                        elif 'construid' in text or 'cubierta' in text:
                            construction_area = parse_area(text)
                        elif 'recámara' in text or 'habitac' in text:
                            match = re.search(r'(\d+)', text)
                            if match:
                                bedrooms = int(match.group(1))
                        elif 'baño' in text:
                            match = re.search(r'(\d+(?:\.\d+)?)', text)
                            if match:
                                bathrooms = float(match.group(1))
                    
                    # Get image
                    img_elem = card.select_one('img')
                    img_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
                    
                    location_text = location_elem.get_text().strip() if location_elem else location
                    
                    properties.append(ScrapedProperty(
                        source="inmuebles24.com",
                        source_url=link,
                        title=title_elem.get_text().strip() if title_elem else "Propiedad",
                        neighborhood=location_text.split(',')[0].strip() if ',' in location_text else location_text,
                        municipality=location.split(',')[0].strip() if ',' in location else location,
                        state=location.split(',')[-1].strip() if ',' in location else "",
                        price=price,
                        land_area=land_area,
                        construction_area=construction_area or land_area,
                        bedrooms=bedrooms,
                        bathrooms=bathrooms,
                        property_type=property_type,
                        listing_type=listing_type,
                        image_url=img_url
                    ))
                    
                except Exception as e:
                    logger.debug(f"Error parsing inmuebles24 card: {e}")
                    continue
                    
    except Exception as e:
        logger.error(f"Error scraping inmuebles24: {e}")
    
    return properties

async def scrape_lamudi(session: aiohttp.ClientSession, location: str, property_type: str, listing_type: str = "venta") -> List[ScrapedProperty]:
    """Scrape lamudi.com.mx"""
    properties = []
    
    type_map = {
        'Casa': 'casa',
        'Departamento': 'departamento',
        'Terreno': 'terreno',
        'Local comercial': 'local-comercial',
        'Oficina': 'oficina',
        'Bodega': 'bodega',
        'Nave industrial': 'nave-industrial'
    }
    
    prop_category = type_map.get(property_type, 'casa')
    location_slug = location.lower().replace(' ', '-').replace(',', '-')
    
    operation = "for-sale" if listing_type == "venta" else "for-rent"
    url = f"https://www.lamudi.com.mx/{location_slug}/{prop_category}/{operation}/"
    
    try:
        async with session.get(url, headers=get_headers(), timeout=aiohttp.ClientTimeout(total=15)) as response:
            if response.status != 200:
                logger.warning(f"lamudi returned {response.status}")
                return properties
            
            html = await response.text()
            soup = BeautifulSoup(html, 'lxml')
            
            cards = soup.select('.listing-card, article.ListingCell')
            
            for card in cards[:15]:
                try:
                    title_elem = card.select_one('.listing-card__title, .ListingCell-KeyInfo-title')
                    price_elem = card.select_one('.listing-card__price, .PriceSection-FirstPrice')
                    
                    if not price_elem:
                        continue
                    
                    price = parse_price(price_elem.get_text())
                    if not price or price < 100000:
                        continue
                    
                    link_elem = card.select_one('a')
                    link = link_elem.get('href', '') if link_elem else ''
                    if link and not link.startswith('http'):
                        link = f"https://www.lamudi.com.mx{link}"
                    
                    # Features
                    land_area = None
                    construction_area = None
                    
                    area_elems = card.select('.KeyValue, .listing-card__features span')
                    for elem in area_elems:
                        text = elem.get_text().lower()
                        area_val = parse_area(text)
                        if area_val:
                            if 'terreno' in text:
                                land_area = area_val
                            else:
                                construction_area = area_val
                    
                    img_elem = card.select_one('img')
                    img_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
                    
                    properties.append(ScrapedProperty(
                        source="lamudi.com.mx",
                        source_url=link,
                        title=title_elem.get_text().strip() if title_elem else "Propiedad",
                        neighborhood=location.split(',')[0].strip(),
                        municipality=location.split(',')[0].strip() if ',' in location else location,
                        state=location.split(',')[-1].strip() if ',' in location else "",
                        price=price,
                        land_area=land_area,
                        construction_area=construction_area or land_area,
                        bedrooms=None,
                        bathrooms=None,
                        property_type=property_type,
                        listing_type=listing_type,
                        image_url=img_url
                    ))
                    
                except Exception as e:
                    logger.debug(f"Error parsing lamudi card: {e}")
                    continue
                    
    except Exception as e:
        logger.error(f"Error scraping lamudi: {e}")
    
    return properties

async def scrape_propiedades_com(session: aiohttp.ClientSession, location: str, property_type: str, listing_type: str = "venta") -> List[ScrapedProperty]:
    """Scrape propiedades.com"""
    properties = []
    
    type_map = {
        'Casa': 'casas',
        'Departamento': 'departamentos',
        'Terreno': 'terrenos',
        'Local comercial': 'locales',
        'Oficina': 'oficinas',
        'Bodega': 'bodegas',
        'Nave industrial': 'naves'
    }
    
    prop_category = type_map.get(property_type, 'casas')
    location_slug = location.lower().replace(' ', '-').replace(',', '')
    
    url = f"https://propiedades.com/{prop_category}-{listing_type}/{location_slug}"
    
    try:
        async with session.get(url, headers=get_headers(), timeout=aiohttp.ClientTimeout(total=15)) as response:
            if response.status != 200:
                return properties
            
            html = await response.text()
            soup = BeautifulSoup(html, 'lxml')
            
            cards = soup.select('.property-card, .listing-item')
            
            for card in cards[:10]:
                try:
                    price_elem = card.select_one('.price, .property-price')
                    if not price_elem:
                        continue
                    
                    price = parse_price(price_elem.get_text())
                    if not price or price < 100000:
                        continue
                    
                    title_elem = card.select_one('.title, .property-title, h3')
                    link_elem = card.select_one('a')
                    link = link_elem.get('href', '') if link_elem else ''
                    if link and not link.startswith('http'):
                        link = f"https://propiedades.com{link}"
                    
                    properties.append(ScrapedProperty(
                        source="propiedades.com",
                        source_url=link,
                        title=title_elem.get_text().strip() if title_elem else "Propiedad",
                        neighborhood=location.split(',')[0].strip(),
                        municipality=location.split(',')[0].strip(),
                        state=location.split(',')[-1].strip() if ',' in location else "",
                        price=price,
                        land_area=None,
                        construction_area=None,
                        bedrooms=None,
                        bathrooms=None,
                        property_type=property_type,
                        listing_type=listing_type,
                        image_url=None
                    ))
                except Exception as e:
                    continue
                    
    except Exception as e:
        logger.error(f"Error scraping propiedades.com: {e}")
    
    return properties

async def scrape_all_sources(
    location: str, 
    property_type: str, 
    listing_type: str = "venta",
    land_area_range: tuple = None,
    construction_area_range: tuple = None
) -> List[ScrapedProperty]:
    """
    Scrape all sources in parallel
    """
    connector = aiohttp.TCPConnector(limit=10, ssl=False)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Run all scrapers in parallel
        tasks = [
            scrape_inmuebles24(session, location, property_type, listing_type),
            scrape_lamudi(session, location, property_type, listing_type),
            scrape_propiedades_com(session, location, property_type, listing_type),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_properties = []
        for result in results:
            if isinstance(result, list):
                all_properties.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Scraper error: {result}")
        
        # Filter by area if specified
        if land_area_range or construction_area_range:
            filtered = []
            for prop in all_properties:
                include = True
                
                if land_area_range and prop.land_area:
                    min_area, max_area = land_area_range
                    if not (min_area * 0.7 <= prop.land_area <= max_area * 1.3):
                        include = False
                
                if construction_area_range and prop.construction_area:
                    min_area, max_area = construction_area_range
                    if not (min_area * 0.7 <= prop.construction_area <= max_area * 1.3):
                        include = False
                
                if include:
                    filtered.append(prop)
            
            return filtered
        
        return all_properties

async def get_rental_factor(
    location: str,
    property_type: str,
    sale_properties: List[ScrapedProperty]
) -> Dict:
    """
    Calculate rental factor by scraping rental listings
    and comparing with sale prices
    """
    # Scrape rental listings
    rental_properties = await scrape_all_sources(location, property_type, "renta")
    
    if not rental_properties or not sale_properties:
        # Return default factors by property type
        default_factors = {
            'Casa': 0.005,  # 0.5% mensual
            'Departamento': 0.006,  # 0.6% mensual
            'Terreno': 0.003,
            'Local comercial': 0.008,
            'Oficina': 0.007,
            'Bodega': 0.006,
            'Nave industrial': 0.005
        }
        return {
            "factor": default_factors.get(property_type, 0.005),
            "avg_rent": 0,
            "avg_sale": 0,
            "rental_listings_count": len(rental_properties),
            "source": "default"
        }
    
    # Calculate average rent and sale prices per m²
    rental_prices_per_sqm = []
    for prop in rental_properties:
        if prop.price and prop.construction_area and prop.construction_area > 0:
            rental_prices_per_sqm.append(prop.price / prop.construction_area)
    
    sale_prices_per_sqm = []
    for prop in sale_properties:
        if prop.price and prop.construction_area and prop.construction_area > 0:
            sale_prices_per_sqm.append(prop.price / prop.construction_area)
    
    if rental_prices_per_sqm and sale_prices_per_sqm:
        avg_rent_sqm = sum(rental_prices_per_sqm) / len(rental_prices_per_sqm)
        avg_sale_sqm = sum(sale_prices_per_sqm) / len(sale_prices_per_sqm)
        
        # Factor = monthly rent / sale price
        factor = avg_rent_sqm / avg_sale_sqm if avg_sale_sqm > 0 else 0.005
        
        # Cap factor to reasonable range
        factor = max(0.003, min(0.012, factor))
        
        return {
            "factor": round(factor, 5),
            "avg_rent_per_sqm": round(avg_rent_sqm, 2),
            "avg_sale_per_sqm": round(avg_sale_sqm, 2),
            "rental_listings_count": len(rental_properties),
            "source": "calculated"
        }
    
    return {
        "factor": 0.005,
        "avg_rent_per_sqm": 0,
        "avg_sale_per_sqm": 0,
        "rental_listings_count": len(rental_properties),
        "source": "default"
    }

def calculate_market_metrics(
    estimated_value: float,
    rental_factor: float,
    property_type: str,
    state: str
) -> Dict:
    """
    Calculate additional market metrics
    """
    # Monthly rent estimate
    monthly_rent = estimated_value * rental_factor
    annual_rent = monthly_rent * 12
    
    # Cap Rate (Annual rent / Property value)
    cap_rate = (annual_rent / estimated_value) * 100 if estimated_value > 0 else 0
    
    # Estimated annual appreciation by state/type
    appreciation_rates = {
        "Ciudad de México": {"Casa": 6.5, "Departamento": 7.0, "default": 5.5},
        "Nuevo León": {"Casa": 7.0, "Departamento": 7.5, "default": 6.0},
        "Jalisco": {"Casa": 6.0, "Departamento": 6.5, "default": 5.0},
        "Quintana Roo": {"Casa": 8.0, "Departamento": 8.5, "default": 7.0},
        "Estado de México": {"Casa": 5.0, "Departamento": 5.5, "default": 4.5},
        "default": {"Casa": 5.0, "Departamento": 5.5, "default": 4.0}
    }
    
    state_rates = appreciation_rates.get(state, appreciation_rates["default"])
    appreciation = state_rates.get(property_type, state_rates["default"])
    
    return {
        "monthly_rent_estimate": round(monthly_rent, 2),
        "annual_rent_estimate": round(annual_rent, 2),
        "cap_rate": round(cap_rate, 2),
        "annual_appreciation": appreciation,
        "rental_factor_used": rental_factor
    }
