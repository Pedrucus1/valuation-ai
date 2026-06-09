import React from "react";
import {
  Building, Map, BedDouble, Bath, Car, Layers, Calendar, Wrench, Maximize,
  Phone, Mail, User, CheckCircle2, QrCode,
  Waves, Wind, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Fingerprint, Sofa, Home
} from "lucide-react";

/* Hoja 2 — "Back page" estilo brochure: sidebar de specs grandes +
   lista "Lo Especial" + descripción + galería. Llena toda la hoja A4.
   Usa la paleta: el sidebar toma el color bg de la paleta.
*/
const LayoutFichaTecnica = ({
  fichaAvaluo: f,
  texts,
  idioma,
  descripcionTexto,
  palette,
  formatMXN,
  session,
  amenidades = [],
  instalaciones = [],
  espacios = [],
  puntosDestacados = [],
}) => {
  const bg        = palette?.bg        || "#1B4332";
  const accent    = palette?.accent    || "#52B788";
  const textLight = palette?.textLight || "#D9ED92";
  const muted     = palette?.muted     || "#4a7c59";

  const precio = f?.valor ?? f?.precio_oferta ?? 0;
  const fotos = (f?.fotos || []).filter(Boolean);

  // Specs grandes para el sidebar
  const specs = [
    { Icon: Maximize, label: idioma === "en" ? "Built Area"  : "Construcción",   val: f?.m2_construccion ? `${f.m2_construccion} m²` : null },
    { Icon: Map,      label: idioma === "en" ? "Lot Size"    : "Terreno",        val: f?.m2_terreno      ? `${f.m2_terreno} m²`      : null },
    { Icon: BedDouble,label: idioma === "en" ? "Bedrooms"    : "Recámaras",      val: f?.recamaras != null ? String(f.recamaras)      : null },
    { Icon: Bath,     label: idioma === "en" ? "Bathrooms"   : "Baños",          val: f?.banos      != null ? String(f.banos)         : null },
    { Icon: Car,      label: idioma === "en" ? "Parking"     : "Estacionamiento",val: f?.estacionamiento != null ? `${f.estacionamiento} autos` : null },
    { Icon: Layers,   label: idioma === "en" ? "Levels"      : "Niveles",        val: f?.niveles != null ? String(f.niveles)          : null },
    { Icon: Calendar, label: idioma === "en" ? "Year Built"  : "Antigüedad",     val: f?.antiguedad != null ? `${f.antiguedad} años`  : null },
    { Icon: Wrench,   label: idioma === "en" ? "Condition"   : "Conservación",   val: f?.conservacion || null },
  ].filter(s => s.val !== null);

  // Lista "Lo Especial": combina amenidades + instalaciones + espacios + puntos verificados
  const especiales = [
    ...puntosDestacados.filter(p => p.verificado).map(p => p.texto),
    ...amenidades, ...instalaciones, ...espacios,
    ...puntosDestacados.filter(p => !p.verificado).map(p => p.texto),
  ].filter(Boolean);

  const asesorName = session?.user?.name || session?.user?.email?.split("@")[0] || "Asesor Inmobiliario";

  // Mitad de la lista en cada columna
  const mitad = Math.ceil(especiales.length / 2);
  const colA = especiales.slice(0, mitad);
  const colB = especiales.slice(mitad);

  return (
    <div
      id="pv-ficha-tecnica-root"
      className="relative flex overflow-hidden shadow-xl print:shadow-none"
      style={{ width: 794, height: 1123, fontFamily: "'Manrope', sans-serif" }}
    >
      {/* ── SIDEBAR IZQUIERDO (specs) ───────────────────────────────── */}
      <div className="shrink-0 flex flex-col" style={{ width: 290, background: bg, color: "#fff", padding: "44px 32px" }}>
        {/* Logo inmobiliaria */}
        <div style={{ marginBottom: 36, minHeight: 40, display: "flex", alignItems: "center" }}>
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 40, maxWidth: 160, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.92 }} />
            : <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2, color: "#fff" }}>INMOBILIARIA</span>}
        </div>

        {/* Precio */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: textLight + "cc" }}>
            {idioma === "en" ? "Asking Price" : "Precio de Oferta"}
          </p>
          <p style={{ margin: "4px 0 0", fontFamily: "Outfit, sans-serif", fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            {formatMXN(precio)}
          </p>
          {f?.m2_construccion > 0 && precio > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: accent }}>
              {formatMXN(Math.round(precio / f.m2_construccion))} / m²
            </p>
          )}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "28px 0" }} />

        {/* Specs apilados grandes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          {specs.map(({ Icon, label, val }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.08)", border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: 20, height: 20, color: accent }} />
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: "Outfit, sans-serif", fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{val}</p>
                <p style={{ margin: "2px 0 0", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: textLight + "aa" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Badge propvalu */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: bg, fontWeight: 900, fontSize: 8, fontFamily: "Outfit, sans-serif" }}>P</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: textLight + "cc" }}>propvalu.mx</span>
        </div>
      </div>

      {/* ── COLUMNA DERECHA ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background: "#fff" }}>
        {/* Foto interior grande */}
        <div style={{ height: 240, position: "relative", overflow: "hidden", background: "#e5e5e5" }}>
          {fotos[1]
            ? <img src={fotos[1]} alt="Interior" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : fotos[0] && <img src={fotos[0]} alt="Interior" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          {/* Título sobre la foto */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 28px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
              {f?.tipo || "Propiedad"} · {[f?.colonia, f?.municipio].filter(Boolean).join(", ")}
            </p>
            <h2 style={{ margin: "3px 0 0", fontFamily: "Outfit, sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
              {f?.direccion || "Sin dirección"}
            </h2>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: "26px 28px", display: "flex", flexDirection: "column" }}>
          {/* Lo Especial */}
          {especiales.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: bg, fontWeight: 800, borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>
                {idioma === "en" ? "What's Special" : "Lo Especial"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
                {[colA, colB].map((col, ci) => (
                  <ul key={ci} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {col.map((item, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, color: "#334155" }}>
                        <CheckCircle2 style={{ width: 14, height: 14, color: accent, flexShrink: 0 }} />
                        <span style={{ textTransform: "capitalize" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {descripcionTexto && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: bg, fontWeight: 800, borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>
                {idioma === "en" ? "Description" : "Descripción"}
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.75, color: "#475569", textAlign: "justify" }}>{descripcionTexto}</p>
            </div>
          )}

          {/* Galería inferior — llena el espacio restante */}
          {fotos.length > 2 && (
            <div style={{ marginTop: "auto" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: bg, fontWeight: 800, borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>
                {idioma === "en" ? "Gallery" : "Galería"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, height: 130 }}>
                {fotos.slice(2, 5).map((foto, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", background: "#e5e5e5" }}>
                    <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer asesor */}
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#e5e5e5", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {session?.user?.photoURL
                ? <img src={session.user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <User style={{ width: 20, height: 20, color: "#94a3b8" }} />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: bg }}>{asesorName}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
                {session?.user?.phone && <span style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Phone style={{ width: 10, height: 10 }} /> {session.user.phone}</span>}
                <span style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}><Mail style={{ width: 10, height: 10 }} /> {session?.user?.email}</span>
              </div>
            </div>
          </div>
          {f?.url_recorrido && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Recorrido</p>
                <p style={{ margin: 0, fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>virtual</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 8, border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <QrCode style={{ width: 20, height: 20, color: "#cbd5e1" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutFichaTecnica;
