import React from "react";
import LayoutFichaTecnica from "./LayoutFichaTecnica";

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

const PALETAS_DEMO = {
  PropValu: { bg: "#1B4332", accent: "#52B788", textLight: "#D9ED92", card: "#fff", textDark: "#1B4332", muted: "#4a7c59" },
  Marino: { bg: "#1a2744", accent: "#4a90d9", textLight: "#e8f0fe", card: "#fff", textDark: "#1a2744", muted: "#4a6fa5" },
  Noir: { bg: "#0D0D0D", accent: "#d4af37", textLight: "#f5f5f5", card: "#1a1a1a", textDark: "#fff", muted: "#a0a0a0" },
  Oro: { bg: "#2F3527", accent: "#B08B4F", textLight: "#F4EFE4", card: "#F4EFE4", textDark: "#2A2A24", muted: "#6E6A5C" },
};

const SAMPLE_FOTOS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=80",
];

const SAMPLE_FICHA = {
  valor: 4850000,
  tipo: "Casa",
  direccion: "Colonia Narvarte, Cto. Sur",
  colonia: "Narvarte",
  municipio: "Ciudad de México",
  m2_construccion: 150,
  m2_terreno: 220,
  recamaras: 3,
  banos: 2.5,
  estacionamiento: 2,
  niveles: 2,
  antiguedad: 3,
  conservacion: "Excelente",
  fotos: SAMPLE_FOTOS,
  url_recorrido: "https://example.com/tour",
};

export default {
  title: "Promociones/LayoutFichaTecnica",
  component: LayoutFichaTecnica,
  argTypes: {
    palette: {
      options: Object.keys(PALETAS_DEMO),
      mapping: PALETAS_DEMO,
      control: { type: "select" },
    },
    idioma: {
      options: ["es", "en"],
      control: { type: "radio" },
    },
  },
};

const Template = (args) => (
  <LayoutFichaTecnica
    fichaAvaluo={SAMPLE_FICHA}
    formatMXN={formatMXN}
    session={{ user: { name: "Nombre Apellido", email: "asesor@propvalu.mx", phone: "155 250 5544" } }}
    descripcionTexto="Excelente residencia ubicada en zona privada, con acabados de primer nivel, amplios espacios y gran iluminación natural. Cuenta con jardín, terraza y área de servicio independiente."
    amenidades={["Alberca", "Gimnasio equipado", "Seguridad 24/7"]}
    instalaciones={["Aire acondicionado", "Paneles solares"]}
    espacios={["Cava de vinos", "Terraza con grill"]}
    puntosDestacados={[
      { texto: "Escrituras en regla", verificado: true },
      { texto: "Libre de gravamen", verificado: true },
    ]}
    {...args}
  />
);

export const PropValu = Template.bind({});
PropValu.args = { palette: "PropValu", idioma: "es" };

export const Marino = Template.bind({});
Marino.args = { palette: "Marino", idioma: "es" };

export const Noir = Template.bind({});
Noir.args = { palette: "Noir", idioma: "es" };
