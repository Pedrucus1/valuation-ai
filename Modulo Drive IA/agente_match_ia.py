import os
import json
import pymongo
from dotenv import load_dotenv
import google.generativeai as genai
from pathlib import Path

# Cargar variables de entorno
load_dotenv(Path(__file__).parent.parent / ".env")

# Configuración
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "propvalu")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def run_match(subject_property):
    print(f"\n=== INICIANDO MATCH INTELIGENTE IA (PYTHON) ===")
    print(f"Sujeto: {subject_property['direccion']} | {subject_property['m2_terreno']}m2 T | {subject_property['m2_construccion']}m2 C")

    try:
        # 1. Conexión a MongoDB
        client = pymongo.MongoClient(MONGO_URL)
        db = client[DB_NAME]
        col_mercado = db["mercado_props"]

        # 2. Cargar Conocimiento Histórico
        cerebro_path = Path(__file__).parent / "cerebro_datos.json"
        with open(cerebro_path, 'r', encoding='utf-8') as f:
            historial = json.load(f)
        
        # Filtrar historial por colonia
        colonia_sujeto = subject_property['colonia'].lower()
        contexto_historico = [
            h for h in historial 
            if colonia_sujeto in h.get('direccion', '').lower()
        ][:5]

        print(f"- Encontrados {len(contexto_historico)} avalúos históricos en la zona.")

        # 3. Buscar Candidatos en Mercado (MongoDB)
        query = {
            "municipio": subject_property['municipio'],
            "m2_construccion": {
                "$gte": subject_property['m2_construccion'] * 0.7,
                "$lte": subject_property['m2_construccion'] * 1.3
            },
            "activo": "TRUE"
        }
        
        candidatos = list(col_mercado.find(query, {"_id": 0}).limit(10))
        print(f"- Encontrados {len(candidatos)} candidatos frescos del mercado actual.")

        if not candidatos:
            print("No se encontraron candidatos suficientes en el mercado.")
            return

        # 4. Análisis Estratégico con Gemini
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Actúa como un Perito Valuador experto en el mercado inmobiliario de México.
        
        OBJETIVO: Seleccionar los 3 mejores comparables de mercado para una propiedad sujeto.
        
        PROPIEDAD SUJETO:
        - Dirección: {subject_property['direccion']}
        - Superficie Terreno: {subject_property['m2_terreno']} m2
        - Superficie Construcción: {subject_property['m2_construccion']} m2
        - Colonia: {subject_property['colonia']}
        
        CONTEXTO HISTÓRICO (Tus propios avalúos previos en esta zona):
        {json.dumps(contexto_historico, ensure_ascii=False)}
        
        CANDIDATOS DEL MERCADO ACTUAL (Scraper):
        {json.dumps(candidatos, ensure_ascii=False)}
        
        TAREA:
        1. Analiza cada candidato basándote en la ubicación, metros y descripción.
        2. Elige los 3 que mejor se adapten como comparables directos.
        3. Justifica cada elección basándote en:
           - Similitud física.
           - Coherencia con tus avalúos históricos (si los precios hacen sentido con lo que valuaste antes).
           - Calidad de la información en la descripción.
        4. Responde en ESPAÑOL con un resumen claro.
        """

        response = model.generate_content(prompt)
        print("\n--- ANÁLISIS DEL EXPERTO IA ---\n")
        print(response.text)

    except Exception as e:
        print(f"Error en el Agente de Match: {e}")

if __name__ == "__main__":
    # Prueba real en Colonia Victoria
    sujeto_prueba = {
        "direccion": "Calle Victoria 2614, Zapopan",
        "colonia": "Victoria",
        "municipio": "Zapopan",
        "m2_terreno": 250,
        "m2_construccion": 220
    }
    run_match(sujeto_prueba)
