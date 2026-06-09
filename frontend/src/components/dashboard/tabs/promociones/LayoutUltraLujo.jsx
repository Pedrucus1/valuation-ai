import React from "react";
import { Phone, Mail, CheckCircle2, User } from "lucide-react";

const LayoutUltraLujo = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, theme, palette, formatMXN, session, amenidades = [], puntosDestacados = [] }) => {
  const bg      = palette?.bg      || "#0D0D0D";
  const accent  = palette?.accent  || "#d4af37";
  const textLt  = palette?.textLight || "#f5f5f5";
  const card    = palette?.card    || "#1a1a1a";

  const precio = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos = f?.fotos || [];

  const specs = [
    { label: texts?.construccion || "m² Const.", val: f?.m2_construccion ? `${f.m2_construccion} m²` : null },
    { label: texts?.terreno      || "m² Terr.",  val: f?.m2_terreno      ? `${f.m2_terreno} m²`      : null },
    { label: texts?.recamaras    || "Recámaras", val: f?.recamaras != null ? String(f.recamaras)      : null },
    { label: texts?.banos        || "Baños",     val: f?.banos      != null ? String(f.banos)         : null },
    { label: "Cajones",          val: f?.estacionamiento != null ? String(f.estacionamiento)          : null },
  ].filter(s => s.val !== null);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", border: `10px solid #111` }}>

      {/* Top branding */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
        {session?.user?.picture
          ? <img src={session.user.picture} alt="Logo" style={{ height: 28, maxWidth: 90, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }} />
          : <span style={{ fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>INMOBILIARIA</span>}
        <div style={{ width: 40, height: 1, background: accent }} />
      </div>

      {/* Hero foto 55% */}
      <div style={{ position: "relative", height: "52%", overflow: "hidden", background: "#000" }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75, mixBlendMode: "luminosity" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, #111 100%)" }} />

        {/* Precio encima */}
        <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
          <span style={{ display: "inline-block", border: `1px solid ${accent}`, padding: "4px 16px", marginBottom: 10, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: accent }}>
            {f?.tipo || "Propiedad"} · {idioma === "en" ? "For Sale" : "En Venta"}
          </span>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 52, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: -1 }}>
            {formatMXN(precio)}
          </h1>
          {precioM2 && <p style={{ margin: 0, fontSize: 11, color: accent, letterSpacing: "0.15em" }}>{formatMXN(precioM2)} / m²</p>}
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", textTransform: "uppercase" }}>{f?.direccion || ""}</p>
        </div>
      </div>

      {/* Mini galería strip */}
      <div style={{ display: "flex", height: 80, background: "#0a0a0a" }}>
        {fotos.slice(1, 4).map((foto, i) => (
          <div key={i} style={{ flex: 1, borderRight: i < 2 ? "1px solid #222" : "none", overflow: "hidden" }}>
            <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55, filter: "grayscale(1)" }} />
          </div>
        ))}
      </div>

      {/* Contenido inferior */}
      <div style={{ flex: 1, display: "flex", padding: "20px 28px", gap: 24, background: card }}>

        {/* Descripción + puntos */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ width: 28, height: 2, background: accent, marginBottom: 12 }} />
          <p style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: accent, marginBottom: 10 }}>
            {idioma === "en" ? "The Property" : "La Propiedad"}
          </p>
          <p style={{ fontSize: 11, lineHeight: 1.7, color: "#94a3b8", textAlign: "justify", marginBottom: 14, flex: 1 }}>
            {descripcionTexto || "Una obra de arte habitable que establece un nuevo estándar de lujo sin compromisos."}
          </p>

          {/* Puntos verificados */}
          {puntosDestacados.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
              {puntosDestacados.slice(0, 4).map((p, i) => (
                <span key={i} style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700,
                  background: p.verificado ? `${accent}20` : "#222",
                  border: `1px solid ${p.verificado ? accent + "60" : "#333"}`,
                  color: p.verificado ? accent : "#666",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {p.verificado && <CheckCircle2 size={9} color={accent} />}
                  {p.texto}
                </span>
              ))}
            </div>
          )}

          {/* Amenidades */}
          {amenidades.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", fontWeight: 700, marginBottom: 6 }}>Amenidades</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {amenidades.slice(0, 6).map((a, i) => (
                  <span key={i} style={{ fontSize: 9, color: "#666", background: "#222", padding: "3px 8px", borderRadius: 3 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Asesor */}
          <div style={{ paddingTop: 12, borderTop: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={14} color="#555" />}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: textLt }}>{session?.user?.name || "Asesor"}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  {session?.user?.phone && <span style={{ fontSize: 9, color: "#666", display: "flex", alignItems: "center", gap: 3 }}><Phone size={8} color={accent} /> {session.user.phone}</span>}
                  <span style={{ fontSize: 9, color: "#666", display: "flex", alignItems: "center", gap: 3 }}><Mail size={8} color={accent} /> {session?.user?.email || ""}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#000", fontWeight: 900, fontSize: 6, fontFamily: "Outfit, sans-serif" }}>P</span>
              </div>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444" }}>propvalu.mx</span>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, background: "linear-gradient(to bottom, transparent, #333, transparent)" }} />

        {/* Specs columna */}
        <div style={{ width: 130, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          {specs.map(({ label, val }, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 26, fontWeight: 800, color: "#fff" }}>{val}</p>
              <p style={{ margin: "3px 0 0", fontSize: 7, letterSpacing: "0.3em", textTransform: "uppercase", color: accent }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LayoutUltraLujo;
