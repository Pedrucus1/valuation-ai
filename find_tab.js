const fs = require('fs');
const fp = 'frontend/src/pages/InmobiliariaDashboardPage.jsx';
const lines = fs.readFileSync(fp, 'utf8').split('\n');

let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const PromocionesTab = () => {')) {
    start = i;
  }
  if (start !== -1 && lines[i].includes('const PublicidadTab = () => {')) {
    end = i - 1;
    break;
  }
}
console.log('Start:', start, 'End:', end);
