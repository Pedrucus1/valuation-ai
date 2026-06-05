const fs = require('fs');
const fp = 'frontend/src/pages/InmobiliariaDashboardPage.jsx';
const lines = fs.readFileSync(fp, 'utf8').split('\n');
console.log(lines.slice(972, 979).join('\n'));
