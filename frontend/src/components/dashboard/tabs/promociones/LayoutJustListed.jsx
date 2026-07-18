import React from "react";
import {
  BedDouble, Bath, Building, Map as MapIcon, Car, Calendar,
  Home, Phone, Mail, MapPin, Gem, User,
} from "lucide-react";

/* LayoutJustListed — estilo editorial "Just Listed" (crema / olivo / dorado).
   Identidad propia de color (no usa la paleta hex del diseñador, igual que Noir).
   4 formatos desde un solo objeto de datos (fichaAvaluo + session):
   - vertical_2p : Folleto A4 (impresión / PDF)   794 × 1123
   - post        : Post cuadrado 1:1              1080 × 1080
   - reels       : Story / Reels 9:16            1080 × 1920
   - horizontal  : Facebook / enlace 1200 × 628
*/

const C = {
  cream: "#F4EFE4", cream2: "#EDE6D6", line: "#E2D9C6",
  olive: "#55603F", oliveDeep: "#2F3527", gold: "#B08B4F", goldSoft: "#C9A96A",
  ink: "#2A2A24", muted: "#6E6A5C", white: "#FCFAF4",
};
const SERIF = '"Didot","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif';
const SANS = '"Helvetica Neue",Arial,sans-serif';

const precioDe = (f) => f?.valor || f?.precio_oferta || 0;
const anioDe = (f) => (f?.antiguedad != null ? new Date().getFullYear() - Number(f.antiguedad) : null);
const zonaDe = (f) => [f?.colonia, f?.municipio, f?.estado_mx].filter(Boolean).join(" · ");
const operacionDe = (f) => f?.operacion || (f?.tipo_operacion === "renta" ? "En Renta" : "En Venta");

// Specs con icono → [{Icon, node}]
const specsJL = (f = {}) => [
  { Icon: BedDouble, val: f.recamaras != null ? `${f.recamaras} recámaras` : null },
  { Icon: Bath, val: f.banos != null ? `${f.banos} baños` : null },
  { Icon: Building, val: f.m2_construccion ? `${f.m2_construccion} m² const.` : null },
  { Icon: MapIcon, val: f.m2_terreno ? `${f.m2_terreno} m² terreno` : null },
  { Icon: Car, val: f.estacionamiento != null ? `${f.estacionamiento} cajones` : null },
  { Icon: Calendar, val: anioDe(f) != null ? `Construida ${anioDe(f)}` : null },
].filter((s) => s.val !== null);

const asesorNombre = (s) => s?.user?.name || s?.user?.email?.split("@")[0] || "Asesor Inmobiliario";
const asesorFoto = (s) => s?.user?.photoURL || null;
const asesorTel = (s) => s?.user?.phone || null;
const asesorMail = (s) => s?.user?.email || null;
const logoUrl = (s) => s?.user?.picture || null;

// ── Bloques compartidos ──────────────────────────────────────────────────────
const LogoBox = ({ session, fs = 10, pad = 14 }) => {
  const url = logoUrl(session);
  return url ? (
    <img src={url} alt="Logo" style={{ height: fs * 2.2, maxWidth: fs * 10, objectFit: "contain", display: "block" }} />
  ) : (
    <div style={{
      border: `1px dashed ${C.goldSoft}`, borderRadius: 8, textAlign: "center", color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.24em", fontSize: fs, padding: `${pad}px ${pad * 1.2}px`,
      lineHeight: 1.4, display: "inline-block",
    }}>Logo de tu<br />inmobiliaria</div>
  );
};

const PriceBadge = ({ precio, formatMXN, kSize = 8.5, vSize = 30, pad = "11px 30px", op = "Precio" }) => (
  <div style={{
    display: "inline-flex", flexDirection: "column", alignItems: "center", background: C.olive,
    color: C.white, borderRadius: 12, padding: pad,
  }}>
    <span style={{ letterSpacing: "0.34em", textTransform: "uppercase", opacity: 0.72, fontSize: kSize }}>{op}</span>
    <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: vSize }}>{formatMXN(precio)}</span>
  </div>
);

const AvatarAsesor = ({ session, size, border = 2 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", overflow: "hidden",
    border: `${border}px solid ${C.goldSoft}`, background: "#d8d2c2", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    {asesorFoto(session)
      ? <img src={asesorFoto(session)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <User size={size * 0.45} color="#9a9484" />}
  </div>
);

const SpecRow = ({ Icon, val, fs, gap }) => (
  <div style={{ display: "flex", alignItems: "center", gap, fontSize: fs, color: C.ink }}>
    <Icon size={fs * 1.35} color={C.olive} style={{ flexShrink: 0 }} strokeWidth={1.6} />
    <span>{val}</span>
  </div>
);

// ── A4 folleto 794×1123 ──────────────────────────────────────────────────────
const A4Layout = ({ fichaAvaluo: f, session, descripcionTexto, formatMXN }) => {
  const specs = specsJL(f);
  const fotos = f?.fotos || [];
  const [e1, e2] = operacionDe(f).split(" ");
  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: C.cream, color: C.ink, fontFamily: SANS, padding: "46px 46px 0", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.18fr", gap: 26 }}>
        <div>
          <LogoBox session={session} fs={10} pad={14} />
          <div style={{ marginTop: 30 }}>
            <h1 style={{ fontFamily: SERIF, margin: 0, fontSize: 74, lineHeight: 0.86, fontWeight: 500 }}>{e1}<br />{e2}</h1>
            <div style={{ width: 64, height: 2, background: C.gold, margin: "16px 0 12px" }} />
            <div style={{ fontSize: 12.5, letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
              {f?.direccion || ""}
              <small style={{ display: "block", fontWeight: 400, color: C.muted, textTransform: "none", marginTop: 3, fontSize: 12 }}>{zonaDe(f)}</small>
            </div>
            <div style={{ marginTop: 22 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} /></div>
          </div>
        </div>
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 26px rgba(47,53,39,.22)", background: "#ddd" }}>
          {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34, marginTop: 34 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.gold, textTransform: "uppercase", fontWeight: 700, fontSize: 11, letterSpacing: "0.24em", marginBottom: 12 }}>
            <Home size={16} strokeWidth={1.6} /> Acerca de esta casa
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.72, color: "#403d34" }}>
            {descripcionTexto || "Residencia con excelente ubicación, acabados de calidad y amplios espacios."}
          </p>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.gold, textTransform: "uppercase", fontWeight: 700, fontSize: 11, letterSpacing: "0.24em", marginBottom: 12 }}>
            <Gem size={16} strokeWidth={1.6} /> Características
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, paddingBottom: 10, borderBottom: `1px solid ${C.line}` }}>
                <s.Icon size={19} color={C.olive} strokeWidth={1.6} /><span>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {fotos.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 30 }}>
          {fotos.slice(1, 4).map((foto, i) => (
            <div key={i} style={{ height: 150, borderRadius: 12, overflow: "hidden", background: "#ddd" }}>
              <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ margin: "32px -46px 0", marginTop: "auto", background: C.oliveDeep, color: "#EAE6D8", padding: "22px 46px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AvatarAsesor session={session} size={66} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 600, color: C.white }}>{asesorNombre(session)}</div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.26em", margin: "3px 0 9px", textTransform: "uppercase", color: C.goldSoft }}>Asesor Inmobiliario</div>
            <div style={{ fontSize: 11, lineHeight: 1.7, color: "#C9C4B4", display: "flex", flexDirection: "column", gap: 1 }}>
              {asesorTel(session) && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Phone size={12} strokeWidth={1.6} />{asesorTel(session)}</span>}
              {asesorMail(session) && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Mail size={12} strokeWidth={1.6} />{asesorMail(session)}</span>}
            </div>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid rgba(201,169,106,.34)", paddingLeft: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: C.white, textTransform: "uppercase" }}>
            <Home size={18} strokeWidth={1.6} /> Cita / Recorrido
          </div>
          <div style={{ fontSize: 11.5, color: "#C9C4B4", marginTop: 8, lineHeight: 1.5 }}>
            Agenda una visita con tu asesor.
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Post 1:1 1080×1080 ───────────────────────────────────────────────────────
const PostLayout = ({ fichaAvaluo: f, session, formatMXN }) => {
  const specs = specsJL(f);
  const fotos = f?.fotos || [];
  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1080, background: C.cream, color: C.ink, fontFamily: SANS, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: 560 }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(47,53,39,.55) 0%,transparent 30%,transparent 60%,rgba(47,53,39,.15) 100%)" }} />
        <div style={{ position: "absolute", top: 40, left: 44 }}><LogoBox session={session} fs={15} pad={20} /></div>
        <div style={{ position: "absolute", right: 44, bottom: 40 }}>
          <PriceBadge precio={precioDe(f)} formatMXN={formatMXN} kSize={12} vSize={44} pad="16px 40px" />
        </div>
      </div>
      <div style={{ flex: 1, padding: "38px 48px", display: "flex", flexDirection: "column" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, margin: 0, fontSize: 78, lineHeight: 0.9, fontWeight: 500 }}>{operacionDe(f)}</h1>
          <div style={{ width: 70, height: 3, background: C.gold, margin: "14px 0 12px" }} />
          <div style={{ fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f?.direccion || ""}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 4 }}>{zonaDe(f)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 30px", marginTop: 34 }}>
          {specs.map((s, i) => <SpecRow key={i} Icon={s.Icon} val={s.val} fs={19} gap={12} />)}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 30, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 18 }}>
          <AvatarAsesor session={session} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: C.ink }}>{asesorNombre(session)}</div>
            <div style={{ fontSize: 13, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase" }}>Asesor Inmobiliario</div>
          </div>
          {asesorTel(session) && (
            <div style={{ textAlign: "right", fontSize: 18, color: C.olive, fontWeight: 600, display: "flex", alignItems: "center", gap: 9 }}>
              <Phone size={20} strokeWidth={1.6} />{asesorTel(session)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Story / Reels 9:16 1080×1920 ─────────────────────────────────────────────
const StoryLayout = ({ fichaAvaluo: f, session, formatMXN }) => {
  const specs = specsJL(f);
  const fotos = f?.fotos || [];
  const [e1, e2] = operacionDe(f).split(" ");
  return (
    <div id="pv-ficha-root" style={{ width: 1080, height: 1920, background: C.cream, color: C.ink, fontFamily: SANS, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: 940 }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(47,53,39,.5) 0%,transparent 26%,transparent 70%,${C.cream} 100%)` }} />
        <div style={{ position: "absolute", top: 56, left: 52 }}><LogoBox session={session} fs={17} pad={24} /></div>
      </div>
      <div style={{ flex: 1, padding: "0 56px 60px", marginTop: -40, position: "relative" }}>
        <h1 style={{ fontFamily: SERIF, margin: 0, fontSize: 118, lineHeight: 0.84, fontWeight: 500 }}>{e1}<br />{e2}</h1>
        <div style={{ width: 90, height: 4, background: C.gold, margin: "26px 0 18px" }} />
        <div style={{ fontSize: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f?.direccion || ""}</div>
        <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{zonaDe(f)}</div>
        <div style={{ marginTop: 34 }}><PriceBadge precio={precioDe(f)} formatMXN={formatMXN} kSize={16} vSize={64} pad="22px 56px" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 40px", marginTop: 44 }}>
          {specs.map((s, i) => <SpecRow key={i} Icon={s.Icon} val={s.val} fs={26} gap={16} />)}
        </div>
        <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 24, background: C.oliveDeep, borderRadius: 20, padding: "28px 34px" }}>
          <AvatarAsesor session={session} size={88} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.white }}>{asesorNombre(session)}</div>
            <div style={{ fontSize: 16, letterSpacing: "0.2em", color: C.goldSoft, marginTop: 4, textTransform: "uppercase" }}>Asesor Inmobiliario</div>
            {asesorTel(session) && (
              <div style={{ fontSize: 22, color: "#C9C4B4", marginTop: 10, display: "flex", alignItems: "center", gap: 11 }}>
                <Phone size={22} strokeWidth={1.6} />{asesorTel(session)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Facebook 1200×628 ────────────────────────────────────────────────────────
const FbLayout = ({ fichaAvaluo: f, session, formatMXN }) => {
  const specs = specsJL(f).slice(0, 4);
  const fotos = f?.fotos || [];
  return (
    <div id="pv-ficha-root" style={{ width: 1200, height: 628, background: C.cream, color: C.ink, fontFamily: SANS, display: "grid", gridTemplateColumns: "1fr 1.05fr" }}>
      <div style={{ padding: "52px 48px", display: "flex", flexDirection: "column" }}>
        <LogoBox session={session} fs={12} pad={16} />
        <h1 style={{ fontFamily: SERIF, margin: "26px 0 0", fontSize: 74, lineHeight: 0.86, fontWeight: 500 }}>{operacionDe(f)}</h1>
        <div style={{ width: 64, height: 3, background: C.gold, margin: "16px 0 12px" }} />
        <div style={{ fontSize: 17, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f?.direccion || ""}</div>
        <div style={{ fontSize: 15, color: C.muted, marginTop: 4 }}>{zonaDe(f)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 26px", marginTop: 26 }}>
          {specs.map((s, i) => <SpecRow key={i} Icon={s.Icon} val={s.val} fs={16} gap={10} />)}
        </div>
        <div style={{ marginTop: "auto" }}>
          <PriceBadge precio={precioDe(f)} formatMXN={formatMXN} kSize={11} vSize={38} pad="14px 36px" />
        </div>
      </div>
      <div style={{ position: "relative" }}>
        {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(0deg,rgba(47,53,39,.9),transparent)", padding: "26px 32px", display: "flex", alignItems: "center", gap: 14 }}>
          <AvatarAsesor session={session} size={52} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.white }}>{asesorNombre(session)}</div>
            {asesorTel(session) && (
              <div style={{ fontSize: 14, color: "#D8D2C2", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Phone size={14} strokeWidth={1.6} />{asesorTel(session)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Export principal ──────────────────────────────────────────────────────────
const LayoutJustListed = (props) => {
  const { formato = "vertical_2p" } = props;
  switch (formato) {
    case "post": return <PostLayout {...props} />;
    case "reels": return <StoryLayout {...props} />;
    case "horizontal": return <FbLayout {...props} />;
    case "vertical_2p":
    default: return <A4Layout {...props} />;
  }
};

export default LayoutJustListed;
