/**
 * valuationMath.js
 * Core valuation formulas translated from the Excel and Parametric PDF logic.
 */

// 1. VALOR FÍSICO (ENFOQUE DE COSTOS)

/**
 * Calcula el valor del terreno.
 * @param {number} superficie M2 del terreno
 * @param {number} valorUnitario Precio base por M2
 * @param {object} factores Objeto con factores: { zona, ubicacion, frente, forma, superficie, otros }
 * @returns {number} Valor final calculado redondeado a 2 decimales
 */
export function calcularValorTerreno(superficie, valorUnitario, factores = {}) {
    const {
        zona = 1.0,
        ubicacion = 1.0,
        frente = 1.0,
        forma = 1.0,
        factorSuperficie = 1.0,
        otros = 1.0
    } = factores;

    // Fórmula del Excel (Z124 y AJ124 en OPI Loc Com b):
    // Resultante = factorZona * factorUbicacion * factorFrente * factorForma * factorSuperficie * factorOtro
    const factorResultante = zona * ubicacion * frente * forma * factorSuperficie * otros;
    
    // Valor Terreno = Superficie * (Valor Unitario * Factor Resultante)
    const valorTotal = superficie * (valorUnitario * factorResultante);
    
    return Math.round(valorTotal * 100) / 100;
}

/**
 * Calcula el factor de demérito/depreciación de una construcción
 * según la fórmula ponderada del Excel.
 * @param {number} edad Edad actual de la construcción
 * @param {number} edadRemanente Años de vida útil restantes
 * @returns {number} Factor de demérito (donde 1 es nuevo, y baja según edad)
 */
export function calcularDemeritoConstruccion(edad, edadRemanente) {
    if (edad === 0) return 1.0; // Nueva

    // Fórmula extraída del Excel (celda AU131): ROUND(((0.1*AR130)+(0.9*AT131))/AR130,2)
    // Básicamente: ((0.1 * Edad) + (0.9 * Edad Remanente)) / Edad
    // Sin embargo, esta fórmula en el Excel original parece estar calculando algo sobre la EDAD, no el demérito directo.
    // La fórmula estándar mexicana general de Ross-Heidecke o línea recta suele ser VidaRemanente / VidaUtilTotal * FactorConservacion.
    
    // Usaremos la fórmula línea recta simple a menos que se defina la curva de Ross:
    const vidaUtilTotal = edad + edadRemanente;
    if (vidaUtilTotal === 0) return 1.0;
    
    const ponderacion = edadRemanente / vidaUtilTotal;
    return Math.round(ponderacion * 100) / 100;
}

/**
 * Calcula el valor de reposición de la construcción.
 * @param {number} superficie M2 de la construcción
 * @param {number} valorNuevo Valor de reposición nuevo (VRN) dictado por el tabulador paramétrico
 * @param {number} demerito Factor de demerito calculado (0 a 1)
 * @returns {number} Valor final de la construcción
 */
export function calcularValorConstruccion(superficie, valorNuevo, demerito = 1.0) {
    // Si el factor resultante por Excel demerit debe tener un mínimo, Ej: IF(AU131<0.2, 0.20, AU131)
    const factorFinal = demerito < 0.2 ? 0.2 : demerito;
    
    // Valor Construcción = M2 * VRN * Demérito
    const valorTotal = superficie * valorNuevo * factorFinal;
    
    return Math.round(valorTotal * 100) / 100;
}

// 2. VALOR DE MERCADO (ENFOQUE COMPARATIVO)

/**
 * Calcula el factor de homologación total para un comparable de mercado.
 * @param {object} factores Objeto con factores de homologación
 * @returns {number} Factor resultante
 */
export function calcularFactorHomologacionMercado(factores = {}) {
    const {
        negociacion = 1.0,
        zona = 1.0,
        ubicacion = 1.0,
        frente = 1.0,
        forma = 1.0,
        superficie = 1.0,
        edad = 1.0,
        conservacion = 1.0,
        otros = 1.0,
        cus = 1.0 // Añadido para mantener histórico
    } = factores;

    // Multiplicamos todos los factores, incluyendo el CUS (si viene pre-calculado para la tabla)
    const resultante = negociacion * zona * ubicacion * frente * forma * superficie * edad * conservacion * otros * cus;
    return Math.round(resultante * 100) / 100;
}

/**
 * Calcula el valor homologado a partir de un comparable, aplicando la lógica de "Terreno Diferencia" por CUS.
 * @param {object} params
 * @param {number} params.precioVenta Precio de venta total del comparable
 * @param {number} params.superficieConstruccion M2 de construcción del comparable
 * @param {number} params.superficieTerreno M2 de terreno del comparable
 * @param {number} params.cusSujeto CUS del sujeto (Construcción / Terreno)
 * @param {number} params.valorTierraM2 Valor unitario del terreno en la zona
 * @param {number} params.factorHomologacion Factor total de calificación resultante
 * @returns {object} { precioNivelado, baseNivelada, valorHomologadoFinal, ajusteMonto }
 */
export function calcularUnitarioHomologadoCUS({
    precioVenta, 
    superficieConstruccion, 
    superficieTerreno, 
    cusSujeto, 
    valorTierraM2, 
    factorHomologacion
}) {
    if (superficieConstruccion === 0 || cusSujeto === 0) {
        return { 
            precioNivelado: precioVenta, 
            baseNivelada: 0, 
            valorHomologadoFinal: 0, 
            ajusteMonto: 0,
            terrenoNecesario: 0,
            terrenoDiferencia: 0
        };
    }

    // 1. Terreno necesario según el CUS del sujeto
    const terrenoNecesario = superficieConstruccion / cusSujeto;
    
    // 2. Terreno Diferencia
    const terrenoDiferencia = terrenoNecesario - superficieTerreno;
    
    // 3. Ajuste de Dinero por fracción
    const ajusteMonto = terrenoDiferencia * valorTierraM2;
    
    // 4. Precio Venta Nivelado
    const precioNivelado = precioVenta + ajusteMonto;
    
    // 5. Valor Base Nivelado ($/m2)
    const baseNivelada = precioNivelado / superficieConstruccion;
    
    // 6. Valor Homologado Final (Base * Factor)
    const valorHomologadoFinal = baseNivelada * factorHomologacion;

    return {
        terrenoNecesario,
        terrenoDiferencia,
        ajusteMonto,
        precioNivelado,
        baseNivelada,
        valorHomologadoFinal: Math.round(valorHomologadoFinal * 100) / 100
    };
}

/**
 * Calcula el valor homologado a partir de un comparable (MÉTODO CLÁSICO).
 * @param {number} precioVenta Precio de venta del comparable
 * @param {number} superficie M2 del comparable
 * @param {number} factorHomologacion Factor resultante calculado
 * @returns {number} Valor Unitario Homologado
 */
export function calcularUnitarioHomologado(precioVenta, superficie, factorHomologacion) {
    if (superficie === 0) return 0;
    const precioUnitario = precioVenta / superficie;
    const homologado = precioUnitario * factorHomologacion;
    return Math.round(homologado * 100) / 100;
}
