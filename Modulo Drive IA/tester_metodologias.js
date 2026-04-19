// tester_metodologias.js

function metodoAppActual(prop) {
    const raw_prices = prop.comparables.map(c => c.precio);
    const adjusted_prices = prop.comparables.map(c => c.precio * 0.95);
    const weighted_prices = adjusted_prices.map((adj, i) => adj * 0.6 + raw_prices[i] * 0.4);
    
    const avg_price = weighted_prices.reduce((a,b) => a+b, 0) / weighted_prices.length;
    const sorted = [...weighted_prices].sort((a,b) => a-b);
    const median_price = sorted[Math.floor(sorted.length/2)];
    
    const final_price_per_sqm = median_price * 0.7 + avg_price * 0.3;
    const comparative_weighted = final_price_per_sqm * prop.construccion;

    const land_value = (final_price_per_sqm * 0.40) * prop.terreno; 
    const construction_new = 16000 * prop.construccion; // Media
    
    let age_depreciation = Math.min(prop.edad / 60, 0.50);
    const conservation_factor = prop.conservacion === 'Excelente' ? 1.0 : (prop.conservacion === 'Bueno' ? 0.85 : 0.65);
    let total_depreciation = Math.min(age_depreciation + (1 - conservation_factor) * 0.3, 0.60);
    
    const construction_depreciated = construction_new * (1 - total_depreciation);
    const physical_total = land_value + construction_depreciated;

    return (comparative_weighted * 0.80) + (physical_total * 0.20);
}

function metodoNuevoEstricto(prop) {
    const factorNegociacion = 0.95; 
    
    let sumaValoresHomologados = 0;
    
    prop.comparables.forEach(c => {
        // Corrección: el precio del comparable está total, calculamos por m2 de CONSTRUCCIÓN (al ser oficinas/casa)
        const precioUnitario = c.precio / c.construccion;
        
        // Factor Superficie: (Superficie Sujeto / Superficie Comp)^(1/6)
        // Usamos la construcción para homologar construcciones
        let factorSuperficie = Math.pow(c.construccion / prop.construccion, 1/6); 
        // Si el comparable es más chico, su m2 es más caro, por lo que el factor debe ser menor a 1 para ajustarlo al sujeto grande
        
        // Factor Edad/Conservación (Simplificado para el demo)
        let factorEdad = 1;
        if (prop.edad > c.edad) factorEdad = 0.90; 
        
        const precioHomologadoM2 = precioUnitario * factorNegociacion * factorSuperficie * factorEdad;
        
        sumaValoresHomologados += (precioHomologadoM2 * prop.construccion);
    });

    return sumaValoresHomologados / prop.comparables.length;
}

const formatoMoneda = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

function correrPrueba(prop) {
    console.log(`======================================================`);
    console.log(`🏠 PROPIEDAD DE PRUEBA: ${prop.nombre}`);
    console.log(`======================================================`);
    console.log(`📐 Terreno: ${prop.terreno}m2 | 🧱 Const: ${prop.construccion}m2`);
    console.log(`⏳ Edad: ${prop.edad} años | 🛠️ Cons: ${prop.conservacion}`);
    console.log(`\n📊 RESULTADOS (Promediando 5 comparables reales):`);
    console.log(`1️⃣ VALOR REAL PERITO (TÚ):       ${formatoMoneda(prop.valorReal)}`);
    
    const valorApp = metodoAppActual(prop);
    const diffApp = ((valorApp / prop.valorReal) - 1) * 100;
    console.log(`2️⃣ VALOR APP ACTUAL (80/20):      ${formatoMoneda(valorApp)} [Dif: ${diffApp > 0 ? '+' : ''}${diffApp.toFixed(1)}%]`);
    
    const valorNuevo = metodoNuevoEstricto(prop);
    const diffNuevo = ((valorNuevo / prop.valorReal) - 1) * 100;
    console.log(`3️⃣ VALOR NUEVO (100% Mercado):    ${formatoMoneda(valorNuevo)} [Dif: ${diffNuevo > 0 ? '+' : ''}${diffNuevo.toFixed(1)}%]`);
    console.log(`======================================================\n`);
}

// DATOS REALES DEL AVALUO OPI-26-4-01-OF (Extraídos de tu Excel original)
const realData = {
    nombre: "OPI-26-4-01-OF Pedro Moreno 110, Cantera Colorada",
    terreno: 894,
    construccion: 406.88,
    edad: 30,
    conservacion: "Regular",
    valorReal: 5500000, 
    comparables: [
        { construccion: 90, precio: 1600000, edad: 21 },
        { construccion: 129, precio: 2236000, edad: 25 },
        { construccion: 109, precio: 2412000, edad: 13 },
        { construccion: 66, precio: 1280000, edad: 15 },
        { construccion: 74, precio: 1930000, edad: 19 }
    ]
};

correrPrueba(realData);
