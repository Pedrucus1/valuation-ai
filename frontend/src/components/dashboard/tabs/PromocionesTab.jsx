import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Download, MapPin, Building, Map, Phone, Mail, Home, Sparkles, Image as ImageIcon, Waves, Dumbbell, Shield, Trees, Sun, Wine, Wind, Car, Monitor, Box, Droplets, Zap, Camera, Wifi, Tv, Utensils, BookOpen, Bed, Gamepad2, Droplet } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { DESCRIPTIONS_CATALOG } from "../../../utils/descriptionsCatalog";

import LayoutClasico from "./promociones/LayoutClasico";
import LayoutMinimalista from "./promociones/LayoutMinimalista";
import LayoutUltraLujo from "./promociones/LayoutUltraLujo";
import LayoutStitch from "./promociones/LayoutStitch";
import LayoutStitchHub from "./promociones/LayoutStitchHub";
import LayoutStitchGallery from "./promociones/LayoutStitchGallery";
import LayoutStitchLetter from "./promociones/LayoutStitchLetter";
import LayoutStitchAsymmetry from "./promociones/LayoutStitchAsymmetry";
import LayoutStitchFacebook from "./promociones/LayoutStitchFacebook";
import LayoutStitchTikTok from "./promociones/LayoutStitchTikTok";
import LayoutStitchKit from "./promociones/LayoutStitchKit";

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);

const THUMBS = {
  classic:          "/templates/ficha_classic.png",
  stitch_gallery:   "https://lh3.googleusercontent.com/aida/AP1WRLvgu7q23LuhYb2qgjCcE_nOpubjwtm5pWSdu52H3ZHVCi5LjOhO2aEUx-5yU1ThSSuRq_PdlBrDu39LdUALTgWVRDNXc3LMU29kIiVpDsvL6_2vSfKsp51Dgs_H7IUiGaCfFoT85zfk8Y9bAlSDJrHTiwQob05Xxcf00HMdwqVNhmvvEVoo3pVZtegIUptRd3Tgs-l_atJ4Ldhb1aErVoYBACAFbDlrD6smdfY7AMWywtDa-N4fCXGOaELe",
  stitch_letter:    "https://lh3.googleusercontent.com/aida/AP1WRLsCEl4Au-uY8ldZIYWbRu5MAWTl4FWp31A3JmzKSdRoj5OzU6qH8Pk_8P8wASzd5nghjav5-6Byj0Mzn3Ca7WKwuiMhGsfcIGv2hLpNIeugDUMSzDBGon0zu1vhX9I5lXgJYKH6dLxSE1O7Fxn826H2fNuCGrRpYgK5dP-gW4jYk4pOaLa_rlue1D-mTVOkQa-EAkJJuo0j49S_mldxE6iuZ4O64NuuqlA2PtsIwDXTB4nWDGz8xtahNAui",
  stitch_asymmetry: "https://lh3.googleusercontent.com/aida/AP1WRLtJIwZBucwnOkUKjb4dZbvBvA_t8ilQsdXUmenMvPDyPIiQ1-cA5ZTXurmDTgYUKORFKWGdJTDrRtfZNbw6a7O89KHoicEaT6mVN-YdZo3XOHXitZLZ5JEnBOqiDzkEGhbMuyJIN4MgUA5TyPUoL3QJll0J5Zeq9NITPrrKAlozOwUtbz6k0nO12dasovqyiW67am36akxdjI_lXpUZEoz80GxDLrJTKB2Ldki1PvVI6ebnTkfDKZ0RzfZz",
  stitch_facebook:  "https://lh3.googleusercontent.com/aida/AP1WRLuG8SD3Du-7KkgwjrWoZ06-6aGmM4KjWerP5ZlnuJeR4bV4aKILnnoG59Q4b5rIgDAnlv2W27SlJ7wDsOBG5a2W-N0_uql6VrTE7uaMcaa4vdc09wczVuICFaNm5dOsTQcKXfVJSU3aYYv9GGdKwrfqHqXmCZxOe9cz3nD7Lyp4p83f8gVJC8Sz5zA6dhsPf-YxsdtFDRrWL10YCx_3dEFBsQV7EZYQt-7yheWl2AKMLBlBAP2EEP0eKFO4",
  stitch_tiktok:    "https://lh3.googleusercontent.com/aida/AP1WRLsTTz8G69LqN8DQmi4KX5WjxsNODem0VVqJ-I72KxUA6E1Vz_9cnzTcPAu1dFHbq0lu7VC4x0egDuTI62WodDrcvu3Cp4dEHmcctxL5JSX7aG8rn7I52oidgGfONjM345qD-uoS9cyMUuf30kSL6Mf3RJ4Ygrfporrp822LsayL2hxFUP-faUZtg4FdNQwGCrQzdlX9Sf0zgT2TiMr0p4L5yziPrZDb__Wk9OHz8meqBa0co4GY9d_RFrLh",
  stitch_kit:       "https://lh3.googleusercontent.com/aida/AP1WRLu7eLkT6x1YjN1ebOD2Aw8U9kc7H61QBWbHeZfeCo9jGSrOBd0G2e8rDTBy3GUING84aiTCeVw-pR6KNsT8jj-8jq__GdW1Lswho1zUoNjcYtDteLrTXCNJ6KyIvSytSddjdSFi_nO19To_BF1sElShCdzoKxfJc1fDl_-MWb6Aq9qPvPWLePgjz4_rlwuJJRAtlqLkb0NPCuQHgL_RZAiL-7hGPQNd55Yj7xtdenDImlb_YY3x7kGozdeP",
  stitch_obsidian:  "https://lh3.googleusercontent.com/aida/AP1WRLsjKpobbO1c3mYio6ROYIY4bs1VNd2ug53dHgz1S1WviWW9eGpG1ikQFy3eLmBL4FTw6Obctxlas7r1F1L-fI7Bt2y_PaSrK8PJbOT4ITorjJQGM9iLMopT7klFGrj80VodqhBk_Dk6bNdJSZo4Io08vwOlYQpR-WJsEG372gZc510MMeCYdaSo3s6lzrUyO1kmukK0BdawURiu3Aoc6N4F1X9SLWLAdYvFbC40-DKvKqTEBMwanwmEVW79",
};

const TEMAS = {
  classic:         { nombre: "Clásico",           thumb: "/templates/ficha_classic.png", bgRoot: "bg-slate-50", bgPage: "bg-white", bgAccent: "bg-[#F0FAF5]", textPri: "text-[#1B4332]", textSec: "text-slate-600", accent: "text-[#52B788]", heroGrad: "from-[#1B4332] to-[#2D6A4F]" },
  minimalist:      { nombre: "Minimalista",       thumb: null,                           bgRoot: "bg-white", bgPage: "bg-white", bgAccent: "bg-slate-50", textPri: "text-slate-900", textSec: "text-slate-500", accent: "text-blue-500", heroGrad: "from-slate-100 to-white" },
  luxury:          { nombre: "Noir (Ultra Lujo)", thumb: null,                           bgRoot: "bg-zinc-950", bgPage: "bg-zinc-900", bgAccent: "bg-zinc-800", textPri: "text-white", textSec: "text-zinc-400", accent: "text-yellow-500", heroGrad: "from-zinc-950 to-zinc-900" },
  stitch_obsidian: { nombre: "Obsidian (Original)", thumb: THUMBS.stitch_obsidian,        bgRoot: "bg-[#0D0D0D]", bgPage: "bg-black", bgAccent: "bg-gray-800", textPri: "text-white", textSec: "text-slate-300", accent: "text-amber-500", heroGrad: "from-black to-slate-900" },
  stitch_new:      { nombre: "Colección AI",      thumb: THUMBS.stitch_gallery,          bgRoot: "bg-white", bgPage: "bg-white", bgAccent: "bg-gray-50", textPri: "text-gray-900", textSec: "text-gray-600", accent: "text-amber-600", heroGrad: "from-gray-900 to-gray-700" },
};

const getLayoutComponent = (temaId) => {
  if (temaId === "stitch_new") return LayoutStitchHub;
  if (temaId === "stitch_obsidian") return LayoutStitch;
  if (temaId === "luxury") return LayoutUltraLujo;
  if (temaId === "minimalist") return LayoutMinimalista;
  return LayoutClasico;
};

// (Las urls de thumbs se definieron arriba)
const PromocionesTab = ({ valuacionesList, session }) => {
  const [fichaAvaluo, setFichaAvaluo] = useState(null);
  const [idioma, setIdioma] = useState("es");
  const [tipoPrecio, setTipoPrecio] = useState("maximo");
  const [precioManual, setPrecioManual] = useState("");
  const [descripcionTexto, setDescripcionTexto] = useState("");
  const [temaSeleccionado, setTemaSeleccionado] = useState("classic");

  const [formatoSeleccionado, setFormatoSeleccionado] = useState("vertical_2p");
  const [amenidadesStr, setAmenidadesStr] = useState("Piscina Privada, Seguridad 24/7, Casa Club, Gimnasio");
  const [instalacionesStr, setInstalacionesStr] = useState("Paneles Solares, Cisterna 10,000L, Aire Acondicionado Central");
  const [espaciosStr, setEspaciosStr] = useState("Sala Principal, Comedor, Cocina Integral, Cuarto de Servicio, Family Room");
  const [hojaActiva, setHojaActiva] = useState(1);

  // Helper para alternar items en el string de selección
  const toggleItem = (currentStr, label) => {
    if (!currentStr) return label;
    const items = currentStr.split(',').map(s => s.trim()).filter(Boolean);
    if (items.includes(label)) {
      return items.filter(i => i !== label).join(', ');
    } else {
      return currentStr + ', ' + label;
    }
  };
  
  const esFormatoA4 = formatoSeleccionado.includes('vertical_2p') || 
                      formatoSeleccionado.includes('gallery') || 
                      formatoSeleccionado.includes('letter') || 
                      formatoSeleccionado.includes('asymmetry');


  const sampleImages = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800"
  ];

  const avaluosCompletados = valuacionesList.filter(v => v.estado === "completada").map((v, i) => {
    if (!v.fotos || v.fotos.length === 0) {
      return { 
        ...v, 
        fotos: [
          sampleImages[i % sampleImages.length], 
          sampleImages[(i+1) % sampleImages.length],
          sampleImages[(i+2) % sampleImages.length],
          sampleImages[(i+3) % sampleImages.length]
        ] 
      };
    }
    return v;
  });

  useEffect(() => {
    if (fichaAvaluo) {
      handleGenerarDescripcion();
      if (tipoPrecio !== "manual") {
        const val = fichaAvaluo.valores?.[tipoPrecio] || fichaAvaluo.valor;
        setPrecioManual(val.toString());
      }
      
      // Intentar auto-rellenar con datos de la OPI o reporte de manera segura
      const parseField = (field, fallback) => {
        if (!field) return fallback;
        if (Array.isArray(field)) return field.join(", ");
        if (typeof field === "string") return field;
        return fallback;
      };
      
      setAmenidadesStr(parseField(fichaAvaluo.amenidades, "Piscina, Gimnasio, Seguridad 24/7, Casa Club"));
      setInstalacionesStr(parseField(fichaAvaluo.instalaciones, "Paneles Solares, Cisterna 10,000L, Aire Acondicionado"));
      setEspaciosStr(parseField(fichaAvaluo.espacios, "Sala de TV, Comedor, Cocina Integral, Estudio"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaAvaluo, tipoPrecio]);

  const handleGenerarDescripcion = () => {
    const randomDesc = DESCRIPTIONS_CATALOG[Math.floor(Math.random() * DESCRIPTIONS_CATALOG.length)];
    let replaced = randomDesc
      .replace(/{tipo}/g, (fichaAvaluo?.tipo || "propiedad").toLowerCase())
      .replace(/{direccion}/g, fichaAvaluo?.direccion || "")
      .replace(/{m2_construccion}/g, fichaAvaluo?.m2_construccion || "X")
      .replace(/{recamaras}/g, fichaAvaluo?.recamaras || "X")
      .replace(/{banos}/g, fichaAvaluo?.banos || "X");
    setDescripcionTexto(replaced);
  };

  const exportarFicha = async (formatoExport = 'pdf') => {
    const el = document.getElementById("pv-ficha-root");
    if (!el) return;

    if (formatoExport === 'jpg') {
      try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.download = `Promocion_${fichaAvaluo.direccion.replace(/\s+/g, '_')}.jpg`;
        link.href = dataUrl;
        link.click();
        toast.success("Imagen descargada exitosamente");
      } catch (err) {
        console.error("Error al exportar JPG", err);
        toast.error("Hubo un error al exportar la imagen");
      }
      return;
    }

    // Default to PDF (Print)
    const clone = el.cloneNode(true);
    const wrap = document.createElement("div");
    wrap.id = "pv-ficha-print";
    wrap.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;overflow:auto;";
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    window.print();
    document.body.removeChild(wrap);
  };

  if (fichaAvaluo) {
    const texts = {
      es: {
        descripcion: "Descripción",
        caracteristicas: "Características",
        construccion: "Construcción",
        terreno: "Terreno",
        recamaras: "Recámaras",
        recamaras_val: `${fichaAvaluo.recamaras || 0} Habs`,
        banos: "Baños",
        banos_val: `${fichaAvaluo.banos || 0} Baños`,
        entorno: "Entorno (15 min)",
        asesor: "Asesor Inmobiliario",
        tecnologia: "Tecnología por"
      },
      en: {
        descripcion: "Description",
        caracteristicas: "Features",
        construccion: "Built Area",
        terreno: "Lot Size",
        recamaras: "Bedrooms",
        recamaras_val: `${fichaAvaluo.recamaras || 0} Beds`,
        banos: "Bathrooms",
        banos_val: `${fichaAvaluo.banos || 0} Baths`,
        entorno: "Surroundings (15 min)",
        asesor: "Real Estate Agent",
        tecnologia: "Powered by"
      }
    }[idioma];

    const theme = TEMAS[temaSeleccionado] || TEMAS.classic;
    const LayoutComponent = getLayoutComponent(temaSeleccionado);

    return (
      <div className="flex flex-col h-[calc(100vh-100px)] pt-2">
        {/* Barra de título y botones superior limpia */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            onClick={() => setFichaAvaluo(null)} 
            className="w-10 h-10 rounded-full p-0 flex items-center justify-center text-[#1B4332] border-[#1B4332] hover:bg-[#1B4332] hover:text-white shrink-0"
            title="Volver a Valuaciones"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
             <h2 className="text-xl font-bold font-['Outfit'] text-[#1B4332]">Diseñador de Fichas</h2>
             <p className="text-xs text-slate-500">{fichaAvaluo.direccion}</p>
          </div>
          <div className="flex gap-2">
             <Button onClick={() => exportarFicha('pdf')} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-lg shadow-sm">
               <Download className="w-4 h-4 mr-2" />
               PDF
             </Button>
             <Button onClick={() => exportarFicha('jpg')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg shadow-sm">
               <ImageIcon className="w-4 h-4 mr-2" />
               JPG
             </Button>
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Left Panel: Controls */}
          <div className="w-full lg:w-[550px] shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-10">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-5 flex flex-col gap-6">
                
                {/* Editor Description */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Descripción Atractiva</label>
                    <button onClick={handleGenerarDescripcion} className="flex items-center gap-1 text-xs text-[#52B788] hover:text-[#1B4332] font-semibold bg-[#F0FAF5] px-2 py-1 rounded-md transition-colors">
                      <Sparkles className="w-3 h-3" /> Generar con IA
                    </button>
                  </div>
                  <textarea 
                    value={descripcionTexto}
                    onChange={(e) => setDescripcionTexto(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[160px] focus:outline-none focus:border-[#52B788] text-slate-600 resize-y"
                    placeholder="Escribe una descripción que enamore..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Idioma */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Idioma</label>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      <button onClick={() => setIdioma("es")} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${idioma === "es" ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>ES</button>
                      <button onClick={() => setIdioma("en")} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${idioma === "en" ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>EN</button>
                    </div>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Precio Mostrado</label>
                    <select 
                      value={tipoPrecio} 
                      onChange={(e) => setTipoPrecio(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-[9px] text-xs focus:outline-none focus:border-[#52B788] bg-white text-[#1B4332] font-semibold"
                    >
                      <option value="maximo">Precio OPI (Máx)</option>
                      <option value="medio">Precio OPI (Medio)</option>
                      <option value="minimo">Precio OPI (Mín)</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* Formato y Detalles Adicionales */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Configuración de Diseño</h4>
                  
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Formato de Exportación</label>
                    <select 
                        value={formatoSeleccionado} 
                        onChange={(e) => setFormatoSeleccionado(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-[9px] text-xs focus:outline-none focus:border-[#52B788] bg-slate-50 text-slate-700 font-semibold"
                      >
                        {temaSeleccionado === 'stitch_new' ? (
                          <>
                            <option value="stitch_gallery">Ficha A4 - Gallery Focus</option>
                            <option value="stitch_letter">Ficha A4 - Carta Clásica</option>
                            <option value="stitch_asymmetry">Ficha A4 - Modern Asymmetry</option>
                            <option value="stitch_facebook">Social - Facebook (3:2)</option>
                            <option value="stitch_tiktok">Social - TikTok/Reels (9:16)</option>
                            <option value="stitch_kit">Marketing Kit</option>
                          </>
                        ) : (
                          <>
                            <option value="vertical_2p">Folleto Vertical (A4 - 2 Páginas)</option>
                            <option value="horizontal">Presentación Horizontal (16:9)</option>
                            <option value="reels">TikTok / Reels (9:16)</option>
                            <option value="post">Post Cuadrado (1:1)</option>
                          </>
                        )}
                      </select>
                  </div>

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mt-4 mb-2">Detalles de la Propiedad (OPI)</h4>
                  
                  {/* Icon Picker - Amenidades */}
                  <div className="mb-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Amenidades</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {[
                        { label: 'Alberca', Icon: Waves }, { label: 'Gimnasio', Icon: Dumbbell },
                        { label: 'Seguridad 24/7', Icon: Shield }, { label: 'Casa Club', Icon: Home },
                        { label: 'Jardín', Icon: Trees }, { label: 'Terraza', Icon: Sun },
                        { label: 'Cava de Vinos', Icon: Wine }, { label: 'Aire Acondicionado', Icon: Wind },
                        { label: 'Cochera 2 autos', Icon: Car }, { label: 'Smart Home', Icon: Monitor },
                        { label: 'Vista al Mar', Icon: Waves }, { label: 'Elevador', Icon: Box },
                      ].map(({ label, Icon }) => {
                        const isActive = amenidadesStr.includes(label);
                        return (
                          <button key={label} title={label} onClick={() => setAmenidadesStr(toggleItem(amenidadesStr, label))}
                            className={`p-2 rounded-lg border transition-colors shadow-sm flex items-center justify-center
                              ${isActive ? 'bg-[#1B4332] border-[#1B4332] text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Icon Picker - Instalaciones */}
                  <div className="mb-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Instalaciones Especiales</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {[
                        { label: 'Paneles Solares', Icon: Sun }, { label: 'Cisterna 10,000L', Icon: Droplets },
                        { label: 'Generador', Icon: Zap }, { label: 'Circuito Cerrado 8 cámaras', Icon: Camera },
                        { label: 'Domótica', Icon: Monitor }, { label: 'Calentador Solar', Icon: Sun },
                        { label: 'Gas Estacionario', Icon: Zap }, { label: 'Fibra Óptica', Icon: Wifi },
                      ].map(({ label, Icon }) => {
                        const isActive = instalacionesStr.includes(label);
                        return (
                          <button key={label} title={label} onClick={() => setInstalacionesStr(toggleItem(instalacionesStr, label))}
                            className={`p-2 rounded-lg border transition-colors shadow-sm flex items-center justify-center
                              ${isActive ? 'bg-[#1B4332] border-[#1B4332] text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Icon Picker - Espacios */}
                  <div className="mb-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Espacios Interiores</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {[
                        { label: 'Sala de TV', Icon: Tv }, { label: 'Comedor', Icon: Utensils },
                        { label: 'Cocina Integral', Icon: Utensils }, { label: 'Estudio', Icon: BookOpen },
                        { label: 'Cuarto de Servicio', Icon: Bed }, { label: 'Bodega', Icon: Box },
                        { label: 'Sala de Juegos', Icon: Gamepad2 }, { label: 'Spa', Icon: Droplet },
                      ].map(({ label, Icon }) => {
                        const isActive = espaciosStr.includes(label);
                        return (
                          <button key={label} title={label} onClick={() => setEspaciosStr(toggleItem(espaciosStr, label))}
                            className={`p-2 rounded-lg border transition-colors shadow-sm flex items-center justify-center
                              ${isActive ? 'bg-[#1B4332] border-[#1B4332] text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Galeria de Plantillas */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-3">Galería de Plantillas</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(TEMAS).map((t) => (
                      <button 
                        key={t}
                        onClick={() => {
                          setTemaSeleccionado(t);
                          if (t === 'stitch_new') setFormatoSeleccionado('stitch_gallery');
                          else setFormatoSeleccionado('vertical_2p');
                        }}
                        className={`relative flex flex-col group text-left rounded-xl overflow-hidden border-2 transition-all ${temaSeleccionado === t ? 'border-[#52B788] ring-2 ring-[#52B788]/20 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="aspect-[3/2] w-full bg-slate-100 overflow-hidden relative">
                          {TEMAS[t].thumb ? (
                            <img src={TEMAS[t].thumb} alt={TEMAS[t].nombre} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] uppercase font-bold tracking-widest">{TEMAS[t].nombre}</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 right-2">
                             <span className={`text-[10px] font-bold text-white drop-shadow-md`}>{TEMAS[t].nombre}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="flex-1 bg-slate-200/60 rounded-2xl border border-slate-300 relative flex flex-col overflow-hidden shadow-inner">
            
            {/* Paginación Header (Sólo si es A4) */}
            {esFormatoA4 && (
              <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
                <div className="bg-white rounded-full shadow-lg border border-slate-200 p-1 flex items-center gap-1">
                  <button 
                    onClick={() => setHojaActiva(1)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${hojaActiva === 1 ? 'bg-[#1B4332] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Hoja 1
                  </button>
                  <button 
                    onClick={() => setHojaActiva(2)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${hojaActiva === 2 ? 'bg-[#1B4332] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Hoja 2
                  </button>
                </div>
              </div>
            )}

            {/* Contenedor con escalado automático para no tener que hacer scroll */}
            <div className="flex-1 flex items-center justify-center p-4 relative h-full w-full overflow-hidden">
              <div className="transform scale-[0.38] md:scale-[0.45] lg:scale-[0.55] xl:scale-[0.65] 2xl:scale-[0.75] origin-top transition-transform duration-300 relative">
                
                {/* Envoltura de paginación para formatos A4 */}
                <div className={`transition-transform duration-700 ease-in-out ${esFormatoA4 && hojaActiva === 2 ? '-translate-y-[1162px]' : 'translate-y-0'}`}>
                  <LayoutComponent 
                    fichaAvaluo={fichaAvaluo}
                    texts={texts}
                    idioma={idioma}
                    descripcionTexto={descripcionTexto}
                    theme={theme}
                    formatMXN={formatMXN}
                    session={session}
                    amenidades={(amenidadesStr || "").split(',').map(s => s.trim()).filter(Boolean)}
                    instalaciones={(instalacionesStr || "").split(',').map(s => s.trim()).filter(Boolean)}
                    espacios={(espaciosStr || "").split(',').map(s => s.trim()).filter(Boolean)}
                    formato={formatoSeleccionado}
                  />
                </div>
                
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-bold text-white text-lg font-['Outfit']">Fichas de Promoción</p>
          <p className="text-[#D9ED92]/80 text-sm mt-1">
            Genera fichas inmobiliarias de alto impacto con un clic, usando los datos de tus avalúos completados.
          </p>
        </div>
      </div>

      {avaluosCompletados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Home className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <p className="font-semibold text-slate-600 mb-1">Aún no tienes avalúos completados</p>
          <p className="text-sm text-slate-400">Solicita un avalúo para poder generar fichas de promoción de tus propiedades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {avaluosCompletados.map((v) => (
            <Card key={v.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col">
              {/* Image Header */}
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                {v.fotos && v.fotos.length > 0 ? (
                  <img src={v.fotos[0]} alt="Fachada" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">{v.tipo}</p>
                  <p className="font-bold font-['Outfit'] text-lg leading-tight">{formatMXN(v.valor)}</p>
                </div>
              </div>
              
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 text-[#52B788] shrink-0" />
                    {v.direccion}
                  </p>
                </div>
                
                <Button
                  onClick={() => setFichaAvaluo(v)}
                  className="w-full mt-auto bg-[#F0FAF5] hover:bg-[#D9F0E3] text-[#1B4332] font-semibold border border-[#B7E4C7]"
                  variant="outline"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-[#52B788]" />
                  Generar Ficha
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromocionesTab;
