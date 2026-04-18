const { execSync } = require('child_process');
const path = require('path');

function runStep(scriptName) {
    console.log(`\n>>> Ejecutando: ${scriptName}...`);
    try {
        const scriptPath = path.join(__dirname, scriptName);
        const output = execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error en el paso ${scriptName}:`, error.message);
    }
}

async function startWorkflow() {
    console.log('=== INICIANDO FLUJO SEMANAL DE VALUACIÓN IA ===');
    console.log('Hora:', new Date().toLocaleString());
    
    // Paso 1: Escanear carpeta Drive
    runStep('escanear_avaluos.js');
    
    // Paso 2: Extraer datos profundos
    runStep('extractor_masivo.js');
    
    // Paso 3: Exportar a la Base de Datos en la nube
    runStep('exportador_resumen.js');
    
    console.log('\n=== FLUJO FINALIZADO CON ÉXITO ===');
}

if (require.main === module) {
    startWorkflow();
}

module.exports = startWorkflow;
