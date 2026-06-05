import React from "react";

const LayoutMinimalista = ({ fichaAvaluo, texts, idioma, descripcionTexto, theme, formatMXN }) => {
  return (
    <div id="pv-ficha-root" className={`${theme.bgRoot} mx-auto w-full max-w-[800px] flex flex-col gap-8 print:gap-0 relative print:max-w-none print:bg-transparent print:m-0`}>
      {/* HOJA 1 */}
      <div className={`${theme.bgPage} w-full aspect-[1/1.414] relative flex flex-col print:aspect-auto print:h-screen print:w-screen overflow-hidden break-after-page page-break-after-always shadow-xl print:shadow-none p-16 border border-slate-100`}>
        
        {/* Header Arquitectonico */}
        <div className="flex justify-between items-start mb-12">
          <div className="max-w-[60%]">
            <h1 className={`text-6xl font-light tracking-tighter ${theme.textPri} leading-none mb-4`}>{formatMXN(fichaAvaluo.valor)}</h1>
            <p className={`text-sm tracking-[0.2em] uppercase ${theme.textSec} font-semibold`}>{fichaAvaluo.direccion}</p>
          </div>
          <div className="text-right">
            <span className="inline-block border border-current px-3 py-1 text-[9px] tracking-[0.3em] uppercase font-bold text-slate-400">
              {fichaAvaluo.tipo}
            </span>
          </div>
        </div>

        {/* Hero Image (Estilo Galería de Arte) */}
        <div className="w-full h-[45%] bg-slate-100 mb-12 relative group">
          {fichaAvaluo?.fotos && fichaAvaluo.fotos.length > 0 ? (
            <img src={fichaAvaluo.fotos[0]} alt="Fachada" className="w-full h-full object-cover filter contrast-105 saturate-50" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 font-light tracking-widest uppercase">Sin Imagen</div>
          )}
          {/* Subtle frame */}
          <div className="absolute inset-4 border border-white/30 mix-blend-overlay pointer-events-none"></div>
        </div>

        {/* Content Split */}
        <div className="flex gap-16 flex-1">
          {/* Specs */}
          <div className="w-[180px] shrink-0 flex flex-col gap-8 border-r border-slate-100 pr-8">
            <div>
               <p className="text-[8px] tracking-[0.2em] uppercase text-slate-400 font-bold mb-2">{texts.construccion}</p>
               <p className={`text-2xl font-light ${theme.textPri}`}>{fichaAvaluo.m2_construccion || 0} <span className="text-sm text-slate-400">m²</span></p>
            </div>
            <div>
               <p className="text-[8px] tracking-[0.2em] uppercase text-slate-400 font-bold mb-2">{texts.recamaras}</p>
               <p className={`text-2xl font-light ${theme.textPri}`}>{fichaAvaluo.recamaras || 0}</p>
            </div>
            <div>
               <p className="text-[8px] tracking-[0.2em] uppercase text-slate-400 font-bold mb-2">{texts.banos}</p>
               <p className={`text-2xl font-light ${theme.textPri}`}>{fichaAvaluo.banos || 0}</p>
            </div>
          </div>

          {/* Main Desc */}
          <div className="flex-1 flex flex-col">
            <p className={`text-sm leading-loose text-justify font-light ${theme.textSec} first-letter:text-5xl first-letter:font-light first-letter:text-slate-800 first-letter:mr-3 first-letter:float-left`}>
              {descripcionTexto || "El diseño se encuentra con la funcionalidad en esta propiedad excepcional. Una muestra de arquitectura contemporánea diseñada para maximizar el espacio y la luz."}
            </p>
            
            <div className="mt-auto pt-8 flex justify-between items-center text-slate-400 border-t border-slate-100">
               <span className="text-[8px] tracking-[0.3em] uppercase font-bold">Ref: {fichaAvaluo.id ? String(fichaAvaluo.id).substring(0,6) : "MIN"}</span>
               <span className="text-[8px] tracking-[0.3em] uppercase font-bold">{texts.tecnologia} PropValu</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LayoutMinimalista;
