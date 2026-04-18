# 🧠 Memoria Técnica: Módulo de Aprendizaje IA (PropValu)

> **Estado:** Fase 2 (Extracción de Conocimiento) - Completada.
> **Última actualización:** 18/04/2026
> **Arquitecto:** Pedro Vergara Espinosa

---

## 🎯 Objetivo
Hacer que la IA de **PropValu** aprenda de la metodología profesional del Arq. Pedro, analizando masivamente los archivos históricos de la carpeta "avaluos" en Google Drive para automatizar sugerencias de comparables y factores de homologación.

## 🛠️ Configuración Técnica
- **Carpeta del Proyecto:** `valuation-ai/Pagina-Valuacion-con-Ai--main`
- **Módulo Experimental:** `Modulo Drive IA/`
- **Cuenta de Servicio:** `propvalu-drive-bot@propvalu-mexico.iam.gserviceaccount.com`
- **Credenciales:** `Modulo Drive IA/credentials.json`
- **Carpeta de Origen en Drive:** "avaluos" (Nota: Si no se encuentra, el script busca en la raíz).

## 📊 Lógica de Valuación Descubierta
Tras analizar los archivos procesados, hemos consolidado:

1.  **Captura de Datos (`Mercado`):** Extracción automatizada de comparables (Precio, Superficie, Ubicación).
2.  **Identificación de Folios:** Mapeo de la nomenclatura `OPI-YY-M-DD-AV`.
3.  **Resultados Consolidados:** Generación de `cerebro_datos.json` con el histórico procesado.

## 🚀 Próximos Pasos (Pendientes)
1.  **Aumento de Datos:** Asegurar que la carpeta "avaluos" esté compartida con la cuenta de servicio para procesar el volumen total.
2.  **Integración con IA:** Conectar el `cerebro_datos.json` con el backend para que la IA sugiera factores en tiempo real basados en el historial.
3.  **Refinamiento del Extractor:** Mapear más pestañas como `Ross Heideke` para depreciación.

---
**Nota para la IA:** El informe de aprendizaje actual se encuentra en `INFORME_APRENDIZAJE.md`.

