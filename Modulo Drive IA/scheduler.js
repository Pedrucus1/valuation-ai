const cron = require('node-cron');
const startWorkflow = require('./orquestador');

// Programar para cada Lunes a las 9:00 AM
// Formato: minuto hora dia-mes mes dia-semana
cron.schedule('0 9 * * 1', async () => {
    console.log('--- Iniciando ejecución programada semanal ---');
    await startWorkflow();
});

console.log('--- Programador de Valuación IA activado ---');
console.log('Próxima ejecución: Todos los Lunes a las 9:00 AM');
console.log('Presiona Ctrl+C para detener.');

// Ejecutar una vez al inicio para validar
// startWorkflow();
