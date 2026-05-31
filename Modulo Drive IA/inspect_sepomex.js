const XLSX = require('xlsx');
const path = 'C:/Users/pedru/Downloads/CPdescarga_extracted/CPdescarga.xls';
console.log('Cargando XLS (72MB)...');
const wb = XLSX.readFile(path);
console.log('Total sheets:', wb.SheetNames.length);
console.log('Primeras:', wb.SheetNames.slice(0, 10));

// Buscar la hoja de Jalisco (suele ser por estado)
const jaliscoSheet = wb.SheetNames.find(n => /jalisco|jal/i.test(n));
console.log('Sheet Jalisco:', jaliscoSheet);

const sheet = wb.Sheets[jaliscoSheet || wb.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);
console.log('Rows:', range.e.r + 1, 'Cols:', range.e.c + 1);

const headers = [];
for (let c = 0; c <= range.e.c; c++) {
  const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
  headers.push(cell ? cell.v : '?');
}
console.log('Headers:', headers);

const sample = XLSX.utils.sheet_to_json(sheet, { range: 0, defval: '' }).slice(0, 3);
console.log('Sample rows:');
sample.forEach(r => console.log(' ', JSON.stringify(r)));
