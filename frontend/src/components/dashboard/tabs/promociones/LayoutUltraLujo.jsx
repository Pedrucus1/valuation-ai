import React from "react";
import { Phone, Mail, CheckCircle2, User } from "lucide-react";

const LayoutUltraLujo = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, theme, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const bg       = palette?.bg        || "#0D0D0D";
  const accent   = palette?.accent    || "#d4af37";
  const textLt   = palette?.textLight || "#f5f5f5";
  const card     = palette?.card      || "#1a1a1a";
  const muted    = palette?.muted     || "#94a3b8";

  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];

  const specs = [
    { label: texts?.construccion || "m² Const.", val: f?.m2_construccion ? `${f.m2_construccion}` : null },
    { label: texts?.terreno      || "m² Terr.",  val: f?.m2_terreno      ? `${f.m2_terreno}`      : null },
    { label: texts?.recamaras    || "Recámaras", val: f?.recamaras != null ? String(f.recamaras)  : null },
    { label: texts?.banos        || "Baños",     val: f?.banos      != null ? String(f.banos)      : null },
    { label: "Cajones",          val: f?.estacionamiento != null ? String(f.estacionamiento)       : null },
    { label: "Niveles",          val: f?.niveles != null ? String(f.niveles)                       : null },
    { label: idioma === "en" ? "Age" : "Antigüedad", val: f?.antiguedad != null ? `${f.antiguedad}` : null },
    { label: idioma === "en" ? "Condition" : "Estado", val: f?.conservacion || null },
  ].filter(s => s.val !== null);

  // "Lo Especial" — combina todo en una lista que crece
  const especial = [
    ...puntosDestacados.map(p => ({ texto: p.texto, verificado: p.verificado })),
    ...amenidades.map(a => ({ texto: a, verificado: false })),
    ...instalaciones.map(a => ({ texto: a, verificado: false })),
    ...espacios.map(a => ({ texto: a, verificado: false })),
  ].filter(x => x.texto);

  const galeria = fotos.slice(1, 5);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", border: `10px solid #111`, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

      {/* Top branding */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
        {session?.user?.picture
          ? <img src={session.user.picture} alt="Logo" style={{ height: 30, maxWidth: 100, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.88 }} />
          : <span style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>INMOBILIARIA</span>}
        <div style={{ width: 40, height: 1, background: accent }} />
      </div>

      {/* Hero foto — dramático (~50%) */}
      <div style={{ position: "relative", height: 540, overflow: "hidden", background: "#000", flexShrink: 0 }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.78, mixBlendMode: "luminosity" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 38%, #111 100%)" }} />

        <div style={{ position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
          <span style={{ display: "inline-block", border: `1px solid ${accent}`, padding: "4px 16px", marginBottom: 12, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: accent }}>
            {f?.tipo || "Propiedad"} · {idioma === "en" ? "For Sale" : "En Venta"}
          </span>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 58, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: -1 }}>
            {formatMXN(precio)}
          </h1>
          {precioM2 && <p style={{ margin: 0, fontSize: 12, color: accent, letterSpacing: "0.15em" }}>{formatMXN(precioM2)} / m²</p>}
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>{f?.direccion || ""}</p>
        </div>
      </div>

      {/* Galería strip */}
      {galeria.length > 0 && (
        <div style={{ display: "flex", height: 92, background: "#0a0a0a", flexShrink: 0 }}>
          {galeria.map((foto, i) => (
            <div key={i} style={{ flex: 1, borderRight: i < galeria.length - 1 ? "1px solid #222" : "none", overflow: "hidden" }}>
              <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6, filter: "grayscale(0.7)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Specs fila dorada */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "16px 28px", background: card, borderBottom: "1px solid #222", flexShrink: 0 }}>
        {specs.map(({ label, val }, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1, borderRight: i < specs.length - 1 ? "1px solid #2a2a2a" : "none" }}>
            <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{val}</p>
            <p style={{ margin: "4px 0 0", fontSize: 6.5, letterSpacing: "0.22em", textTransform: "uppercase", color: accent }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Contenido inferior — crece para llenar */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "20px 28px 16px", background: card }}>
        <div style={{ width: 28, height: 2, background: accent, marginBottom: 12 }} />
        <p style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: accent, marginBottom: 10 }}>
          {idioma === "en" ? "The Property" : "La Propiedad"}
        </p>
        <p style={{ fontSize: 11.5, lineHeight: 1.7, color: muted, textAlign: "justify", marginBottom: 16 }}>
          {descripcionTexto || "Una obra de arte habitable que establece un nuevo estándar de lujo sin compromisos."}
        </p>

        {/* Lo Especial — lista que crece y llena el espacio */}
        {especial.length > 0 && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <p style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", color: accent, fontWeight: 700, marginBottom: 12 }}>
              {idioma === "en" ? "What Makes It Special" : "Lo Especial"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: especial.length > 5 ? "1fr 1fr" : "1fr", columnGap: 28, rowGap: 9 }}>
              {especial.slice(0, 12).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5, color: "#cbd5e1" }}>
                  <CheckCircle2 size={13} color={p.verificado ? accent : "#3a3a3a"} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: p.verificado ? 700 : 400, color: p.verificado ? textLt : "#9ca3af" }}>{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asesor */}
        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${accent}40` }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={15} color="#555" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: textLt }}>{session?.user?.name || "Asesor"}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                {session?.user?.phone && <span style={{ fontSize: 9.5, color: "#888", display: "flex", alignItems: "center", gap: 4 }}><Phone size={9} color={accent} /> {session.user.phone}</span>}
                {session?.user?.email && <span style={{ fontSize: 9.5, color: "#888", display: "flex", alignItems: "center", gap: 4 }}><Mail size={9} color={accent} /> {session.user.email}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 11, height: 11, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#000", fontWeight: 900, fontSize: 6.5, fontFamily: "Outfit, sans-serif" }}>P</span>
            </div>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555" }}>propvalu.mx</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutUltraLujo;
