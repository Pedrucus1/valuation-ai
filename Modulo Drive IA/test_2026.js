const fs = require('fs');
const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

// Buscamos folios de 2026
const recientes = data.filter(d => {
    const nombre = d.fileName || d.archivo_nombre || d.name || '';
    return nombre.includes('-26-');
});

console.log(`Se encontraron ${recientes.length} avaluos de 2026.`);

// Imprimimos los primeros 3 para armar nuestra tabla de pruebas
const ejemplos = recientes.slice(0, 3).map(d => ({
    archivo: d.fileName,
    terreno: d.m2Terreno,
    construccion: d.m2Construccion,
    edad: d.edad,
    valor_concluido: d.valorMercado
}));

console.log(JSON.stringify(ejemplos, null, 2));
