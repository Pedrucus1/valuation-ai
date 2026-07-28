import {
  Waves, Dumbbell, Shield, Home, Trees, Sun, Wine, Wind, Car, Monitor, Box,
  Droplets, Zap, Camera, Wifi, Tv, Utensils, BookOpen, Bed, Gamepad2, Droplet,
} from "lucide-react";

// Iconos de amenidades/instalaciones/espacios — módulo compartido para evitar
// el ciclo de import PromocionesTab.jsx <-> LayoutA4EstateElite2.jsx (ambos
// necesitan esta tabla; PromocionesTab.jsx re-exporta estos mismos arrays por
// compatibilidad con PropiedadManualForm, que ya los importaba de ahí).
export const AMENIDADES_ICONS = [
  { label: "Alberca",            Icon: Waves },    { label: "Gimnasio",           Icon: Dumbbell },
  { label: "Seguridad 24/7",    Icon: Shield },   { label: "Casa Club",          Icon: Home },
  { label: "Jardín",            Icon: Trees },    { label: "Terraza",            Icon: Sun },
  { label: "Cava de Vinos",     Icon: Wine },     { label: "Aire Acondicionado", Icon: Wind },
  { label: "Cochera 2 autos",   Icon: Car },      { label: "Smart Home",         Icon: Monitor },
  { label: "Elevador",          Icon: Box },      { label: "Área de mascotas",   Icon: Trees },
];
export const INSTALACIONES_ICONS = [
  { label: "Paneles Solares",        Icon: Sun },      { label: "Cisterna 10,000L",  Icon: Droplets },
  { label: "Generador",             Icon: Zap },      { label: "Circuito Cerrado",  Icon: Camera },
  { label: "Domótica",              Icon: Monitor },  { label: "Calentador Solar",  Icon: Sun },
  { label: "Gas Estacionario",      Icon: Zap },      { label: "Fibra Óptica",      Icon: Wifi },
];
export const ESPACIOS_ICONS = [
  { label: "Sala de TV",    Icon: Tv },        { label: "Comedor",          Icon: Utensils },
  { label: "Cocina Integral", Icon: Utensils },{ label: "Estudio",          Icon: BookOpen },
  { label: "Cuarto de Servicio", Icon: Bed }, { label: "Bodega",           Icon: Box },
  { label: "Sala de Juegos", Icon: Gamepad2 }, { label: "Spa",              Icon: Droplet },
];
