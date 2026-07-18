import React, { useState, useEffect } from "react";
import { BedDouble, Bath, Building, Map as MapIcon, Car, Calendar, Phone, User, MapPin, ArrowRight } from "lucide-react";

/* SecuenciasJustListed — 3 secuencias animadas 9:16 (estilo GIF/TikTok) para el
   estilo Just Listed. Loop automático con ken-burns (zoom) + crossfade.
   1) Impacto + precio  2) Datos  3) Contacto.  Máx 3 secuencias. */

const C = {
  cream: "#F4EFE4", line: "#E2D9C6", olive: "#55603F", oliveDeep: "#2F3527",
  gold: "#B08B4F", goldSoft: "#C9A96A", ink: "#2A2A24", muted: "#6E6A5C", white: "#FCFAF4",
};
const SERIF = '"Didot","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif';
const SANS = '"Helvetica Neue",Arial,sans-serif';
const W = 1080, H = 1920, DUR = 3000; // ms por secuencia

const precioDe = (f) => f?.valor || f?.precio_oferta || 0;
const anioDe = (f) => (f?.antiguedad != null ? new Date().getFullYear() - Number(f.antiguedad) : null);
const zonaDe = (f) => [f?.colonia, f?.municipio, f?.estado_mx].filter(Boolean).join(" · ");
const operacionDe = (f) => f?.operacion || (f?.tipo_operacion === "renta" ? "En Renta" : "En Venta");
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

const KEYFRAMES = `
@keyframes jl-ken { from { transform: scale(1); } to { transform: scale(1.14); } }
@keyframes jl-in  { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
`;

const SecuenciasJustListed = ({ fichaAvaluo: f, session, formatMXN, scale = 0.4 }) => {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % 3), DUR);
    return () => clearInterval(t);
  }, [playing]);

  const fotos = f?.fotos || [];
  const specs = specsJL(f);
  const [e1, e2] = operacionDe(f).split(" ");

  const slideWrap = { position: "absolute", inset: 0, transition: "opacity .6s ease", fontFamily: SANS };
  const anim = (on) => ({ animation: on ? "jl-in .6s ease both" : "none" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ width: W * scale, height: H * scale, position: "relative" }}>
        <div id="jl-seq-board" style={{
          width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left",
          position: "absolute", top: 0, left: 0, overflow: "hidden", borderRadius: 8,
          background: C.cream, boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}>
          <style>{KEYFRAMES}</style>

          {/* Barra de progreso (3 segmentos) */}
          <div data-export-hide style={{ position: "absolute", top: 28, left: 28, right: 28, zIndex: 10, display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.white, width: i < idx ? "100%" : i === idx ? "100%" : "0%",
                  transition: i === idx && playing ? `width ${DUR}ms linear` : "none",
                  transformOrigin: "left" }} />
              </div>
            ))}
          </div>

          {/* ── SECUENCIA 1 — Impacto + precio ── */}
          <div data-seq="0" style={{ ...slideWrap, opacity: idx === 0 ? 1 : 0, zIndex: idx === 0 ? 3 : 1 }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {fotos[0] && <img src={fotos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover",
                animation: idx === 0 ? `jl-ken ${DUR + 600}ms ease-out both` : "none" }} />}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(47,53,39,.55) 0%,transparent 34%,transparent 52%,rgba(47,53,39,.92) 100%)" }} />
            <div style={{ position: "absolute", bottom: 130, left: 64, right: 64, ...anim(idx === 0) }}>
              <div style={{ display: "inline-flex", flexDirection: "column", background: C.olive, color: C.white, borderRadius: 14, padding: "24px 60px", marginBottom: 30 }}>
                <span style={{ letterSpacing: "0.34em", textTransform: "uppercase", opacity: 0.72, fontSize: 18 }}>Precio</span>
                <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: 72 }}>{formatMXN(precioDe(f))}</span>
              </div>
              <h1 style={{ fontFamily: SERIF, margin: 0, fontSize: 128, lineHeight: 0.86, fontWeight: 500, color: C.white }}>{e1}<br />{e2}</h1>
              <div style={{ width: 100, height: 5, background: C.gold, margin: "28px 0 20px" }} />
              <div style={{ fontSize: 34, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.white }}>{f?.direccion || ""}</div>
              <div style={{ fontSize: 28, color: "rgba(255,255,255,.8)", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <MapPin size={30} strokeWidth={1.6} />{zonaDe(f)}
              </div>
            </div>
          </div>

          {/* ── SECUENCIA 2 — Datos ── */}
          <div data-seq="1" style={{ ...slideWrap, opacity: idx === 1 ? 1 : 0, zIndex: idx === 1 ? 3 : 1, background: C.oliveDeep }}>
            <div style={{ padding: "150px 72px", color: C.white, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", ...anim(idx === 1) }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 96, fontWeight: 500, margin: "0 0 12px", color: C.white }}>Lo que<br />incluye</h2>
              <div style={{ width: 100, height: 5, background: C.gold, margin: "0 0 70px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px 44px", marginBottom: "auto" }}>
                {specs.slice(0, 6).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                    <s.Icon size={64} color={C.goldSoft} strokeWidth={1.5} />
                    <span style={{ fontSize: 36, fontWeight: 500 }}>{s.val}</span>
                  </div>
                ))}
              </div>
              {fotos[1] && <img src={fotos[1]} alt="" style={{ width: "100%", height: 420, objectFit: "cover", borderRadius: 20, border: `8px solid ${C.cream}` }} />}
            </div>
          </div>

          {/* ── SECUENCIA 3 — Contacto ── */}
          <div data-seq="2" style={{ ...slideWrap, opacity: idx === 2 ? 1 : 0, zIndex: idx === 2 ? 3 : 1, background: C.cream }}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 90, boxSizing: "border-box", textAlign: "center", ...anim(idx === 2) }}>
              <div style={{ width: 360, height: 360, borderRadius: "50%", overflow: "hidden", marginBottom: 56, border: `14px solid ${C.goldSoft}`, background: "#d8d2c2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {asesorFoto(session)
                  ? <img src={asesorFoto(session)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <User size={150} color="#9a9484" />}
              </div>
              <h2 style={{ fontFamily: SERIF, fontSize: 78, color: C.oliveDeep, fontWeight: 500, margin: "0 0 12px" }}>{asesorNombre(session)}</h2>
              <p style={{ fontSize: 30, color: C.gold, margin: "0 0 44px", textTransform: "uppercase", letterSpacing: "0.24em" }}>Asesor Inmobiliario</p>
              {asesorTel(session) && (
                <p style={{ fontSize: 56, fontWeight: 600, color: C.ink, marginBottom: 66, display: "flex", alignItems: "center", gap: 20 }}>
                  <Phone size={48} color={C.olive} strokeWidth={1.6} /> {asesorTel(session)}
                </p>
              )}
              <div style={{ background: C.olive, color: C.white, fontFamily: SERIF, fontSize: 54, fontWeight: 500, padding: "40px 84px", borderRadius: 100, display: "flex", alignItems: "center", gap: 22 }}>
                Agenda tu visita <ArrowRight size={46} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <button key={i} onClick={() => setIdx(i)} title={`Secuencia ${i + 1}`}
            style={{ width: 10, height: 10, borderRadius: "50%", border: "none", cursor: "pointer",
              background: i === idx ? C.olive : "#cbd5e1" }} />
        ))}
        <button onClick={() => setPlaying((p) => !p)}
          style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: "#334155", background: "#fff",
            border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
          {playing ? "⏸ Pausar" : "▶ Reproducir"}
        </button>
      </div>
    </div>
  );
};

export default SecuenciasJustListed;
