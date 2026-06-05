import React from "react";
import { Phone, Mail } from "lucide-react";

const LayoutUltraLujo = ({ fichaAvaluo, texts, idioma, descripcionTexto, theme, formatMXN, session }) => {
  return (
    <div id="pv-ficha-root" className={`${theme.bgRoot} mx-auto w-full max-w-[800px] flex flex-col gap-8 print:gap-0 relative print:max-w-none print:bg-transparent print:m-0`}>
      {/* HOJA 1 */}
      <div className={`${theme.bgPage} w-full aspect-[1/1.414] relative flex flex-col print:aspect-auto print:h-screen print:w-screen overflow-hidden break-after-page page-break-after-always shadow-2xl print:shadow-none border-[12px] border-[#111111]`}>
        
        {/* Top Branding */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
          <span className={`text-[10px] tracking-[0.4em] uppercase font-bold text-white/70`}>PropValu Exclusive</span>
          <div className="w-12 h-[1px] bg-[#D4AF37]"></div>
        </div>

        {/* Hero Section */}
        <div className="relative w-full h-[55%] bg-black shrink-0">
          {fichaAvaluo?.fotos && fichaAvaluo.fotos.length > 0 ? (
            <img src={fichaAvaluo.fotos[0]} alt="Fachada" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-800 font-serif">COLLECTION</div>
          )}
          
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-black/40"></div>
          
          <div className="absolute bottom-10 left-10 right-10 text-center">
             <span className={`inline-block border border-[#D4AF37] px-4 py-1 mb-6 text-[10px] tracking-[0.3em] uppercase text-[#D4AF37]`}>{fichaAvaluo.tipo}</span>
             <h1 className={`text-5xl font-serif text-white mb-3 tracking-wide`}>{formatMXN(fichaAvaluo.valor)}</h1>
             <p className="text-white/60 tracking-[0.2em] uppercase text-xs">{fichaAvaluo.direccion}</p>
          </div>
        </div>

        {/* Mini Gallery Strip */}
        <div className="flex h-[15%] w-full bg-[#0a0a0a]">
           {fichaAvaluo?.fotos && fichaAvaluo.fotos.length > 1 ? (
             <>
               <div className="flex-1 border-r border-[#222]"><img src={fichaAvaluo.fotos[1]} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity filter grayscale" alt="Interior" /></div>
               <div className="flex-1 border-r border-[#222]"><img src={fichaAvaluo.fotos[2]} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity filter grayscale" alt="Interior" /></div>
               <div className="flex-1"><img src={fichaAvaluo.fotos[3] || fichaAvaluo.fotos[0]} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity filter grayscale" alt="Interior" /></div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-[#333] font-serif text-xs tracking-widest">GALERÍA NO DISPONIBLE</div>
           )}
        </div>

        {/* Bottom Content Split */}
        <div className="flex-1 flex p-12 gap-12 bg-[#111]">
          {/* Main Desc */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="w-8 h-[2px] bg-[#D4AF37] mb-6"></div>
              <h3 className={`text-[9px] tracking-[0.3em] uppercase font-bold mb-4 ${theme.textPri}`}>La Propiedad</h3>
              <p className={`text-xs leading-relaxed text-justify font-serif text-slate-400`}>
                {descripcionTexto || "Ubicada en el enclave más codiciado de la ciudad, esta obra de arte habitable establece un nuevo estándar de lujo sin compromisos."}
              </p>
            </div>
            
            {/* Agent Contact Footer */}
            <div className="pt-6 border-t border-[#333]">
              <p className={`text-[10px] tracking-[0.2em] uppercase ${theme.textPri} mb-2`}>{session?.company_name || session?.name || "Premium Real Estate"}</p>
              <div className="flex items-center gap-6 text-slate-500 text-[10px] tracking-widest">
                <span className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#D4AF37]"/> {session?.phone || "555-0123-456"}</span>
                <span className="flex items-center gap-2"><Mail className="w-3 h-3 text-[#D4AF37]"/> {session?.email || "contacto@inmobiliaria.com"}</span>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-[#333] to-transparent"></div>
          
          {/* Specs Column */}
          <div className="w-[160px] shrink-0 flex flex-col justify-center gap-8">
            <div className="text-center">
               <p className={`text-3xl font-serif text-white`}>{fichaAvaluo.m2_construccion || 0}</p>
               <p className="text-[8px] tracking-[0.3em] uppercase text-[#D4AF37] mt-2">{texts.construccion}</p>
            </div>
            <div className="text-center">
               <p className={`text-3xl font-serif text-white`}>{fichaAvaluo.recamaras || 0}</p>
               <p className="text-[8px] tracking-[0.3em] uppercase text-[#D4AF37] mt-2">{texts.recamaras}</p>
            </div>
            <div className="text-center">
               <p className={`text-3xl font-serif text-white`}>{fichaAvaluo.banos || 0}</p>
               <p className="text-[8px] tracking-[0.3em] uppercase text-[#D4AF37] mt-2">{texts.banos}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LayoutUltraLujo;
