import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft, Download, MapPin, Home, Sparkles, Image as ImageIcon,
  Waves, Dumbbell, Shield, Trees, Sun, Wine, Wind, Car, Monitor,
  Box, Droplets, Zap, Camera, Wifi, Tv, Utensils, BookOpen, Bed,
  Gamepad2, Droplet, Plus, X, CheckCircle2, Building2, AlertCircle,
  ChevronRight, ZoomIn, ZoomOut, LayoutTemplate, Palette, DollarSign, Type, Star, Eye, User, Link2
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { DESCRIPTIONS_CATALOG } from "../../../utils/descriptionsCatalog";

import LayoutClasico from "./promociones/LayoutClasico";
import LayoutFichaTecnica from "./promociones/LayoutFichaTecnica";
import LayoutModerno from "./promociones/LayoutModerno";
import LayoutMinimalista from "./promociones/LayoutMinimalista";
import LayoutUltraLujo from "./promociones/LayoutUltraLujo";
import LayoutStitch from "./promociones/LayoutStitch";
import LayoutStitchHub from "./promociones/LayoutStitchHub";
import LayoutJustListed from "./promociones/LayoutJustListed";
import LayoutEstateElite from "./promociones/LayoutEstateElite";
import SecuenciasJustListed from "./promociones/SecuenciasJustListed";
import { exportSecuenciasGif, exportSecuenciasJpg, exportSecuenciasVideo } from "./promociones/secuenciasGif";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

// ── Paletas de color (hex → inline styles) ──────────────────────────────────
const PALETAS = [
  { id: "verde",  nombre: "PropValu", bg: "#1B4332", accent: "#52B788", textLight: "#D9ED92", card: "#fff", textDark: "#1B4332", muted: "#4a7c59" },
  { id: "marino", nombre: "Marino",   bg: "#1a2744", accent: "#4a90d9", textLight: "#e8f0fe", card: "#fff", textDark: "#1a2744", muted: "#4a6fa5" },
  { id: "noir",   nombre: "Noir",     bg: "#0D0D0D", accent: "#d4af37", textLight: "#f5f5f5", card: "#1a1a1a",textDark: "#fff",  muted: "#a0a0a0" },
  { id: "beige",  nombre: "Arena",    bg: "#f5f0e8", accent: "#8b6914", textLight: "#fff",    card: "#faf8f3",textDark: "#2c2010",muted: "#8b7355" },
  { id: "rojo",   nombre: "Pasión",   bg: "#7b1c1c", accent: "#e74c3c", textLight: "#fde8e8", card: "#fff",  textDark: "#7b1c1c",muted: "#a05252" },
  { id: "oro",    nombre: "Oro",      bg: "#2F3527", accent: "#B08B4F", textLight: "#F4EFE4", card: "#F4EFE4",textDark: "#2A2A24",muted: "#6E6A5C" },
  { id: "carbon", nombre: "Carbón",   bg: "#1f2937", accent: "#c99a4b", textLight: "#f3f4f6", card: "#f7f7f5",textDark: "#111827",muted: "#6b7280" },
  { id: "vino",   nombre: "Vino",     bg: "#4a1420", accent: "#b0778a", textLight: "#f7ecef", card: "#faf6f7",textDark: "#3a1018",muted: "#8a6b73" },
  { id: "cielo",  nombre: "Cielo",    bg: "#0e4a52", accent: "#4ea0a8", textLight: "#eaf6f7", card: "#f4fafb",textDark: "#0a3238",muted: "#5a8288" },
];

// ── Temas (backward compat con layouts existentes) ──────────────────────────
const TEMAS = {
  classic:         { nombre: "Clásico",           bgRoot: "bg-slate-50", bgPage: "bg-white", bgAccent: "bg-[#F0FAF5]", textPri: "text-[#1B4332]", textSec: "text-slate-600", accent: "text-[#52B788]", heroGrad: "from-[#1B4332] to-[#2D6A4F]" },
  minimalist:      { nombre: "Minimalista",        bgRoot: "bg-white", bgPage: "bg-white", bgAccent: "bg-slate-50", textPri: "text-slate-900", textSec: "text-slate-500", accent: "text-blue-500", heroGrad: "from-slate-100 to-white" },
  luxury:          { nombre: "Noir (Ultra Lujo)",  bgRoot: "bg-zinc-950", bgPage: "bg-zinc-900", bgAccent: "bg-zinc-800", textPri: "text-white", textSec: "text-zinc-400", accent: "text-yellow-500", heroGrad: "from-zinc-950 to-zinc-900" },
  stitch_obsidian: { nombre: "Obsidian",           bgRoot: "bg-[#0D0D0D]", bgPage: "bg-black", bgAccent: "bg-gray-800", textPri: "text-white", textSec: "text-slate-300", accent: "text-amber-500", heroGrad: "from-black to-slate-900" },
  stitch_new:      { nombre: "Colección AI",       bgRoot: "bg-white", bgPage: "bg-white", bgAccent: "bg-gray-50", textPri: "text-gray-900", textSec: "text-gray-600", accent: "text-amber-600", heroGrad: "from-gray-900 to-gray-700" },
};

// Fotos de referencia para preview cuando no hay fotos reales
const SAMPLE_FOTOS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80",
];

const THUMBS = {
  stitch_gallery:   "https://lh3.googleusercontent.com/aida/AP1WRLvgu7q23LuhYb2qgjCcE_nOpubjwtm5pWSdu52H3ZHVCi5LjOhO2aEUx-5yU1ThSSuRq_PdlBrDu39LdUALTgWVRDNXc3LMU29kIiVpDsvL6_2vSfKsp51Dgs_H7IUiGaCfFoT85zfk8Y9bAlSDJrHTiwQob05Xxcf00HMdwqVNhmvvEVoo3pVZtegIUptRd3Tgs-l_atJ4Ldhb1aErVoYBACAFbDlrD6smdfY7AMWywtDa-N4fCXGOaELe",
  stitch_obsidian:  "https://lh3.googleusercontent.com/aida/AP1WRLsjKpobbO1c3mYio6ROYIY4bs1VNd2ug53dHgz1S1WviWW9eGpG1ikQFy3eLmBL4FTw6Obctxlas7r1F1L-fI7Bt2y_PaSrK8PJbOT4ITorjJQGM9iLMopT7klFGrj80VodqhBk_Dk6bNdJSZo4Io08vwOlYQpR-WJsEG372gZc510MMeCYdaSo3s6lzrUyO1kmukK0BdawURiu3Aoc6N4F1X9SLWLAdYvFbC40-DKvKqTEBMwanwmEVW79",
};

const TEMA_THUMB = {
  classic:         { bg: "#1B4332", accent: "#52B788", foto: SAMPLE_FOTOS[0] },
  minimalist:      { bg: "#1e293b", accent: "#3b82f6", foto: SAMPLE_FOTOS[2] },
  luxury:          { bg: "#0D0D0D", accent: "#d4af37", foto: SAMPLE_FOTOS[4] },
  stitch_obsidian: { bg: "#0D0D0D", accent: "#f59e0b", foto: THUMBS.stitch_obsidian },
  stitch_new:      { bg: "#111827", accent: "#d97706", foto: THUMBS.stitch_gallery },
  moderno:         { bg: "#1B4332", accent: "#52B788", foto: SAMPLE_FOTOS[5] },
  just_listed:     { bg: "#2F3527", accent: "#B08B4F", foto: SAMPLE_FOTOS[3] },
  estateelite:     { bg: "#051b12", accent: "#e9c176", foto: SAMPLE_FOTOS[1] },
};

const LayoutThumb = ({ temaId, nombre }) => {
  const t = TEMA_THUMB[temaId] || TEMA_THUMB.classic;
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Foto de fondo */}
      <img src={t.foto} alt={nombre} className="absolute inset-0 w-full h-full object-cover" />
      {/* Franja superior con color de marca */}
      <div className="absolute top-0 left-0 right-0 h-[38%]"
        style={{ background: `linear-gradient(to bottom, ${t.bg}ee, ${t.bg}88)` }} />
      {/* Precio simulado en la franja */}
      <div className="absolute top-2 left-2 right-2">
        <div className="text-white font-black text-[8px] opacity-80 mb-0.5" style={{ fontFamily: "Outfit, sans-serif", letterSpacing: -0.3 }}>$4,850,000</div>
        <div className="h-[3px] rounded w-14" style={{ background: t.accent }} />
      </div>
      {/* Barra de specs en el medio */}
      <div className="absolute left-2 right-2" style={{ top: "40%" }}>
        <div className="flex gap-1">
          {["150m²","3 rec","2.5 b"].map((s, i) => (
            <div key={i} className="flex-1 rounded text-[5px] font-bold text-center py-0.5"
              style={{ background: t.bg + "dd", color: t.accent }}>
              {s}
            </div>
          ))}
        </div>
      </div>
      {/* Gradiente inferior + nombre */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
        <span className="text-[9px] font-bold text-white drop-shadow">{nombre}</span>
        <div className="w-3 h-3 rounded-sm" style={{ background: t.accent }} />
      </div>
    </div>
  );
};

// Formatos disponibles por estilo (para los pills del diseñador)
const FORMATOS = {
  stitch_new: [
    ["stitch_gallery", "A4 · Gallery"], ["stitch_letter", "A4 · Carta"], ["stitch_asymmetry", "A4 · Asymmetry"],
    ["stitch_facebook", "Facebook 3:2"], ["stitch_tiktok", "Reels 9:16"], ["stitch_kit", "Marketing Kit"],
  ],
  moderno: [["vertical_2p", "Folleto A4"], ["horizontal", "Ficha Carta"], ["reels", "TikTok / Reels"], ["post", "Post 1:1"]],
  just_listed: [["vertical_2p", "Folleto A4"], ["post", "Post 1:1"], ["post3", "Post · 3 slides"], ["reels", "Story / Reels"], ["tiktok", "TikTok · 3 slides"], ["horizontal", "Facebook"]],
  estateelite: [["reel_ee", "Reel 9:16"], ["post_ee", "Post 1:1"], ["fb_ee", "Facebook"]],
  _default: [["vertical_2p", "Folleto A4"], ["horizontal", "Presentación 16:9"], ["reels", "TikTok / Reels"], ["post", "Post 1:1"]],
};
const formatosDe = (t) => FORMATOS[t] || FORMATOS._default;

// Secciones del rail tipo Canva (cada ícono abre su panel; sin scroll largo)
const SECCIONES = [
  { id: "estilo",     label: "Estilo y formato",     short: "Estilo",  Icon: LayoutTemplate },
  { id: "color",      label: "Paleta de color",      short: "Color",   Icon: Palette },
  { id: "fotos",      label: "Fotos del anuncio",    short: "Fotos",   Icon: ImageIcon },
  { id: "precio",     label: "Precio a mostrar",     short: "Precio",  Icon: DollarSign },
  { id: "texto",      label: "Descripción e idioma", short: "Texto",   Icon: Type },
  { id: "puntos",     label: "Puntos destacados",    short: "Puntos",  Icon: Star },
  { id: "amenidades", label: "Amenidades y extras",  short: "Extras",  Icon: Sparkles },
  { id: "asesor",     label: "Datos del asesor",     short: "Asesor",  Icon: User },
  { id: "elementos",  label: "Qué mostrar",          short: "Mostrar", Icon: Eye },
];

// Tipografía de títulos (Just Listed) — fuentes de sistema, ~20 opciones
const FUENTES = [
  { label: "Editorial (Didot)", css: '"Didot","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif' },
  { label: "Playfair", css: '"Playfair Display",Georgia,serif' },
  { label: "Georgia", css: "Georgia,serif" },
  { label: "Times", css: '"Times New Roman",Times,serif' },
  { label: "Garamond", css: 'Garamond,"EB Garamond",serif' },
  { label: "Baskerville", css: 'Baskerville,"Libre Baskerville",serif' },
  { label: "Bodoni", css: '"Bodoni MT","Didot",serif' },
  { label: "Cambria", css: "Cambria,Georgia,serif" },
  { label: "Palatino", css: '"Palatino Linotype","Book Antiqua",Palatino,serif' },
  { label: "Cormorant", css: '"Cormorant Garamond",Georgia,serif' },
  { label: "Helvetica", css: '"Helvetica Neue",Helvetica,Arial,sans-serif' },
  { label: "Arial", css: "Arial,sans-serif" },
  { label: "Futura", css: 'Futura,"Century Gothic",sans-serif' },
  { label: "Century Gothic", css: '"Century Gothic",Futura,sans-serif' },
  { label: "Trebuchet", css: '"Trebuchet MS",sans-serif' },
  { label: "Verdana", css: "Verdana,Geneva,sans-serif" },
  { label: "Segoe UI", css: '"Segoe UI",Roboto,sans-serif' },
  { label: "Optima", css: 'Optima,"Segoe UI",sans-serif' },
  { label: "Gill Sans", css: '"Gill Sans","Gill Sans MT",sans-serif' },
  { label: "Tahoma", css: "Tahoma,Geneva,sans-serif" },
];

// Colores individuales por elemento (Just Listed) — override sobre la paleta
const COLOR_CAMPOS = [
  { key: "bg",     label: "Fondo",              def: "#F4EFE4" },
  { key: "ink",    label: "Texto",              def: "#2A2A24" },
  { key: "accent", label: "Acento (líneas/íconos)", def: "#B08B4F" },
  { key: "dark",   label: "Recuadros / Footer", def: "#2F3527" },
  { key: "onDark", label: "Texto sobre oscuro", def: "#FCFAF4" },
];

// Bloques que se pueden mostrar/ocultar en la ficha (Just Listed)
const ELEMENTOS_TOGGLE = [
  { key: "descripcion",      label: "Descripción" },
  { key: "especificaciones", label: "Características (m², rec, baños…)" },
  { key: "amenidades",       label: "Amenidades e instalaciones" },
  { key: "puntos",           label: "Puntos destacados" },
];

const getLayoutComponent = (temaId) => {
  if (temaId === "just_listed") return LayoutJustListed;
  if (temaId === "stitch_new") return LayoutStitchHub;
  if (temaId === "stitch_obsidian") return LayoutStitch;
  if (temaId === "luxury") return LayoutUltraLujo;
  if (temaId === "minimalist") return LayoutMinimalista;
  if (temaId === "moderno") return LayoutModerno;
  if (temaId === "estateelite") return LayoutEstateElite;
  return LayoutClasico;
};

// Normaliza cualquier propiedad (OPI o manual) al formato que usan los layouts
const normalizar = (v) => {
  if (!v) return null;
  const fotos = (v.fotos?.length ? v.fotos : SAMPLE_FOTOS).filter(Boolean);
  if (v.origen === "manual") {
    return {
      ...v,
      fotos,
      id: v.propiedad_id,
      valor: v.precio_oferta,
      valores: { maximo: v.precio_oferta, medio: v.precio_oferta, minimo: v.precio_oferta },
      construccion: v.m2_construccion,
      terreno: v.m2_terreno,
      cajones: v.estacionamiento,
      colonia: v.colonia || v.municipio,
      _esManual: true,
    };
  }
  return { ...v, fotos, _esManual: false };
};

// ── Iconos de amenidades ─────────────────────────────────────────────────────
const AMENIDADES_ICONS = [
  { label: "Alberca",            Icon: Waves },    { label: "Gimnasio",           Icon: Dumbbell },
  { label: "Seguridad 24/7",    Icon: Shield },   { label: "Casa Club",          Icon: Home },
  { label: "Jardín",            Icon: Trees },    { label: "Terraza",            Icon: Sun },
  { label: "Cava de Vinos",     Icon: Wine },     { label: "Aire Acondicionado", Icon: Wind },
  { label: "Cochera 2 autos",   Icon: Car },      { label: "Smart Home",         Icon: Monitor },
  { label: "Elevador",          Icon: Box },      { label: "Área de mascotas",   Icon: Trees },
];
const INSTALACIONES_ICONS = [
  { label: "Paneles Solares",        Icon: Sun },      { label: "Cisterna 10,000L",  Icon: Droplets },
  { label: "Generador",             Icon: Zap },      { label: "Circuito Cerrado",  Icon: Camera },
  { label: "Domótica",              Icon: Monitor },  { label: "Calentador Solar",  Icon: Sun },
  { label: "Gas Estacionario",      Icon: Zap },      { label: "Fibra Óptica",      Icon: Wifi },
];
const ESPACIOS_ICONS = [
  { label: "Sala de TV",    Icon: Tv },        { label: "Comedor",          Icon: Utensils },
  { label: "Cocina Integral", Icon: Utensils },{ label: "Estudio",          Icon: BookOpen },
  { label: "Cuarto de Servicio", Icon: Bed }, { label: "Bodega",           Icon: Box },
  { label: "Sala de Juegos", Icon: Gamepad2 }, { label: "Spa",              Icon: Droplet },
];

// Fotos de referencia para preview cuando no hay fotos reales
const PROP_DEMO = {
  propiedad_id: "demo",
  origen: "manual",
  tipo: "Casa",
  direccion: "Av. Vallarta 1234, Col. Arcos",
  colonia: "Arcos",
  municipio: "Zapopan",
  estado_mx: "Jalisco",
  precio_oferta: 4850000,
  m2_construccion: 220,
  m2_terreno: 300,
  recamaras: 3,
  banos: 2.5,
  estacionamiento: 2,
  antiguedad: 2,
  conservacion: "Excelente",
  fotos: SAMPLE_FOTOS,
  amenidades: ["Alberca", "Gimnasio", "Seguridad 24/7", "Jardín"],
  instalaciones: ["Paneles Solares", "Cisterna 10,000L"],
  espacios: ["Sala de TV", "Cocina Integral", "Estudio"],
  descripcion: "Residencia contemporánea de lujo en una de las zonas más exclusivas. Acabados premium, dobles alturas y amplio jardín privado.",
  puntos_libres: [],
  puntos_propvalu: ["Precio competitivo en la zona", "Construcción reciente"],
  fuera_de_mercado: false,
  activo: true,
  _demo: true,
};

const FORM_INIT = {
  tipo: "Casa", direccion: "", colonia: "", municipio: "", estado_mx: "Jalisco",
  precio_oferta: "", m2_construccion: "", m2_terreno: "",
  recamaras: "", banos: "", medio_banos: "", estacionamiento: "",
  niveles: "", nivel_depto: "", antiguedad: "", conservacion: "",
  fotos: ["", "", ""], url_recorrido: "", descripcion: "",
  amenidades: [], instalaciones: [], espacios: [], puntos_libres: ["", ""],
};

const toggleArr = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

const toggleStr = (str, label) => {
  if (!str) return label;
  const items = str.split(",").map(s => s.trim()).filter(Boolean);
  return items.includes(label) ? items.filter(i => i !== label).join(", ") : str + ", " + label;
};

// ────────────────────────────────────────────────────────────────────────────
const PromocionesTab = ({ valuacionesList, session }) => {
  // ── Propiedades manuales ──
  const [propiedadesManual, setPropiedadesManual] = useState([]);
  const [cargandoProps, setCargandoProps] = useState(true);

  // ── UI flow ──
  const [fichaAvaluo, setFichaAvaluo] = useState(null);  // propiedad normalizada seleccionada
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState(FORM_INIT);
  const [guardando, setGuardando] = useState(false);
  const [bannerMercado, setBannerMercado] = useState(false);

  // ── Design state ──
  const [paletaId, setPaletaId] = useState("verde");
  const [temaSeleccionado, setTemaSeleccionado] = useState("classic");
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("vertical_2p");
  const [hojaActiva, setHojaActiva] = useState(1);
  const [zoom, setZoom] = useState(0.5);
  const previewBoxRef = useRef(null); // contenedor scrollable del visualizador, para el auto-ajuste de zoom
  const [secuencias, setSecuencias] = useState(false);
  // Navegación de hojas dinámicas de EstateElite (Portada/Características/Descripción/Puntos/Galería/Contacto)
  const [estateEliteSlide, setEstateEliteSlide] = useState(0);
  const [estateEliteSlideCount, setEstateEliteSlideCount] = useState(1);
  const [gifProgress, setGifProgress] = useState(null); // null | 0-100
  const [seccionActiva, setSeccionActiva] = useState("estilo"); // rail tipo Canva
  const [fotosElegidas, setFotosElegidas] = useState([]); // fotos ordenadas para la ficha (1ª = portada)
  const [elementos, setElementos] = useState({ descripcion: true, especificaciones: true, amenidades: true, puntos: true });
  const [coloresCustom, setColoresCustom] = useState({}); // override de color por elemento (Just Listed)
  const [asesorCfg, setAsesorCfg] = useState({ fuente: "asesor", mostrarFoto: true, mostrarNombre: true }); // fuente: asesor | empresa
  const [precioBg, setPrecioBg] = useState("solido"); // solido | transparente | nulo
  const [fuente, setFuente] = useState(FUENTES[0].css); // tipografía de títulos
  const [ctaTexto, setCtaTexto] = useState(""); // texto del botón CTA (vacío = default por idioma)
  const [slidesFotos, setSlidesFotos] = useState(0); // # de slides de fotos en mosaico (TikTok)
  const [idioma, setIdioma] = useState("es");
  const [tipoPrecio, setTipoPrecio] = useState("oferta");
  const [precioAjustado, setPrecioAjustado] = useState("");
  const [descripcionTexto, setDescripcionTexto] = useState("");
  const [amenidadesStr, setAmenidadesStr] = useState("Alberca, Gimnasio, Seguridad 24/7");
  const [instalacionesStr, setInstalacionesStr] = useState("Paneles Solares, Cisterna 10,000L");
  const [espaciosStr, setEspaciosStr] = useState("Sala de TV, Cocina Integral, Estudio");
  const [puntosLibres, setPuntosLibres] = useState(["", ""]);

  // ── Fetch propiedades manuales ──
  useEffect(() => {
    const fetchProps = async () => {
      try {
        const res = await fetch(`${API}/api/inmobiliaria/propiedades`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPropiedadesManual(data.propiedades || []);
        }
      } catch { /* sin props manuales */ } finally {
        setCargandoProps(false);
      }
    };
    fetchProps();
  }, []);

  // ── Auto-relleno al seleccionar propiedad ──
  useEffect(() => {
    if (!fichaAvaluo) return;
    const parseField = (f, fb) => Array.isArray(f) ? f.join(", ") : (typeof f === "string" ? f : fb);
    setAmenidadesStr(parseField(fichaAvaluo.amenidades, "Alberca, Gimnasio, Seguridad 24/7"));
    setInstalacionesStr(parseField(fichaAvaluo.instalaciones, "Paneles Solares, Cisterna 10,000L"));
    setEspaciosStr(parseField(fichaAvaluo.espacios, "Sala de TV, Cocina Integral, Estudio"));
    setPrecioAjustado((fichaAvaluo.valor || fichaAvaluo.precio_oferta || "").toString());
    setFotosElegidas((fichaAvaluo.fotos || []).filter(Boolean));
    setPuntosLibres(fichaAvaluo.puntos_libres?.length ? [...fichaAvaluo.puntos_libres, ""].slice(0, 2) : ["", ""]);
    if (fichaAvaluo.fuera_de_mercado) setBannerMercado(true);
    else setBannerMercado(false);
    setEstateEliteSlide(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaAvaluo]);

  // Al cambiar de estilo, regresar a la primera hoja de EstateElite
  useEffect(() => { setEstateEliteSlide(0); }, [temaSeleccionado]);

  // Auto-ajuste de zoom al cambiar de estilo/formato/propiedad: cada formato tiene un
  // tamaño real distinto (Reel 693px alto, Post 1:1 1080px, A4 1123px, etc.) y un zoom
  // fijo (50%) no cabe igual de bien en todos — se calcula el zoom que sí quepa completo
  // en el visualizador, midiendo el tamaño real de #pv-ficha-root (genérico: sirve para
  // cualquier estilo/formato actual o futuro, no hace falta una tabla de tamaños a mano).
  // ponytail: no reacciona a resize de ventana, solo a cambio de estilo/formato/propiedad.
  useEffect(() => {
    if (!fichaAvaluo) return;
    const fit = () => {
      const box = previewBoxRef.current;
      const elId = tieneHoja2 && hojaActiva === 2 ? "pv-ficha-tecnica-root" : "pv-ficha-root";
      const el = document.getElementById(elId);
      if (!box || !el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nativeW = rect.width / zoom;
      const nativeH = rect.height / zoom;
      const availW = box.clientWidth - 32; // p-4 = 16px por lado
      const availH = box.clientHeight - 32;
      if (availW <= 0 || availH <= 0) return;
      const fitZoom = Math.max(0.15, Math.min(availW / nativeW, availH / nativeH, 1));
      setZoom(Math.round(fitZoom * 100) / 100);
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(fit));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaSeleccionado, formatoSeleccionado, fichaAvaluo?.propiedad_id]);

  const handleGenerarDescripcion = useCallback(() => {
    const src = fichaAvaluo || {};
    const rand = DESCRIPTIONS_CATALOG[Math.floor(Math.random() * DESCRIPTIONS_CATALOG.length)];
    setDescripcionTexto(
      rand
        .replace(/{tipo}/g, (src.tipo || "propiedad").toLowerCase())
        .replace(/{direccion}/g, src.direccion || "")
        .replace(/{m2_construccion}/g, src.m2_construccion || src.construccion || "X")
        .replace(/{recamaras}/g, src.recamaras || "X")
        .replace(/{banos}/g, src.banos || "X")
    );
  }, [fichaAvaluo]);

  // ── Guardar propiedad manual ──
  const handleGuardar = async () => {
    if (!formData.direccion.trim()) { toast.error("La dirección es requerida"); return; }
    if (!formData.precio_oferta) { toast.error("El precio de oferta es requerido"); return; }
    setGuardando(true);
    try {
      const body = {
        ...formData,
        precio_oferta: parseFloat(formData.precio_oferta),
        m2_construccion: formData.m2_construccion ? parseFloat(formData.m2_construccion) : null,
        m2_terreno: formData.m2_terreno ? parseFloat(formData.m2_terreno) : null,
        recamaras: formData.recamaras ? parseInt(formData.recamaras) : null,
        banos: formData.banos ? parseFloat(formData.banos) : null,
        medio_banos: formData.medio_banos ? parseInt(formData.medio_banos) : null,
        estacionamiento: formData.estacionamiento ? parseInt(formData.estacionamiento) : null,
        antiguedad: formData.antiguedad ? parseInt(formData.antiguedad) : null,
        fotos: formData.fotos.filter(Boolean),
        puntos_libres: formData.puntos_libres.map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch(`${API}/api/inmobiliaria/propiedades`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      const nueva = data.propiedad;
      setPropiedadesManual(prev => [nueva, ...prev]);
      toast.success("Propiedad guardada");
      setMostrarFormulario(false);
      setPaso(1);
      setFormData(FORM_INIT);
      setFichaAvaluo(normalizar(nueva));
    } catch (e) { toast.error(e.message || "Error al guardar la propiedad"); }
    finally { setGuardando(false); }
  };

  // ── Export ──
  const waitFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const descargarJPGDe = async (elId, sufijo) => {
    const el = document.getElementById(elId);
    if (!el) return false;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `Ficha_${(fichaAvaluo?.direccion || "propiedad").replace(/\s+/g, "_")}_${sufijo}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
    return true;
  };

  const exportarFicha = async (modo = "pdf") => {
    const hasHoja2 = temaSeleccionado === "classic" && formatoSeleccionado === "vertical_2p";
    const elId = hasHoja2 && hojaActiva === 2 ? "pv-ficha-tecnica-root" : "pv-ficha-root";
    if (modo === "jpg") {
      // El zoom del preview usa CSS "zoom" (no estándar) y html2canvas no lo soporta bien:
      // duplica el contenido a dos escalas superpuestas. Se captura siempre a zoom 1.
      // Además: si el estilo tiene varias hojas (EstateElite dinámico, Clásico H1+H2),
      // se descarga una imagen por cada una — no solo la que está a la vista.
      const zoomPrevio = zoom;
      if (zoomPrevio !== 1) { setZoom(1); await waitFrame(); }
      try {
        if (temaSeleccionado === "estateelite") {
          const slidePrevio = estateEliteSlide;
          for (let i = 0; i < estateEliteSlideCount; i++) {
            setEstateEliteSlide(i);
            await waitFrame();
            await descargarJPGDe("pv-ficha-root", `H${i + 1}`);
          }
          setEstateEliteSlide(slidePrevio);
        } else if (hasHoja2) {
          const hojaPrevia = hojaActiva;
          setHojaActiva(1); await waitFrame();
          await descargarJPGDe("pv-ficha-root", "H1");
          setHojaActiva(2); await waitFrame();
          await descargarJPGDe("pv-ficha-tecnica-root", "H2");
          setHojaActiva(hojaPrevia);
        } else {
          const ok = await descargarJPGDe(elId, `H${hojaActiva}`);
          if (!ok) throw new Error("elemento no encontrado");
        }
        toast.success("Imagen(es) descargada(s)");
      } catch { toast.error("Error al exportar imagen"); }
      finally { if (zoomPrevio !== 1) setZoom(zoomPrevio); }
      return;
    }
    if (temaSeleccionado === "estateelite") {
      // El reel (390x693, hojas apiladas) no cabe en el mecanismo genérico de
      // window.print() (pensado para hojas A4 sueltas) — se arma un PDF real
      // client-side con una página por hoja, capturando cada una a zoom 1.
      const zoomPrevio = zoom;
      const slidePrevio = estateEliteSlide;
      if (zoomPrevio !== 1) setZoom(1);
      try {
        let doc = null;
        for (let i = 0; i < estateEliteSlideCount; i++) {
          setEstateEliteSlide(i);
          await waitFrame();
          const el = document.getElementById("pv-ficha-root");
          if (!el) continue;
          const canvas = await html2canvas(el, { scale: 2, useCORS: true });
          const img = canvas.toDataURL("image/jpeg", 0.92);
          if (!doc) doc = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
          else doc.addPage([canvas.width, canvas.height]);
          doc.addImage(img, "JPEG", 0, 0, canvas.width, canvas.height);
        }
        if (doc) {
          doc.save(`Reel_${(fichaAvaluo?.direccion || "propiedad").replace(/\s+/g, "_")}.pdf`);
          toast.success("PDF descargado");
        }
      } catch { toast.error("Error al exportar PDF"); }
      finally {
        if (zoomPrevio !== 1) setZoom(zoomPrevio);
        setEstateEliteSlide(slidePrevio);
      }
      return;
    }
    const el = document.getElementById(elId);
    if (!el) return;
    // PDF: incluye ambas hojas si es A4 de 2 páginas
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;overflow:auto;padding:0;margin:0;";
    const h1 = document.getElementById("pv-ficha-root");
    if (h1) {
      const c1 = h1.cloneNode(true);
      c1.style.display = "block";
      wrap.appendChild(c1);
    }
    if (hasHoja2) {
      const h2 = document.getElementById("pv-ficha-tecnica-root");
      if (h2) {
        const sep = document.createElement("div");
        sep.style.cssText = "page-break-before:always;break-before:page;";
        const c2 = h2.cloneNode(true);
        c2.style.display = "block";
        wrap.appendChild(sep);
        wrap.appendChild(c2);
      }
    }
    document.body.appendChild(wrap);
    window.print();
    document.body.removeChild(wrap);
  };

  // ── Promo Interactiva: copia link público del reel EstateElite ──
  const handlePromoInteractiva = async () => {
    const propId = fichaAvaluo?.propiedad_id;
    if (!propId) {
      toast.error("Guarda la propiedad primero (opción “Subir propiedad”) para generar su link.");
      return;
    }
    const url = `${window.location.origin}/promo/${propId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado — pégalo en WhatsApp");
    } catch {
      window.prompt("Copia el link de tu promo:", url);
    }
  };

  // ── Derivados ──
  const avaluosCompletados = (valuacionesList || [])
    .filter(v => v.estado === "completada")
    .map((v, i) => {
      const samples = [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800",
      ];
      return v.fotos?.length ? v : { ...v, fotos: samples.slice(i % 4) };
    });

  const palette = PALETAS.find(p => p.id === paletaId) || PALETAS[0];
  const theme = TEMAS[temaSeleccionado] || TEMAS.classic;
  const LayoutComponent = getLayoutComponent(temaSeleccionado);
  const esFormatoA4 = ["vertical_2p","stitch_gallery","stitch_letter","stitch_asymmetry"].includes(formatoSeleccionado) && temaSeleccionado !== "moderno";
  // Hoja 2 (LayoutFichaTecnica) solo existe para el estilo Clásico en formato A4
  const tieneHoja2 = temaSeleccionado === "classic" && formatoSeleccionado === "vertical_2p";

  const precioFinal = tipoPrecio === "ajustado" && precioAjustado
    ? parseFloat(precioAjustado)
    : fichaAvaluo?.valor || fichaAvaluo?.precio_oferta || 0;

  const puntosVerificados = fichaAvaluo?.puntos_propvalu || [];
  const todosLosPuntos = [
    ...puntosVerificados.map(p => ({ texto: p, verificado: true })),
    ...puntosLibres.filter(Boolean).map(p => ({ texto: p, verificado: false })),
  ];

  const texts = {
    es: { descripcion: "Descripción", caracteristicas: "Características", construccion: "Construcción", terreno: "Terreno", recamaras: "Recámaras", recamaras_val: `${fichaAvaluo?.recamaras || 0} Habs`, banos: "Baños", banos_val: `${fichaAvaluo?.banos || 0} Baños`, entorno: "Entorno (15 min)", asesor: "Asesor Inmobiliario", tecnologia: "Tecnología por" },
    en: { descripcion: "Description", caracteristicas: "Features", construccion: "Built Area", terreno: "Lot Size", recamaras: "Bedrooms", recamaras_val: `${fichaAvaluo?.recamaras || 0} Beds`, banos: "Bathrooms", banos_val: `${fichaAvaluo?.banos || 0} Baths`, entorno: "Surroundings (15 min)", asesor: "Real Estate Agent", tecnologia: "Powered by" },
  }[idioma];

  const fichaConPrecio = fichaAvaluo ? {
    ...fichaAvaluo,
    valor: precioFinal,
    fotos: fotosElegidas.length ? fotosElegidas
      : (fichaAvaluo.fotos?.filter(Boolean).length ? fichaAvaluo.fotos.filter(Boolean) : SAMPLE_FOTOS),
  } : null;

  // Pool de fotos para el selector: las de la propiedad + las de muestra (para siempre tener de dónde elegir)
  const fotosPool = fichaAvaluo
    ? Array.from(new Set([...(fichaAvaluo.fotos || []).filter(Boolean), ...SAMPLE_FOTOS]))
    : [];

  // Datos del asesor a mostrar (precargados de la cuenta): fuente Asesor o Empresa
  const esEmpresa = asesorCfg.fuente === "empresa";
  const asesorFinal = {
    nombre: asesorCfg.mostrarNombre === false ? ""
      : (esEmpresa ? (session?.company_name || session?.empresa_afiliada || "")
        : (session?.name || session?.email?.split("@")[0] || "Asesor Inmobiliario")),
    telefono: esEmpresa
      ? (session?.telefono_empresa || session?.company_phone || session?.phone || "")
      : (session?.phone || session?.telefono || ""),
    foto: asesorCfg.mostrarFoto === false ? null
      : (esEmpresa ? (session?.logo_url || session?.logo_empresa_url || session?.picture || null)
        : (session?.picture || session?.foto_url || null)),
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ── FORMULARIO DE CAPTURA ──
  // ════════════════════════════════════════════════════════════════════════════
  if (mostrarFormulario) {
    const setF = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" onClick={() => { setMostrarFormulario(false); setPaso(1); setFormData(FORM_INIT); }} className="p-2 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-[#1B4332] font-['Outfit']">Nueva Propiedad</h2>
            <p className="text-xs text-slate-400">Paso {paso} de 2 — {paso === 1 ? "Datos generales" : "Fotos y extras"}</p>
          </div>
          <div className="ml-auto flex gap-1">
            {[1,2].map(n => (
              <div key={n} className={`h-1.5 w-8 rounded-full transition-colors ${paso >= n ? "bg-[#52B788]" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>

        {paso === 1 && (
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label-xs">Dirección*</label>
                  <input className="input-base" placeholder="Ej. Av. Vallarta 1234, Col. Arcos" value={formData.direccion} onChange={e => setF("direccion", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Tipo de inmueble*</label>
                  <select className="input-base" value={formData.tipo} onChange={e => setF("tipo", e.target.value)}>
                    {["Casa","Departamento","Terreno","Local Comercial","Oficina","Bodega"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs">Colonia</label>
                  <input className="input-base" placeholder="Colonia" value={formData.colonia} onChange={e => setF("colonia", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Municipio</label>
                  <input className="input-base" placeholder="Zapopan" value={formData.municipio} onChange={e => setF("municipio", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Estado</label>
                  <input className="input-base" placeholder="Jalisco" value={formData.estado_mx} onChange={e => setF("estado_mx", e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="label-xs mb-2 block">Precio de oferta (MXN)*</label>
                <input className="input-base text-lg font-bold" type="number" placeholder="0" value={formData.precio_oferta} onChange={e => setF("precio_oferta", e.target.value)} />
                <p className="text-[10px] text-slate-400 mt-1">PropValu analizará si el precio está acorde al mercado.</p>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">m² Construcción</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.m2_construccion} onChange={e => setF("m2_construccion", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">m² Terreno</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.m2_terreno} onChange={e => setF("m2_terreno", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Recámaras</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.recamaras} onChange={e => setF("recamaras", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Baños</label>
                  <input className="input-base" type="number" step="0.5" placeholder="0" value={formData.banos} onChange={e => setF("banos", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Medios baños</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.medio_banos} onChange={e => setF("medio_banos", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Cajones estac.</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.estacionamiento} onChange={e => setF("estacionamiento", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Antigüedad (años)</label>
                  <input className="input-base" type="number" placeholder="0" value={formData.antiguedad} onChange={e => setF("antiguedad", e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Conservación</label>
                  <select className="input-base" value={formData.conservacion} onChange={e => setF("conservacion", e.target.value)}>
                    <option value="">-- Selecciona --</option>
                    {["Excelente","Bueno","Regular"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paso === 2 && (
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="label-xs mb-2 block">Fotos (hasta 10)</label>
                <div className="grid grid-cols-3 gap-2">
                  {formData.fotos.map((url, i) => (
                    <label key={i} className="relative cursor-pointer group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-[#52B788] transition-colors flex items-center justify-center bg-slate-50">
                      {url
                        ? <img src={url} alt="" className="w-full h-full object-cover" />
                        : <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-[#52B788]">
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase">{i === 0 ? "Principal" : `Foto ${i + 1}`}</span>
                          </div>}
                      {url && (
                        <button type="button" onClick={e => { e.preventDefault(); const next = [...formData.fotos]; next[i] = ""; setF("fotos", next); }}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <input type="file" accept="image/*" className="sr-only"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("fotos", file);
                          try {
                            const res = await fetch(`${API}/api/inmobiliaria/upload-fotos`, { method: "POST", credentials: "include", body: fd });
                            if (!res.ok) throw new Error();
                            const data = await res.json();
                            const next = [...formData.fotos];
                            next[i] = data.urls[0];
                            setF("fotos", next);
                          } catch { toast.error("Error al subir la foto"); }
                        }} />
                    </label>
                  ))}
                  {formData.fotos.length < 10 && (
                    <button type="button" onClick={() => setF("fotos", [...formData.fotos, ""])}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-[#52B788] flex items-center justify-center text-slate-300 hover:text-[#52B788] transition-colors bg-slate-50">
                      <Plus className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="label-xs mb-1 block">URL Recorrido Virtual (opcional)</label>
                <input className="input-base text-xs" placeholder="https://..." value={formData.url_recorrido} onChange={e => setF("url_recorrido", e.target.value)} />
              </div>

              <div>
                <label className="label-xs mb-1 block">Amenidades</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  {AMENIDADES_ICONS.map(({ label, Icon }) => {
                    const active = formData.amenidades.includes(label);
                    return (
                      <button key={label} title={label}
                        onClick={() => setF("amenidades", toggleArr(formData.amenidades, label))}
                        className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${active ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label-xs mb-1 block">Descripción</label>
                <textarea className="input-base min-h-[100px] resize-y text-sm" placeholder="Descripción de la propiedad..." value={formData.descripcion} onChange={e => setF("descripcion", e.target.value)} />
              </div>

              <div>
                <label className="label-xs mb-1 block">Puntos destacados (hasta 2)</label>
                {[0, 1].map(i => (
                  <input key={i} className="input-base text-sm mb-2" placeholder={`Punto destacado ${i + 1}...`}
                    value={formData.puntos_libres[i] || ""}
                    onChange={e => {
                      const next = [...formData.puntos_libres];
                      next[i] = e.target.value;
                      setF("puntos_libres", next);
                    }} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {paso === 2 && (
            <Button variant="outline" className="flex-1" onClick={() => setPaso(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
          )}
          {paso === 1 && (
            <Button className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white" onClick={() => setPaso(2)}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {paso === 2 && (
            <Button className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white" onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar y Diseñar"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── DISEÑADOR (split panel) ──
  // ════════════════════════════════════════════════════════════════════════════
  if (fichaAvaluo) {
    return (
      <div className="flex flex-col h-[calc(100vh-96px)] pt-1">
        {/* Barra superior: navegación · avisos · acciones (todo en una fila) */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button variant="outline" onClick={() => setFichaAvaluo(null)}
            className="w-9 h-9 rounded-full p-0 flex items-center justify-center text-[#1B4332] border-[#1B4332] hover:bg-[#1B4332] hover:text-white shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 max-w-[210px]">
            <h2 className="text-sm font-bold font-['Outfit'] text-[#1B4332] truncate">
              Diseñador <span className="font-normal text-slate-500">· {fichaAvaluo.direccion}</span>
            </h2>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${fichaAvaluo._esManual ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {fichaAvaluo._esManual ? "Subida" : "OPI"}
          </span>
          {/* Chip de precio (abre la sección Precio) */}
          <button onClick={() => setSeccionActiva("precio")} title="Editar precio a mostrar"
            className="flex items-center gap-1 text-xs font-bold text-[#1B4332] bg-[#F0FAF5] border border-[#B7E4C7] px-2.5 py-1.5 rounded-full hover:bg-[#D9F0E3] shrink-0">
            <DollarSign className="w-3.5 h-3.5" /> {formatMXN(precioFinal)}
          </button>
          {/* Aviso compacto: precio fuera de mercado */}
          {bannerMercado && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full shrink-0"
              title="Una valuación formal puede darte certeza y credibilidad ante el comprador.">
              <AlertCircle className="w-3.5 h-3.5" /> Precio fuera de mercado
              <button onClick={() => setBannerMercado(false)} className="text-amber-400 hover:text-amber-600 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <div className="flex gap-2 shrink-0 ml-auto">
            {/* "Secuencias" solo sabe animar el diseño Just Listed; en EstateElite mostraría
                una hoja 2 que no corresponde al estilo elegido, así que se oculta acá. */}
            {temaSeleccionado !== "estateelite" && (
              <Button onClick={() => setSecuencias(true)} variant="outline" className="text-xs px-3 h-8 border-[#B08B4F] text-[#8b6914] hover:bg-[#faf6ee]">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Secuencias
              </Button>
            )}
            <Button onClick={() => exportarFicha("pdf")} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs px-3 h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button onClick={() => exportarFicha("jpg")} variant="outline" className="text-xs px-3 h-8">
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> JPG
            </Button>
            <Button onClick={handlePromoInteractiva} variant="outline" className="text-xs px-3 h-8 border-[#1B4332] text-[#1B4332] hover:bg-[#f0f7f2]">
              <Link2 className="w-3.5 h-3.5 mr-1.5" /> Promo Interactiva
            </Button>
          </div>
        </div>

        {/* Split panel */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

          {/* ── Rail tipo Canva + panel de la sección activa (rail arriba en móvil, al lado en desktop) ── */}
          <div className="flex flex-col lg:flex-row shrink-0 min-h-0 w-full lg:w-auto">
            {/* Rail de íconos */}
            <div className="flex flex-row lg:flex-col gap-1 bg-white border border-slate-200 rounded-t-xl lg:rounded-t-none lg:rounded-l-xl p-1.5 self-stretch lg:self-start shrink-0 overflow-x-auto lg:overflow-visible">
              {SECCIONES.map(s => (
                <button key={s.id} onClick={() => setSeccionActiva(s.id)} title={s.label}
                  className={`w-12 h-12 shrink-0 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${seccionActiva === s.id ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  <s.Icon className="w-[18px] h-[18px]" />
                  <span className="text-[10px] font-semibold leading-none">{s.short}</span>
                </button>
              ))}
            </div>

            {/* Panel de la sección activa */}
            <div className="w-full lg:w-[320px] bg-slate-50 border border-t-0 lg:border-t lg:border-l-0 border-slate-200 rounded-b-xl lg:rounded-b-none lg:rounded-r-xl p-3 overflow-y-auto space-y-4">

            {/* Paleta de color */}
            {seccionActiva === "color" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="label-xs mb-3 block">Paleta de color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PALETAS.map(p => (
                      <button key={p.id} title={p.nombre} onClick={() => setPaletaId(p.id)}
                        className={`flex flex-col items-center gap-1 group transition-transform ${paletaId === p.id ? "scale-110" : "hover:scale-105"}`}>
                        <div className={`w-9 h-9 rounded-full border-2 transition-all ${paletaId === p.id ? "border-slate-700 shadow-md" : "border-slate-200"}`}
                          style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} />
                        <span className="text-[9px] text-slate-400">{p.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Colores individuales (Just Listed) */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-xs">Color por elemento (Just Listed)</span>
                    <button onClick={() => setColoresCustom({})} className="text-[10px] text-slate-400 hover:text-[#1B4332] font-semibold">Restablecer</button>
                  </div>
                  <div className="space-y-1.5">
                    {COLOR_CAMPOS.map(({ key, label, def }) => (
                      <label key={key} className="flex items-center justify-between gap-2 cursor-pointer">
                        <span className="text-xs text-slate-600">{label}</span>
                        <input type="color" value={coloresCustom[key] || def}
                          onChange={e => setColoresCustom(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-9 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5" />
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug mt-2">Cada color se aplica a su elemento en todos los formatos de Just Listed.</p>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Estilo + Formato */}
            {seccionActiva === "estilo" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <label className="label-xs block">Estilo de diseño</label>
                <div className="grid grid-cols-2 gap-2">
                  {[...Object.entries(TEMAS), ["moderno", { nombre: "Moderno" }], ["just_listed", { nombre: "Just Listed" }], ["estateelite", { nombre: "EstateElite" }]].map(([id, t]) => (
                    <button key={id} onClick={() => {
                      setTemaSeleccionado(id);
                      // Preserva el formato actual al cambiar de estilo (mapea entre familias)
                      setFormatoSeleccionado(prev => {
                        const FMT_COMUN = ["vertical_2p", "horizontal", "reels", "post"];
                        // mapa stitch <-> común
                        const stitchToComun = { stitch_gallery: "vertical_2p", stitch_letter: "horizontal", stitch_asymmetry: "vertical_2p", stitch_facebook: "post", stitch_tiktok: "reels", stitch_kit: "vertical_2p" };
                        const comunToStitch = { vertical_2p: "stitch_gallery", horizontal: "stitch_letter", reels: "stitch_tiktok", post: "stitch_facebook" };
                        if (id === "estateelite") return "reel_ee";
                        if (id === "stitch_new") {
                          if (prev.startsWith("stitch_")) return prev;
                          return comunToStitch[prev] || "stitch_gallery";
                        }
                        // estilo común: si venía de stitch, traduce
                        if (prev.startsWith("stitch_")) return stitchToComun[prev] || "vertical_2p";
                        return FMT_COMUN.includes(prev) ? prev : "vertical_2p";
                      });
                    }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${temaSeleccionado === id ? "border-[#52B788] ring-2 ring-[#52B788]/20" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="aspect-[3/2] bg-slate-100 relative overflow-hidden">
                        <LayoutThumb temaId={id} nombre={t.nombre} />
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label-xs mb-1 block">Formato</label>
                  <div className="flex flex-wrap gap-1.5">
                    {formatosDe(temaSeleccionado).map(([val, label]) => (
                      <button key={val} onClick={() => setFormatoSeleccionado(val)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${formatoSeleccionado === val ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-slate-600 border-slate-200 hover:border-[#52B788]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            )}

            {/* Fotos del anuncio */}
            {seccionActiva === "fotos" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label-xs">Fotos del anuncio</label>
                  <span className="text-[10px] text-slate-400">{fotosElegidas.length} elegidas</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">Toca para incluir/quitar. La ★ marca la portada. El número indica el orden.</p>
                {fotosPool.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin fotos disponibles.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotosPool.map((url, i) => {
                      const pos = fotosElegidas.indexOf(url);
                      const incluida = pos >= 0;
                      return (
                        <div key={i}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-opacity ${incluida ? "border-[#1B4332]" : "border-transparent opacity-50 hover:opacity-80"}`}
                          onClick={() => setFotosElegidas(prev => incluida ? prev.filter(u => u !== url) : [...prev, url])}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {incluida && (
                            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#1B4332] text-white text-[10px] font-bold flex items-center justify-center">{pos + 1}</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setFotosElegidas(prev => [url, ...prev.filter(u => u !== url)]); }}
                            title="Usar como portada"
                            className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs ${pos === 0 ? "bg-amber-400 text-white" : "bg-black/50 text-white/90 hover:bg-black/70"}`}>★</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pt-3 border-t border-slate-100">
                  <label className="label-xs mb-1.5 block">Slides de fotos en mosaico (TikTok)</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSlidesFotos(n => Math.max(0, n - 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold">–</button>
                    <span className="text-sm font-bold text-[#1B4332] tabular-nums w-6 text-center">{slidesFotos}</span>
                    <button onClick={() => setSlidesFotos(n => Math.min(3, n + 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold">+</button>
                    <span className="text-[10px] text-slate-400">4 fotos por slide</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Precio */}
            {seccionActiva === "precio" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <label className="label-xs block">Precio a mostrar</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipoPrecio" value="oferta" checked={tipoPrecio === "oferta"} onChange={() => setTipoPrecio("oferta")} className="accent-[#1B4332]" />
                    <span className="text-xs text-slate-700">Precio de oferta — <strong>{formatMXN(fichaAvaluo.valor || fichaAvaluo.precio_oferta || 0)}</strong></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipoPrecio" value="ajustado" checked={tipoPrecio === "ajustado"} onChange={() => setTipoPrecio("ajustado")} className="accent-[#1B4332]" />
                    <span className="text-xs text-slate-700">Ajustar precio</span>
                  </label>
                </div>
                {tipoPrecio === "ajustado" && (
                  <input type="number" className="input-base mt-1 font-bold" placeholder="Precio a mostrar" value={precioAjustado} onChange={e => setPrecioAjustado(e.target.value)} />
                )}
                <div className="pt-2 border-t border-slate-100">
                  <label className="label-xs mb-1.5 block">Fondo del recuadro de precio (Just Listed)</label>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    {[["solido", "Sólido"], ["transparente", "Transparente"], ["nulo", "Sin fondo"]].map(([v, l]) => (
                      <button key={v} onClick={() => setPrecioBg(v)}
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors ${precioBg === v ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            )}

            {/* Descripción + Idioma */}
            {seccionActiva === "texto" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="label-xs">Descripción</label>
                    <button onClick={handleGenerarDescripcion}
                      className="flex items-center gap-1 text-xs text-[#52B788] hover:text-[#1B4332] font-semibold bg-[#F0FAF5] px-2 py-1 rounded-md">
                      <Sparkles className="w-3 h-3" /> Generar con IA
                    </button>
                  </div>
                  <textarea value={descripcionTexto} onChange={e => setDescripcionTexto(e.target.value)}
                    className="input-base min-h-[150px] resize-y text-sm"
                    placeholder="Escribe una descripción que enamore..." />
                  {(() => {
                    const palabras = descripcionTexto.trim() ? descripcionTexto.trim().split(/\s+/).length : 0;
                    const LIM = 60;
                    return (
                      <div className={`text-[10px] mt-1 text-right ${palabras > LIM ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                        {palabras} / {LIM} palabras {palabras > LIM ? "· recórtala para que quepa bien" : ""}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="label-xs mb-1 block">Tipografía de títulos</label>
                  <select className="input-base text-xs" value={fuente} onChange={e => setFuente(e.target.value)}>
                    {FUENTES.map(({ label, css }) => <option key={label} value={css} style={{ fontFamily: css }}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs mb-1 block">Texto del botón (TikTok / slides)</label>
                  <input className="input-base text-xs" maxLength={30}
                    placeholder={idioma === "en" ? "Schedule your visit" : "Agenda tu visita"}
                    value={ctaTexto} onChange={e => setCtaTexto(e.target.value)} />
                </div>
                <div>
                  <label className="label-xs mb-1 block">Idioma</label>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    {["es","en"].map(l => (
                      <button key={l} onClick={() => setIdioma(l)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${idioma === l ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500"}`}>
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            )}

            {/* Puntos de valor */}
            {seccionActiva === "puntos" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <label className="label-xs block">Puntos destacados</label>
                {puntosVerificados.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Verificados por PropValu</p>
                    <div className="flex flex-wrap gap-1.5">
                      {puntosVerificados.map((p, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs bg-[#F0FAF5] text-[#1B4332] border border-[#B7E4C7] px-2 py-1 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3 text-[#52B788]" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sin datos suficientes para generar puntos verificados.</p>
                )}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Agrega tus puntos propios</p>
                  {puntosLibres.map((val, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input className="input-base text-xs flex-1" maxLength={40}
                        placeholder={`Ej. Vista al jardín, Cocina equipada...`}
                        value={val}
                        onChange={e => {
                          const next = [...puntosLibres];
                          next[i] = e.target.value;
                          setPuntosLibres(next);
                        }} />
                      {puntosLibres.length > 1 && (
                        <button onClick={() => setPuntosLibres(puntosLibres.filter((_, j) => j !== i))}
                          className="w-6 h-6 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {puntosLibres.length < 8 && (
                    <button onClick={() => setPuntosLibres([...puntosLibres, ""])}
                      className="flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:text-[#2D6A4F] mt-1">
                      <Plus className="w-3.5 h-3.5" /> Agregar punto
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            )}

            {/* Amenidades / Instalaciones / Espacios */}
            {seccionActiva === "amenidades" && [
              { label: "Amenidades", state: amenidadesStr, set: setAmenidadesStr, icons: AMENIDADES_ICONS },
              { label: "Instalaciones", state: instalacionesStr, set: setInstalacionesStr, icons: INSTALACIONES_ICONS },
              { label: "Espacios interiores", state: espaciosStr, set: setEspaciosStr, icons: ESPACIOS_ICONS },
            ].map(({ label, state, set, icons }) => (
              <Card key={label} className="border-slate-200">
                <CardContent className="p-4">
                  <label className="label-xs mb-2 block">{label}</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    {icons.map(({ label: lbl, Icon }) => {
                      const active = state.includes(lbl);
                      return (
                        <button key={lbl} title={lbl} onClick={() => set(toggleStr(state, lbl))}
                          className={`p-2 rounded-lg border transition-colors ${active ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Datos del asesor */}
            {seccionActiva === "asesor" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <label className="label-xs block">Datos de:</label>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[["asesor", "Asesor"], ["empresa", "Empresa"]].map(([v, l]) => (
                    <button key={v} onClick={() => setAsesorCfg(p => ({ ...p, fuente: v }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${asesorCfg.fuente === v ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {/* Preview de lo precargado */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center shrink-0">
                    {asesorFinal.foto ? <img src={asesorFinal.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1B4332] truncate">{asesorFinal.nombre || "—"}</p>
                    <p className="text-[11px] text-slate-500 truncate">{asesorFinal.telefono || "sin teléfono"}</p>
                  </div>
                </div>
                {[
                  { key: "mostrarFoto", label: "Mostrar foto" },
                  { key: "mostrarNombre", label: "Mostrar nombre" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-700">{label}</span>
                    <button type="button" onClick={() => setAsesorCfg(p => ({ ...p, [key]: !p[key] }))}
                      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${asesorCfg[key] ? "bg-[#1B4332]" : "bg-slate-300"}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${asesorCfg[key] ? "left-5" : "left-1"}`} />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 leading-snug">Se precargan de tu cuenta. Aplica a todos los formatos.</p>
              </CardContent>
            </Card>
            )}

            {/* Qué mostrar (toggles de elementos) */}
            {seccionActiva === "elementos" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-1">
                <label className="label-xs block mb-1">Qué mostrar en la ficha</label>
                {ELEMENTOS_TOGGLE.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-xs text-slate-700">{label}</span>
                    <button type="button" onClick={() => setElementos(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${elementos[key] ? "bg-[#1B4332]" : "bg-slate-300"}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${elementos[key] ? "left-5" : "left-1"}`} />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 leading-snug pt-1">Aplica al estilo Just Listed en todos sus formatos.</p>
              </CardContent>
            </Card>
            )}
            </div>
          </div>

          {/* ── Panel derecho: preview ── */}
          <div className="flex-1 bg-slate-200/60 rounded-2xl border border-slate-300 relative flex flex-col overflow-hidden shadow-inner">
            {/* Control de zoom */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white rounded-full shadow-lg border border-slate-200 px-1.5 py-1">
              <button onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
                title="Alejar" className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(0.5)} title="Restablecer"
                className="text-[11px] font-bold text-slate-600 tabular-nums w-11 text-center hover:text-[#1B4332]">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}
                title="Acercar" className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            {tieneHoja2 && (
              <div className="absolute top-3 left-0 right-0 z-20 flex justify-center">
                <div className="bg-white rounded-full shadow-lg border border-slate-200 p-1 flex items-center gap-1">
                  {["Hoja 1","Hoja 2"].map((label, idx) => (
                    <button key={idx} onClick={() => setHojaActiva(idx + 1)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${hojaActiva === idx + 1 ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Navegación de hojas dinámicas (EstateElite): mismo patrón visual que Hoja 1/Hoja 2 */}
            {temaSeleccionado === "estateelite" && estateEliteSlideCount > 1 && (
              <div className="absolute top-3 left-0 right-0 z-20 flex justify-center">
                <div className="bg-white rounded-full shadow-lg border border-slate-200 p-1 flex items-center gap-1">
                  {Array.from({ length: estateEliteSlideCount }, (_, idx) => (
                    <button key={idx} onClick={() => setEstateEliteSlide(idx)}
                      title={`Hoja ${idx + 1}`}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors ${estateEliteSlide === idx ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={previewBoxRef} className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
              <div style={{ zoom }} className="origin-top transition-transform duration-300">
                {/* Hoja 1 — siempre en DOM para export PDF */}
                <div style={{ display: tieneHoja2 && hojaActiva === 2 ? "none" : "block" }}>
                  <LayoutComponent
                    fichaAvaluo={fichaConPrecio}
                    texts={texts}
                    idioma={idioma}
                    descripcionTexto={descripcionTexto}
                    theme={theme}
                    palette={palette}
                    formatMXN={formatMXN}
                    session={session}
                    amenidades={(amenidadesStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                    instalaciones={(instalacionesStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                    espacios={(espaciosStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                    puntosDestacados={todosLosPuntos}
                    elementos={elementos}
                    coloresCustom={coloresCustom}
                    asesor={asesorFinal}
                    precioBg={precioBg}
                    fuente={fuente}
                    cta={ctaTexto}
                    slidesFotos={slidesFotos}
                    formato={formatoSeleccionado}
                    activeSlide={estateEliteSlide}
                    onSlideChange={setEstateEliteSlide}
                    onSlideCountChange={setEstateEliteSlideCount}
                  />
                </div>
                {/* Hoja 2 — técnica, solo en estilo Clásico vertical_2p */}
                {tieneHoja2 && (
                  <div style={{ display: hojaActiva === 2 ? "block" : "none" }}>
                    <LayoutFichaTecnica
                      fichaAvaluo={fichaConPrecio}
                      texts={texts}
                      idioma={idioma}
                      descripcionTexto={descripcionTexto}
                      theme={theme}
                      palette={palette}
                      formatMXN={formatMXN}
                      session={session}
                      amenidades={(amenidadesStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                      instalaciones={(instalacionesStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                      espacios={(espaciosStr || "").split(",").map(s => s.trim()).filter(Boolean)}
                      puntosDestacados={todosLosPuntos}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* ── Overlay: Secuencias (loop tipo GIF/TikTok 9:16) ── */}
        {secuencias && (
          <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(20,18,15,.92)" }} onClick={() => setSecuencias(false)}>
            <button onClick={() => setSecuencias(false)}
              className="absolute top-4 right-5 z-10 bg-[#F4EFE4] text-[#2A2A24] rounded-full px-4 py-2 text-sm font-bold shadow-lg">
              ✕ Cerrar
            </button>
            <div onClick={e => e.stopPropagation()} className="flex flex-col items-center gap-3">
              <p className="text-[#C9A96A] text-xs font-bold uppercase tracking-[0.2em]">Secuencias · Just Listed · 9:16</p>
              <SecuenciasJustListed
                fichaAvaluo={fichaConPrecio}
                session={session}
                formatMXN={formatMXN}
                palette={palette}
                coloresCustom={coloresCustom}
                idioma={idioma}
                asesor={asesorFinal}
                scale={Math.max(0.2, Math.min((window.innerHeight - 220) / 1920, (window.innerWidth - 80) / 1080))}
              />
              <div className="mt-1 flex items-center gap-2">
                {[
                  { fmt: "jpg", label: "JPG", fn: () => exportSecuenciasJpg({ nombre: fichaAvaluo?.direccion || "propiedad" }) },
                  { fmt: "gif", label: "GIF", fn: () => exportSecuenciasGif({ nombre: fichaAvaluo?.direccion || "propiedad", onProgress: setGifProgress }) },
                  { fmt: "mp4", label: "MP4", fn: () => exportSecuenciasVideo({ nombre: fichaAvaluo?.direccion || "propiedad", onProgress: setGifProgress }) },
                ].map(({ fmt, label, fn }) => (
                  <button key={fmt} disabled={gifProgress !== null}
                    onClick={async () => {
                      try { if (fmt !== "jpg") setGifProgress(0); await fn(); toast.success(`${label} descargado`); }
                      catch (e) { toast.error(e.message || `No se pudo generar el ${label}`); }
                      finally { setGifProgress(null); }
                    }}
                    className="bg-[#B08B4F] hover:bg-[#9a7943] disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
                    <Download className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
              <p className="text-[#b8b2a4] text-[11px] max-w-xs text-center">
                {gifProgress === null
                  ? "Elige la salida: JPG (3 imágenes), GIF animado o MP4 (video). Loop de 3 secuencias 9:16 con zoom y transición."
                  : `Generando… ${gifProgress}%`}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── SELECTOR / BIENVENIDA ──
  // ════════════════════════════════════════════════════════════════════════════
  const totalPropiedades = avaluosCompletados.length + propiedadesManual.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-bold text-white text-lg font-['Outfit']">Fichas de Promoción</p>
          <p className="text-[#D9ED92]/80 text-sm mt-1">
            Genera fichas de tus <b>OPIs</b> (avalúos) o de propiedades que <b>subas tú</b> con sus fotos.
          </p>
        </div>
        <Button onClick={() => { setMostrarFormulario(true); setPaso(1); setFormData(FORM_INIT); }}
          className="bg-white text-[#1B4332] hover:bg-[#D9ED92] font-bold shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Subir propiedad
        </Button>
      </div>

      {/* Estado cargando */}
      {cargandoProps && (
        <div className="text-center py-8 text-slate-400 text-sm">Cargando propiedades...</div>
      )}

      {/* Sin propiedades — muestra ejemplo para que el usuario vea el resultado */}
      {!cargandoProps && totalPropiedades === 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ejemplo de ficha</p>
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Demo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-5">
            <PropCard prop={PROP_DEMO} badge="Ejemplo" badgeColor="green" idx={0}
              precio="$4,850,000"
              fotos={SAMPLE_FOTOS}
              onSelect={() => setFichaAvaluo(normalizar(PROP_DEMO))} />
          </div>
          <div className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1B4332]">¿Listo para subir tu primera propiedad?</p>
              <p className="text-xs text-slate-500 mt-0.5">Carga los datos y genera tu ficha profesional en segundos.</p>
            </div>
            <Button onClick={() => { setMostrarFormulario(true); setPaso(1); setFormData(FORM_INIT); }}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white shrink-0 ml-4">
              <Plus className="w-4 h-4 mr-2" /> Agregar propiedad
            </Button>
          </div>
        </div>
      )}

      {/* Grid de propiedades */}
      {!cargandoProps && totalPropiedades > 0 && (
        <>
          {/* OPIs */}
          {avaluosCompletados.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">OPIs de PropValu</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {avaluosCompletados.map((v, i) => (
                  <PropCard key={v.id} prop={v} badge="OPI" badgeColor="green" idx={i}
                    precio={formatMXN(v.valor)}
                    onSelect={() => { setFichaAvaluo(normalizar(v)); handleGenerarDescripcion(); }} />
                ))}
              </div>
            </div>
          )}

          {/* Mis propiedades (subidas) — siempre visible con guía */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mis propiedades (subidas)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Propiedades que subes tú con sus fotos, en “Subir propiedad”.</p>
              </div>
              <button onClick={() => { setMostrarFormulario(true); setPaso(1); setFormData(FORM_INIT); }}
                className="flex items-center gap-1 text-xs font-semibold text-[#1B4332] hover:text-[#2D6A4F] shrink-0">
                <Plus className="w-3.5 h-3.5" /> Subir propiedad
              </button>
            </div>
            {propiedadesManual.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {propiedadesManual.map((v, i) => (
                  <PropCard key={v.propiedad_id} prop={v} badge="Subida" badgeColor="blue" idx={i + 3}
                    precio={formatMXN(v.precio_oferta)}
                    fotos={v.fotos}
                    onSelect={() => { setFichaAvaluo(normalizar(v)); }} />
                ))}
              </div>
            ) : (
              <button onClick={() => { setMostrarFormulario(true); setPaso(1); setFormData(FORM_INIT); }}
                className="w-full border-2 border-dashed border-slate-200 hover:border-[#52B788] rounded-xl py-6 flex flex-col items-center gap-1 text-slate-400 hover:text-[#1B4332] transition-colors">
                <Plus className="w-6 h-6" />
                <span className="text-xs font-semibold">Sube una propiedad con sus fotos</span>
                <span className="text-[10px]">Paso 2 del formulario: cargas las fotos</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── PropCard subcomponent ────────────────────────────────────────────────────
const PropCard = ({ prop, badge, badgeColor, precio, fotos, onSelect, idx = 0 }) => {
  const fotoSrc = fotos?.[0] || prop.fotos?.[0] || SAMPLE_FOTOS[idx % SAMPLE_FOTOS.length];
  const badgeCls = badgeColor === "green"
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700";

  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col">
      <div className="h-36 bg-slate-100 relative overflow-hidden">
        <img src={fotoSrc} alt="Fachada" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeCls}`}>{badge}</span>
        </div>
        <div className="absolute bottom-2 left-3 text-white">
          <p className="text-[10px] font-bold uppercase opacity-80">{prop.tipo}</p>
          <p className="font-bold font-['Outfit'] text-base leading-tight">{precio}</p>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 flex items-start gap-1 flex-1">
          <MapPin className="w-3 h-3 mt-0.5 text-[#52B788] shrink-0" />
          {prop.direccion}
        </p>
        <Button onClick={onSelect} variant="outline"
          className="w-full bg-[#F0FAF5] hover:bg-[#D9F0E3] text-[#1B4332] font-semibold border-[#B7E4C7] text-xs h-8">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#52B788]" /> Generar Ficha
        </Button>
      </CardContent>
    </Card>
  );
};

export default PromocionesTab;
