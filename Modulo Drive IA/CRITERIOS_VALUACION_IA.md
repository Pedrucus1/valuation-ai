# 🏛️ Manual de Criterios de Valuación - PropValu AI

Este documento define la lógica de razonamiento que la IA (Gemini) debe aplicar para la preselección y homologación de propiedades basadas en la metodología experta de PropValu y normatividad SHF/INDAABIN.

## 1. Reglas de Preselección (Limpieza de Datos)
Para elegir comparables válidos del scrap, la IA debe seguir este orden de prioridad ABSOLUTO:

### A. Frescura de Mercado (REGLA DE ORO)
- **Criterio:** Solo comparables ACTIVOS y vigentes con una antigüedad de publicación de **3 a 6 meses**.
- **Descarte:** Ignorar automáticamente cualquier dato histórico o anuncio pausado que supere este rango, a menos que sea para análisis de tendencias.

### B. Micro-Mercado y Demanda Local
- **Lógica:** El valor lo dicta la oferta y demanda de la calle/manzana/coto específico.
- **Factores de "Moda":** Identificar si la zona tiene un crecimiento acelerado por nuevos desarrollos o servicios (amenidades) que justifiquen precios por encima del promedio municipal.

### C. Ubicación y Plusvalía Micro
- **Diferenciador:** Segmentar por colonias con plusvalía similar. No usar promedios macro (SHF) para determinar el precio final; usarlos solo como referencia histórica para normalizar datos de años anteriores.

### D. Segmentación por Producto y Uso
- **Segmentación:** Separar departamentos de inversión vs. vivienda familiar.
- **Edad:** Mantener la tolerancia de +- 10 años.

## 2. Factores de Homologación (Lógica Matemática)
La IA debe calcular el Valor Resultante aplicando estos factores:

1. **Factor de Zona:** Ajuste según la deseabilidad de la ubicación específica.
2. **Factor de Ubicación:** Esquina (+), Media manzana (=), Fondo de privada (-).
3. **Factor de CUS/CAS:** Potencial de desarrollo del suelo.
4. **Factor de Acabados:** Clasificar en (Económico, Medio, Semilujo, Lujo).
5. **Factor de Conservación:** Basado en la inspección visual o descripción del estado.

## 3. Exclusiones Críticas
- **Factor de Comercialización:** EXCLUIR de la preselección inicial. Buscamos el valor físico y de mercado puro antes de ajustes artificiales de venta.
- **Datos Atípicos (Outliers):** Descartar propiedades con precios sospechosamente bajos (posibles remates judiciales) o altos sin justificación.

## 4. Fuentes de Verdad
La IA debe dar mayor peso a comparables provenientes de portales validados en los avalúos históricos (Inmuebles24, Propiedades.com, etc.).
