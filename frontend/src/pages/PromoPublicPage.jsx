import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PromoReelEstateElite from "@/components/dashboard/tabs/promociones/PromoReelEstateElite";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// Normaliza el registro de propiedad al shape que espera el reel
const toFicha = (p = {}) => ({
  direccion: p.direccion,
  colonia: p.colonia,
  municipio: p.municipio,
  estado_mx: p.estado_mx,
  valor: p.precio_oferta,
  construccion: p.m2_construccion,
  terreno: p.m2_terreno,
  recamaras: p.recamaras,
  banos: p.banos,
  cajones: p.estacionamiento,
  fotos: p.fotos,
  amenidades: p.amenidades,
});

export default function PromoPublicPage() {
  const { propiedadId } = useParams();
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fuentes del diseño (web normal: CDN permitido, a diferencia del artifact)
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&family=Work+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    let vivo = true;
    fetch(`${API}/api/inmobiliaria/propiedades/${propiedadId}/promo-publica`)
      .then((r) => { if (!r.ok) throw new Error("no"); return r.json(); })
      .then((json) => { if (vivo) { setData(json); setEstado("ok"); } })
      .catch(() => { if (vivo) setEstado("error"); });

    return () => { vivo = false; };
  }, [propiedadId]);

  const shell = {
    width: "100vw", height: "100dvh", margin: 0, background: "#050505",
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
  };
  // 9:16 centrado (letterbox en desktop, full-bleed en móvil)
  const stage = { position: "relative", height: "100dvh", width: "min(100vw, 56.25dvh)", background: "#051b12" };

  if (estado === "cargando") {
    return <div style={shell}><div style={{ color: "#cfe9d9", fontFamily: "'Work Sans',sans-serif", fontSize: 14, letterSpacing: "0.1em" }}>Cargando…</div></div>;
  }
  if (estado === "error") {
    return (
      <div style={shell}>
        <div style={{ color: "#cfe9d9", fontFamily: "'Work Sans',sans-serif", textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Esta promoción ya no está disponible</p>
          <p style={{ fontSize: 13, opacity: 0.6 }}>El enlace pudo haber expirado o la propiedad fue retirada.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={stage}>
        <PromoReelEstateElite ficha={toFicha(data.propiedad)} asesor={data.asesor} />
      </div>
    </div>
  );
}
