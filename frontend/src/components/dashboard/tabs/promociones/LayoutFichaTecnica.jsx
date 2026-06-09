import React from "react";
import {
  MapPin, Building, Map, BedDouble, Bath, Car, Layers,
  Calendar, Wrench, Phone, Mail, User, CheckCircle2,
  Waves, Wind, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, QrCode
} from "lucide-react";

/* Hoja técnica — datos completos sin comparables de mercado.
   Recibe las mismas props que LayoutClasico para ser intercambiable.
*/
const LayoutFichaTecnica = ({
  fichaAvaluo,
  texts,
  idioma,
  descripcionTexto,
  palette,
  theme,
  formatMXN,
  session,
  amenidades = [],
  instalaciones = [],
  espacios = [],
  puntosDestacados = [],
}) => {
  const bg       = palette?.bg      || "#1B4332";
  const accent   = palette?.accent  || "#52B788";
  const textLight = palette?.textLight || "#D9ED92";
  const cardBg   = palette?.card    || "#fff";
  const muted    = palette?.muted   || "#4a7c59";

  const iconMap = (str = "") => {
    const s = str.toLowerCase();
    if (s.includes("alberca") || s.includes("piscina")) return Waves;
    if (s.includes("aire") || s.includes("acondicionado")) return Wind;
    if (s.includes("auto") || s.includes("cochera") || s.includes("estacionamiento")) return Car;
    if (s.includes("camara") || s.includes("cctv") || s.includes("circuito")) return Camera;
    if (s.includes("jardin") || s.includes("arbol") || s.includes("areas verdes")) return Trees;
    if (s.includes("gym") || s.includes("gimnasio")) return Dumbbell;
    if (s.includes("seguridad") || s.includes("vigilancia")) return Shield;
    if (s.includes("cava") || s.includes("vino")) return Wine;
    if (s.includes("smart") || s.includes("inteligente")) return Monitor;
    if (s.includes("biometrico") || s.includes("huella")) return Fingerprint;
    if (s.includes("sala") || s.includes("family")) return Sofa;
    if (s.includes("casa club")) return Home;
    return CheckCircle2;
  };

  const specs = [
    { Icon: Building, label: "m² Construidos", val: fichaAvaluo?.m2_construccion ? `${fichaAvaluo.m2_construccion} m²` : "—" },
    { Icon: Map,      label: "m² Terreno",     val: fichaAvaluo?.m2_terreno      ? `${fichaAvaluo.m2_terreno} m²`      : "—" },
    { Icon: BedDouble, label: texts?.recamaras || "Recámaras", val: fichaAvaluo?.recamaras ?? "—" },
    { Icon: Bath,     label: texts?.banos || "Baños",          val: fichaAvaluo?.banos ?? "—" },
    { Icon: Car,      label: "Estacionamientos", val: fichaAvaluo?.estacionamiento ?? "—" },
    { Icon: Layers,   label: "Niveles",          val: fichaAvaluo?.niveles ?? "—" },
    { Icon: Calendar, label: "Antigüedad",       val: fichaAvaluo?.antiguedad != null ? `${fichaAvaluo.antiguedad} años` : "—" },
    { Icon: Wrench,   label: "Conservación",     val: fichaAvaluo?.conservacion ?? "—" },
  ].filter(s => s.val !== "—");

  const asesorName = session?.user?.name || session?.user?.email?.split("@")[0] || "Asesor Inmobiliario";
  const fotos = fichaAvaluo?.fotos || [];

  return (
    <div
      id="pv-ficha-tecnica-root"
      className="relative flex flex-col overflow-hidden shadow-xl print:shadow-none"
      style={{ width: 794, height: 1123, backgroundColor: cardBg, fontFamily: "'Manrope', sans-serif" }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-stretch" style={{ backgroundColor: bg, minHeight: 72 }}>
        {/* Logo inmobiliaria */}
        <div className="w-20 shrink-0 flex items-center justify-center p-3 border-r border-white/10">
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" className="w-full h-full object-contain" />
            : <Building className="w-8 h-8 text-white/50" />}
        </div>

        <div className="flex-1 px-6 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: accent }}>
            {fichaAvaluo?.tipo || "Propiedad"} · {idioma === "en" ? "Technical Sheet" : "Ficha Técnica"}
          </p>
          <h2 className="text-base font-bold leading-snug text-white truncate">
            {fichaAvaluo?.direccion || "Sin dirección"}
          </h2>
          {(fichaAvaluo?.colonia || fichaAvaluo?.municipio) && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: textLight }}>
              <MapPin className="w-3 h-3" />
              {[fichaAvaluo.colonia, fichaAvaluo.municipio].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Precio */}
        <div className="shrink-0 flex flex-col items-end justify-center pr-6 py-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: textLight + "99" }}>
            {idioma === "en" ? "Asking Price" : "Precio de Oferta"}
          </p>
          <p className="text-2xl font-black font-['Outfit'] text-white">
            {formatMXN(fichaAvaluo?.valor ?? fichaAvaluo?.precio_oferta ?? 0)}
          </p>
          {fichaAvaluo?.m2_construccion > 0 && (fichaAvaluo?.valor ?? fichaAvaluo?.precio_oferta) > 0 && (
            <p className="text-[9px] mt-0.5" style={{ color: accent }}>
              {formatMXN(Math.round((fichaAvaluo?.valor ?? fichaAvaluo?.precio_oferta) / fichaAvaluo.m2_construccion))} / m²
            </p>
          )}
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Columna izquierda — foto principal + specs */}
        <div className="w-[42%] shrink-0 flex flex-col border-r border-slate-100">
          {/* Foto principal */}
          <div className="relative" style={{ height: 190 }}>
            {fotos[0]
              ? <img src={fotos[0]} alt="Principal" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-slate-100">
                  <Building className="w-12 h-12 text-slate-300" />
                </div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          {/* Galería secundaria */}
          {fotos.length > 1 && (
            <div className="grid grid-cols-3 gap-0.5 p-0.5" style={{ height: 64 }}>
              {fotos.slice(1, 4).map((f, i) => (
                <img key={i} src={f} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          )}

          {/* Specs grid */}
          <div className="flex-1 p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: muted }}>
              {idioma === "en" ? "Technical Data" : "Datos Técnicos"}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {specs.map(({ Icon, label, val }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: bg + "12" }}>
                    <Icon className="w-3 h-3" style={{ color: accent }} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 leading-none mb-0.5">{label}</p>
                    <p className="text-xs font-bold text-slate-700">{String(val)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha — descripción, puntos, amenidades */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">

          {/* Descripción */}
          {descripcionTexto && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: muted }}>
                {idioma === "en" ? "Description" : "Descripción"}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-5">{descripcionTexto}</p>
            </div>
          )}

          {/* Puntos destacados */}
          {puntosDestacados?.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>
                {idioma === "en" ? "Highlights" : "Puntos Destacados"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {puntosDestacados.slice(0, 5).map((p, i) => (
                  <span key={i}
                    className="text-[10px] px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                    style={p.verificado
                      ? { backgroundColor: accent + "18", color: bg, border: `1px solid ${accent}40` }
                      : { backgroundColor: "#f1f5f9", color: "#475569" }}>
                    {p.verificado && <CheckCircle2 className="w-2.5 h-2.5" style={{ color: accent }} />}
                    {p.texto}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amenidades */}
          {amenidades.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>
                {idioma === "en" ? "Amenities" : "Amenidades"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {amenidades.slice(0, 8).map((am, i) => {
                  const Icon = iconMap(am);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-600">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: accent }} />
                      <span className="truncate capitalize">{am}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instalaciones + Espacios en columnas */}
          {(instalaciones.length > 0 || espacios.length > 0) && (
            <div className="flex gap-3">
              {instalaciones.length > 0 && (
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: muted }}>
                    {idioma === "en" ? "Installations" : "Instalaciones"}
                  </p>
                  <ul className="space-y-1">
                    {instalaciones.slice(0, 5).map((inst, i) => {
                      const Icon = iconMap(inst);
                      return (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                          <Icon className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate capitalize">{inst}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {espacios.length > 0 && (
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: muted }}>
                    {idioma === "en" ? "Spaces" : "Espacios"}
                  </p>
                  <ul className="space-y-1">
                    {espacios.slice(0, 5).map((esp, i) => {
                      const Icon = iconMap(esp);
                      return (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                          <Icon className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate capitalize">{esp}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER — contacto + badge ────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: bg + "08" }}>
        {/* Asesor */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow flex items-center justify-center overflow-hidden shrink-0">
            {session?.user?.photoURL
              ? <img src={session.user.photoURL} alt="Asesor" className="w-full h-full object-cover" />
              : <User className="w-4 h-4 text-slate-400" />}
          </div>
          <div>
            <p className="text-[10px] font-bold leading-none" style={{ color: bg }}>{asesorName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {session?.user?.phone && (
                <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                  <Phone className="w-2.5 h-2.5" /> {session.user.phone}
                </span>
              )}
              <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                <Mail className="w-2.5 h-2.5" /> {session?.user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* QR placeholder */}
        {fichaAvaluo?.url_recorrido && (
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 text-right">Recorrido virtual</p>
            </div>
            <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-slate-300" />
            </div>
          </div>
        )}

        {/* PropValu badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: bg + "12" }}>
          <div className="w-3 h-3 rounded-sm flex items-center justify-center shrink-0" style={{ backgroundColor: accent }}>
            <span className="text-white font-black" style={{ fontSize: 6 }}>P</span>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: bg }}>propvalu.mx</span>
        </div>
      </div>
    </div>
  );
};

export default LayoutFichaTecnica;
