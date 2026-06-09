import React from "react";
import { MapPin, CheckCircle2, Building, Map, BedDouble, Bath, Car, Phone, Mail, User } from "lucide-react";

const LayoutMinimalista = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, theme, palette, formatMXN, session, amenidades = [], puntosDestacados = [] }) => {
  const bg     = palette?.bg     || "#1e293b";
  const accent = palette?.accent || "#3b82f6";
  const card   = palette?.card   || "#fff";
  const muted  = palette?.muted  || "#64748b";

  const precio = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos = f?.fotos || [];

  const specs = [
    { label: "m² Const.", val: f?.m2_construccion ? `${f.m2_construccion}` : null },
    { label: "m² Terr.",  val: f?.m2_terreno      ? `${f.m2_terreno}`      : null },
    { label: texts?.recamaras || "Recámaras", val: f?.recamaras != null ? String(f.recamaras) : null },
    { label: texts?.banos || "Baños",         val: f?.banos      != null ? String(f.banos)    : null },
    { label: "Cajones",   val: f?.estacionamiento != null ? String(f.estacionamiento) : null },
  ].filter(s => s.val !== null);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Barra lateral de color */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: accent }} />

      {/* Header */}
      <div style={{ padding: "40px 50px 0 56px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {/* Logo inmobiliaria */}
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            {session?.user?.picture
              ? <img src={session.user.picture} alt="Logo" style={{ height: 32, maxWidth: 100, objectFit: "contain" }} />
              : <div style={{ height: 20, width: 70, background: `${accent}20`, borderRadius: 3 }} />}
          </div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 56, fontWeight: 300, letterSpacing: -2, color: bg, lineHeight: 1, margin: 0 }}>
            {formatMXN(precio)}
          </h1>
          {precioM2 && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: muted, letterSpacing: "0.15em" }}>
              {formatMXN(precioM2)} / m²
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", paddingTop: 4 }}>
          <span style={{ display: "inline-block", border: `1px solid ${accent}`, padding: "4px 12px", fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: accent }}>
            {f?.tipo || "Propiedad"}
          </span>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: muted, letterSpacing: "0.1em" }}>
            {f?.colonia || f?.municipio || ""}
          </p>
        </div>
      </div>

      {/* Hero foto */}
      <div style={{ margin: "28px 56px 0 56px", height: 340, position: "relative", overflow: "hidden" }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(0.7)" }} />}
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.25)", pointerEvents: "none" }} />
        {/* Overlay con dirección */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 20px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.85)", letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={11} /> {f?.direccion || ""}
          </p>
        </div>
      </div>

      {/* Specs + Contenido */}
      <div style={{ display: "flex", gap: 0, margin: "24px 56px 0", flex: 1 }}>
        {/* Columna specs */}
        <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid #f1f5f9", paddingRight: 24 }}>
          {specs.map(({ label, val }, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, marginBottom: 3 }}>{label}</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 300, color: bg }}>{val}</p>
            </div>
          ))}
          {/* Amenidades compactas */}
          {amenidades.length > 0 && (
            <div style={{ marginTop: 8, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>Amenidades</p>
              {amenidades.slice(0, 6).map((a, i) => (
                <p key={i} style={{ margin: "0 0 4px", fontSize: 10, color: muted }}>· {a}</p>
              ))}
            </div>
          )}
        </div>

        {/* Columna contenido */}
        <div style={{ flex: 1, paddingLeft: 24, display: "flex", flexDirection: "column" }}>
          <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.8, color: "#475569", fontWeight: 300, textAlign: "justify" }}>
            {descripcionTexto || "Propiedad de diseño contemporáneo en ubicación privilegiada."}
          </p>

          {/* Puntos verificados */}
          {puntosDestacados.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {puntosDestacados.slice(0, 4).map((p, i) => (
                <span key={i} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                  background: p.verificado ? `${accent}12` : "#f8fafc",
                  border: `1px solid ${p.verificado ? accent : "#e2e8f0"}`,
                  color: p.verificado ? bg : "#64748b",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {p.verificado && <CheckCircle2 size={10} color={accent} />}
                  {p.texto}
                </span>
              ))}
            </div>
          )}

          {/* Mini galería */}
          {fotos.length > 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16, height: 90 }}>
              {fotos.slice(1, 3).map((foto, i) => (
                <img key={i} src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.6)" }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer asesor */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 56px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={16} color="#94a3b8" />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: bg }}>{session?.user?.name || "Asesor"}</p>
            <p style={{ margin: 0, fontSize: 10, color: muted }}>{session?.user?.phone || session?.user?.email || ""}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 7, fontFamily: "Outfit, sans-serif" }}>P</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>propvalu.mx</span>
        </div>
      </div>
    </div>
  );
};

export default LayoutMinimalista;
