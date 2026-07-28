import React, { useEffect } from "react";

// Hoja A4 imprimible del estilo EstateElite — fiel al diseño real de Framer
// (mismas fuentes: Archivo Black / Barlow Condensed / Bodoni Moda, copiadas
// del export a `public/fonts/estate-elite/`). A diferencia de los otros 3
// formatos (Reel/Post/Facebook), que reusan y escalan `PromoReelEstateElite`
// (tarjeta 390x693), esta es una hoja de una sola página con su propia
// estructura (header+foto+atributos+cuerpo+galería+contacto+pie). Mismos
// campos de datos que ya consume `PromoReelEstateElite.jsx` — sin inventar
// campos nuevos ni afirmar datos que el sistema no tiene (ej. "Escrituras
// listas"/"Verificada" del mockup demo se sustituyen por datos reales).

const FONTS_CSS = `
@font-face { font-family: 'EE Archivo Black'; src: url('/fonts/estate-elite/archivo-black-regular.woff2') format('woff2'); font-weight: 400; }
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
const ARCHIVO = "'EE Archivo Black', sans-serif";
const BODONI = "'EE Bodoni Moda', serif";
const ARIAL_BLACK = '"Arial Black","Helvetica Neue",Arial,sans-serif';
const VERDE = "#1B4332";
const VERDE_PRECIO = "#2F8056";

const money = (v, formatMXN) => (formatMXN ? formatMXN(v) : (v ? `$${Number(v).toLocaleString("es-MX")} MXN` : "—"));

export default function LayoutA4EstateElite({ fichaAvaluo, asesor, slidesFotos, amenidades, formatMXN }) {
  useFuentesElite();
  const f = fichaAvaluo || {};
  const a = asesor || {};

  const fotos = (slidesFotos?.length ? slidesFotos : f.fotos || []).filter(Boolean);
  const heroImg = fotos[0] || null;
  const galeria = fotos.slice(1, 4);

  const precio = money(f.valor ?? f.precio_oferta, formatMXN);
  const direccion = f.direccion || "Propiedad en venta";
  const ubicacion = [f.colonia, f.municipio].filter(Boolean).join(" · ") || f.estado_mx || "";
  const tipoOperacion = (f.tipo_operacion || "venta").toLowerCase() === "renta" ? "Renta" : "Venta";
  const tipoLabel = f.tipo || f.tipo_propiedad || "Propiedad";
  const tituloHoja = `${tipoLabel} en ${tipoOperacion}`;

  const constr = f.construccion ?? f.m2_construccion;
  const terreno = f.terreno ?? f.m2_terreno;
  const recamaras = f.recamaras ?? f.recamaras_val;
  const banos = f.banos;
  const estac = f.cajones ?? f.estacionamiento;
  const descripcion = (f.descripcion || "").trim();

  const anio = f.anio_construccion || (f.antiguedad != null ? new Date().getFullYear() - Number(f.antiguedad) : null);
  const niveles = f.niveles;

  const amenList = Array.isArray(amenidades) && amenidades.length ? amenidades
    : (Array.isArray(f.amenidades) ? f.amenidades
      : (typeof f.amenidades === "string" ? f.amenidades.split(",").map((s) => s.trim()).filter(Boolean) : []));

  const atributos = [
    constr ? { label: `${constr} m² const` } : null,
    terreno ? { label: `${terreno} m² terreno` } : null,
    recamaras != null ? { label: `${recamaras} rec` } : null,
    banos != null ? { label: `${banos} baños` } : null,
    estac != null ? { label: `${estac} estac.` } : null,
  ].filter(Boolean);

  // Chips de specs reales (nunca afirmaciones no verificables como "Verificada").
  const puntosReales = [
    ...(Array.isArray(f.puntos_propvalu) ? f.puntos_propvalu : []),
    ...(Array.isArray(f.puntos_libres) ? f.puntos_libres : []),
  ].map((s) => (s || "").trim()).filter(Boolean);
  const tags = [
    ...puntosReales,
    ...amenList,
  ].slice(0, 6);

  const datosAdicionales = [
    anio ? { label: "AÑO", valor: anio } : null,
    niveles ? { label: "NIVELES", valor: `${niveles} ${Number(niveles) === 1 ? "planta" : "plantas"}` } : null,
    { label: "OPERACIÓN", valor: tipoOperacion },
  ].filter(Boolean);

  return (
    <div id="pv-ficha-root" style={{ width: 794, height: 1123, background: "#fff", fontFamily: BARLOW, display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ background: VERDE, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ border: "1px solid rgba(255,255,255,.6)", borderRadius: 4, padding: "5px 12px", color: "#fff", fontSize: 15 }}>EstateElite</div>
        <div style={{ fontFamily: BODONI, fontWeight: 500, fontSize: 31, color: "#fff" }}>{precio}</div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 300, background: "#ddd" }}>
        {heroImg && <img src={heroImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <span style={{ position: "absolute", right: 16, bottom: 12, color: "#fff", fontWeight: 600, fontSize: 15, textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>propvalu.mx</span>
      </div>

      {atributos.length > 0 && (
        <div style={{ background: VERDE, display: "flex", padding: "16px 0" }}>
          {atributos.map((at, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 19, borderLeft: i > 0 ? "1px solid rgba(255,255,255,.2)" : "none" }}>
              {at.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "22px 30px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: ARIAL_BLACK, fontSize: 48, letterSpacing: -1.5, lineHeight: 0.95, color: "rgb(13,13,12)" }}>{tituloHoja}</div>
        <div style={{ fontFamily: ARCHIVO, fontWeight: 400, fontSize: 38, letterSpacing: -1, color: VERDE_PRECIO, marginTop: 6 }}>{precio}</div>
        {ubicacion && <div style={{ fontSize: 22, color: "rgb(21,21,21)", marginTop: 8 }}>{ubicacion}</div>}
        <div style={{ borderTop: "1px solid #e2e2e2", margin: "14px 0" }} />
        {descripcion && <p style={{ fontSize: 17, lineHeight: 1.35, color: "rgb(32,32,32)", margin: 0, maxWidth: 560 }}>{descripcion}</p>}

        {galeria.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {galeria.map((foto, i) => (
              <div key={i} style={{ flex: 1, height: 105, borderRadius: 6, overflow: "hidden", background: "#ddd" }}>
                <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 18 }}>
          {datosAdicionales.map((d, i) => (
            <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? "1px solid #e2e2e2" : "none" }}>
              <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.8, color: "#5d6f65" }}>{d.label}</div>
              <div style={{ fontSize: 17, color: "#1c2420", marginTop: 2 }}>{d.valor}</div>
            </div>
          ))}
        </div>

        {a.telefono && (
          <div style={{ marginTop: 18, background: "#eaf2ee", borderRadius: 6, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0.8, color: "#285640" }}>{a.nombre ? a.nombre.toUpperCase() : "AGENDA UNA VISITA"}</span>
            <span style={{ fontWeight: 600, fontSize: 17, color: "#123d2b" }}>{a.telefono}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {tags.map((t, i) => (
              <span key={i} style={{ background: "#d8e7dd", color: "#285640", borderRadius: 18, padding: "5px 12px", fontSize: 15 }}>✓ {t}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: VERDE, padding: "13px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
        <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: 1 }}>PROPIEDAD DESTACADA</span>
        <span style={{ fontSize: 14 }}>propvalu.mx</span>
      </div>
    </div>
  );
}
