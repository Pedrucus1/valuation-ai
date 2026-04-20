# Metodología de Valuación PropValu AI - Versión Beta

Esta metodología fue obtenida mediante la ingeniería inversa de 5 avalúos reales (2026), logrando una precisión superior al 95% (margen de error < 5.5%).

## 1. Reglas de Selección de Método
El motor debe identificar el tipo de propiedad para elegir el camino matemático:

*   **VIVIENDA (Casa/Departamento):** Se utiliza el **Método de Homologación Directa**.
    *   Fórmula: `(Precio Comparable / M2 Construcción Comparable) * Factores = Unitario Homologado`.
*   **MIXTOS, INDUSTRIALES O TERRENOS GRANDES:** Se utiliza el **Método de Suma de Partes (Enfoque de Costos)**.
    *   Fórmula: `(M2 Terreno * Valor Mercado Zona) + (M2 Construcción * Valor Físico Directo * Factor de Utilidad)`.

## 2. Factores de Homologación Críticos

### A. Factor de Edad (Ross-Heidecke Relativo)
No es un valor absoluto. Se debe comparar la edad del Sujeto contra la del Comparable:
`Factor Edad = Depreciación(Edad Sujeto) / Depreciación(Edad Comparable)`.

### B. Factor de Utilidad Comercial
En propiedades donde se separan terreno y construcción (Mixtos/Industriales), se debe agregar un margen de utilidad sobre el valor físico de la construcción:
*   **Rango:** 15% a 20% adicional (Multiplicador 1.15 - 1.20).

### C. Filtro de Calidad de Mercado (Anti-Remates)
Para evitar distorsiones por "Remates Bancarios" o anuncios falsos:
*   **Regla:** Descartar automáticamente cualquier comparable cuyo $/m2 esté un **30% por debajo** del promedio inicial de la muestra.

### D. Factor de Comercialización / Negociación
*   **Estándar:** 0.95 (Cierre de venta estimado).

## 3. Divisores Estrictos
*   **Casa/Depto/Oficina:** SIEMPRE dividir entre M2 de CONSTRUCCIÓN.
*   **Terreno/Bodega/Local:** SIEMPRE dividir entre M2 de TERRENO.

---
*Este documento es la base para el entrenamiento de la red neuronal de PropValu.*
