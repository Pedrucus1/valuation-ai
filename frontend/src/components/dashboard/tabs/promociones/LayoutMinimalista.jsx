import React from "react";
import { MapPin, CheckCircle2, User } from "lucide-react";

const LayoutMinimalista = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, theme, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const bg       = palette?.bg       || "#1e293b";
  const accent   = palette?.accent   || "#3b82f6";
  const card     = palette?.card     || "#fff";
  const muted    = palette?.muted    || "#64748b";
  const textDark = palette?.textDark || "#0f172a";

  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];

  const specs = [
    { label: "m² Const.", val: f?.m2_construccion ? `${f.m2_construccion}` : null },
    { label: "m² Terr.",  val: f?.m2_terreno      ? `${f.m2_terreno}`      : null },
    { label: texts?.recamaras || "Recámaras", val: f?.recamaras != null ? String(f.recamaras) : null },
    { label: texts?.banos || "Baños",         val: f?.banos      != null ? String(f.banos)    : null },
    { label: "Cajones",   val: f?.estacionamiento != null ? String(f.estacionamiento) : null },
    { label: "Niveles",   val: f?.niveles != null ? String(f.niveles) : null },
    { label: "Antigüedad", val: f?.antiguedad != null ? `${f.antiguedad} ${idioma === "en" ? "yrs" : "años"}` : null },
    { label: "Estado",    val: f?.conservacion || null },
  ].filter(s => s.val !== null);

  // "Lo Especial" — combina todo en una sola lista que crece
  const especial = [
    ...puntosDestacados.map(p => ({ texto: p.texto, verificado: p.verificado })),
    ...amenidades.map(a => ({ texto: a, verificado: false })),
    ...instalaciones.map(a => ({ texto: a, verificado: false })),
    ...espacios.map(a => ({ texto: a, verificado: false })),
  ].filter(x => x.texto);

  const galeria = fotos.slice(1, 5);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* Barra lateral de color */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: accent, zIndex: 5 }} />

      {/* Header */}
      <div style={{ padding: "34px 50px 0 56px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            {session?.user?.picture
              ? <img src={session.user.picture} alt="Logo" style={{ height: 32, maxWidth: 100, objectFit: "contain" }} />
              : <div style={{ height: 20, width: 70, background: `${accent}20`, borderRadius: 3 }} />}
          </div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 52, fontWeight: 300, letterSpacing: -2, color: bg, lineHeight: 1, margin: 0 }}>
            {formatMXN(precio)}
          </h1>
          {precioM2 && (
            <p style={{ margin: "5px 0 0", fontSize: 12, color: muted, letterSpacing: "0.15em" }}>
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

      {/* Hero foto — grande (~46% de la página) */}
      <div style={{ margin: "22px 56px 0 56px", height: 470, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(0.78)" }} />}
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.25)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 18px", background: "linear-gradient(transparent, rgba(0,0,0,0.62))" }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.9)", letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={12} /> {f?.direccion || ""}
          </p>
        </div>
      </div>

      {/* Specs + Lo Especial */}
      <div style={{ display: "flex", gap: 0, margin: "22px 56px 0", flexShrink: 0 }}>
        {/* Columna specs */}
        <div style={{ width: 168, flexShrink: 0, borderRight: "1px solid #f1f5f9", paddingRight: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 10, rowGap: 14 }}>
            {specs.map(({ label, val }, i) => (
              <div key={i}>
                <p style={{ margin: 0, fontSize: 7.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, marginBottom: 2 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 300, color: bg, lineHeight: 1.05 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Columna contenido */}
        <div style={{ flex: 1, paddingLeft: 24, display: "flex", flexDirection: "column" }}>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.75, color: "#475569", fontWeight: 300, textAlign: "justify" }}>
            {descripcionTexto || "Propiedad de diseño contemporáneo en ubicación privilegiada."}
          </p>

          {especial.length > 0 && (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
                {idioma === "en" ? "What Makes It Special" : "Lo Especial"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: especial.length > 5 ? "1fr 1fr" : "1fr", columnGap: 18, rowGap: 6 }}>
                {especial.slice(0, 10).map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#475569" }}>
                    <CheckCircle2 size={12} color={p.verificado ? accent : "#cbd5e1"} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: p.verificado ? 600 : 300, color: p.verificado ? textDark : "#475569" }}>{p.texto}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Galería — crece para llenar el espacio restante */}
      {galeria.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, margin: "20px 56px 0", marginTop: "auto", display: "grid", gridTemplateColumns: `repeat(${galeria.length}, 1fr)`, gap: 8, paddingBottom: 76 }}>
          {galeria.map((foto, i) => (
            <div key={i} style={{ position: "relative", overflow: "hidden" }}>
              <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.78)" }} />
              <div style={{ position: "absolute", inset: 0, border: "1px solid #f1f5f9", pointerEvents: "none" }} />
            </div>
          ))}
        </div>
      )}

      {/* Footer asesor */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 56px", borderTop: "1px solid #f1f5f9", background: card, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={16} color="#94a3b8" />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: bg }}>{session?.user?.name || "Asesor"}</p>
            <p style={{ margin: 0, fontSize: 10, color: muted }}>
              {[session?.user?.phone, session?.user?.email].filter(Boolean).join("  ·  ")}
            </p>
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
