import React from "react";
import {
  Building, Map, BedDouble, Bath, Car, Calendar,
  Waves, Dumbbell, Shield, Trees, Wine, Sun, Droplets,
  Wifi, Tv, CheckCircle2, MapPin, Phone, Mail, User,
  ChevronUp, ArrowRight
} from "lucide-react";

/* LayoutModerno — 4 formatos en un sistema visual unificado.
   Todos responden a la paleta hex del diseñador de fichas.
   - vertical_2p : Folleto A4 2 páginas
   - horizontal  : Ficha carta dos columnas (estilo WhatsApp)
   - reels       : 3 slides TikTok/Reels 9:16
   - post        : Post cuadrado 1:1
*/

const A4_W = 794;
const A4_H = 1123;
const CARTA_W = 816;
const CARTA_H = 1056;
const REEL_W = 1080;
const REEL_H = 1920;
const POST_W = 1080;
const POST_H = 1080;

const ICON_MAP = {
  alberca: Waves, piscina: Waves,
  gimnasio: Dumbbell, gym: Dumbbell,
  seguridad: Shield, vigilancia: Shield,
  jardin: Trees, jardín: Trees, arbol: Trees, árbol: Trees, "areas verdes": Trees,
  cava: Wine, vino: Wine, "casa club": Building,
  solar: Sun, fotovoltaico: Sun,
  cisterna: Droplets, agua: Droplets,
  wifi: Wifi, fibra: Wifi,
  tv: Tv, sala: Tv,
  auto: Car, cochera: Car, estacionamiento: Car,
};

const iconForLabel = (label = "") => {
  const l = label.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (l.includes(key)) return Icon;
  }
  return CheckCircle2;
};

const specsFromFicha = (f = {}) => [
  { Icon: Building, val: f.m2_construccion ? `${f.m2_construccion} m²` : null, label: "Construcción" },
  { Icon: Map,      val: f.m2_terreno      ? `${f.m2_terreno} m²`      : null, label: "Terreno" },
  { Icon: BedDouble,val: f.recamaras != null ? String(f.recamaras)      : null, label: "Recámaras" },
  { Icon: Bath,     val: f.banos      != null ? String(f.banos)          : null, label: "Baños" },
  { Icon: Car,      val: f.estacionamiento != null ? String(f.estacionamiento) : null, label: "Cajones" },
  { Icon: Calendar, val: f.antiguedad != null ? `${f.antiguedad} años`   : null, label: "Antigüedad" },
].filter(s => s.val !== null);

// ── Shared sub-components ────────────────────────────────────────────────────

const PropValuBadge = ({ color = "#1B4332", bg = "transparent" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    <div style={{ width: 14, height: 14, borderRadius: 3, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#fff", fontWeight: 900, fontSize: 8, fontFamily: "Outfit, sans-serif" }}>P</span>
    </div>
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color }}>propvalu.mx</span>
  </div>
);

const LogoBox = ({ session, palette, style = {} }) => {
  const { bg, accent } = palette;
  return (
    <div style={{ background: "white", padding: "10px 18px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", ...style }}>
      {session?.user?.picture
        ? <img src={session.user.picture} alt="Logo" style={{ height: 34, maxWidth: 120, objectFit: "contain" }} />
        : <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 13, color: bg, letterSpacing: 2 }}>LOGOTIPO</span>}
    </div>
  );
};

const AsesorCard = ({ session, palette, compact = false }) => {
  const { bg, accent } = palette;
  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "Asesor Inmobiliario";
  const phone = session?.user?.phone;
  const email = session?.user?.email;
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e5e5", border: `2px solid ${accent}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={18} color="#aaa" />}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, color: bg }}>{name}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#666" }}>{phone || email || ""}</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#e5e5e5", border: `3px solid ${accent}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {session?.user?.photoURL ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <User size={30} color="#aaa" />}
      </div>
      <div>
        <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 20, color: bg }}>{name}</p>
        {phone && <p style={{ margin: "4px 0 0", fontSize: 14, color: "#555", display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} color={accent} /> {phone}</p>}
        {email && <p style={{ margin: "2px 0 0", fontSize: 14, color: "#555", display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} color={accent} /> {email}</p>}
      </div>
    </div>
  );
};

// ── A4 2 páginas ─────────────────────────────────────────────────────────────

const A4Layout = ({ fichaAvaluo: f, palette, session, descripcionTexto, puntosDestacados, amenidades, instalaciones, espacios, formatMXN, idioma }) => {
  const { bg, accent, textDark } = palette;
  const specs = specsFromFicha(f);
  const allFeatures = [...amenidades, ...instalaciones, ...espacios];
  const precio = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;

  const photoStyle = (url, height, radius = 4) => ({
    width: "100%", height, objectFit: "cover", borderRadius: radius, display: "block",
    background: url ? undefined : "#ccc",
  });

  const fotos = f?.fotos || [];

  return (
    <div id="pv-ficha-root" style={{ width: A4_W, fontFamily: "Manrope, sans-serif", color: textDark, background: "#fff" }}>
      {/* ── PÁGINA 1 ── */}
      <div style={{ width: A4_W, height: A4_H, background: "#fff", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Hero */}
        <div style={{ position: "relative", height: 500, overflow: "hidden", flexShrink: 0 }}>
          {fotos[0] && <img src={fotos[0]} alt="Fachada" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          <div style={{ position: "absolute", bottom: 0, width: "100%", height: "50%", background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }} />
          <div style={{ position: "absolute", top: 28, left: 28 }}>
            <LogoBox session={session} palette={palette} />
          </div>
          <div style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
            <div style={{ display: "inline-block", background: accent, color: "#fff", padding: "7px 20px", fontWeight: 700, textTransform: "uppercase", fontSize: 13, letterSpacing: 1, borderRadius: 3, marginBottom: 12 }}>
              {f?.tipo || "Propiedad"} en Venta
            </div>
            <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.05 }}>
              {f?.direccion || ""}
            </h2>
          </div>
        </div>

        {/* Content — crece para llenar */}
        <div style={{ padding: "26px 40px 0", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 54, fontWeight: 800, color: bg, lineHeight: 1, margin: "0 0 6px" }}>
                {formatMXN(precio)}
              </h1>
              <p style={{ fontSize: 15, color: "#555", margin: 0, fontWeight: 500 }}>
                {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || ""}
                {precioM2 && <span style={{ marginLeft: 14, fontSize: 13, color: "#888" }}>{formatMXN(precioM2)} / m²</span>}
              </p>
            </div>
          </div>

          {/* Specs bar — 6 specs */}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd", padding: "18px 0", margin: "22px 0 24px" }}>
            {specs.slice(0, 6).map(({ Icon, val, label }, i) => (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <Icon size={20} color={accent} style={{ display: "block", margin: "0 auto 6px" }} />
                <strong style={{ display: "block", fontFamily: "Outfit, sans-serif", fontSize: 18, color: bg }}>{val}</strong>
                <span style={{ fontSize: 9.5, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Descripción */}
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 18, textAlign: "justify" }}>
            {descripcionTexto || "Propiedad en excelente ubicación con acabados de primera calidad."}
          </p>

          {/* Chips */}
          {puntosDestacados?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {puntosDestacados.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  padding: "8px 16px", borderRadius: 30, fontSize: 12, fontWeight: 600,
                  background: p.verificado ? `${accent}18` : "#f8f8f8",
                  border: `1px solid ${p.verificado ? accent : "#ddd"}`,
                  color: p.verificado ? bg : textDark,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {p.verificado && <CheckCircle2 size={12} color={accent} />}
                  {p.texto}
                </div>
              ))}
            </div>
          )}

          {/* Galería que llena el espacio restante */}
          {fotos.length > 1 && (
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 56 }}>
              {fotos.slice(1, 4).map((foto, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: "hidden", background: "#e5e5e5" }}>
                  <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 18, width: "100%", textAlign: "center" }}>
          <PropValuBadge color="#aaa" />
        </div>
      </div>

      {/* ── PÁGINA 2 ── */}
      <div style={{ width: A4_W, height: A4_H, background: "#fff", position: "relative", overflow: "hidden", padding: "36px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {/* Galería destacada */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 28, height: 300, flexShrink: 0 }}>
          <div style={{ borderRadius: 8, overflow: "hidden", background: "#e5e5e5" }}>
            {fotos[1] && <img src={fotos[1]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
            {[fotos[2], fotos[3]].map((foto, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: "hidden", background: "#e5e5e5" }}>
                {foto && <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Amenidades / Lo Especial — 2 columnas con iconos */}
        {allFeatures.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 22, color: bg, margin: "0 0 16px", borderLeft: `4px solid ${accent}`, paddingLeft: 14 }}>
              {idioma === "en" ? "Amenities & Features" : "Amenidades e Instalaciones"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 28px" }}>
              {allFeatures.slice(0, 12).map((label, i) => {
                const Icon = iconForLabel(label);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} color={accent} />
                    </div>
                    <span style={{ textTransform: "capitalize", color: "#334155" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contacto */}
        <div style={{ marginTop: "auto", border: "1px solid #eee", borderRadius: 10, padding: "22px 28px", background: "#fafafa" }}>
          <AsesorCard session={session} palette={palette} />
        </div>

        <div style={{ position: "absolute", bottom: 16, right: 32 }}>
          <PropValuBadge color="#aaa" />
        </div>
      </div>
    </div>
  );
};

// ── Carta dos columnas (WhatsApp/email) ──────────────────────────────────────

const CartaLayout = ({ fichaAvaluo: f, palette, session, descripcionTexto, puntosDestacados, amenidades, formatMXN }) => {
  const { bg, accent, textDark } = palette;
  const specs = specsFromFicha(f);
  const precio = f?.valor || f?.precio_oferta || 0;
  const precioM2 = f?.m2_construccion > 0 ? Math.round(precio / f.m2_construccion) : null;
  const fotos = f?.fotos || [];

  return (
    <div id="pv-ficha-root" style={{ width: CARTA_W, height: CARTA_H, background: "#fff", display: "grid", gridTemplateColumns: "38% 62%", overflow: "hidden", fontFamily: "Manrope, sans-serif" }}>
      {/* Columna izq — fotos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20, background: "#f0f0f0", borderRight: "1px solid #e0e0e0" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: 380, objectFit: "cover", borderRadius: 4, display: "block" }} />}
        {(fotos[1] || fotos[2]) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, height: 120 }}>
            {[fotos[1], fotos[2]].map((f2, i) => f2 && <img key={i} src={f2} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />)}
          </div>
        )}
        {fotos[3] && <img src={fotos[3]} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 4, display: "block" }} />}
        {/* Logo abajo */}
        <div style={{ marginTop: "auto" }}>
          <LogoBox session={session} palette={palette} style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Columna der — datos */}
      <div style={{ padding: "36px 36px 22px", display: "flex", flexDirection: "column", color: textDark }}>
        <p style={{ margin: "0 0 4px", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15, textTransform: "uppercase", letterSpacing: 1, color: accent }}>
          {f?.tipo || "Propiedad"} · {f?.colonia || f?.municipio || ""}
        </p>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 52, fontWeight: 800, color: textDark, lineHeight: 1, margin: "0 0 4px", letterSpacing: -1 }}>
          {formatMXN(precio)}
        </h1>
        {precioM2 && <p style={{ margin: "0 0 18px", fontSize: 13, color: "#666", fontWeight: 500 }}>{formatMXN(precioM2)} MXN / m²</p>}
        <div style={{ width: 60, height: 4, background: accent, marginBottom: 26 }} />

        {/* Specs 3-col */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px 10px", marginBottom: 26 }}>
          {specs.map(({ Icon, val, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={18} color={accent} />
              <div>
                <strong style={{ display: "block", fontFamily: "Outfit, sans-serif", fontSize: 16, color: textDark, lineHeight: 1.2 }}>{val}</strong>
                <span style={{ fontSize: 10, color: "#777", textTransform: "uppercase" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Amenidad chips */}
        {amenidades.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {amenidades.slice(0, 8).map((a, i) => (
              <span key={i} style={{ background: bg, color: accent, padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{a}</span>
            ))}
          </div>
        )}

        {/* Descripción */}
        {descripcionTexto && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#555", marginBottom: 22 }}>{descripcionTexto}</p>
        )}

        {/* Highlights */}
        {puntosDestacados?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "auto" }}>
            {puntosDestacados.slice(0, 3).map((p, i) => (
              <span key={i} style={{
                background: p.verificado ? `${accent}18` : "#fff8e1",
                border: `1px solid ${accent}`,
                color: textDark, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {p.verificado && <CheckCircle2 size={11} color={accent} />}
                {p.texto}
              </span>
            ))}
          </div>
        )}

        {/* Footer contacto */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <AsesorCard session={session} palette={palette} compact />
          <PropValuBadge color="#aaa" />
        </div>
      </div>
    </div>
  );
};

// ── TikTok / Reels 3 slides ──────────────────────────────────────────────────

const ReelsLayout = ({ fichaAvaluo: f, palette, session, puntosDestacados, amenidades, formatMXN }) => {
  const { bg, accent, textLight, textDark } = palette;
  const specs = specsFromFicha(f).slice(0, 4);
  const precio = f?.valor || f?.precio_oferta || 0;
  const fotos = f?.fotos || [];

  const slideBase = { width: REEL_W, height: REEL_H, position: "relative", overflow: "hidden", flexShrink: 0, background: "#fff", fontFamily: "Manrope, sans-serif" };

  return (
    <div id="pv-ficha-root" style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>

      {/* SLIDE 1 — Impacto */}
      <div style={slideBase}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.88))" }} />
        <div style={{ position: "absolute", top: 80, right: 80 }}>
          <LogoBox session={session} palette={palette} style={{ padding: "16px 32px" }} />
        </div>
        <div style={{ position: "absolute", bottom: 150, width: "100%", textAlign: "center", padding: "0 60px", boxSizing: "border-box", zIndex: 2 }}>
          <div style={{ display: "inline-block", background: accent, color: "#fff", padding: "14px 44px", fontSize: 30, fontWeight: 800, textTransform: "uppercase", borderRadius: 50, marginBottom: 36 }}>
            {f?.tipo || "Propiedad"} en Venta
          </div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 150, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "0 0 18px", textShadow: "0 10px 20px rgba(0,0,0,0.5)" }}>
            {formatMXN(precio)}
          </h1>
          <p style={{ fontSize: 38, color: "rgba(255,255,255,0.9)", fontWeight: 500, margin: 0 }}>
            <MapPin size={32} style={{ display: "inline", marginRight: 10, verticalAlign: "middle" }} />
            {f?.colonia || f?.municipio || f?.direccion || ""}
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 50, width: "100%", textAlign: "center", color: "#fff", fontSize: 28, zIndex: 2 }}>
          <ChevronUp size={50} style={{ display: "block", margin: "0 auto 8px" }} />
          Desliza para ver detalles
        </div>
      </div>

      {/* SLIDE 2 — Datos */}
      <div style={{ ...slideBase, background: bg }}>
        <div style={{ position: "absolute", top: 80, right: 80 }}>
          <LogoBox session={session} palette={palette} style={{ background: textLight + "30", padding: "16px 32px" }} />
        </div>
        <div style={{ padding: "120px 80px", boxSizing: "border-box", color: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 90, fontWeight: 800, margin: "0 0 90px", lineHeight: 1.1 }}>
            Lo que<br />incluye:
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "70px 40px", marginBottom: "auto" }}>
            {specs.map(({ Icon, val, label }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 36 }}>
                <Icon size={70} color={accent} />
                <div>
                  <strong style={{ display: "block", fontSize: 48, fontWeight: 800, lineHeight: 1.2 }}>{val}</strong>
                  <span style={{ display: "block", fontSize: 28, fontWeight: 500, color: textLight, textTransform: "uppercase" }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
          {amenidades.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 70 }}>
              {amenidades.slice(0, 4).map((a, i) => (
                <span key={i} style={{ background: textLight + "20", color: "#fff", border: `2px solid ${textLight}40`, padding: "16px 36px", fontSize: 30, fontWeight: 800, borderRadius: 100 }}>{a}</span>
              ))}
            </div>
          )}
          {fotos[1] && <img src={fotos[1]} alt="" style={{ width: "100%", height: 360, objectFit: "cover", borderRadius: 20, border: "10px solid #fff" }} />}
        </div>
      </div>

      {/* SLIDE 3 — Contacto */}
      <div style={{ ...slideBase, background: "#fff" }}>
        <div style={{ position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)" }}>
          <LogoBox session={session} palette={palette} style={{ background: `${accent}20`, padding: "20px 50px" }} />
        </div>
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 100, boxSizing: "border-box", textAlign: "center" }}>
          <div style={{ width: 380, height: 380, borderRadius: "50%", overflow: "hidden", marginBottom: 50, border: `14px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", background: "#e5e5e5" }}>
            {session?.user?.photoURL
              ? <img src={session.user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : <User size={120} color="#aaa" />}
          </div>
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 72, color: bg, fontWeight: 800, margin: "0 0 10px" }}>
            {session?.user?.name || session?.user?.email?.split("@")[0] || "Asesor"}
          </h2>
          <p style={{ fontSize: 36, color: "#666", margin: "0 0 50px", textTransform: "uppercase", letterSpacing: 2 }}>Asesor Inmobiliario</p>
          {session?.user?.phone && (
            <p style={{ fontSize: 62, fontWeight: 800, color: textDark || "#222", marginBottom: 70, display: "flex", alignItems: "center", gap: 18 }}>
              <Phone size={50} color={accent} /> {session.user.phone}
            </p>
          )}
          <div style={{ background: bg, color: "#fff", fontFamily: "Outfit, sans-serif", fontSize: 52, fontWeight: 800, padding: "44px 90px", borderRadius: 100, textTransform: "uppercase", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            Agendar mi visita <ArrowRight size={46} />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 50, width: "100%", textAlign: "center" }}>
          <PropValuBadge color="#aaa" />
        </div>
      </div>
    </div>
  );
};

// ── Post 1:1 ─────────────────────────────────────────────────────────────────

const PostLayout = ({ fichaAvaluo: f, palette, session, puntosDestacados, formatMXN }) => {
  const { bg, accent, textDark } = palette;
  const specs = specsFromFicha(f).slice(0, 3);
  const precio = f?.valor || f?.precio_oferta || 0;
  const fotos = f?.fotos || [];

  return (
    <div id="pv-ficha-root" style={{ width: POST_W, height: POST_H, background: "#fff", position: "relative", overflow: "hidden", fontFamily: "Manrope, sans-serif" }}>
      {/* Hero foto (65%) */}
      <div style={{ position: "relative", height: "65%", overflow: "hidden" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(transparent 20%, ${bg}f2 100%)` }} />
        <div style={{ position: "absolute", top: 40, right: 40 }}>
          <LogoBox session={session} palette={palette} style={{ padding: "12px 24px" }} />
        </div>
        <div style={{ position: "absolute", bottom: 38, left: 60, right: 60, zIndex: 2 }}>
          <div style={{ display: "inline-block", background: accent, color: "#fff", padding: "9px 20px", fontWeight: 700, fontSize: 22, textTransform: "uppercase", borderRadius: 4, marginBottom: 18 }}>
            {f?.tipo || "Propiedad"} en Venta
          </div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 100, fontWeight: 800, color: "#fff", lineHeight: 1, textShadow: "0 4px 10px rgba(0,0,0,0.3)", margin: 0 }}>
            {formatMXN(precio)}
          </h1>
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 12, background: accent }} />

      {/* Info bottom (35% - 12px) */}
      <div style={{ padding: "40px 60px", height: "calc(35% - 12px)", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 28, color: textDark, fontWeight: 700, margin: "0 0 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={24} color={accent} /> {f?.colonia ? `${f.colonia}, ` : ""}{f?.municipio || ""}
        </p>
        <div style={{ display: "flex", gap: 44, marginBottom: 28 }}>
          {specs.map(({ Icon, val, label }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, fontWeight: 700, color: "#444" }}>
              <Icon size={28} color={accent} /> {val}
            </div>
          ))}
        </div>
        {puntosDestacados?.length > 0 && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {puntosDestacados.slice(0, 2).map((p, i) => (
              <span key={i} style={{
                background: p.verificado ? bg : "#f0f4f8", color: p.verificado ? "#fff" : textDark,
                padding: "10px 22px", borderRadius: 50, fontSize: 18, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {p.verificado && <CheckCircle2 size={16} color={accent} />}
                {p.texto}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #eee", paddingTop: 20 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: textDark }}>
            {session?.user?.name || "Asesor"}{session?.user?.phone ? ` · ${session.user.phone}` : ""}
          </span>
          <PropValuBadge color="#bbb" />
        </div>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

const LayoutModerno = (props) => {
  const { formato = "vertical_2p", palette = {} } = props;

  const pal = {
    bg:        palette.bg        || "#1B4332",
    accent:    palette.accent    || "#52B788",
    textLight: palette.textLight || "#D9ED92",
    card:      palette.card      || "#fff",
    textDark:  palette.textDark  || "#1B4332",
    muted:     palette.muted     || "#4a7c59",
  };

  const shared = { ...props, palette: pal };

  switch (formato) {
    case "horizontal":
      return <CartaLayout {...shared} />;
    case "reels":
      return <ReelsLayout {...shared} />;
    case "post":
      return <PostLayout {...shared} />;
    case "vertical_2p":
    default:
      return <A4Layout {...shared} />;
  }
};

export default LayoutModerno;
