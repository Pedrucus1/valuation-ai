const fs = require('fs');
const fp = 'frontend/src/components/dashboard/tabs/PromocionesTab.jsx';
let content = fs.readFileSync(fp, 'utf8');

const target1 = const avaluosCompletados = valuacionesList.filter(v => v.estado === "completada");;

const replacement1 = const sampleImages = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800"
];

const avaluosCompletados = valuacionesList.filter(v => v.estado === "completada").map((v, i) => {
  // Inject sample images if none exist
  if (!v.fotos || v.fotos.length === 0) {
    return { ...v, fotos: [sampleImages[i % sampleImages.length], sampleImages[(i+1) % sampleImages.length]] };
  }
  return v;
});;

content = content.replace(target1, replacement1);
fs.writeFileSync(fp, content, 'utf8');
console.log("Patched PromocionesTab with sample images");
