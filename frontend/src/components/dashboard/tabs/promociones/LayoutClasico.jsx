import React from "react";
import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Plus, Fingerprint, Sofa, Home } from "lucide-react";
import { esClaro, sobreFondo, tinta } from "./paletteUtils";

const LayoutClasico = ({ fichaAvaluo, texts, idioma, descripcionTexto, theme, palette, formatMXN, session, amenidades, instalaciones, espacios, puntosDestacados, formato }) => {
  // palette override: si viene palette, usa sus hex; si no, mantiene clases Tailwind del theme
  const heroBg = palette?.bg || "#1B4332";
  const accentColor = palette?.accent || "#52B788";
  const accentBg = palette ? palette.bg + "18" : null; // null = usar clase Tailwind
  // Configuración de contenedores según el formato
  let containerClasses = "";
  let pageClasses = "";

  switch (formato) {
    case "horizontal":
      containerClasses = "w-full max-w-[1100px] flex flex-col gap-8 print:gap-0 relative print:max-w-none";
      pageClasses = "w-full aspect-[16/9] relative flex overflow-hidden shadow-xl print:shadow-none break-after-page page-break-after-always";
      break;
    case "reels":
      containerClasses = "w-full max-w-[420px] mx-auto flex flex-col relative";
      pageClasses = "w-full aspect-[9/16] relative flex flex-col overflow-hidden shadow-2xl bg-black";
      break;
    case "post":
      containerClasses = "w-full max-w-[600px] mx-auto flex flex-col relative";
      pageClasses = "w-full aspect-square relative flex flex-col overflow-hidden shadow-xl";
      break;
    case "vertical_2p":
    default:
      containerClasses = "w-full max-w-[800px] mx-auto flex flex-col gap-8 print:gap-0 relative print:max-w-none";
      pageClasses = "w-full aspect-[1/1.414] relative flex flex-col overflow-hidden shadow-xl print:shadow-none break-after-page page-break-after-always";
      break;
  }

  // --- PARSER DE ICONOS INTELIGENTE ---
  const parseFeatureItem = (str) => {
    const raw = str.trim();
    // Extraer un número si existe al principio o final (Ej: "Alberca 100m2", "2 Aires")
    const numMatch = raw.match(/\b(\d+(?:m2)?)\b/i);
    const qty = numMatch ? numMatch[1] : null;
    let label = raw;
    if (qty) label = raw.replace(qty, "").replace(/\s+/, " ").trim();
    
    // Mapeo Inteligente
    const lower = label.toLowerCase();
    let Icon = CheckCircle2;
    if (lower.includes("alberca") || lower.includes("piscina")) Icon = Waves;
    else if (lower.includes("aire") || lower.includes("acondicionado")) Icon = Wind;
    else if (lower.includes("auto") || lower.includes("cochera") || lower.includes("estacionamiento")) Icon = Car;
    else if (lower.includes("camara") || lower.includes("circuito") || lower.includes("cctv")) Icon = Camera;
    else if (lower.includes("jardin") || lower.includes("arbol") || lower.includes("areas verdes")) Icon = Trees;
    else if (lower.includes("gym") || lower.includes("gimnasio")) Icon = Dumbbell;
    else if (lower.includes("seguridad") || lower.includes("vigilancia") || lower.includes("caseta")) Icon = Shield;
    else if (lower.includes("cava") || lower.includes("vino")) Icon = Wine;
    else if (lower.includes("smart") || lower.includes("inteligente")) Icon = Monitor;
    else if (lower.includes("biometrico") || lower.includes("huella")) Icon = Fingerprint;
    else if (lower.includes("sala") || lower.includes("family")) Icon = Sofa;
    else if (lower.includes("casa club")) Icon = Home;

    return { label, qty, Icon };
  };

  // Si es un reel, dibujamos un diseño ultra compacto a pantalla completa
  if (formato === "reels") {
    return (
      <div id="pv-ficha-root" className={containerClasses}>
        <div className={pageClasses}>
          <img src={fichaAvaluo?.fotos?.[0]} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          <div className="relative z-10 flex flex-col h-full p-8 text-white">
            <div className={`mt-auto mb-4 px-4 py-1.5 ${theme.bgAccent} rounded-full inline-block self-start`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textPri}`}>{fichaAvaluo.tipo}</span>
            </div>
            
            <h2 className="text-4xl font-['Outfit'] font-black leading-tight mb-2 drop-shadow-md">{formatMXN(fichaAvaluo.valor)}</h2>
            <p className="text-sm tracking-widest uppercase text-white/80 mb-8"><MapPin className="inline w-4 h-4 mr-1"/> {fichaAvaluo.direccion}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
               {amenidades?.slice(0,4).map((am, i) => (
                 <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center justify-center text-center">
                   <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{am}</span>
                 </div>
               ))}
            </div>

            <div className="bg-white text-black p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-widest shadow-2xl">
              Agenda tu visita en el Link
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si es post cuadrado
  if (formato === "post") {
    return (
      <div id="pv-ficha-root" className={containerClasses}>
        <div className={`${pageClasses} bg-white`}>
          <div className="h-[60%] w-full relative">
             <img src={fichaAvaluo?.fotos?.[0]} alt="Hero" className="w-full h-full object-cover" />
          </div>
          <div className={`h-[40%] w-full ${theme.bgRoot} p-8 flex flex-col justify-between border-t-[12px] border-[#D4AF37]`}>
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-bold ${theme.textSec} mb-1`}>Nueva Exclusiva</p>
              <h2 className={`text-2xl font-bold ${theme.textPri} leading-tight truncate`}>{fichaAvaluo.direccion}</h2>
            </div>
            <div className="flex justify-between items-end">
              <h1 className={`text-5xl font-black font-['Outfit'] ${theme.textPri}`}>{formatMXN(fichaAvaluo.valor)}</h1>
              <div className="flex gap-4">
                 <div className="text-center"><p className={`font-bold ${theme.textPri}`}>{fichaAvaluo.recamaras}</p><p className="text-[8px] uppercase tracking-widest text-slate-500">Habs</p></div>
                 <div className="text-center"><p className={`font-bold ${theme.textPri}`}>{fichaAvaluo.banos}</p><p className="text-[8px] uppercase tracking-widest text-slate-500">Baños</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── A4 FRONT PAGE (vertical_2p) — estilo brochure: hero grande + datos abajo ──
  if (formato === 'vertical_2p') {
    const fotos = (fichaAvaluo?.fotos || []).filter(Boolean);
    const precioM2 = fichaAvaluo?.m2_construccion > 0 ? Math.round(fichaAvaluo.valor / fichaAvaluo.m2_construccion) : null;
    const asesorName = session?.user?.name || session?.user?.email?.split('@')[0] || "Asesor Inmobiliario";
    const specsFront = [
      { Icon: Building, label: idioma === 'es' ? 'm² Const.' : 'Built',   val: fichaAvaluo?.m2_construccion ? `${fichaAvaluo.m2_construccion}` : null },
      { Icon: Map,      label: idioma === 'es' ? 'm² Terreno' : 'Lot',    val: fichaAvaluo?.m2_terreno ? `${fichaAvaluo.m2_terreno}` : null },
      { Icon: null,     label: texts.recamaras, val: fichaAvaluo?.recamaras != null ? String(fichaAvaluo.recamaras) : null },
      { Icon: null,     label: texts.banos,     val: fichaAvaluo?.banos != null ? String(fichaAvaluo.banos) : null },
      { Icon: Car,      label: idioma === 'es' ? 'Autos' : 'Parking',     val: fichaAvaluo?.estacionamiento != null ? String(fichaAvaluo.estacionamiento) : null },
    ].filter(s => s.val !== null);

    const ink = tinta(heroBg, "#1a1a1a");          // título legible aunque la paleta sea clara
    const chipText = sobreFondo(heroBg);           // texto sobre el chip de color
    // Galería adaptativa: las fotos disponibles llenan el espacio
    const galeria = fotos.slice(1, 4);

    return (
      <div id="pv-ficha-root" className="w-full mx-auto" style={{ width: 794 }}>
        <div className="relative flex flex-col overflow-hidden shadow-xl print:shadow-none" style={{ width: 794, height: 1123, background: "#fff" }}>
          {/* Detalle de fondo: barra diagonal de color de marca */}
          <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 130px 130px 0", borderColor: `transparent ${accentColor}22 transparent transparent`, zIndex: 0 }} />

          {/* Hero grande con margen e inset */}
          <div style={{ padding: 22, paddingBottom: 0, position: "relative", zIndex: 1 }}>
            <div style={{ height: 600, borderRadius: 14, overflow: "hidden", position: "relative", background: "#e5e5e5" }}>
              {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 38%)" }} />
              {/* Chip tipo */}
              <div style={{ position: "absolute", top: 22, left: 22, background: heroBg, padding: "10px 22px", borderRadius: 30, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: chipText }}>
                  {fichaAvaluo.tipo} · {idioma === 'es' ? 'En Venta' : 'For Sale'}
                </span>
              </div>
              {/* Logo inmobiliaria */}
              {session?.user?.picture && (
                <div style={{ position: "absolute", top: 20, right: 22, background: "rgba(255,255,255,0.94)", borderRadius: 10, padding: "10px 16px", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
                  <img src={session.user.picture} alt="Logo" style={{ height: 34, maxWidth: 130, objectFit: "contain" }} />
                </div>
              )}
            </div>
          </div>

          {/* Bloque inferior */}
          <div style={{ flex: 1, padding: "24px 34px 0", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
            {/* Tagline + dirección + precio */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: accentColor }}>
                  {idioma === 'es' ? 'Nuevo en Venta' : 'New Listing'}
                </p>
                <h1 style={{ margin: "7px 0 5px", fontFamily: "Outfit, sans-serif", fontSize: 40, fontWeight: 800, color: ink, lineHeight: 1.03 }}>
                  {fichaAvaluo.direccion}
                </h1>
                <p style={{ margin: 0, fontSize: 17, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin style={{ width: 18, height: 18, color: accentColor }} />
                  {[fichaAvaluo.colonia, fichaAvaluo.municipio].filter(Boolean).join(", ") || "Ubicación Premium"}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 46, fontWeight: 800, color: ink, lineHeight: 1 }}>
                  {formatMXN(fichaAvaluo.valor)}
                </p>
                {precioM2 && <p style={{ margin: "5px 0 0", fontSize: 15, color: "#94a3b8" }}>{formatMXN(precioM2)} / m²</p>}
              </div>
            </div>

            {/* Specs bar */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "22px 0", padding: "20px 0", borderTop: "2px solid #e2e8f0", borderBottom: "2px solid #e2e8f0" }}>
              {specsFront.map(({ Icon, label, val }, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 54, height: 54, margin: "0 auto 8px", borderRadius: "50%", background: accentColor + "1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {Icon
                      ? <Icon style={{ width: 24, height: 24, color: accentColor }} />
                      : <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 24, color: accentColor }}>{val}</span>}
                  </div>
                  {Icon && <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 22, color: ink }}>{val}</p>}
                  <p style={{ margin: "3px 0 0", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Descripción + chips */}
            <div>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: "#475569", textAlign: "justify" }}>
                {descripcionTexto}
              </p>
              {puntosDestacados?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}>
                  {puntosDestacados.slice(0, 5).map((p, i) => (
                    <span key={i} style={{
                      fontSize: 13.5, padding: "7px 16px", borderRadius: 30, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6,
                      background: p.verificado ? accentColor + "18" : "#f1f5f9",
                      border: p.verificado ? `1px solid ${accentColor}40` : "1px solid #e2e8f0",
                      color: p.verificado ? ink : "#64748b",
                    }}>
                      {p.verificado && <CheckCircle2 style={{ width: 14, height: 14, color: accentColor }} />}
                      {p.texto}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Galería adaptativa — llena el espacio restante con las fotos disponibles */}
            {galeria.length > 0 && (
              <div style={{ flex: 1, minHeight: 0, marginTop: 18, display: "grid", gridTemplateColumns: `repeat(${galeria.length}, 1fr)`, gap: 10 }}>
                {galeria.map((foto, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: "hidden", background: "#e5e5e5" }}>
                    <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Footer asesor */}
            <div style={{ marginTop: "auto", borderTop: "2px solid #e2e8f0", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "#e5e5e5", border: `2px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {session?.user?.photoURL
                    ? <img src={session.user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <User style={{ width: 24, height: 24, color: "#94a3b8" }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ink }}>{asesorName}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    {session?.user?.phone}{session?.user?.phone && session?.user?.email ? " · " : ""}{session?.user?.email}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: sobreFondo(accentColor), fontWeight: 900, fontSize: 9, fontFamily: "Outfit, sans-serif" }}>P</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8" }}>propvalu.mx</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Horizontal (16:9)
  return (
    <div id="pv-ficha-root" className={containerClasses}>

      {/* PÁGINA 1 */}
      <div className={`${pageClasses} ${theme.bgPage}`}>
        <div className={`relative ${formato === 'horizontal' ? 'w-[50%] h-full' : 'h-[45%] w-full'} shrink-0`}>
          <img src={fichaAvaluo?.fotos?.[0]} alt="Fachada" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          <div className={`absolute top-8 left-8 px-4 py-1.5 rounded-full shadow-lg`}
            style={accentBg ? { backgroundColor: accentBg } : undefined}
            {...(!accentBg && { className: `absolute top-8 left-8 ${theme.bgAccent} px-4 py-1.5 rounded-full shadow-lg` })}>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: accentColor }}>{fichaAvaluo.tipo}</span>
          </div>

          <div className={`absolute ${formato === 'horizontal' ? 'bottom-8 left-8' : '-bottom-8 right-10'} px-8 py-4 rounded-2xl shadow-2xl z-20`}
            style={{ background: heroBg }}>
            <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold mb-1">{idioma === 'es' ? 'Precio de Venta' : 'Asking Price'}</p>
            <h1 className="text-4xl font-black text-white font-['Outfit']">{formatMXN(fichaAvaluo.valor)}</h1>
          </div>
        </div>

        <div className={`flex-1 flex flex-col p-10 relative z-10 ${formato === 'horizontal' ? 'justify-center' : 'pt-12'}`}>
          <div className="mb-8">
             <h2 className={`text-2xl font-bold ${theme.textPri} mb-2 leading-tight`}>{fichaAvaluo.direccion}</h2>
             <p className={`text-sm ${theme.textSec} flex items-center gap-2`}><MapPin className={`w-4 h-4 ${theme.accent}`}/> Ubicación Premium</p>
          </div>

          <div className="grid grid-cols-4 gap-4 pb-8 border-b border-slate-100 mb-8">
            <div className="text-center">
              <div className={`${theme.bgAccent} w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2`}><Building className={`w-4 h-4 ${theme.accent}`} /></div>
              <p className={`font-bold ${theme.textPri} text-base`}>{fichaAvaluo.m2_construccion || 0}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">m² Const.</p>
            </div>
            <div className="text-center">
              <div className={`${theme.bgAccent} w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2`}><Map className={`w-4 h-4 ${theme.accent}`} /></div>
              <p className={`font-bold ${theme.textPri} text-base`}>{fichaAvaluo.m2_terreno || 0}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">m² Terr.</p>
            </div>
            <div className="text-center">
              <div className={`${theme.bgAccent} w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2`}><span className={`font-bold ${theme.accent} text-lg font-['Outfit']`}>{fichaAvaluo.recamaras || 0}</span></div>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">{texts.recamaras}</p>
            </div>
            <div className="text-center">
              <div className={`${theme.bgAccent} w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2`}><span className={`font-bold ${theme.accent} text-lg font-['Outfit']`}>{fichaAvaluo.banos || 0}</span></div>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">{texts.banos}</p>
            </div>
          </div>

          <div className="flex-1">
            <h3 className={`text-[11px] font-bold ${theme.textPri} uppercase tracking-widest mb-3 flex items-center gap-2`}><CheckCircle2 className={`w-4 h-4 ${theme.accent}`} style={{ color: accentColor }}/> {texts.descripcion}</h3>
            <p className={`text-sm leading-relaxed text-justify ${theme.textSec}`}>{descripcionTexto}</p>

            {/* Puntos destacados */}
            {puntosDestacados?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {puntosDestacados.slice(0, 6).map((p, i) => (
                  <span key={i} className={`text-[11px] px-3 py-1 rounded-full font-semibold flex items-center gap-1 ${p.verificado ? "border" : "bg-slate-100 text-slate-600"}`}
                    style={p.verificado ? { backgroundColor: accentColor + "18", color: heroBg, borderColor: accentColor + "40" } : undefined}>
                    {p.verificado && <CheckCircle2 className="w-3 h-3" style={{ color: accentColor }} />}
                    {p.texto}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PÁGINA 2 - Detalles de Lujo y Contacto */}
      {formato === 'vertical_2p' && (
        <div className={`${pageClasses} ${theme.bgPage} p-12 flex flex-col justify-between`}>
          
          {/* Listados */}
          <div className="flex-1 flex flex-col gap-10">
            {/* Amenidades */}
            <div>
              <h3 className={`text-lg font-bold ${theme.textPri} uppercase tracking-widest mb-6 border-b-2 border-slate-100 pb-2`}>{idioma === 'es' ? 'Amenidades de Lujo' : 'Luxury Amenities'}</h3>
              <div className="grid grid-cols-3 gap-6">
                {amenidades?.map((am, i) => {
                  const { label, qty, Icon } = parseFeatureItem(am);
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 ${theme.bgRoot} rounded-xl border border-slate-100`}>
                      <div className={`p-2 rounded-full ${theme.bgAccent} shrink-0`}><Icon className={`w-4 h-4 ${theme.accent}`}/></div>
                      <div className="flex flex-col">
                         <span className={`text-xs font-bold ${theme.textSec} capitalize leading-tight`}>{label}</span>
                         {qty && <span className={`text-[10px] font-black ${theme.textPri} uppercase tracking-widest mt-0.5`}>{qty}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-10">
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${theme.textPri} uppercase tracking-widest mb-4 border-b border-slate-100 pb-2`}>{idioma === 'es' ? 'Instalaciones Especiales' : 'Special Installations'}</h3>
                <ul className="space-y-4">
                  {instalaciones?.map((inst, i) => {
                    const { label, qty, Icon } = parseFeatureItem(inst);
                    return (
                      <li key={i} className={`flex items-center justify-between border-b border-slate-50 pb-2`}>
                        <div className="flex items-center gap-3"><Icon className={`w-4 h-4 text-slate-400`}/><span className={`text-xs ${theme.textSec}`}>{label}</span></div>
                        {qty && <span className={`text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase`}>{qty}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${theme.textPri} uppercase tracking-widest mb-4 border-b border-slate-100 pb-2`}>{idioma === 'es' ? 'Espacios Interiores' : 'Interior Spaces'}</h3>
                <ul className="space-y-4">
                  {espacios?.map((esp, i) => {
                    const { label, qty, Icon } = parseFeatureItem(esp);
                    return (
                      <li key={i} className={`flex items-center justify-between border-b border-slate-50 pb-2`}>
                        <div className="flex items-center gap-3"><Icon className={`w-4 h-4 text-slate-400`}/><span className={`text-xs ${theme.textSec}`}>{label}</span></div>
                        {qty && <span className={`text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase`}>{qty}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Galería Secundaria (Mitad inferior) */}
          <div className="h-[200px] w-full grid grid-cols-3 gap-4 mt-8 mb-8">
            {fichaAvaluo?.fotos?.slice(1, 4).map((f, i) => (
              <div key={i} className="w-full h-full bg-slate-200 rounded-2xl overflow-hidden shadow-inner"><img src={f} className="w-full h-full object-cover" alt="Detalle" /></div>
            ))}
          </div>

          {/* Contacto Asesor */}
          <div className={`${theme.bgRoot} rounded-2xl p-6 border border-slate-100 flex items-center justify-between`}>
             <div className="flex items-center gap-4">
               {/* Logo inmobiliaria (picture del usuario) */}
               <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                 {session?.user?.picture
                   ? <img src={session.user.picture} alt="Logo" className="w-full h-full object-contain p-1"/>
                   : <Building className="w-10 h-10 text-slate-300"/>}
               </div>
               <div className="w-px h-12 bg-slate-200 mx-1" />
               <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                 {session?.user?.photoURL ? <img src={session.user.photoURL} alt="Asesor" className="w-full h-full object-cover"/> : <User className="w-6 h-6 text-slate-400"/>}
               </div>
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{texts.asesor}</p>
                 <p className={`text-lg font-bold ${theme.textPri}`}>{session?.user?.name || session?.user?.email?.split('@')[0] || "Asesor Inmobiliario"}</p>
                 <div className="flex items-center gap-4 mt-1">
                   {session?.user?.phone && <span className={`text-[10px] font-bold ${theme.textSec} flex items-center gap-1`}><Phone className="w-3 h-3"/> {session.user.phone}</span>}
                   <span className={`text-[10px] font-bold ${theme.textSec} flex items-center gap-1`}><Mail className="w-3 h-3"/> {session?.user?.email}</span>
                 </div>
               </div>
               </div>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-[10px] font-bold ${theme.textPri} uppercase tracking-widest mb-1`}>Agenda tu cita</p>
                  <p className="text-xs text-slate-500">Escanea el código QR</p>
                </div>
                <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                   {/* QR Placeholder. Can use a real react-qr-code later */}
                   <div className="w-full h-full border-4 border-black border-dashed opacity-20"></div>
                </div>
             </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default LayoutClasico;
