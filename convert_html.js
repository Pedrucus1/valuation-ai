const fs = require('fs');

let html = fs.readFileSync('C:/Users/pedru/.gemini/antigravity/brain/a64264d8-65b9-4dea-b9fc-3e8890e26b39/stitch_ficha.html', 'utf8');

let jsx = html.replace(/class=/g, 'className=')
              .replace(/<!--[\s\S]*?-->/g, '')
              .replace(/<img(.*?)>/g, '<img$1 />')
              .replace(/<br>/g, '<br />')
              .replace(/<hr>/g, '<hr />')
              .replace(/<input(.*?)>/g, '<input$1 />')
              .replace(/style=".*?"/g, '');

const bodyMatch = jsx.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
    jsx = bodyMatch[1];
}

const componentCode = `import React from 'react';
import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Plus, Fingerprint, Sofa, Home } from "lucide-react";

const LayoutStitchFicha = ({ fichaAvaluo, session, formatMXN, parseFeatureItem, amenidades }) => {
  return (
    <div className="bg-white w-[2560px] h-[2432px] overflow-hidden relative" style={{ transform: 'scale(0.35)', transformOrigin: 'top left' }}>
      ${jsx}
    </div>
  );
};
export default LayoutStitchFicha;
`;

fs.writeFileSync('c:/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/frontend/src/components/dashboard/tabs/promociones/LayoutStitchFicha.jsx', componentCode);
