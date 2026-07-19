import React from "react";
import {
  BedDouble, Bath, Building, Map as MapIcon, Car, Calendar,
  Home, Phone, Mail, MapPin, Gem, User, ArrowRight, CheckCircle2, Sparkles,
  Waves, Dumbbell, Shield, Trees, Sun, Wine, Wind, Droplets, Wifi, Tv, Utensils, Warehouse,
} from "lucide-react";

/* LayoutJustListed — estilo editorial "Just Listed", TEMATIZABLE por paleta.
   Formatos: vertical_2p (A4 2 hojas) · post 1:1 · reels 9:16 · tiktok (3 slides) · horizontal (Facebook).
   Todo (fondo, recuadros, iconos, footer, texto, acento) toma color de la paleta;
   "verde" = look editorial crema/olivo/dorado por defecto. `elementos` controla qué bloques se ven. */

const EDITORIAL = {
  bg: "#F4EFE4", line: "#E2D9C6", dark: "#55603F", darker: "#2F3527",
  accent: "#B08B4F", accent2: "#C9A96A", ink: "#2A2A24", muted: "#6E6A5C", onDark: "#FCFAF4",
};
// Deriva la paleta de colores del layout. "verde" (default) = editorial.
const colores = (p) => {
  if (!p || p.id === "verde") return EDITORIAL;
  return {
    bg: p.card || "#ffffff",
    line: `${p.textDark || "#333333"}22`,
    dark: p.bg, darker: p.bg,
    accent: p.accent, accent2: p.accent,
    ink: p.textDark || "#222222", muted: p.muted || "#777777",
    onDark: p.textLight || "#ffffff",
  };
};

const SERIF = '"Didot","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif';
const SANS = '"Helvetica Neue",Arial,sans-serif';

const precioDe = (f) => f?.valor || f?.precio_oferta || 0;
const anioDe = (f) => (f?.antiguedad != null ? new Date().getFullYear() - Number(f.antiguedad) : null);
// Dirección corta: condominio (opcional) + colonia. Ciudad como sub-línea.
const direccionCorta = (f) => [f?.condominio || f?.conjunto || f?.coto, f?.colonia].filter(Boolean).join(" · ") || f?.direccion || "";
const ciudadDe = (f) => [f?.municipio, f?.estado_mx].filter(Boolean).join(", ");
// ── i18n ─────────────────────────────────────────────────────────────────────
const STR = {
  es: {
    forSale: "En Venta", forRent: "En Renta",
    bedrooms: "Recámaras", bathrooms: "Baños", built: "m² const.", lot: "m² terreno", parking: "Cajones", year: "Año", builtIn: "Construida",
    bedroomsL: "recámaras", bathroomsL: "baños", builtL: "m² const.", lotL: "m² terreno", parkingL: "cajones",
    bedroomsL1: "recámara", bathroomsL1: "baño", parkingL1: "cajón", age: "Edad", years: "años",
    about: "Acerca de esta casa", features: "Características", amenities: "Amenidades e instalaciones", highlights: "Puntos destacados",
    agent: "Asesor Inmobiliario", tour: "Cita / Recorrido", tourNote: "Agenda una visita con tu asesor.",
    includes: "Lo que incluye", scheduleVisit: "Agenda tu visita",
    descFallback: "Residencia con excelente ubicación, acabados de calidad y amplios espacios.", noData: "Sin datos.",
    logo1: "Logo de tu", logo2: "inmobiliaria",
  },
  en: {
    forSale: "For Sale", forRent: "For Rent",
    bedrooms: "Bedrooms", bathrooms: "Bathrooms", built: "Built m²", lot: "Lot m²", parking: "Parking", year: "Year", builtIn: "Built",
    bedroomsL: "bedrooms", bathroomsL: "bathrooms", builtL: "m² built", lotL: "m² lot", parkingL: "parking spaces",
    bedroomsL1: "bedroom", bathroomsL1: "bathroom", parkingL1: "parking space", age: "Age", years: "yrs",
    about: "About this home", features: "Features", amenities: "Amenities & features", highlights: "Highlights",
    agent: "Real Estate Agent", tour: "Schedule a tour", tourNote: "Schedule a visit with your agent.",
    includes: "What it includes", scheduleVisit: "Schedule your visit",
    descFallback: "Home in a prime location with quality finishes and spacious rooms.", noData: "No data.",
    logo1: "Your agency", logo2: "logo",
  },
};
const tr = (idioma) => STR[idioma] || STR.es;
const operacion = (f, t) => f?.operacion || (f?.tipo_operacion === "renta" ? t.forRent : t.forSale);

// Traducción de amenidades/instalaciones/espacios (catálogo fijo del formulario) ES→EN
const AMEN_EN = {
  "Alberca": "Pool", "Gimnasio": "Gym", "Seguridad 24/7": "24/7 Security", "Casa Club": "Clubhouse",
  "Jardín": "Garden", "Terraza": "Terrace", "Cava de Vinos": "Wine Cellar", "Aire Acondicionado": "A/C",
  "Cochera 2 autos": "2-car Garage", "Smart Home": "Smart Home", "Elevador": "Elevator", "Área de mascotas": "Pet Area",
  "Paneles Solares": "Solar Panels", "Cisterna 10,000L": "10,000L Cistern", "Generador": "Generator",
  "Circuito Cerrado": "CCTV", "Domótica": "Home Automation", "Calentador Solar": "Solar Heater",
  "Gas Estacionario": "Gas Tank", "Fibra Óptica": "Fiber Optic",
  "Sala de TV": "TV Room", "Comedor": "Dining Room", "Cocina Integral": "Full Kitchen", "Estudio": "Study",
  "Cuarto de Servicio": "Service Room", "Bodega": "Storage", "Sala de Juegos": "Game Room", "Spa": "Spa",
};
const amenTr = (label, idioma) => (idioma === "en" ? (AMEN_EN[label] || label) : label);

const plural = (n, uno, muchos) => `${n} ${Number(n) === 1 ? uno : muchos}`;
const specsJL = (f = {}, t = STR.es) => {
  const caj = f.estacionamiento ?? f.cajones;
  return [
    { Icon: BedDouble, val: f.recamaras != null ? plural(f.recamaras, t.bedroomsL1, t.bedroomsL) : null },
    { Icon: Bath, val: f.banos != null ? plural(f.banos, t.bathroomsL1, t.bathroomsL) : null },
    { Icon: Building, val: (f.m2_construccion || f.construccion) ? `${f.m2_construccion || f.construccion} ${t.builtL}` : null },
    { Icon: MapIcon, val: (f.m2_terreno || f.terreno) ? `${f.m2_terreno || f.terreno} ${t.lotL}` : null },
    { Icon: Car, val: caj != null ? plural(caj, t.parkingL1, t.parkingL) : null },
    { Icon: Calendar, val: f.antiguedad != null ? `${t.age} ${f.antiguedad} ${t.years}` : null },
  ].filter((s) => s.val !== null);
};

// Specs "grandes" para social: icono + número + etiqueta
const specsRich = (f = {}, t = STR.es) => [
  { Icon: BedDouble, num: f.recamaras, label: t.bedrooms },
  { Icon: Bath, num: f.banos, label: t.bathrooms },
  { Icon: Building, num: (f.m2_construccion || f.construccion), label: t.built },
  { Icon: MapIcon, num: (f.m2_terreno || f.terreno), label: t.lot },
  { Icon: Car, num: (f.estacionamiento ?? f.cajones), label: t.parking },
  { Icon: Calendar, num: f.antiguedad != null ? `${f.antiguedad} ${t.years}` : null, label: t.age },
].filter((s) => s.num != null && s.num !== "");

const AMEN_ICONS = [
  [/(alberca|piscina)/, Waves], [/(gim|gym)/, Dumbbell], [/(segur|vigil|24)/, Shield],
  [/(jard|verde|terra|árbol|arbol)/, Trees], [/(sol|panel|calent)/, Sun], [/(cava|vino)/, Wine],
  [/(clima|aire|ventil)/, Wind], [/(cisterna|agua|aljibe)/, Droplets], [/(wifi|fibra|internet)/, Wifi],
  [/(tv|sala|cine)/, Tv], [/(cocina|comedor|integral)/, Utensils], [/(bodega|almac|closet)/, Warehouse],
];
const amenIcon = (l = "") => { const s = l.toLowerCase(); for (const [re, Ic] of AMEN_ICONS) if (re.test(s)) return Ic; return CheckCircle2; };

// Con config de asesor (a): usa sus valores (nombre puede ir "" para ocultar). Sin a: cae a la sesión.
const asesorNombre = (s, a) => (a ? a.nombre : (s?.name || s?.user?.name || s?.email?.split("@")[0] || s?.user?.email?.split("@")[0] || "Asesor Inmobiliario"));
const asesorFoto = (s, a) => (a ? a.foto : (s?.picture || s?.foto_url || s?.user?.photoURL || null));
const asesorTel = (s, a) => (a ? a.telefono : (s?.phone || s?.telefono || s?.user?.phone || null));
const asesorMail = (s) => s?.email || s?.user?.email || null;
const logoUrl = (s) => s?.logo_url || s?.logo_empresa_url || s?.user?.picture || null;

const show = (el, key) => el?.[key] !== false; // default visible

// ── Bloques compartidos ──────────────────────────────────────────────────────
const LogoBox = ({ session, c, t = STR.es, fs = 10, pad = 14 }) => {
  const url = logoUrl(session);
  return url ? (
    <img src={url} alt="Logo" style={{ height: fs * 2.2, maxWidth: fs * 10, objectFit: "contain", display: "block" }} />
  ) : (
    <div style={{ border: `1px dashed ${c.accent2}`, borderRadius: 8, textAlign: "center", color: c.muted, textTransform: "uppercase", letterSpacing: "0.24em", fontSize: fs, padding: `${pad}px ${pad * 1.2}px`, lineHeight: 1.4, display: "inline-block" }}>{t.logo1}<br />{t.logo2}</div>
  );
};
const PriceBadge = ({ precio, formatMXN, c, kSize = 8.5, vSize = 30, pad = "11px 30px" }) => {
  const mode = c.priceBg || "solido";
  const bg = mode === "nulo" ? "transparent" : mode === "transparente" ? `${c.dark}80` : c.dark;
  const txt = mode === "solido" ? c.onDark : c.onDark;
  const shadow = mode === "solido" ? "none" : "0 1px 6px rgba(0,0,0,.55)";
  return (
  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: bg, color: txt, borderRadius: 12, padding: pad, textShadow: shadow }}>
    <span style={{ letterSpacing: "0.34em", textTransform: "uppercase", opacity: 0.72, fontSize: kSize }}>Precio</span>
    <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: vSize }}>{formatMXN(precio)}</span>
  </div>
  );
};
const AvatarAsesor = ({ session, asesor, c, size, border = 2 }) => {
  const foto = asesorFoto(session, asesor);
  if (asesor && !foto) return null; // ocultar foto si el asesor lo eligió
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `${border}px solid ${c.accent2}`, background: "#d8d2c2", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {foto ? <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={size * 0.45} color="#9a9484" />}
    </div>
  );
};
const SpecRow = ({ Icon, val, c, fs, gap }) => (
  <div style={{ display: "flex", alignItems: "center", gap, fontSize: fs, color: c.ink }}>
    <Icon size={fs * 1.35} color={c.dark} style={{ flexShrink: 0 }} strokeWidth={1.6} /><span>{val}</span>
  </div>
);
const SectionTitle = ({ Icon, children, c, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.accent, textTransform: "uppercase", fontWeight: 700, fontSize: 11, letterSpacing: "0.24em", marginBottom: 10, ...style }}>
    <Icon size={16} strokeWidth={1.6} /> {children}
  </div>
);
const PuntosChips = ({ puntos, c, fs = 11.5, big = false }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: big ? 12 : 7 }}>
    {puntos.slice(0, big ? 4 : 6).map((p, i) => (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: fs, fontWeight: 600, padding: big ? "12px 22px" : "6px 13px", borderRadius: 30, background: p.verificado ? `${c.accent}1e` : "rgba(0,0,0,.04)", border: `1px solid ${p.verificado ? c.accent : c.line}`, color: c.ink }}>
        {p.verificado && <CheckCircle2 size={fs * 1.1} color={c.accent} />} {p.texto}
      </span>
    ))}
  </div>
);
const AmenidadesGrid = ({ items, c, cols = 2, fs = 13, dark = false, max, iconSize = 16, box = 30, gap = "11px 24px" }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
    {items.slice(0, max || cols * 6).map((label, i) => {
      const Icon = amenIcon(label);
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: fs, fontWeight: 500, paddingBottom: 6, borderBottom: `1px solid ${dark ? "rgba(255,255,255,.15)" : c.line}`, color: dark ? c.onDark : c.ink, minWidth: 0 }}>
          <div style={{ width: box, height: box, borderRadius: 8, background: dark ? "rgba(255,255,255,.12)" : `${c.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={iconSize} color={dark ? c.accent2 : c.accent} strokeWidth={1.6} />
          </div>
          <span style={{ textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        </div>
      );
    })}
  </div>
);
// Stat grande: icono + número + etiqueta (para social)
const SpecStat = ({ Icon, num, label, c, iconSize = 44, numSize = 40, labelSize = 20 }) => (
  <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
    <Icon size={iconSize} color={c.dark} strokeWidth={1.6} style={{ margin: "0 auto", display: "block" }} />
    <div style={{ fontFamily: c.serif, fontSize: numSize, fontWeight: 600, color: c.ink, marginTop: 8, lineHeight: 1 }}>{num}</div>
    <div style={{ fontSize: labelSize, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6 }}>{label}</div>
  </div>
);
// Chip de amenidad CON icono
const AmenChip = ({ label, c, fs = 26 }) => {
  const Icon = amenIcon(label);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: fs * 0.5, padding: `${fs * 0.55}px ${fs}px`, borderRadius: 100, border: `2px solid ${c.accent}66`, background: `${c.accent}14`, fontSize: fs, fontWeight: 600, color: c.ink }}>
      <Icon size={fs * 1.5} color={c.accent} strokeWidth={1.7} /> {label}
    </span>
  );
};
const AgentBar = ({ session, asesor, c, t = STR.es, pad = "13px 46px" }) => (
  <div style={{ background: c.darker, color: c.onDark, padding: pad, display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 18, alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
      <AvatarAsesor session={session} asesor={asesor} c={c} size={50} />
      <div>
        {asesorNombre(session, asesor) && <div style={{ fontSize: 17, fontWeight: 600, color: c.onDark }}>{asesorNombre(session, asesor)}</div>}
        <div style={{ fontSize: 8.5, letterSpacing: "0.22em", marginTop: 2, textTransform: "uppercase", color: c.accent2 }}>{t.agent}</div>
      </div>
    </div>
    <div style={{ borderLeft: `1px solid ${c.accent2}55`, paddingLeft: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: c.onDark, textTransform: "uppercase" }}><Home size={15} strokeWidth={1.6} /> {t.tour}</div>
      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 3, lineHeight: 1.35 }}>{t.tourNote}</div>
      <div style={{ fontSize: 10.5, marginTop: 4, display: "flex", flexDirection: "column", gap: 1, opacity: 0.92 }}>
        {asesorTel(session, asesor) && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={11} strokeWidth={1.6} />{asesorTel(session, asesor)}</span>}
        {asesorMail(session) && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={11} strokeWidth={1.6} />{asesorMail(session)}</span>}
      </div>
    </div>
  </div>
);

// ── A4 · UNA hoja ────────────────────────────────────────────────────────────
const A4Layout = ({ fichaAvaluo: f, session, descripcionTexto, formatMXN, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, c, t }) => {
  const specs = specsJL(f, t);
  const fotos = f?.fotos || [];
  const [e1, e2] = operacion(f, t).split(" ");
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: c.bg, color: c.ink, fontFamily: SANS, padding: "34px 42px 0", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden", position: "relative" }}>
      {/* Portada grande con logo + precio ENCIMA (layer) */}
      <div style={{ position: "relative", height: 306, borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 26px rgba(0,0,0,.2)", background: "#ddd" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.32) 0%,transparent 26%)" }} />
        <div style={{ position: "absolute", top: 18, left: 18 }}><LogoBox session={session} c={c} t={t} fs={10} pad={12} /></div>
        <div style={{ position: "absolute", top: 16, right: 16 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={7} vSize={23} pad="8px 20px" /></div>
      </div>

      {/* Título + dirección, pegados a la foto */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: c.serif, margin: 0, fontSize: 48, lineHeight: 1, fontWeight: 500 }}>{operacion(f, t)}</h1>
          <div style={{ width: 60, height: 3, background: c.accent, margin: "10px 0 8px" }} />
          <div style={{ fontSize: 14, letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>{direccionCorta(f)}
            <small style={{ display: "block", fontWeight: 400, color: c.muted, textTransform: "none", marginTop: 2, fontSize: 12 }}>{ciudadDe(f)}</small>
          </div>
        </div>
      </div>

      {/* Descripción + Características (2 columnas) */}
      <div style={{ display: "grid", gridTemplateColumns: show(elementos, "descripcion") ? "1fr 1fr" : "1fr", gap: 30, marginTop: 16 }}>
        {show(elementos, "descripcion") && (
          <div>
            <SectionTitle Icon={Home} c={c} style={{ marginBottom: 7 }}>{t.about}</SectionTitle>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.58, color: c.ink, textAlign: "justify" }}>{descripcionTexto || t.descFallback}</p>
          </div>
        )}
        {show(elementos, "especificaciones") && (
          <div>
            <SectionTitle Icon={Gem} c={c} style={{ marginBottom: 7 }}>{t.features}</SectionTitle>
            {specs.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 16px" }}>
                {specs.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12 }}>
                    <s.Icon size={17} color={c.dark} strokeWidth={1.6} /><span>{s.val}</span>
                  </div>
                ))}
              </div>
            ) : <span style={{ fontSize: 12, color: c.muted, fontStyle: "italic" }}>{t.noData}</span>}
          </div>
        )}
      </div>

      {/* Puntos destacados (debajo de la descripción) */}
      {show(elementos, "puntos") && puntosDestacados.length > 0 && (
        <div style={{ marginTop: 12 }}><PuntosChips puntos={puntosDestacados} c={c} fs={11} /></div>
      )}

      {/* Amenidades e instalaciones (4 columnas) */}
      {show(elementos, "amenidades") && extras.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <SectionTitle Icon={Sparkles} c={c} style={{ marginBottom: 7 }}>{t.amenities}</SectionTitle>
          <AmenidadesGrid items={extras} c={c} cols={4} fs={10.5} max={8} iconSize={14} box={26} gap="8px 14px" />
        </div>
      )}

      {/* 6 fotos iguales, 2 filas de 3 */}
      {fotos.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {fotos.slice(1, 7).map((foto, i) => (
            <div key={i} style={{ height: 124, borderRadius: 10, overflow: "hidden", background: "#ddd" }}>
              <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}

      {/* Footer del asesor, al fondo (respeta el margen inferior) */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ margin: "14px -42px 0" }}><AgentBar session={session} asesor={asesor} c={c} t={t} pad="16px 42px" /></div>
      </div>
    </div>
  );
};

// ── Post 1:1 ─────────────────────────────────────────────────────────────────
const PostLayout = ({ fichaAvaluo: f, session, formatMXN, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, c, t }) => {
  const stats = specsRich(f, t);
  const fotos = f?.fotos || [];
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  const puntos = puntosDestacados;
  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1080, background: c.bg, color: c.ink, fontFamily: SANS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "relative", height: 468 }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.5) 0%,transparent 30%,transparent 62%,rgba(0,0,0,.22) 100%)" }} />
        <div style={{ position: "absolute", top: 44, left: 48 }}><LogoBox session={session} c={c} t={t} fs={17} pad={22} /></div>
        <div style={{ position: "absolute", right: 48, bottom: 38 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={13} vSize={52} pad="18px 44px" /></div>
      </div>
      <div style={{ flex: 1, padding: "34px 52px 0", display: "flex", flexDirection: "column" }}>
        {/* Título + dirección | foto secundaria */}
        <div style={{ display: "grid", gridTemplateColumns: fotos[1] ? "1fr 300px" : "1fr", gap: 28, alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: c.serif, margin: 0, fontSize: 78, lineHeight: 0.92, fontWeight: 500 }}>{operacion(f, t)}</h1>
            <div style={{ width: 84, height: 4, background: c.accent, margin: "14px 0 12px" }} />
            <div style={{ fontSize: 32, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{direccionCorta(f)}</div>
            <div style={{ fontSize: 25, color: c.muted, marginTop: 4 }}>{ciudadDe(f)}</div>
          </div>
          {fotos[1] && <div style={{ height: 196, borderRadius: 16, overflow: "hidden", background: "#ddd" }}><img src={fotos[1]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
        </div>
        {show(elementos, "especificaciones") && stats.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 22, padding: "16px 0", borderTop: `2px solid ${c.line}`, borderBottom: `2px solid ${c.line}` }}>
            {stats.slice(0, 4).map((s, i) => <SpecStat key={i} Icon={s.Icon} num={s.num} label={s.label} c={c} iconSize={40} numSize={38} labelSize={16} />)}
          </div>
        )}
        {show(elementos, "amenidades") && extras.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
            {extras.slice(0, 5).map((a, i) => <AmenChip key={i} label={a} c={c} fs={23} />)}
          </div>
        )}
        {show(elementos, "puntos") && puntos.length > 0 && (
          <div style={{ marginTop: 16 }}><PuntosChips puntos={puntos} c={c} fs={20} big /></div>
        )}
        {/* Footer del asesor CON fondo, al fondo (compacto) */}
        <div style={{ marginTop: "auto", margin: "20px -52px 0", background: c.darker, color: c.onDark, padding: "22px 52px", display: "flex", alignItems: "center", gap: 22 }}>
          <AvatarAsesor session={session} asesor={asesor} c={c} size={74} />
          <div style={{ flex: 1 }}>
            {asesorNombre(session, asesor) && <div style={{ fontSize: 30, fontWeight: 600, color: c.onDark }}>{asesorNombre(session, asesor)}</div>}
            <div style={{ fontSize: 17, letterSpacing: "0.2em", color: c.accent2, textTransform: "uppercase", marginTop: 3 }}>{t.agent}</div>
          </div>
          {asesorTel(session, asesor) && <div style={{ textAlign: "right", fontSize: 27, color: c.onDark, fontWeight: 600, display: "flex", alignItems: "center", gap: 11 }}><Phone size={27} strokeWidth={1.6} />{asesorTel(session, asesor)}</div>}
        </div>
      </div>
    </div>
  );
};

// ── Story / Reels 9:16 ───────────────────────────────────────────────────────
const StoryLayout = ({ fichaAvaluo: f, session, formatMXN, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, slidesFotos = 0, c, t }) => {
  const stats = specsRich(f, t);
  const fotos = f?.fotos || [];
  const [e1, e2] = operacion(f, t).split(" ");
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  const slide = { width: 1080, height: 1920, position: "relative", overflow: "hidden", flexShrink: 0, fontFamily: SANS };
  const mosaicos = [];
  for (let s = 0; s < slidesFotos; s++) mosaicos.push(fotos.slice(1 + s * 4, 1 + s * 4 + 4));
  return (
    <div id="pv-ficha-root" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <div style={{ ...slide, background: c.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", height: 880 }}>
          {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(0,0,0,.45) 0%,transparent 26%,transparent 74%,${c.bg} 100%)` }} />
          <div style={{ position: "absolute", top: 60, left: 56 }}><LogoBox session={session} c={c} t={t} fs={19} pad={26} /></div>
        </div>
        <div style={{ flex: 1, padding: "0 60px 60px", marginTop: -50, position: "relative", display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontFamily: c.serif, margin: 0, fontSize: 118, lineHeight: 0.84, fontWeight: 500 }}>{e1}<br />{e2}</h1>
          <div style={{ width: 100, height: 5, background: c.accent, margin: "24px 0 16px" }} />
          <div style={{ fontSize: 34, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{direccionCorta(f)}</div>
          <div style={{ fontSize: 28, color: c.muted, marginTop: 6 }}>{ciudadDe(f)}</div>
          <div style={{ marginTop: 30 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={18} vSize={74} pad="24px 60px" /></div>
          {show(elementos, "especificaciones") && stats.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px 20px", marginTop: 44, padding: "34px 0", borderTop: `2px solid ${c.line}`, borderBottom: `2px solid ${c.line}` }}>
              {stats.slice(0, 6).map((s, i) => <SpecStat key={i} Icon={s.Icon} num={s.num} label={s.label} c={c} iconSize={64} numSize={62} labelSize={26} />)}
            </div>
          )}
          {show(elementos, "amenidades") && extras.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 36 }}>
              {extras.slice(0, 6).map((a, i) => <AmenChip key={i} label={a} c={c} fs={30} />)}
            </div>
          )}
          {show(elementos, "puntos") && puntosDestacados.length > 0 && (
            <div style={{ marginTop: 26 }}><PuntosChips puntos={puntosDestacados} c={c} fs={26} big /></div>
          )}
          {/* Footer compacto: foto | nombre + tel en misma fila, con margen sobre los pills */}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 24, background: c.darker, borderRadius: 22, padding: "22px 32px" }}>
            <AvatarAsesor session={session} asesor={asesor} c={c} size={78} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18 }}>
                {asesorNombre(session, asesor) && <div style={{ fontSize: 34, fontWeight: 600, color: c.onDark }}>{asesorNombre(session, asesor)}</div>}
                {asesorTel(session, asesor) && <div style={{ fontSize: 25, color: c.onDark, opacity: 0.92, display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap" }}><Phone size={25} strokeWidth={1.6} />{asesorTel(session, asesor)}</div>}
              </div>
              <div style={{ fontSize: 17, letterSpacing: "0.2em", color: c.accent2, marginTop: 3, textTransform: "uppercase" }}>{t.agent}</div>
            </div>
          </div>
        </div>
      </div>
      {/* SLIDES DE FOTOS EN MOSAICO */}
      {mosaicos.map((group, mi) => group.filter(Boolean).length > 0 && (
        <div key={`m${mi}`} style={{ ...slide, background: c.darker }}>
          <div style={{ position: "absolute", top: 56, left: 56, zIndex: 2 }}><LogoBox session={session} c={c} t={t} fs={16} pad={22} /></div>
          <div style={{ height: "100%", padding: 56, boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 22 }}>
            {group.filter(Boolean).map((foto, i) => <div key={i} style={{ borderRadius: 24, overflow: "hidden", background: "#556" }}><img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── TikTok · 3 slides (+ mosaicos de fotos) 9:16 ─────────────────────────────
const TikTok3Layout = ({ fichaAvaluo: f, session, formatMXN, descripcionTexto, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, cta, slidesFotos = 0, c, t }) => {
  const specs = specsJL(f, t);
  const fotos = f?.fotos || [];
  const [e1, e2] = operacion(f, t).split(" ");
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  const slide = { width: 1080, height: 1920, position: "relative", overflow: "hidden", flexShrink: 0, fontFamily: SANS };
  const ctaTxt = cta || t.scheduleVisit;
  const mosaicos = [];
  for (let s = 0; s < slidesFotos; s++) mosaicos.push(fotos.slice(2 + s * 4, 2 + s * 4 + 4));
  return (
    <div id="pv-ficha-root" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* SLIDE 1 — Impacto */}
      <div style={{ ...slide, background: c.bg }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.5) 0%,transparent 34%,transparent 52%,rgba(0,0,0,.9) 100%)" }} />
        <div style={{ position: "absolute", top: 56, left: 52 }}><LogoBox session={session} c={c} t={t} fs={17} pad={24} /></div>
        <div style={{ position: "absolute", bottom: 120, left: 64, right: 64 }}>
          <div style={{ marginBottom: 30 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={18} vSize={72} pad="24px 60px" /></div>
          <h1 style={{ fontFamily: c.serif, margin: 0, fontSize: 128, lineHeight: 0.86, fontWeight: 500, color: c.onDark }}>{e1}<br />{e2}</h1>
          <div style={{ width: 100, height: 5, background: c.accent, margin: "28px 0 20px" }} />
          <div style={{ fontSize: 34, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: c.onDark }}>{direccionCorta(f)}</div>
          <div style={{ fontSize: 28, color: c.onDark, opacity: 0.85, marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}><MapPin size={30} strokeWidth={1.6} />{ciudadDe(f)}</div>
        </div>
      </div>
      {/* SLIDE 2 — Datos + descripción + puntos + 2 fotos */}
      <div style={{ ...slide, background: c.darker, color: c.onDark }}>
        <div style={{ padding: "110px 72px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontFamily: c.serif, fontSize: 84, fontWeight: 500, margin: "0 0 12px", color: c.onDark }}>{t.includes}</h2>
          <div style={{ width: 100, height: 5, background: c.accent, margin: "0 0 40px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "34px 44px", marginBottom: 34 }}>
            {specs.slice(0, 6).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <s.Icon size={54} color={c.accent2} strokeWidth={1.5} /><span style={{ fontSize: 32, fontWeight: 500 }}>{s.val}</span>
              </div>
            ))}
          </div>
          {show(elementos, "descripcion") && descripcionTexto && (
            <p style={{ fontSize: 30, lineHeight: 1.5, color: c.onDark, opacity: 0.9, margin: "0 0 30px", textAlign: "justify" }}>{descripcionTexto}</p>
          )}
          {show(elementos, "amenidades") && extras.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 30 }}>
              {extras.slice(0, 6).map((a, i) => { const Icon = amenIcon(a); return <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,.12)", border: `2px solid ${c.accent2}55`, color: c.onDark, padding: "12px 24px", fontSize: 26, fontWeight: 600, borderRadius: 100 }}><Icon size={30} color={c.accent2} strokeWidth={1.7} />{a}</span>; })}
            </div>
          )}
          {show(elementos, "puntos") && puntosDestacados.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
              {puntosDestacados.slice(0, 4).map((p, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${c.accent}2a`, border: `1px solid ${c.accent2}`, color: c.onDark, padding: "12px 24px", fontSize: 26, fontWeight: 600, borderRadius: 100 }}>{p.verificado && <CheckCircle2 size={26} color={c.accent2} />}{p.texto}</span>)}
            </div>
          )}
          {/* Mosaico que LLENA el resto del slide (sin espacios en blanco) */}
          {(() => {
            const mos = fotos.slice(1, 5).filter(Boolean);
            if (!mos.length) return null;
            return (
              <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: mos.length === 1 ? "1fr" : "1fr 1fr", gridTemplateRows: mos.length > 2 ? "1fr 1fr" : "1fr", gap: 20, marginTop: "auto" }}>
                {mos.map((foto, i) => <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "#556", gridColumn: mos.length === 3 && i === 2 ? "1 / -1" : undefined }}><img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
              </div>
            );
          })()}
        </div>
      </div>
      {/* SLIDE 3 — Recap + CTA + asesor abajo */}
      <div style={{ ...slide, background: c.bg }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", height: 820 }}>
            {(fotos[3] || fotos[0]) && <img src={fotos[3] || fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.85))" }} />
            <div style={{ position: "absolute", bottom: 60, left: 64, right: 64 }}>
              <div style={{ display: "inline-block", background: c.dark, color: c.onDark, borderRadius: 12, padding: "16px 40px", fontSize: 52, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{formatMXN(precioDe(f))}</div>
              <div style={{ fontSize: 40, fontWeight: 600, textTransform: "uppercase", color: "#fff", marginTop: 18 }}>{direccionCorta(f)}</div>
              <div style={{ fontSize: 30, color: "rgba(255,255,255,.85)", marginTop: 6 }}>{ciudadDe(f)}</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 72px" }}>
            <div style={{ background: c.dark, color: c.onDark, fontFamily: c.serif, fontSize: 56, fontWeight: 500, padding: "40px 80px", borderRadius: 100, display: "flex", alignItems: "center", gap: 22, textAlign: "center" }}>{ctaTxt} <ArrowRight size={46} /></div>
          </div>
          <div style={{ background: c.darker, color: c.onDark, padding: "44px 64px", display: "flex", alignItems: "center", gap: 28 }}>
            <AvatarAsesor session={session} asesor={asesor} c={c} size={120} />
            <div style={{ flex: 1 }}>
              {asesorNombre(session, asesor) && <div style={{ fontSize: 46, fontWeight: 600, color: c.onDark }}>{asesorNombre(session, asesor)}</div>}
              <div style={{ fontSize: 24, letterSpacing: "0.2em", color: c.accent2, marginTop: 6, textTransform: "uppercase" }}>{t.agent}</div>
            </div>
            {asesorTel(session, asesor) && <div style={{ fontSize: 40, fontWeight: 600, color: c.onDark, display: "flex", alignItems: "center", gap: 14 }}><Phone size={40} strokeWidth={1.6} />{asesorTel(session, asesor)}</div>}
          </div>
        </div>
      </div>
      {/* SLIDES DE FOTOS EN MOSAICO (agregables) */}
      {mosaicos.map((group, mi) => group.filter(Boolean).length > 0 && (
        <div key={`m${mi}`} style={{ ...slide, background: c.darker }}>
          <div style={{ position: "absolute", top: 56, left: 56, zIndex: 2 }}><LogoBox session={session} c={c} t={t} fs={16} pad={22} /></div>
          <div style={{ height: "100%", padding: 56, boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 22 }}>
            {group.filter(Boolean).map((foto, i) => <div key={i} style={{ borderRadius: 24, overflow: "hidden", background: "#556" }}><img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Facebook 1200×628 ────────────────────────────────────────────────────────
const FbLayout = ({ fichaAvaluo: f, session, formatMXN, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, c, t }) => {
  const stats = specsRich(f, t);
  const fotos = f?.fotos || [];
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  return (
    <div id="pv-ficha-root" style={{ width: 1200, height: 628, background: c.bg, color: c.ink, fontFamily: SANS, display: "grid", gridTemplateColumns: "1fr 1.02fr", overflow: "hidden" }}>
      <div style={{ padding: "40px 44px", display: "flex", flexDirection: "column" }}>
        <LogoBox session={session} c={c} t={t} fs={13} pad={16} />
        <h1 style={{ fontFamily: c.serif, margin: "18px 0 0", fontSize: 58, lineHeight: 0.9, fontWeight: 500 }}>{operacion(f, t)}</h1>
        <div style={{ width: 70, height: 4, background: c.accent, margin: "12px 0 10px" }} />
        <div style={{ fontSize: 26, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{direccionCorta(f)}</div>
        <div style={{ fontSize: 18, color: c.muted, marginTop: 3 }}>{ciudadDe(f)}</div>
        {show(elementos, "especificaciones") && stats.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 20, padding: "18px 0", borderTop: `2px solid ${c.line}`, borderBottom: `2px solid ${c.line}` }}>
            {stats.slice(0, 4).map((s, i) => <SpecStat key={i} Icon={s.Icon} num={s.num} label={s.label} c={c} iconSize={34} numSize={32} labelSize={14} />)}
          </div>
        )}
        {show(elementos, "amenidades") && extras.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14 }}>
            {extras.slice(0, 4).map((a, i) => <AmenChip key={i} label={a} c={c} fs={15} />)}
          </div>
        )}
        {show(elementos, "puntos") && puntosDestacados.length > 0 && (
          <div style={{ marginTop: 12 }}><PuntosChips puntos={puntosDestacados} c={c} fs={14} /></div>
        )}
        <div style={{ marginTop: "auto" }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={12} vSize={46} pad="14px 40px" /></div>
      </div>
      <div style={{ position: "relative" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(0deg,rgba(0,0,0,.88),transparent)", padding: "28px 34px", display: "flex", alignItems: "center", gap: 16 }}>
          <AvatarAsesor session={session} asesor={asesor} c={c} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: "#fff" }}>{asesorNombre(session, asesor)}</div>
            <div style={{ fontSize: 13, letterSpacing: "0.18em", color: "#eee", textTransform: "uppercase", marginTop: 2 }}>{t.agent}</div>
          </div>
          {asesorTel(session, asesor) && <div style={{ fontSize: 22, color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 9 }}><Phone size={22} strokeWidth={1.6} />{asesorTel(session, asesor)}</div>}
        </div>
      </div>
    </div>
  );
};

// ── Post · 3 slides (1:1) + mosaicos ─────────────────────────────────────────
const Post3Layout = ({ fichaAvaluo: f, session, formatMXN, descripcionTexto, puntosDestacados = [], amenidades = [], instalaciones = [], espacios = [], elementos, idioma, asesor, cta, slidesFotos = 0, c, t }) => {
  const stats = specsRich(f, t);
  const fotos = f?.fotos || [];
  const extras = [...amenidades, ...instalaciones, ...espacios].map((a) => amenTr(a, idioma));
  const slide = { width: 1080, height: 1080, position: "relative", overflow: "hidden", flexShrink: 0, fontFamily: SANS };
  const ctaTxt = cta || t.scheduleVisit;
  const mosaicos = [];
  for (let s = 0; s < slidesFotos; s++) mosaicos.push(fotos.slice(2 + s * 4, 2 + s * 4 + 4));
  return (
    <div id="pv-ficha-root" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* SLIDE 1 — Impacto */}
      <div style={{ ...slide, background: c.bg }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.45) 0%,transparent 32%,transparent 52%,rgba(0,0,0,.9) 100%)" }} />
        <div style={{ position: "absolute", top: 44, left: 44 }}><LogoBox session={session} c={c} t={t} fs={15} pad={20} /></div>
        <div style={{ position: "absolute", bottom: 60, left: 56, right: 56 }}>
          <div style={{ marginBottom: 22 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} c={c} kSize={13} vSize={50} pad="16px 40px" /></div>
          <h1 style={{ fontFamily: c.serif, margin: 0, fontSize: 82, lineHeight: 0.9, fontWeight: 500, color: c.onDark }}>{operacion(f, t)}</h1>
          <div style={{ width: 80, height: 4, background: c.accent, margin: "18px 0 12px" }} />
          <div style={{ fontSize: 30, fontWeight: 600, textTransform: "uppercase", color: c.onDark }}>{direccionCorta(f)}</div>
          <div style={{ fontSize: 24, color: c.onDark, opacity: 0.85, marginTop: 4 }}>{ciudadDe(f)}</div>
        </div>
      </div>
      {/* SLIDE 2 — Datos */}
      <div style={{ ...slide, background: c.darker, color: c.onDark }}>
        <div style={{ padding: "60px 64px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontFamily: c.serif, fontSize: 64, fontWeight: 500, margin: "0 0 10px", color: c.onDark }}>{t.includes}</h2>
          <div style={{ width: 80, height: 4, background: c.accent, margin: "0 0 34px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 30, borderBottom: `2px solid ${c.accent2}44`, marginBottom: 26 }}>
            {stats.slice(0, 4).map((s, i) => (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <s.Icon size={54} color={c.accent2} strokeWidth={1.5} style={{ margin: "0 auto", display: "block" }} />
                <div style={{ fontFamily: c.serif, fontSize: 44, fontWeight: 600, marginTop: 6 }}>{s.num}</div>
                <div style={{ fontSize: 18, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {show(elementos, "amenidades") && extras.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: "auto" }}>
              {extras.slice(0, 6).map((a, i) => { const Icon = amenIcon(a); return <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.12)", border: `2px solid ${c.accent2}55`, color: c.onDark, padding: "11px 22px", fontSize: 24, fontWeight: 600, borderRadius: 100 }}><Icon size={28} color={c.accent2} strokeWidth={1.7} />{a}</span>; })}
            </div>
          )}
          {fotos[1] && <img src={fotos[1]} alt="" style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 18, border: `6px solid ${c.bg}`, marginTop: 26 }} />}
        </div>
      </div>
      {/* SLIDE 3 — CTA + asesor abajo */}
      <div style={{ ...slide, background: c.bg }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", height: 560 }}>
            {(fotos[2] || fotos[0]) && <img src={fotos[2] || fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 45%,rgba(0,0,0,.85))" }} />
            <div style={{ position: "absolute", bottom: 40, left: 56, right: 56 }}>
              <div style={{ display: "inline-block", background: c.dark, color: c.onDark, borderRadius: 12, padding: "12px 32px", fontSize: 42, fontWeight: 500 }}>{formatMXN(precioDe(f))}</div>
              <div style={{ fontSize: 34, fontWeight: 600, textTransform: "uppercase", color: "#fff", marginTop: 14 }}>{direccionCorta(f)}</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 56px" }}>
            <div style={{ background: c.dark, color: c.onDark, fontFamily: c.serif, fontSize: 44, fontWeight: 500, padding: "28px 60px", borderRadius: 100, display: "flex", alignItems: "center", gap: 18 }}>{ctaTxt} <ArrowRight size={38} /></div>
          </div>
          <div style={{ background: c.darker, color: c.onDark, padding: "30px 56px", display: "flex", alignItems: "center", gap: 22 }}>
            <AvatarAsesor session={session} asesor={asesor} c={c} size={88} />
            <div style={{ flex: 1 }}>
              {asesorNombre(session, asesor) && <div style={{ fontSize: 34, fontWeight: 600, color: c.onDark }}>{asesorNombre(session, asesor)}</div>}
              <div style={{ fontSize: 18, letterSpacing: "0.2em", color: c.accent2, marginTop: 4, textTransform: "uppercase" }}>{t.agent}</div>
            </div>
            {asesorTel(session, asesor) && <div style={{ fontSize: 30, fontWeight: 600, color: c.onDark, display: "flex", alignItems: "center", gap: 11 }}><Phone size={30} strokeWidth={1.6} />{asesorTel(session, asesor)}</div>}
          </div>
        </div>
      </div>
      {/* MOSAICOS */}
      {mosaicos.map((group, mi) => group.filter(Boolean).length > 0 && (
        <div key={`m${mi}`} style={{ ...slide, background: c.darker }}>
          <div style={{ position: "absolute", top: 44, left: 44, zIndex: 2 }}><LogoBox session={session} c={c} t={t} fs={14} pad={18} /></div>
          <div style={{ height: "100%", padding: 44, boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 18 }}>
            {group.filter(Boolean).map((foto, i) => <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "#556" }}><img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Export principal ──────────────────────────────────────────────────────────
const LayoutJustListed = (props) => {
  const { formato = "vertical_2p", palette, coloresCustom, idioma } = props;
  const c = colores(palette);
  // Overrides individuales por elemento (Fondo/Texto/Acento/Recuadros/Texto-sobre-oscuro)
  if (coloresCustom) {
    const cc = coloresCustom;
    if (cc.bg) c.bg = cc.bg;
    if (cc.ink) c.ink = cc.ink;
    if (cc.accent) { c.accent = cc.accent; c.accent2 = cc.accent; }
    if (cc.dark) { c.dark = cc.dark; c.darker = cc.dark; }
    if (cc.onDark) c.onDark = cc.onDark;
  }
  c.priceBg = props.precioBg || "solido";
  c.serif = props.fuente || SERIF;
  const t = tr(idioma);
  const shared = { ...props, c, t };
  switch (formato) {
    case "post": return <PostLayout {...shared} />;
    case "post3": return <Post3Layout {...shared} />;
    case "reels": return <StoryLayout {...shared} />;
    case "tiktok": return <TikTok3Layout {...shared} />;
    case "horizontal": return <FbLayout {...shared} />;
    case "vertical_2p":
    default: return <A4Layout {...shared} />;
  }
};

export default LayoutJustListed;
