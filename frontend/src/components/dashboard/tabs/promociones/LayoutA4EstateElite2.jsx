import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { AMENIDADES_ICONS, INSTALACIONES_ICONS, ESPACIOS_ICONS } from "./amenidadesIcons";

// Hoja 2 del A4 EstateElite — fiel al diseño real de Framer (confirmado por
// screenshot del usuario, ya que el export/zip original solo traía la hoja 1):
// mismo header verde que la hoja 1, galería de 6 fotos en grid asimétrico,
// franja de amenidades reales con ícono, y pie de contacto (foto+nombre+rol
// del asesor a la izquierda, marca+teléfono+correo a la derecha).

const FONTS_CSS = `
@font-face { font-family: 'EE Barlow Condensed'; src: url('/fonts/estate-elite/barlow-condensed-regular.woff2') format('woff2'); font-weight: 400; }
@font-face { font-family: 'EE Barlow Condensed'; src: url('/fonts/estate-elite/barlow-condensed-semibold.woff2') format('woff2'); font-weight: 600; }
@font-face { font-family: 'EE Bodoni Moda'; src: url('/fonts/estate-elite/bodoni-moda-medium.woff2') format('woff2'); font-weight: 500; }
`;
function useFuentesElite() {
  useEffect(() => {
    if (document.getElementById("ee-a4-fonts")) return;
    const style = document.createElement("style");
    style.id = "ee-a4-fonts";
    style.textContent = FONTS_CSS;
    document.head.appendChild(style);
  }, []);
}

const BARLOW = "'EE Barlow Condensed', sans-serif";
const BODONI = "'EE Bodoni Moda', serif";
const VERDE = "#1B4332";

const ICONOS = [...AMENIDADES_ICONS, ...INSTALACIONES_ICONS, ...ESPACIOS_ICONS];
const iconoDe = (label) => ICONOS.find((i) => i.label.toLowerCase() === (label || "").toLowerCase())?.Icon || CheckCircle2;

const money = (v, formatMXN) => (formatMXN ? formatMXN(v) : (v ? `$${Number(v).toLocaleString("es-MX")} MXN` : "—"));

export default function LayoutA4EstateElite2({ fichaAvaluo, asesor, slidesFotos, amenidades, formatMXN, session }) {
  useFuentesElite();
  const f = fichaAvaluo || {};
  const a = asesor || {};
  const fotos = (slidesFotos?.length ? slidesFotos : f.fotos || []).filter(Boolean);
  const galeria = fotos.slice(4, 10); // las 6 siguientes a las que ya usó la hoja 1 (hero + 3 galería)

  const amenList = (Array.isArray(amenidades) && amenidades.length ? amenidades
    : (Array.isArray(f.amenidades) ? f.amenidades
      : (typeof f.amenidades === "string" ? f.amenidades.split(",").map((s) => s.trim()).filter(Boolean) : []))
  ).slice(0, 5);

  const precio = money(f.valor ?? f.precio_oferta, formatMXN);

  // Filas asimétricas (60/40, 40/60, 40/60) — mismo patrón visual del diseño original.
  const filas = [
    [galeria[0], galeria[1], "1.5fr 1fr"],
    [galeria[2], galeria[3], "1fr 1.5fr"],
    [galeria[4], galeria[5], "1fr 1.5fr"],
  ].filter(([f1, f2]) => f1 || f2);

  return (
    <div id="pv-ficha-tecnica-root" style={{ width: 794, height: 1123, background: "#fff", fontFamily: BARLOW, display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ background: VERDE, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ border: "1px solid rgba(255,255,255,.6)", borderRadius: 4, padding: "5px 12px", color: "#fff", fontSize: 15 }}>EstateElite</div>
        <div style={{ fontFamily: BODONI, fontWeight: 500, fontSize: 31, color: "#fff" }}>{precio}</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {filas.map(([foto1, foto2, cols], i) => (
          <div key={i} style={{ flex: 1, display: "grid", gridTemplateColumns: cols, gap: 4 }}>
            {[foto1, foto2].map((foto, j) => (
              <div key={j} style={{ background: "#ddd", overflow: "hidden" }}>
                {foto && <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
            ))}
          </div>
        ))}

        {amenList.length > 0 && (
          <div style={{ display: "flex", padding: "18px 0" }}>
            {amenList.map((label, i) => {
              const Icon = iconoDe(label);
              return (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "0 8px", borderLeft: i > 0 ? "1px solid #e2e2e2" : "none" }}>
                  <Icon style={{ width: 22, height: 22, color: VERDE, margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 13, color: "#1c2420", lineHeight: 1.2 }}>{label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: "auto", background: "#eaf2ee", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {a.foto ? (
            <img src={a.foto} alt={a.nombre} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#c8ddd0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: VERDE }}>
              {(a.nombre || "?").trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: VERDE }}>{a.nombre || "Asesor Inmobiliario"}</div>
            <div style={{ fontSize: 12, color: "#5d6f65" }}>Asesor(a) inmobiliario(a)</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.5, color: VERDE }}>PROPVALÚ</div>
          {a.telefono && <div style={{ fontSize: 13, color: "#1c2420" }}>{a.telefono}</div>}
          {session?.email && <div style={{ fontSize: 12, color: "#5d6f65" }}>{session.email}</div>}
        </div>
      </div>
    </div>
  );
}
