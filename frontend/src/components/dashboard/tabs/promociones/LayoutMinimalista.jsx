import React from "react";
import {
  MapPin, CheckCircle2, User, Phone, Mail,
  Building, Map, BedDouble, Bath, Car, Calendar, Layers,
} from "lucide-react";

/* LayoutMinimalista — 4 formatos con identidad minimalista unificada.
   Fondo claro, tipografía Outfit fina, un solo color de acento, líneas
   delgadas, mucho aire elegante, detalle geométrico sutil.
   - vertical_2p / default : Folleto A4 vertical (diseño original)
   - horizontal            : A4 apaisado dos columnas
   - reels                 : 9:16  (1080 x 1920)
   - post                  : 1:1   (1080 x 1080)
*/

const specsFromFicha = (f = {}, idioma = "es", texts = {}) => [
  { Icon: Building,  val: f.m2_construccion ? `${f.m2_construccion}` : null, suffix: "m²", label: idioma === "en" ? "Built" : "Const." },
  { Icon: Map,       val: f.m2_terreno      ? `${f.m2_terreno}`      : null, suffix: "m²", label: idioma === "en" ? "Land" : "Terreno" },
  { Icon: BedDouble, val: f.recamaras != null ? String(f.recamaras)  : null, label: texts?.recamaras || (idioma === "en" ? "Beds" : "Recámaras") },
  { Icon: Bath,      val: f.banos      != null ? String(f.banos)      : null, label: texts?.banos || (idioma === "en" ? "Baths" : "Baños") },
  { Icon: Car,       val: f.estacionamiento != null ? String(f.estacionamiento) : null, label: idioma === "en" ? "Parking" : "Cajones" },
  { Icon: Layers,    val: f.niveles != null ? String(f.niveles) : null, label: idioma === "en" ? "Levels" : "Niveles" },
  { Icon: Calendar,  val: f.antiguedad != null ? `${f.antiguedad}` : null, suffix: idioma === "en" ? "yrs" : "años", label: idioma === "en" ? "Age" : "Antigüedad" },
].filter(s => s.val !== null);

const buildEspecial = ({ puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [] }) => [
  ...puntosDestacados.map(p => ({ texto: p.texto, verificado: p.verificado })),
  ...amenidades.map(a => ({ texto: a, verificado: false })),
  ...instalaciones.map(a => ({ texto: a, verificado: false })),
  ...espacios.map(a => ({ texto: a, verificado: false })),
].filter(x => x.texto);

const Badge = ({ accent, muted = "#94a3b8" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    <div style={{ width: 12, height: 12, borderRadius: 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#fff", fontWeight: 900, fontSize: 7, fontFamily: "Outfit, sans-serif" }}>P</span>
    </div>
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: muted }}>propvalu.mx</span>
  </div>
);

const Logo = ({ session, accent, height = 32, maxWidth = 100 }) =>
  session?.user?.picture
    ? <img src={session.user.picture} alt="Logo" style={{ height, maxWidth, objectFit: "contain" }} />
    : <div style={{ height: height * 0.6, width: maxWidth * 0.7, background: `${accent}20`, borderRadius: 3 }} />;

// ── A4 vertical (diseño original) ────────────────────────────────────────────

const MinimalistaA4 = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, card, muted, textDark } = palette;
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

  const especial = buildEspecial({ puntosDestacados, amenidades, instalaciones, espacios });
  const galeria = fotos.slice(1, 5);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* Barra lateral de color */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: accent, zIndex: 5 }} />

      {/* Header */}
      <div style={{ padding: "34px 50px 0 56px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Logo session={session} accent={accent} />
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

      {/* Hero foto */}
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

      {/* Galería */}
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
        <Badge accent={accent} />
      </div>
    </div>
  );
};

// ── Horizontal — A4 apaisado dos columnas (1123 x 794) ───────────────────────

const MinimalistaHorizontal = ({ fichaAvaluo: f, idioma, texts, descripcionTexto, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, card, muted, textDark } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma, texts);
  const especial = buildEspecial({ puntosDestacados, amenidades, instalaciones, espacios });

  return (
    <div id="pv-ficha-root" style={{ width: 1123, height: 794, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", display: "flex" }}>
      {/* Detalle geométrico — triángulo de acento esquina sup. izquierda */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, borderTop: `90px solid ${accent}`, borderRight: "90px solid transparent", zIndex: 6 }} />

      {/* Columna izquierda — hero foto (~55%) */}
      <div style={{ width: "55%", height: "100%", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(0.8)" }} />}
        <div style={{ position: "absolute", inset: 18, border: "1px solid rgba(255,255,255,0.3)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "70px 40px 28px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
          <span style={{ display: "inline-block", border: "1px solid rgba(255,255,255,0.7)", padding: "5px 14px", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            {f?.tipo || "Propiedad"}
          </span>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.92)", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} /> {f?.direccion || f?.colonia || f?.municipio || ""}
          </p>
        </div>
      </div>

      {/* Columna derecha — datos */}
      <div style={{ flex: 1, padding: "48px 52px 40px", display: "flex", flexDirection: "column", position: "relative", boxSizing: "border-box" }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <Logo session={session} accent={accent} height={40} maxWidth={150} />
        </div>

        {/* Precio */}
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 70, fontWeight: 300, letterSpacing: -2, color: bg, lineHeight: 1, margin: 0 }}>
          {formatMXN(precio)}
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: muted, letterSpacing: "0.12em" }}>
          {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || ""}
          {precioM2 && <span style={{ marginLeft: 14 }}>· {formatMXN(precioM2)} / m²</span>}
        </p>

        <div style={{ width: 70, height: 2, background: accent, margin: "24px 0" }} />

        {/* Specs grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 24, columnGap: 10, marginBottom: 28 }}>
          {specs.map(({ Icon, val, suffix, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={26} color={accent} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 24, fontWeight: 300, color: bg, lineHeight: 1 }}>
                  {val}{suffix ? <span style={{ fontSize: 14, color: muted, marginLeft: 3 }}>{suffix}</span> : null}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lo Especial */}
        {especial.length > 0 && (
          <div style={{ marginBottom: "auto" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
              {idioma === "en" ? "What Makes It Special" : "Lo Especial"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 22, rowGap: 9 }}>
              {especial.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#475569" }}>
                  <CheckCircle2 size={15} color={p.verificado ? accent : "#cbd5e1"} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: p.verificado ? 600 : 300, color: p.verificado ? textDark : "#475569" }}>{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer asesor */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#f1f5f9", border: `2px solid ${accent}30`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={20} color="#94a3b8" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: bg }}>{session?.user?.name || "Asesor"}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: muted }}>
                {[session?.user?.phone, session?.user?.email].filter(Boolean).join("  ·  ")}
              </p>
            </div>
          </div>
          <Badge accent={accent} />
        </div>
      </div>
    </div>
  );
};

// ── Reels — 9:16 (1080 x 1920) ───────────────────────────────────────────────

const MinimalistaReels = ({ fichaAvaluo: f, idioma, texts, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, card, muted, textDark } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma, texts).slice(0, 4);
  const especial = buildEspecial({ puntosDestacados, amenidades, instalaciones, espacios }).slice(0, 3);

  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1920, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Hero foto full-bleed (~60%) */}
      <div style={{ position: "relative", height: "60%", overflow: "hidden" }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(0.82)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 65%, rgba(0,0,0,0.45))" }} />
        {/* Logo */}
        <div style={{ position: "absolute", top: 70, right: 70, background: "rgba(255,255,255,0.92)", padding: "20px 36px", borderRadius: 6, display: "flex", alignItems: "center" }}>
          <Logo session={session} accent={accent} height={56} maxWidth={220} />
        </div>
        {/* Tipo + ubicación */}
        <div style={{ position: "absolute", bottom: 56, left: 70, right: 70 }}>
          <span style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.85)", padding: "12px 30px", fontSize: 26, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700, color: "#fff", marginBottom: 22 }}>
            {f?.tipo || "Propiedad"}
          </span>
          <p style={{ margin: 0, fontSize: 36, color: "#fff", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 14 }}>
            <MapPin size={38} /> {f?.colonia || f?.municipio || f?.direccion || ""}
          </p>
        </div>
      </div>

      {/* Detalle geométrico — línea diagonal de acento */}
      <div style={{ position: "absolute", top: "60%", left: 0, width: "100%", height: 8, background: accent }} />

      {/* Panel info inferior (~40%) */}
      <div style={{ height: "40%", padding: "64px 70px 70px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* Precio */}
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 130, fontWeight: 300, letterSpacing: -4, color: bg, lineHeight: 0.95, margin: 0 }}>
          {formatMXN(precio)}
        </h1>
        {precioM2 && (
          <p style={{ margin: "14px 0 0", fontSize: 30, color: muted, letterSpacing: "0.1em" }}>
            {formatMXN(precioM2)} / m²
          </p>
        )}

        {/* Specs row con iconos */}
        <div style={{ display: "flex", gap: 0, margin: "44px 0 38px" }}>
          {specs.map(({ Icon, val, suffix, label }, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < specs.length - 1 ? "1px solid #e2e8f0" : "none", padding: "0 8px" }}>
              <Icon size={56} color={accent} strokeWidth={1.5} style={{ display: "block", margin: "0 auto 14px" }} />
              <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 50, fontWeight: 300, color: bg, lineHeight: 1 }}>
                {val}{suffix ? <span style={{ fontSize: 26, color: muted }}> {suffix}</span> : null}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 24, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Amenidades */}
        {especial.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: "auto" }}>
            {especial.map((p, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${accent}`, color: bg, padding: "16px 32px", borderRadius: 60, fontSize: 30, fontWeight: 400 }}>
                <CheckCircle2 size={30} color={accent} /> {p.texto}
              </span>
            ))}
          </div>
        )}

        {/* Footer asesor + logo */}
        <div style={{ marginTop: 40, paddingTop: 34, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#f1f5f9", border: `3px solid ${accent}40`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={44} color="#94a3b8" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 700, color: bg }}>{session?.user?.name || "Asesor"}</p>
              {session?.user?.phone && (
                <p style={{ margin: "6px 0 0", fontSize: 28, color: muted, display: "flex", alignItems: "center", gap: 10 }}>
                  <Phone size={26} color={accent} /> {session.user.phone}
                </p>
              )}
              {!session?.user?.phone && session?.user?.email && (
                <p style={{ margin: "6px 0 0", fontSize: 26, color: muted, display: "flex", alignItems: "center", gap: 10 }}>
                  <Mail size={24} color={accent} /> {session.user.email}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 15, fontFamily: "Outfit, sans-serif" }}>P</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8" }}>propvalu.mx</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Post — 1:1 (1080 x 1080) ─────────────────────────────────────────────────

const MinimalistaPost = ({ fichaAvaluo: f, idioma, texts, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, card, muted } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma, texts).slice(0, 3);
  const chips    = buildEspecial({ puntosDestacados, amenidades, instalaciones, espacios }).slice(0, 2);

  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1080, background: card, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Hero foto (~62%) */}
      <div style={{ position: "relative", height: "62%", overflow: "hidden" }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(0.82)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 70%, rgba(0,0,0,0.4))" }} />
        {/* Logo */}
        <div style={{ position: "absolute", top: 48, right: 48, background: "rgba(255,255,255,0.92)", padding: "16px 28px", borderRadius: 5, display: "flex", alignItems: "center" }}>
          <Logo session={session} accent={accent} height={44} maxWidth={170} />
        </div>
        {/* Tipo */}
        <div style={{ position: "absolute", bottom: 40, left: 56 }}>
          <span style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.85)", padding: "10px 24px", fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: "#fff" }}>
            {f?.tipo || "Propiedad"}
          </span>
        </div>
      </div>

      {/* Detalle geométrico — barra de acento */}
      <div style={{ height: 8, background: accent }} />

      {/* Info inferior */}
      <div style={{ height: "calc(38% - 8px)", padding: "40px 56px 44px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* Precio + dirección */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 100, fontWeight: 300, letterSpacing: -3, color: bg, lineHeight: 0.95, margin: 0 }}>
              {formatMXN(precio)}
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 26, color: muted, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={26} color={accent} /> {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || f?.direccion || ""}
            </p>
          </div>
          {precioM2 && (
            <p style={{ margin: 0, fontSize: 24, color: muted, textAlign: "right", letterSpacing: "0.06em" }}>
              {formatMXN(precioM2)}<br /><span style={{ fontSize: 18 }}>/ m²</span>
            </p>
          )}
        </div>

        <div style={{ width: 70, height: 2, background: accent, margin: "26px 0" }} />

        {/* Specs con iconos */}
        <div style={{ display: "flex", gap: 0, marginBottom: "auto" }}>
          {specs.map(({ Icon, val, suffix, label }, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, borderRight: i < specs.length - 1 ? "1px solid #e2e8f0" : "none", paddingLeft: i > 0 ? 28 : 0 }}>
              <Icon size={48} color={accent} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 46, fontWeight: 300, color: bg, lineHeight: 1 }}>
                  {val}{suffix ? <span style={{ fontSize: 22, color: muted }}> {suffix}</span> : null}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 20, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chips + asesor + badge */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, flex: 1 }}>
            {chips.map((p, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${accent}`, color: bg, padding: "10px 22px", borderRadius: 50, fontSize: 22, fontWeight: 400 }}>
                <CheckCircle2 size={22} color={accent} /> {p.texto}
              </span>
            ))}
            {chips.length === 0 && (
              <span style={{ fontSize: 24, color: bg, fontWeight: 700 }}>
                {session?.user?.name || "Asesor"}{session?.user?.phone ? ` · ${session.user.phone}` : ""}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, marginLeft: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, fontFamily: "Outfit, sans-serif" }}>P</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8" }}>propvalu.mx</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Router principal ──────────────────────────────────────────────────────────

const LayoutMinimalista = (props) => {
  const { formato = "vertical_2p", palette = {} } = props;
  const pal = {
    bg:        palette.bg        || "#1e293b",
    accent:    palette.accent    || "#3b82f6",
    textLight: palette.textLight || "#dbeafe",
    card:      palette.card      || "#fff",
    textDark:  palette.textDark  || "#0f172a",
    muted:     palette.muted     || "#64748b",
  };
  const shared = { ...props, palette: pal };

  switch (formato) {
    case "horizontal": return <MinimalistaHorizontal {...shared} />;
    case "reels":      return <MinimalistaReels {...shared} />;
    case "post":       return <MinimalistaPost {...shared} />;
    default:           return <MinimalistaA4 {...shared} />;
  }
};

export default LayoutMinimalista;
