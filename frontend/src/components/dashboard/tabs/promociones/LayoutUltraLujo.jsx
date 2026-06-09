import React from "react";
import {
  Phone, Mail, CheckCircle2, User, MapPin,
  Building, Map, BedDouble, Bath, Car, Calendar, Layers
} from "lucide-react";

/* LayoutUltraLujo — "Noir / Ultra Lujo".
   Identidad: fondo oscuro, acento dorado, dramático y elegante (Outfit/serif).
   4 formatos: vertical_2p (A4), horizontal (A4 landscape), reels (9:16), post (1:1).
*/

// ── Helpers compartidos ──────────────────────────────────────────────────────

const specsFromFicha = (f = {}, idioma) => [
  { Icon: Building,  val: f.m2_construccion ? `${f.m2_construccion} m²` : null, label: idioma === "en" ? "Built" : "Construcción" },
  { Icon: Map,       val: f.m2_terreno      ? `${f.m2_terreno} m²`      : null, label: idioma === "en" ? "Land" : "Terreno" },
  { Icon: BedDouble, val: f.recamaras != null ? String(f.recamaras)     : null, label: idioma === "en" ? "Beds" : "Recámaras" },
  { Icon: Bath,      val: f.banos      != null ? String(f.banos)         : null, label: idioma === "en" ? "Baths" : "Baños" },
  { Icon: Car,       val: f.estacionamiento != null ? String(f.estacionamiento) : null, label: idioma === "en" ? "Parking" : "Cajones" },
  { Icon: Layers,    val: f.niveles != null ? String(f.niveles)         : null, label: idioma === "en" ? "Levels" : "Niveles" },
  { Icon: Calendar,  val: f.antiguedad != null ? `${f.antiguedad}`      : null, label: idioma === "en" ? "Age" : "Antigüedad" },
].filter(s => s.val !== null);

const especialFrom = ({ puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [] }) => [
  ...puntosDestacados.map(p => ({ texto: p.texto, verificado: p.verificado })),
  ...amenidades.map(a => ({ texto: a, verificado: false })),
  ...instalaciones.map(a => ({ texto: a, verificado: false })),
  ...espacios.map(a => ({ texto: a, verificado: false })),
].filter(x => x.texto);

// "P" badge dorado
const NoirBadge = ({ scale = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 * scale }}>
    <div style={{ width: 11 * scale, height: 11 * scale, borderRadius: 2 * scale, background: "#d4af37", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#000", fontWeight: 900, fontSize: 6.5 * scale, fontFamily: "Outfit, sans-serif" }}>P</span>
    </div>
    <span style={{ fontSize: 8 * scale, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>propvalu.mx</span>
  </div>
);

// Logo inmobiliaria en blanco (filter sobre fondo oscuro)
const NoirLogo = ({ session, height = 30, maxWidth = 100 }) => (
  session?.user?.picture
    ? <img src={session.user.picture} alt="Logo" style={{ height, maxWidth, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
    : <span style={{ fontSize: Math.max(9, height * 0.3), letterSpacing: "0.4em", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>INMOBILIARIA</span>
);

// ─────────────────────────────────────────────────────────────────────────────
// A4 VERTICAL (diseño original conservado)
// ─────────────────────────────────────────────────────────────────────────────

const LujoA4 = ({ fichaAvaluo: f, texts, idioma, descripcionTexto, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, textLight: textLt, card, muted } = palette;

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

  const especial = especialFrom({ puntosDestacados, amenidades, instalaciones, espacios });
  const galeria = fotos.slice(1, 5);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", border: `10px solid #111`, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

      {/* Top branding */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
        <NoirLogo session={session} height={30} maxWidth={100} />
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

        {/* Lo Especial */}
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
          <NoirBadge />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HORIZONTAL — A4 landscape 1123×794
// ─────────────────────────────────────────────────────────────────────────────

const LujoHorizontal = ({ fichaAvaluo: f, idioma, descripcionTexto, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, textLight, card, muted } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma);
  const especial = especialFrom({ puntosDestacados, amenidades, instalaciones, espacios });

  return (
    <div id="pv-ficha-root" style={{ width: 1123, height: 794, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", border: "10px solid #111", display: "flex", boxSizing: "border-box" }}>
      {/* Detalle geométrico: línea diagonal dorada */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 120px 120px 0", borderColor: `transparent ${accent}22 transparent transparent`, zIndex: 1 }} />

      {/* Izq — hero foto (~55%) con borde dorado */}
      <div style={{ width: "55%", height: "100%", position: "relative", overflow: "hidden", background: "#000", flexShrink: 0 }}>
        {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82, mixBlendMode: "luminosity" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.7))" }} />
        <div style={{ position: "absolute", inset: 16, border: `1px solid ${accent}66`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 38, left: 38, zIndex: 2 }}>
          <NoirLogo session={session} height={34} maxWidth={150} />
        </div>
        <div style={{ position: "absolute", bottom: 40, left: 40, right: 40, zIndex: 2 }}>
          <span style={{ display: "inline-block", border: `1px solid ${accent}`, padding: "6px 18px", marginBottom: 14, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: accent }}>
            {f?.tipo || "Propiedad"} · {idioma === "en" ? "For Sale" : "En Venta"}
          </span>
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 30, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1, textShadow: "0 4px 12px rgba(0,0,0,0.6)" }}>
            {f?.direccion || ""}
          </h2>
        </div>
      </div>

      {/* Der — datos sobre card oscuro */}
      <div style={{ flex: 1, height: "100%", background: card, padding: "48px 46px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: accent, margin: "0 0 4px" }}>
          {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || ""}
        </p>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 62, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "0 0 8px", letterSpacing: -1.5 }}>
          {formatMXN(precio)}
        </h1>
        {precioM2 && <p style={{ margin: 0, fontSize: 16, color: accent, letterSpacing: "0.12em", fontWeight: 600 }}>{formatMXN(precioM2)} / m²</p>}
        <div style={{ width: 56, height: 3, background: accent, margin: "22px 0" }} />

        {/* Specs con labels dorados */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px 14px", marginBottom: 26 }}>
          {specs.slice(0, 6).map(({ Icon, val, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={26} color={accent} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: "block", fontFamily: "Outfit, sans-serif", fontSize: 22, color: "#fff", lineHeight: 1.1 }}>{val}</strong>
                <span style={{ fontSize: 9.5, color: accent, textTransform: "uppercase", letterSpacing: "0.16em" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Lo Especial */}
        {especial.length > 0 && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: accent, fontWeight: 700, marginBottom: 12 }}>
              {idioma === "en" ? "What Makes It Special" : "Lo Especial"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 26, rowGap: 11 }}>
              {especial.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14 }}>
                  <CheckCircle2 size={15} color={p.verificado ? accent : "#3a3a3a"} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: p.verificado ? 700 : 400, color: p.verificado ? textLight : "#9ca3af" }}>{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asesor */}
        <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${accent}` }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={20} color="#555" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textLight }}>{session?.user?.name || "Asesor"}</p>
              <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                {session?.user?.phone && <span style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} color={accent} /> {session.user.phone}</span>}
                {session?.user?.email && <span style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} color={accent} /> {session.user.email}</span>}
              </div>
            </div>
          </div>
          <NoirBadge />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REELS — 1080×1920 (9:16)
// ─────────────────────────────────────────────────────────────────────────────

const LujoReels = ({ fichaAvaluo: f, idioma, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, textLight } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma).slice(0, 4);
  const especial = especialFrom({ puntosDestacados, amenidades, instalaciones, espacios });

  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1920, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* Hero full-bleed */}
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8, mixBlendMode: "luminosity" }} />}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 28%, transparent 45%, ${bg} 88%)` }} />
      </div>

      {/* Marco dorado fino */}
      <div style={{ position: "absolute", inset: 36, border: `2px solid ${accent}55`, zIndex: 1, pointerEvents: "none" }} />
      {/* Triángulo dorado esquina */}
      <div style={{ position: "absolute", top: 36, left: 36, width: 0, height: 0, borderStyle: "solid", borderWidth: "150px 150px 0 0", borderColor: `${accent}22 transparent transparent transparent`, zIndex: 1 }} />

      {/* Top: logo + badge En Venta */}
      <div style={{ position: "relative", zIndex: 3, padding: "90px 90px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <NoirLogo session={session} height={70} maxWidth={300} />
        <span style={{ display: "inline-block", background: accent, color: "#000", padding: "16px 40px", fontSize: 30, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 6 }}>
          {idioma === "en" ? "For Sale" : "En Venta"}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bloque info inferior */}
      <div style={{ position: "relative", zIndex: 3, padding: "0 90px 80px", color: "#fff" }}>
        <p style={{ fontSize: 32, color: accent, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>
          {f?.tipo || "Propiedad"}
        </p>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 140, fontWeight: 800, color: "#fff", margin: "0 0 6px", lineHeight: 0.95, letterSpacing: -3, textShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
          {formatMXN(precio)}
        </h1>
        {precioM2 && <p style={{ fontSize: 40, color: accent, fontWeight: 600, letterSpacing: "0.1em", margin: "0 0 14px" }}>{formatMXN(precioM2)} / m²</p>}
        <p style={{ fontSize: 36, color: "rgba(255,255,255,0.85)", fontWeight: 500, margin: "0 0 50px", display: "flex", alignItems: "center", gap: 14 }}>
          <MapPin size={40} color={accent} /> {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || f?.direccion || ""}
        </p>

        <div style={{ width: 90, height: 4, background: accent, marginBottom: 50 }} />

        {/* Specs grid dorado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "44px 30px", marginBottom: especial.length ? 56 : 70 }}>
          {specs.map(({ Icon, val, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26 }}>
              <Icon size={68} color={accent} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: "block", fontFamily: "Outfit, sans-serif", fontSize: 60, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{val}</strong>
                <span style={{ fontSize: 26, color: accent, textTransform: "uppercase", letterSpacing: "0.16em" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Lo Especial chips */}
        {especial.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 70 }}>
            {especial.slice(0, 4).map((p, i) => (
              <span key={i} style={{ border: `2px solid ${accent}`, color: textLight, padding: "16px 36px", fontSize: 30, fontWeight: 700, borderRadius: 100, display: "flex", alignItems: "center", gap: 12 }}>
                {p.verificado && <CheckCircle2 size={28} color={accent} />}
                {p.texto}
              </span>
            ))}
          </div>
        )}

        {/* Asesor + logo */}
        <div style={{ paddingTop: 40, borderTop: `2px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `3px solid ${accent}` }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={50} color="#555" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: "#fff", fontFamily: "Outfit, sans-serif" }}>{session?.user?.name || "Asesor"}</p>
              {session?.user?.phone && <p style={{ margin: "8px 0 0", fontSize: 32, color: accent, display: "flex", alignItems: "center", gap: 12 }}><Phone size={30} color={accent} /> {session.user.phone}</p>}
            </div>
          </div>
          <NoirBadge scale={3} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — 1080×1080 (1:1)
// ─────────────────────────────────────────────────────────────────────────────

const LujoPost = ({ fichaAvaluo: f, idioma, palette, formatMXN, session, amenidades = [], instalaciones = [], espacios = [], puntosDestacados = [] }) => {
  const { bg, accent, textLight, card } = palette;
  const precio   = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos    = f?.fotos || [];
  const specs    = specsFromFicha(f, idioma).slice(0, 3);
  const especial = especialFrom({ puntosDestacados, amenidades, instalaciones, espacios });

  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1080, background: bg, fontFamily: "Manrope, sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* Hero dramático ~62% */}
      <div style={{ position: "relative", height: "62%", overflow: "hidden", background: "#000", flexShrink: 0 }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82, mixBlendMode: "luminosity" }} />}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 35%, ${bg} 100%)` }} />
        {/* Triángulo dorado esquina */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 170px 170px 0", borderColor: `transparent ${accent}28 transparent transparent` }} />

        <div style={{ position: "absolute", top: 50, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <NoirLogo session={session} height={56} maxWidth={250} />
          <span style={{ display: "inline-block", border: `2px solid ${accent}`, color: accent, padding: "10px 26px", fontSize: 22, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            {f?.tipo || "Propiedad"} · {idioma === "en" ? "For Sale" : "En Venta"}
          </span>
        </div>
      </div>

      {/* Línea acento dorada */}
      <div style={{ height: 6, background: accent, flexShrink: 0 }} />

      {/* Info inferior */}
      <div style={{ flex: 1, minHeight: 0, background: card, padding: "44px 56px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 90, fontWeight: 800, color: "#fff", lineHeight: 0.95, margin: 0, letterSpacing: -2 }}>
              {formatMXN(precio)}
            </h1>
            {precioM2 && <p style={{ fontSize: 30, color: accent, fontWeight: 600, letterSpacing: "0.1em", margin: "8px 0 0" }}>{formatMXN(precioM2)} / m²</p>}
          </div>
          <p style={{ fontSize: 26, color: textLight, fontWeight: 500, margin: 0, textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={28} color={accent} /> {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || ""}
          </p>
        </div>

        {/* 3 specs */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, margin: "34px 0", padding: "26px 0", borderTop: `1px solid ${accent}33`, borderBottom: `1px solid ${accent}33` }}>
          {specs.map(({ Icon, val, label }, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, justifyContent: "center" }}>
              <Icon size={50} color={accent} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: "block", fontFamily: "Outfit, sans-serif", fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{val}</strong>
                <span style={{ fontSize: 20, color: accent, textTransform: "uppercase", letterSpacing: "0.14em" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 2 chips */}
        {especial.length > 0 && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: "auto" }}>
            {especial.slice(0, 2).map((p, i) => (
              <span key={i} style={{ border: `2px solid ${accent}`, color: textLight, padding: "12px 28px", fontSize: 24, fontWeight: 700, borderRadius: 100, display: "flex", alignItems: "center", gap: 10 }}>
                {p.verificado && <CheckCircle2 size={22} color={accent} />}
                {p.texto}
              </span>
            ))}
          </div>
        )}

        {/* Asesor */}
        <div style={{ marginTop: "auto", paddingTop: 28, borderTop: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${accent}` }}>
              {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={34} color="#555" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#fff", fontFamily: "Outfit, sans-serif" }}>{session?.user?.name || "Asesor"}</p>
              {session?.user?.phone && <p style={{ margin: "6px 0 0", fontSize: 24, color: accent, display: "flex", alignItems: "center", gap: 10 }}><Phone size={22} color={accent} /> {session.user.phone}</p>}
            </div>
          </div>
          <NoirBadge scale={2.2} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

const LayoutUltraLujo = (props) => {
  const { formato = "vertical_2p", palette = {} } = props;
  const pal = {
    bg:        palette.bg        || "#0D0D0D",
    accent:    palette.accent    || "#d4af37",
    textLight: palette.textLight || "#f5f5f5",
    card:      palette.card      || "#1a1a1a",
    textDark:  palette.textDark  || "#fff",
    muted:     palette.muted     || "#94a3b8",
  };
  const shared = { ...props, palette: pal };
  switch (formato) {
    case "horizontal": return <LujoHorizontal {...shared} />;
    case "reels":      return <LujoReels {...shared} />;
    case "post":       return <LujoPost {...shared} />;
    default:           return <LujoA4 {...shared} />;
  }
};

export default LayoutUltraLujo;
