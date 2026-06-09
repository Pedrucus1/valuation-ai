// Utilidades de contraste para las paletas de fichas.

// Luminancia percibida (0-255). >150 = color claro.
export const esClaro = (hex = "#000") => {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
};

// Color de texto legible SOBRE un fondo dado.
export const sobreFondo = (bg) => (esClaro(bg) ? "#1a1a1a" : "#ffffff");

// Color de "tinta" para títulos sobre fondo CLARO (blanco de la página):
// si el color de marca es muy claro (beige), usa un tono oscuro derivado.
export const tinta = (brand, fallbackDark = "#1a1a1a") => (esClaro(brand) ? fallbackDark : brand);

// Normaliza una paleta agregando campos derivados de contraste.
export const normalizarPaleta = (p = {}) => {
  const bg = p.bg || "#1B4332";
  return {
    bg,
    accent: p.accent || "#52B788",
    textLight: p.textLight || "#D9ED92",
    card: p.card || "#fff",
    textDark: p.textDark || "#1B4332",
    muted: p.muted || "#4a7c59",
    onBg: sobreFondo(bg),                       // texto legible sobre bg
    ink: tinta(bg, p.textDark || "#1a1a1a"),    // títulos sobre fondo claro
    bgEsClaro: esClaro(bg),
  };
};
