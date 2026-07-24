import React from "react";
import PromoReelEstateElite from "./PromoReelEstateElite";

// Adaptador: traduce las props genéricas del Diseñador (fichaAvaluo/asesor/slidesFotos)
// al shape que espera PromoReelEstateElite (ficha/asesor), sin tocar ese componente
// para no afectar su uso en PromoPublicPage.jsx.
// Ancho de teléfono real (no 1080 de export estático): PromoReelEstateElite tiene sus
// tamaños de fuente calibrados para el ancho de pantalla de un celular (~390px, como en
// PromoPublicPage.jsx: width: min(100vw, 56.25dvh)), no para una imagen de alta resolución.
const REEL_W = 390;
const REEL_H = 693;

export default function LayoutEstateElite({ fichaAvaluo, asesor, slidesFotos }) {
  const ficha = {
    ...fichaAvaluo,
    fotos: (slidesFotos?.length ? slidesFotos : fichaAvaluo?.fotos) || [],
  };

  return (
    <div style={{ width: REEL_W, height: REEL_H, position: "relative", overflow: "hidden", flexShrink: 0, background: "#051b12" }}>
      <PromoReelEstateElite ficha={ficha} asesor={asesor} />
    </div>
  );
}
