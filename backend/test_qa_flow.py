import asyncio
from fastapi.testclient import TestClient
import sys
import os
from pathlib import Path

# Agregar el directorio backend al sys.path para poder importar server
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from server import app

client = TestClient(app)

def run_test():
    print("=== INICIANDO SIMULACRO DE CALIDAD E2E ===")
    
    # 1. Crear el borrador del avalúo
    print("\n1. Creando borrador de avalúo...")
    prop_data = {
        "property_type": "Casa",
        "state": "Jalisco",
        "municipality": "Zapopan",
        "neighborhood": "Providencia",
        "street": "Calle de Prueba",
        "exterior_number": "123",
        "land_area": 250,
        "construction_area": 300,
        "bedrooms": 4,
        "bathrooms": 3.5,
        "parking_spaces": 2,
        "age": 10,
        "conservation_state": "Bueno",
        "land_regime": "URBANO"
    }
    
    response = client.post("/api/valuations", json=prop_data)
    if response.status_code != 200:
        print(f"[ERROR] Error al crear avalúo: {response.text}")
        return
        
    val_data = response.json()
    val_id = val_data.get("valuation_id")
    print(f"[OK] Avalúo creado con ID: {val_id}")
    
    # 2. Subir una foto de prueba
    print("\n2. Simulando subida de fotos...")
    # Crear un archivo de imagen dummy en memoria
    dummy_image = b"R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" # 1x1 pixel gif base64
    import base64
    img_bytes = base64.b64decode(dummy_image)
    
    files = [("photos", ("test.gif", img_bytes, "image/gif"))]
    resp_photos = client.post(f"/api/valuations/{val_id}/upload-photos", files=files)
    
    if resp_photos.status_code == 200:
        print(f"[OK] Fotos subidas correctamente: {resp_photos.json()}")
    else:
        print(f"[ERROR] Error al subir fotos: {resp_photos.text}")
        
    # 3. Disparar el Motor de Valuación (Generar Comparables)
    print("\n3. Disparando Motor de Valuación Remi + IA + MongoDB Cache...")
    resp_engine = client.post(f"/api/valuations/{val_id}/generate-comparables")
    
    if resp_engine.status_code == 200:
        result = resp_engine.json()
        print(f"[OK] Motor Finalizó con Éxito!")
        
        comps = result.get("comparables", [])
        print(f"   -> Se encontraron {len(comps)} comparables.")
        
        if len(comps) > 0:
            print(f"   -> Top Comparable: {comps[0].get('price')} en {comps[0].get('neighborhood')}")
            
    else:
        print(f"[ERROR] Error en el motor: {resp_engine.text}")
        
    print("\n=== SIMULACRO COMPLETADO ===")

if __name__ == "__main__":
    run_test()
