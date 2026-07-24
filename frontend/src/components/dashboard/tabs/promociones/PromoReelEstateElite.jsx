import React, { useEffect, useState } from "react";

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Work+Sans:wght@400;500;600;700&display=swap";

/*
  PromoReelEstateElite — port fiel 100% del diseño EstateElite (reel 9:16 de 3 hojas:
  Portada · Características · Contacto). Autocontenido: estilos en <style> scoped bajo
  .ee-reel + iconos SVG inline. NO depende del tailwind.config del app.
  Alimentado con datos reales de la propiedad + asesor.
*/

const ICONS = {
  pin: '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.3"/>',
  ruler: '<path d="M12 3l7 17H5L12 3z"/><path d="M12 9v11"/>',
  bed: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18v2"/><path d="M21 18v2"/><path d="M3 12V9a2 2 0 0 1 2-2h4v5"/>',
  bath: '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3z"/><path d="M4 12V7a2 2 0 0 1 3-1.7"/><path d="M3 20h18"/>',
  car: '<path d="M3 17v-4l2-5h12l3 5v4"/><path d="M5 17h14"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
  pool: '<path d="M2 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M2 12c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/>',
  dumbbell: '<path d="M6 7v10"/><path d="M18 7v10"/><path d="M2 10v4"/><path d="M22 10v4"/><path d="M6 12h12"/>',
  tree: '<path d="M12 2l5 8h-3l4 6h-4v6h-4v-6H6l4-6H7l5-8z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.3 12.5l2.4 2.4 4.7-5"/>',
  phone: '<path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1 .4 2.2.6 3.4.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.9 21 3 12.1 3 3c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.4.1.4 0 .8-.3 1L6.6 10.8z"/>',
  security: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h9a2.5 2.5 0 1 1-2.5 2.5"/>',
  wine: '<path d="M8 3h8l-.7 6a3.3 3.3 0 0 1-6.6 0L8 3z"/><path d="M12 12v6"/><path d="M8 21h8"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  home: '<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>',
  star: '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2L3 9.5l6.4-.6L12 3z"/>',
  check2: '<circle cx="12" cy="12" r="9"/><path d="M8.3 12.5l2.4 2.4 4.7-5"/>',
  arrowR: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  arrowUR: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
};

const Icon = ({ name, size = 22 }) => (
  <span
    className="ee-icon"
    style={{ width: size, height: size, display: "inline-flex", flexShrink: 0 }}
    dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${ICONS[name] || ""}</svg>` }}
  />
);

// Elige un icono para una amenidad/feature según su texto (misma heurística que el resto del app)
const iconoDe = (str) => {
  const s = (str || "").toLowerCase();
  if (s.includes("alberca") || s.includes("piscina")) return "pool";
  if (s.includes("casa club")) return "home";
  if (s.includes("gym") || s.includes("gimnasio")) return "dumbbell";
  if (s.includes("jardin") || s.includes("jardín") || s.includes("árbol") || s.includes("arbol") || s.includes("verde") || s.includes("parque")) return "tree";
  if (s.includes("seguridad") || s.includes("vigilancia") || s.includes("caseta")) return "security";
  if (s.includes("aire") || s.includes("clima")) return "wind";
  if (s.includes("cava") || s.includes("vino")) return "wine";
  if (s.includes("camara") || s.includes("cámara") || s.includes("cctv") || s.includes("circuito")) return "camera";
  return "star";
};

const fmtMXN = (v) => {
  const n = Number(v) || 0;
  if (!n) return "Precio a consultar";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n) + " MXN";
};

const STYLES = `
.ee-reel, .ee-reel * { box-sizing: border-box; }
.ee-reel { position: relative; width: 100%; height: 100%; margin: 0 auto; overflow: hidden; background: #051b12; font-family: 'Work Sans', system-ui, sans-serif; }
.ee-icon svg { width: 100%; height: 100%; display: block; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.ee-reel .no-scrollbar::-webkit-scrollbar { display: none; }
.ee-reel .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.ee-slide { position: absolute; inset: 0; opacity: 0; visibility: hidden; transition: opacity .28s ease; }
.ee-slide.active { opacity: 1; visibility: visible; }

.ee-dots { position: absolute; top: 12px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; z-index: 60; padding: 0 16px; }
.ee-dot { flex: 1; max-width: 60px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.22); overflow: hidden; border: none; padding: 0; cursor: pointer; }
.ee-dot::after { content: ''; display: block; width: 0; height: 100%; background: #fff; transition: width .25s ease; }
.ee-dot.active::after, .ee-dot.done::after { width: 100%; }

/* Slide 1: Portada */
#ee-slide-0 { background: #051b12; }
.ee-s0-frame { position: relative; height: 100%; width: 100%; overflow: hidden; }
.ee-s0-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.08); }
.ee-s0-bg-fallback { position: absolute; inset: 0; background: linear-gradient(135deg, #0a2a1c 0%, #1a3026 50%, #0a2a1c 100%); }
.ee-s0-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,27,18,0.15) 0%, rgba(5,27,18,0.25) 45%, rgba(5,27,18,0.97) 92%); }
.ee-s0-mark { position: absolute; top: 34px; left: 0; right: 0; display: flex; justify-content: center; z-index: 5; }
.ee-s0-mark span { font-family: 'Noto Serif', Georgia, serif; font-weight: 700; font-size: 19px; letter-spacing: 0.16em; color: #cfe9d9; border: 1px solid rgba(207,233,217,0.35); padding: 6px 16px; background: rgba(5,27,18,0.35); backdrop-filter: blur(6px); text-transform: uppercase; }
.ee-s0-content { position: absolute; left: 0; right: 0; bottom: 84px; z-index: 5; padding: 0 22px; display: flex; flex-direction: column; gap: 14px; }
.ee-s0-price { display: inline-block; align-self: flex-start; background: #e9c176; color: #261900; font-weight: 600; font-size: 13px; letter-spacing: 0.08em; padding: 6px 12px; text-transform: uppercase; }
.ee-s0-title { font-family: 'Noto Serif', Georgia, serif; font-weight: 700; font-size: 34px; line-height: 1.15; color: #fff; margin: 0; text-wrap: balance; }
.ee-s0-loc { display: flex; align-items: center; gap: 6px; color: #b3ccbe; font-size: 14px; }
.ee-s0-rule { width: 44px; height: 1px; background: rgba(233,193,118,0.5); }
.ee-s0-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.12); }
.ee-s0-stats > div { display: flex; flex-direction: column; gap: 2px; }
.ee-s0-stats .k { color: rgba(255,255,255,0.55); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.ee-s0-stats .v { color: #fff; font-family: 'Noto Serif', Georgia, serif; font-weight: 600; font-size: 22px; }

/* Slide 2: Características */
#ee-slide-1 { background: linear-gradient(180deg, rgba(5,27,18,1) 0%, rgba(26,48,38,1) 100%); }
.ee-s1-frame { height: 100%; width: 100%; display: flex; flex-direction: column; padding-top: 46px; }
.ee-s1-mark { padding: 0 20px 18px; }
.ee-s1-mark span { font-family: 'Noto Serif', Georgia, serif; font-weight: 700; font-size: 18px; color: #cfe9d9; border: 1px solid rgba(179,204,190,0.3); padding: 5px 12px; background: rgba(0,0,0,0.1); }
.ee-s1-body { flex: 1; overflow-y: auto; padding: 0 20px 28px; }
.ee-eyebrow { font-weight: 600; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #e9c176; opacity: 0.85; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin: 0 0 14px; }
.ee-feat-row { display: flex; align-items: center; gap: 14px; padding: 7px 0; }
.ee-feat-icon { width: 46px; height: 46px; flex-shrink: 0; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #b3ccbe; }
.ee-feat-row p { font-weight: 500; font-size: 15px; color: rgba(255,255,255,0.92); margin: 0; }
.ee-amen-section { margin-top: 22px; }
.ee-amen-card { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 13px 14px; margin-bottom: 10px; }
.ee-amen-icon { width: 38px; height: 38px; border-radius: 8px; background: rgba(58,40,0,0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #e9c176; }
.ee-amen-card p { font-size: 14px; color: rgba(255,255,255,0.92); margin: 0; }

/* Slide 3: Contacto */
#ee-slide-2 { background: #f7f5f0; }
.ee-s2-frame { position: relative; height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden; }
.ee-glow-a, .ee-glow-b { position: absolute; width: 220px; height: 220px; border-radius: 50%; filter: blur(70px); opacity: 0.14; pointer-events: none; }
.ee-glow-a { top: -6%; right: -12%; background: #b3ccbe; }
.ee-glow-b { bottom: -6%; left: -12%; background: #e9c176; }
.ee-s2-mark { padding-top: 52px; display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 2; }
.ee-s2-mark span { font-family: 'Noto Serif', Georgia, serif; font-weight: 700; font-size: 18px; color: #051b12; border: 1px solid #c2c8c3; padding: 5px 14px; }
.ee-s2-mark i.rule { display: block; width: 44px; height: 1px; background: #c2c8c3; }
.ee-s2-main { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 30px; z-index: 2; flex: 1; justify-content: center; margin-top: -14px; }
.ee-s2-photo { position: relative; margin-bottom: 16px; }
.ee-s2-photo img { width: 124px; height: 124px; border-radius: 50%; object-fit: cover; border: 3px solid #051b12; padding: 3px; background: #fff; display: block; }
.ee-s2-photo .ph { width: 124px; height: 124px; border-radius: 50%; border: 3px solid #051b12; padding: 3px; background: #cfe9d9; display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif', serif; font-size: 44px; font-weight: 700; color: #051b12; }
.ee-s2-badge { position: absolute; bottom: 2px; right: 2px; width: 26px; height: 26px; border-radius: 50%; background: #051b12; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; color: #fff; }
.ee-s2-name { font-family: 'Noto Serif', Georgia, serif; font-weight: 700; font-size: 26px; color: #051b12; margin: 0 0 2px; }
.ee-s2-role { font-weight: 600; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #5b6660; margin: 0 0 14px; }
.ee-s2-phone { display: flex; align-items: center; justify-content: center; gap: 7px; color: rgba(26,28,27,0.78); font-size: 15px; margin-bottom: 22px; }
.ee-s2-cta { background: #ba1a1a; color: #fff; border: none; border-radius: 999px; padding: 15px 34px; display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.03em; cursor: pointer; box-shadow: 0 8px 24px -6px rgba(186,26,26,0.45); transition: transform .12s ease; text-decoration: none; }
.ee-s2-cta:active { transform: scale(0.96); }
.ee-s2-cta .ee-icon { transition: transform .15s ease; }
.ee-s2-cta:hover .ee-icon { transform: translateX(3px); }
.ee-s2-foot { padding-bottom: 44px; font-size: 12px; letter-spacing: 0.02em; color: rgba(26,28,27,0.45); z-index: 2; }

/* Navegación (botones propios de cada hoja) */
.ee-advance { width: 100%; padding: 15px; border-radius: 2px; border: 1px solid #cfe9d9; background: rgba(5,27,18,0.4); color: #cfe9d9; font-weight: 600; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; backdrop-filter: blur(4px); transition: background .2s ease, transform .12s ease; margin-top: 4px; }
.ee-advance:active { transform: scale(0.98); background: rgba(207,233,217,0.15); }
.ee-advance.gold { border-color: rgba(233,193,118,0.5); color: #e9c176; margin-top: 22px; }
.ee-advance .ee-icon { transition: transform .15s ease; }
.ee-advance:hover .ee-icon { transform: translateX(3px); }
.ee-back { position: absolute; top: 16px; left: 18px; z-index: 60; display: flex; align-items: center; gap: 4px; background: none; border: none; padding: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; color: rgba(255,255,255,0.55); }
#ee-slide-2 .ee-back { color: rgba(26,28,27,0.45); }
`;

export default function PromoReelEstateElite({ ficha, asesor, marca }) {
  const [current, setCurrent] = useState(0);
  const go = (i) => { if (i >= 0 && i <= 2) setCurrent(i); };

  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  // Inyecta el CSS en <head> vía DOM (no como <style> JSX inline): montado dentro de
  // árboles muy anidados (p.ej. el panel del Diseñador), el <style> inline a veces
  // queda con 0 reglas parseadas por el navegador; creado directo en head siempre parsea bien.
  useEffect(() => {
    if (document.getElementById("ee-reel-styles")) return;
    const style = document.createElement("style");
    style.id = "ee-reel-styles";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }, []);

  const f = ficha || {};
  const brand = marca || "EstateElite";
  const heroImg = (f.fotos || []).filter(Boolean)[0] || null;
  const precio = fmtMXN(f.valor ?? f.precio_oferta);
  const direccion = f.direccion || "Propiedad en venta";
  const tituloLineas = direccion.split(",");
  const ubicacion = [f.colonia, f.municipio].filter(Boolean).join(" · ") || f.estado_mx || "";
  const beds = f.recamaras ?? f.recamaras_val ?? "—";
  const baths = f.banos ?? "—";
  const constr = f.construccion ?? f.m2_construccion;

  // Características: derivadas de datos reales
  const features = [
    constr ? { icon: "ruler", label: `${constr} m² de Construcción` } : null,
    (f.recamaras != null) ? { icon: "bed", label: `${f.recamaras} ${Number(f.recamaras) === 1 ? "Recámara" : "Recámaras"}` } : null,
    (f.banos != null) ? { icon: "bath", label: `${f.banos} ${Number(f.banos) === 1 ? "Baño" : "Baños"}` } : null,
    (f.cajones != null || f.estacionamiento != null)
      ? { icon: "car", label: `${f.cajones ?? f.estacionamiento} ${Number(f.cajones ?? f.estacionamiento) === 1 ? "Estacionamiento" : "Estacionamientos"}` }
      : null,
  ].filter(Boolean);

  const amenList = Array.isArray(f.amenidades)
    ? f.amenidades
    : (typeof f.amenidades === "string" ? f.amenidades.split(",").map((s) => s.trim()).filter(Boolean) : []);

  const a = asesor || {};
  const asesorNombre = a.nombre || brand;
  const asesorFoto = a.foto || null;
  const asesorTel = a.telefono || null;
  const telHref = asesorTel ? `tel:${String(asesorTel).replace(/[^\d+]/g, "")}` : null;
  const inicial = (asesorNombre || "?").trim().charAt(0).toUpperCase();

  const dotState = (i) => (i === current ? "active" : i < current ? "done" : "");

  return (
    <div className="ee-reel">
      <div className="ee-dots">
        {[0, 1, 2].map((i) => (
          <button key={i} className={`ee-dot ${dotState(i)}`} onClick={() => go(i)} aria-label={`Ir a hoja ${i + 1}`} />
        ))}
      </div>

      {/* HOJA 1 — Portada */}
      <div className={`ee-slide ${current === 0 ? "active" : ""}`} id="ee-slide-0">
        <div className="ee-s0-frame">
          {heroImg ? <img className="ee-s0-bg" alt={direccion} src={heroImg} /> : <div className="ee-s0-bg-fallback" />}
          <div className="ee-s0-scrim" />
          <div className="ee-s0-mark"><span>{brand}</span></div>
          <div className="ee-s0-content">
            <span className="ee-s0-price">{precio}</span>
            <h1 className="ee-s0-title">
              {tituloLineas[0]}
              {tituloLineas.length > 1 && <><br />{tituloLineas.slice(1).join(",").trim()}</>}
            </h1>
            {ubicacion && (
              <div className="ee-s0-loc"><Icon name="pin" size={16} />{ubicacion}</div>
            )}
            <div className="ee-s0-rule" />
            <div className="ee-s0-stats">
              <div><span className="k">Recámaras</span><span className="v">{beds}</span></div>
              <div><span className="k">Baños</span><span className="v">{baths}</span></div>
              <div><span className="k">m² Const.</span><span className="v">{constr ?? "—"}</span></div>
            </div>
            <button className="ee-advance" onClick={() => go(1)}>Ver características<Icon name="arrowR" size={16} /></button>
          </div>
        </div>
      </div>

      {/* HOJA 2 — Características */}
      <div className={`ee-slide ${current === 1 ? "active" : ""}`} id="ee-slide-1">
        <div className="ee-s1-frame">
          <button className="ee-back" onClick={() => go(0)}><Icon name="arrowUR" size={14} />Atrás</button>
          <div className="ee-s1-mark"><span>{brand}</span></div>
          <div className="ee-s1-body no-scrollbar">
            <p className="ee-eyebrow">Características</p>
            {features.map((ft, i) => (
              <div className="ee-feat-row" key={i}>
                <div className="ee-feat-icon"><Icon name={ft.icon} size={22} /></div>
                <p>{ft.label}</p>
              </div>
            ))}
            {amenList.length > 0 && (
              <div className="ee-amen-section">
                <p className="ee-eyebrow">Amenidades</p>
                {amenList.map((am, i) => (
                  <div className="ee-amen-card" key={i}>
                    <div className="ee-amen-icon"><Icon name={iconoDe(am)} size={19} /></div>
                    <p>{am}</p>
                  </div>
                ))}
              </div>
            )}
            <button className="ee-advance gold" onClick={() => go(2)}>Ver contacto<Icon name="arrowR" size={16} /></button>
          </div>
        </div>
      </div>

      {/* HOJA 3 — Contacto */}
      <div className={`ee-slide ${current === 2 ? "active" : ""}`} id="ee-slide-2">
        <div className="ee-s2-frame">
          <div className="ee-glow-a" />
          <div className="ee-glow-b" />
          <button className="ee-back" onClick={() => go(1)}><Icon name="arrowUR" size={14} />Atrás</button>
          <div className="ee-s2-mark"><span>{brand}</span><i className="rule" /></div>
          <div className="ee-s2-main">
            <div className="ee-s2-photo">
              {asesorFoto ? <img alt={asesorNombre} src={asesorFoto} /> : <div className="ph">{inicial}</div>}
              <div className="ee-s2-badge"><Icon name="check" size={14} /></div>
            </div>
            <h1 className="ee-s2-name">{asesorNombre}</h1>
            <p className="ee-s2-role">Asesor Inmobiliario</p>
            {asesorTel && (
              <div className="ee-s2-phone"><Icon name="phone" size={16} />{asesorTel}</div>
            )}
            {telHref ? (
              <a className="ee-s2-cta" href={telHref}>Agendar mi visita<Icon name="arrowR" size={18} /></a>
            ) : (
              <button className="ee-s2-cta" type="button">Agendar mi visita<Icon name="arrowR" size={18} /></button>
            )}
          </div>
          <div className="ee-s2-foot">propvalu.mx</div>
        </div>
      </div>
    </div>
  );
}
