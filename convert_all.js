const fs = require('fs');

function parseHtml(filepath) {
    if (!fs.existsSync(filepath)) return '<div>Not found</div>';
    let html = fs.readFileSync(filepath, 'utf8');
    
    let jsx = html.replace(/class=/g, 'className=')
                  .replace(/<!--[\s\S]*?-->/g, '')
                  .replace(/<img(.*?)>/g, '<img$1 />')
                  .replace(/<br>/g, '<br />')
                  .replace(/<hr>/g, '<hr />')
                  .replace(/<input(.*?)>/g, '<input$1 />')
                  .replace(/style=".*?"/g, '')
                  // Inject dynamic variables (naive approach)
                  .replace(/The Obsidian Villa/g, '{fichaAvaluo?.direccion || "The Obsidian Villa"}')
                  .replace(/\$4,500,000/g, '{fichaAvaluo ? formatMXN(fichaAvaluo.valor) : "$4,500,000"}');

    const bodyMatch = jsx.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : jsx;
}

const fichaJSX = parseHtml('C:/Users/pedru/.gemini/antigravity/brain/a64264d8-65b9-4dea-b9fc-3e8890e26b39/stitch_ficha.html');
const fbJSX = parseHtml('C:/Users/pedru/.gemini/antigravity/brain/a64264d8-65b9-4dea-b9fc-3e8890e26b39/stitch_fb.html');
const tiktokJSX = parseHtml('C:/Users/pedru/.gemini/antigravity/brain/a64264d8-65b9-4dea-b9fc-3e8890e26b39/stitch_tiktok.html');

const componentCode = `import React from 'react';
import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Plus, Fingerprint, Sofa, Home } from "lucide-react";

const LayoutStitch = ({ fichaAvaluo, session, formatMXN, parseFeatureItem, amenidades, instalaciones, espacios, formato }) => {
  
  if (formato === "post") {
      return (
        <div className="w-full max-w-[800px] mx-auto relative overflow-hidden bg-white shadow-xl" style={{ aspectRatio: '3/2' }}>
            <div className="transform scale-[0.4] origin-top-left w-[2560px]">
                ${fbJSX}
            </div>
        </div>
      );
  }

  if (formato === "reels") {
      return (
        <div className="w-full max-w-[420px] mx-auto relative overflow-hidden bg-black shadow-xl" style={{ aspectRatio: '9/16' }}>
            <div className="transform scale-[0.25] origin-top-left w-[2560px]">
                ${tiktokJSX}
            </div>
        </div>
      );
  }

  // vertical_2p
  return (
    <div className="w-full max-w-[800px] mx-auto flex flex-col gap-8 print:gap-0 relative print:max-w-none">
        <div className="w-full aspect-[1/1.414] relative overflow-hidden shadow-xl print:shadow-none break-after-page page-break-after-always bg-white">
            <div className="transform scale-[0.35] origin-top-left w-[2560px]">
                ${fichaJSX}
            </div>
        </div>
    </div>
  );
};
export default LayoutStitch;
`;

fs.writeFileSync('c:/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/frontend/src/components/dashboard/tabs/promociones/LayoutStitch.jsx', componentCode);
