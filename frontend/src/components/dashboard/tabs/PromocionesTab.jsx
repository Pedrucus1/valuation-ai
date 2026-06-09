import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft, Download, MapPin, Home, Sparkles, Image as ImageIcon,
  Waves, Dumbbell, Shield, Trees, Sun, Wine, Wind, Car, Monitor,
  Box, Droplets, Zap, Camera, Wifi, Tv, Utensils, BookOpen, Bed,
  Gamepad2, Droplet, Plus, X, CheckCircle2, Building2, AlertCircle,
  ChevronRight
} from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { DESCRIPTIONS_CATALOG } from "../../../utils/descriptionsCatalog";

import LayoutClasico from "./promociones/LayoutClasico";
import LayoutFichaTecnica from "./promociones/LayoutFichaTecnica";
import LayoutModerno from "./promociones/LayoutModerno";
import LayoutMinimalista from "./promociones/LayoutMinimalista";
import LayoutUltraLujo from "./promociones/LayoutUltraLujo";
import LayoutStitch from "./promociones/LayoutStitch";
import LayoutStitchHub from "./promociones/LayoutStitchHub";

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
  "https://images.unsplash.com/photo-1600607687920-4e2a09be15f1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1613490908677-49772ba6554b?auto=format&fit=crop&w=800&q=80",
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

const getLayoutComponent = (temaId) => {
  if (temaId === "stitch_new") return LayoutStitchHub;
  if (temaId === "stitch_obsidian") return LayoutStitch;
  if (temaId === "luxury") return LayoutUltraLujo;
  if (temaId === "minimalist") return LayoutMinimalista;
  if (temaId === "moderno") return LayoutModerno;
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
  amenidades: [], instalaciones: [], espacios: [],
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
    setPuntosLibres(fichaAvaluo.puntos_libres?.length ? [...fichaAvaluo.puntos_libres, ""].slice(0, 2) : ["", ""]);
    if (fichaAvaluo.fuera_de_mercado) setBannerMercado(true);
    else setBannerMercado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichaAvaluo]);

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
  const exportarFicha = async (modo = "pdf") => {
    const hasHoja2 = temaSeleccionado === "classic" && formatoSeleccionado === "vertical_2p";
    const elId = hasHoja2 && hojaActiva === 2 ? "pv-ficha-tecnica-root" : "pv-ficha-root";
    const el = document.getElementById(elId);
    if (!el) return;
    if (modo === "jpg") {
      try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const link = document.createElement("a");
        link.download = `Ficha_${(fichaAvaluo?.direccion || "propiedad").replace(/\s+/g, "_")}_H${hojaActiva}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.92);
        link.click();
        toast.success("Imagen descargada");
      } catch { toast.error("Error al exportar imagen"); }
      return;
    }
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
    fotos: fichaAvaluo.fotos?.filter(Boolean).length ? fichaAvaluo.fotos : SAMPLE_FOTOS,
  } : null;

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
      <div className="flex flex-col h-[calc(100vh-100px)] pt-2">
        {/* Barra superior */}
        <div className="flex items-center gap-3 mb-3">
          <Button variant="outline" onClick={() => setFichaAvaluo(null)}
            className="w-10 h-10 rounded-full p-0 flex items-center justify-center text-[#1B4332] border-[#1B4332] hover:bg-[#1B4332] hover:text-white shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold font-['Outfit'] text-[#1B4332] truncate">Diseñador de Ficha</h2>
            <p className="text-xs text-slate-500 truncate">{fichaAvaluo.direccion}</p>
          </div>
          {fichaAvaluo._esManual && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-1 rounded-full shrink-0">Manual</span>
          )}
          {!fichaAvaluo._esManual && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">OPI</span>
          )}
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => exportarFicha("pdf")} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs px-3 h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button onClick={() => exportarFicha("jpg")} variant="outline" className="text-xs px-3 h-8">
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> JPG
            </Button>
          </div>
        </div>

        {/* Banner: precio fuera de mercado */}
        {bannerMercado && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-semibold text-xs">El precio parece alejarse del mercado de la zona</p>
              <p className="text-amber-600 text-xs mt-0.5">Una valuación formal puede darte certeza y credibilidad ante el comprador.</p>
            </div>
            <button onClick={() => setBannerMercado(false)} className="text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Split panel */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

          {/* ── Panel izquierdo ── */}
          <div className="w-full lg:w-[380px] shrink-0 overflow-y-auto pr-1 pb-10 space-y-4">

            {/* Paleta de color */}
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <label className="label-xs mb-3 block">Paleta de color</label>
                <div className="flex gap-2">
                  {PALETAS.map(p => (
                    <button key={p.id} title={p.nombre} onClick={() => setPaletaId(p.id)}
                      className={`flex flex-col items-center gap-1 group transition-transform ${paletaId === p.id ? "scale-110" : "hover:scale-105"}`}>
                      <div className={`w-9 h-9 rounded-full border-2 transition-all ${paletaId === p.id ? "border-slate-700 shadow-md" : "border-slate-200"}`}
                        style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} />
                      <span className="text-[9px] text-slate-400">{p.nombre}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estilo + Formato */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <label className="label-xs block">Estilo de diseño</label>
                <div className="grid grid-cols-2 gap-2">
                  {[...Object.entries(TEMAS), ["moderno", { nombre: "Moderno" }]].map(([id, t]) => (
                    <button key={id} onClick={() => {
                      setTemaSeleccionado(id);
                      setFormatoSeleccionado(id === "stitch_new" ? "stitch_gallery" : "vertical_2p");
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
                  <select className="input-base text-xs" value={formatoSeleccionado} onChange={e => setFormatoSeleccionado(e.target.value)}>
                    {temaSeleccionado === "stitch_new" ? (
                      <>
                        <option value="stitch_gallery">A4 – Gallery Focus</option>
                        <option value="stitch_letter">A4 – Carta Clásica</option>
                        <option value="stitch_asymmetry">A4 – Modern Asymmetry</option>
                        <option value="stitch_facebook">Social – Facebook (3:2)</option>
                        <option value="stitch_tiktok">Social – TikTok/Reels (9:16)</option>
                        <option value="stitch_kit">Marketing Kit</option>
                      </>
                    ) : temaSeleccionado === "moderno" ? (
                      <>
                        <option value="vertical_2p">Folleto A4 (2 páginas)</option>
                        <option value="horizontal">Ficha Carta (dos columnas)</option>
                        <option value="reels">TikTok / Reels (3 slides)</option>
                        <option value="post">Post Cuadrado 1:1</option>
                      </>
                    ) : (
                      <>
                        <option value="vertical_2p">Folleto Vertical (A4)</option>
                        <option value="horizontal">Presentación 16:9</option>
                        <option value="reels">TikTok / Reels (9:16)</option>
                        <option value="post">Post Cuadrado (1:1)</option>
                      </>
                    )}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Precio */}
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
              </CardContent>
            </Card>

            {/* Descripción + Idioma */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="label-xs">Descripción</label>
                  <button onClick={handleGenerarDescripcion}
                    className="flex items-center gap-1 text-xs text-[#52B788] hover:text-[#1B4332] font-semibold bg-[#F0FAF5] px-2 py-1 rounded-md">
                    <Sparkles className="w-3 h-3" /> Generar con IA
                  </button>
                </div>
                <textarea value={descripcionTexto} onChange={e => setDescripcionTexto(e.target.value)}
                  className="input-base min-h-[120px] resize-y text-sm"
                  placeholder="Escribe una descripción que enamore..." />
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

            {/* Puntos de valor */}
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
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Agrega hasta 2 puntos propios</p>
                  {puntosLibres.map((val, i) => (
                    <input key={i} className="input-base text-xs" maxLength={40}
                      placeholder={`Ej. Vista al jardín, Cocina equipada...`}
                      value={val}
                      onChange={e => {
                        const next = [...puntosLibres];
                        next[i] = e.target.value;
                        setPuntosLibres(next);
                      }} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Amenidades / Instalaciones / Espacios */}
            {[
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
          </div>

          {/* ── Panel derecho: preview ── */}
          <div className="flex-1 bg-slate-200/60 rounded-2xl border border-slate-300 relative flex flex-col overflow-hidden shadow-inner">
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
            <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
              <div style={{ zoom: 0.5 }} className="origin-top transition-transform duration-300">
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
                    formato={formatoSeleccionado}
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
            Genera fichas inmobiliarias de alto impacto para cualquiera de tus propiedades.
          </p>
        </div>
        <Button onClick={() => { setMostrarFormulario(true); setPaso(1); setFormData(FORM_INIT); }}
          className="bg-white text-[#1B4332] hover:bg-[#D9ED92] font-bold shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Agregar propiedad
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

          {/* Manuales */}
          {propiedadesManual.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Mis propiedades</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {propiedadesManual.map((v, i) => (
                  <PropCard key={v.propiedad_id} prop={v} badge="Manual" badgeColor="blue" idx={i + 3}
                    precio={formatMXN(v.precio_oferta)}
                    fotos={v.fotos}
                    onSelect={() => { setFichaAvaluo(normalizar(v)); }} />
                ))}
              </div>
            </div>
          )}
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
