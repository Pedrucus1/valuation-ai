import React, { useState } from "react";
import PromoReelEstateElite from "./PromoReelEstateElite";

// Adaptador: traduce las props genéricas del Diseñador (fichaAvaluo/asesor/slidesFotos)
// al shape que espera PromoReelEstateElite (ficha/asesor), sin tocar ese componente
// para no afectar su uso en PromoPublicPage.jsx.
// Ancho de teléfono real (no 1080 de export estático): PromoReelEstateElite tiene sus
// tamaños de fuente calibrados para el ancho de pantalla de un celular (~390px, como en
// PromoPublicPage.jsx: width: min(100vw, 56.25dvh)), no para una imagen de alta resolución.
const REEL_W = 390;
const REEL_H = 693;

// Post 1:1 y Facebook reutilizan EXACTAMENTE el mismo diseño del reel (mismo texto,
// tipografía, iconos) — se escala y centra dentro del lienzo del formato, con el fondo
// de la hoja activa extendido a los costados (letterbox), en vez de rehacer el CSS de
// cada hoja por formato. ponytail: relleno sólido, no blur de foto — mejora futura si
// el resultado se ve muy vacío en Facebook (letterbox ancho por ser 16:9-ish contra 9:16).
const CANVAS = {
  reel_ee: [REEL_W, REEL_H],
  post_ee: [1080, 1080],
  fb_ee: [1200, 628],
};

export default function LayoutEstateElite({ fichaAvaluo, asesor, slidesFotos, amenidades, activeSlide, onSlideChange, onSlideCountChange, formato }) {
  const ficha = {
    ...fichaAvaluo,
    fotos: (slidesFotos?.length ? slidesFotos : fichaAvaluo?.fotos) || [],
    amenidades: (amenidades?.length ? amenidades : fichaAvaluo?.amenidades) || [],
  };

  const [bg, setBg] = useState("#051b12");
  const [canvasW, canvasH] = CANVAS[formato] || CANVAS.reel_ee;
  const scale = Math.min(canvasW / REEL_W, canvasH / REEL_H);
  const scaledW = REEL_W * scale;
  const scaledH = REEL_H * scale;

  return (
    <div id="pv-ficha-root" style={{ width: canvasW, height: canvasH, position: "relative", overflow: "hidden", flexShrink: 0, background: bg, transition: "background .2s ease" }}>
      <div style={{ position: "absolute", left: (canvasW - scaledW) / 2, top: (canvasH - scaledH) / 2, width: REEL_W, height: REEL_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <PromoReelEstateElite
          ficha={ficha} asesor={asesor}
          activeSlide={activeSlide} onSlideChange={onSlideChange} onSlideCountChange={onSlideCountChange}
          onBgChange={(modo) => setBg(modo === "light" ? "#f7f5f0" : "#051b12")}
        />
      </div>
    </div>
  );
}
