import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  LogOut,
  CreditCard,
  TrendingUp,
  Users,
  BarChart2,
  Plus,
  MapPin,
  AlertTriangle,
  Maximize2,
  X,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertCircle,
  User,
  Phone,
  Mail,
  Briefcase,
  ShoppingCart,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  MessageCircle,
  ExternalLink,
  Star,
  Send,
  ChevronDown,
  ChevronUp,
  Pencil,
  Calendar,
  Bell,
  RefreshCw,
  Megaphone,
  Map,
  Activity,
  Home,
  Building,
} from "lucide-react";
import { API } from "@/App";
import MercadoView from "@/components/MercadoView";
const MercadoViewM = React.memo(MercadoView);

/* ─── PropValu Watermark ─────────────────────────────── */
const PropValuWatermark = ({ empresa, tipoOp, fecha }) => (
  <div className="flex items-center gap-2.5">
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="#1B4332" strokeWidth="2"/>
        <path d="M7 9h10M7 12h6M7 15h8" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="14" y="11" width="6" height="8" rx="1" fill="#52B788"/>
      </svg>
      <span className="font-['Outfit'] font-bold text-[#1B4332] text-sm tracking-tight">PropValu</span>
    </div>
    <div className="w-px h-8 bg-slate-200" />
    <div>
      <p className="text-[10px] font-semibold text-slate-600">{empresa || "Análisis de mercado"}</p>
      <p className="text-[9px] text-slate-400">{tipoOp ? `${tipoOp.charAt(0).toUpperCase()+tipoOp.slice(1)} · ` : ""}{fecha || new Date().toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" })} · GDL metro</p>
    </div>
  </div>
);

/* ─── ChartModal (fullscreen) ────────────────────────── */
const ChartModal = ({ open, onClose, title, children, empresa, tipoOp }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-['Outfit'] font-bold text-[#1B4332] text-base">{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
        {/* Footer watermark */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <PropValuWatermark empresa={empresa} tipoOp={tipoOp} />
        </div>
      </div>
    </div>
  );
};

/* ─── ChartCard (card con botón expand) ──────────────── */
const ChartCard = ({ title, subtitle, icon, tipoOp, empresa, children, modalChildren, className = "" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className={`bg-white border-0 shadow-sm ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1B4332]">{title}</p>
                  {tipoOp && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${tipoOp === "venta" ? "bg-[#1B4332] text-white" : "bg-blue-600 text-white"}`}>
                      {tipoOp}
                    </span>
                  )}
                </div>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button onClick={() => setOpen(true)} title="Ver pantalla completa"
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
          {children}
        </CardContent>
      </Card>
      <ChartModal open={open} onClose={() => setOpen(false)} title={title} empresa={empresa} tipoOp={tipoOp}>
        {modalChildren || children}
      </ChartModal>
    </>
  );
};

/* ─── Helpers ──────────────────────────────────────────── */

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);

const STATUS_CONFIG = {
  completada: { label: "Completada", className: "bg-green-100 text-green-700" },
  en_proceso: { label: "En proceso", className: "bg-amber-100 text-amber-700" },
  pendiente:  { label: "Pendiente",  className: "bg-slate-100 text-slate-600" },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
};

/* ─── Mock data ─────────────────────────────────────────── */

const MOCK_VALUACIONES = [
  {
    id: 1,
    direccion: "Blvd. Puerta de Hierro 4965, Zapopan",
    tipo: "Casa",
    fecha: "15 mar 2026",
    valor: 6200000,
    estado: "completada",
    valuador_nombre: "Arq. Carlos Ruiz",
    valuador_id: "user_carlos_ruiz",
    calificada: false,
  },
  {
    id: 2,
    direccion: "Av. López Mateos Sur 3080, Guadalajara",
    tipo: "Departamento",
    fecha: "13 mar 2026",
    valor: 2850000,
    estado: "completada",
    valuador_nombre: "Ing. Patricia Soto",
    valuador_id: "user_patricia_soto",
    calificada: true,
    calificacion_dada: 5,
  },
  {
    id: 3,
    direccion: "Calle Niños Héroes 1455, Col. Moderna",
    tipo: "Casa",
    fecha: "11 mar 2026",
    valor: 3900000,
    estado: "en_proceso",
    valuador_nombre: "Arq. Miguel Torres",
    valuador_id: null,
    calificada: false,
  },
  {
    id: 4,
    direccion: "Av. Mariano Otero 2963, Zapopan",
    tipo: "Departamento",
    fecha: "08 mar 2026",
    valor: 1750000,
    estado: "completada",
    valuador_nombre: "Arq. Carlos Ruiz",
    valuador_id: "user_carlos_ruiz",
    calificada: false,
  },
  {
    id: 5,
    direccion: "Calle Reforma 210, Tlaquepaque",
    tipo: "Casa",
    fecha: "04 mar 2026",
    valor: 2200000,
    estado: "pendiente",
    valuador_nombre: null,
    valuador_id: null,
    calificada: false,
  },
];

/* ─── Modal calificación valuador ────────────────────────── */
const ModalCalificarValuador = ({ valuacion, onClose, onCalificado }) => {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const etiquetas = ["", "Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"];

  const enviar = async () => {
    if (estrellas === 0) { toast.error("Selecciona una calificación"); return; }
    if (!comentario.trim()) { toast.error("Escribe un comentario breve"); return; }
    setEnviando(true);
    try {
      await fetch(`${API}/directorio/valuador/${valuacion.valuador_id}/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          calificacion: estrellas,
          comentario: comentario.trim(),
          nombre_cliente: "Inmobiliaria",
        }),
      });
      toast.success("¡Gracias por tu calificación!");
      onCalificado(valuacion.id, estrellas);
      onClose();
    } catch {
      toast.error("Error al enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="font-['Outfit'] text-base font-bold text-[#1B4332] mb-1">Calificar valuador</p>
        <p className="text-xs text-slate-500 mb-4">{valuacion.valuador_nombre} · {valuacion.direccion.split(",")[0]}</p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setEstrellas(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${(hover || estrellas) >= n ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
              />
            </button>
          ))}
        </div>
        {(hover || estrellas) > 0 && (
          <p className="text-center text-sm font-semibold text-amber-600 mb-3">{etiquetas[hover || estrellas]}</p>
        )}

        {/* Comentario */}
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="¿Cómo fue tu experiencia? (requerido)"
          rows={3}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-[#52B788] bg-[#F0FAF5] mb-4"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm text-slate-500 hover:text-slate-700 py-2 rounded-xl border border-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando || estrellas === 0}
            className="flex-1 bg-[#1B4332] text-white text-sm font-semibold py-2 rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
          >
            {enviando ? "Enviando…" : "Enviar calificación"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MOCK_ASESORES = [
  { id: 1, nombre: "Sofía Ramírez Torres",   email: "sofia.ramirez@inmobiliaria.mx",   phone: "33 1234 5678", valuaciones: 7,  _mock_kyc: "approved" },
  { id: 2, nombre: "Carlos Mendoza Ibarra",  email: "carlos.mendoza@inmobiliaria.mx",  phone: "33 8765 4321", valuaciones: 4,  _mock_kyc: "approved" },
  { id: 3, nombre: "Daniela Herrera López",  email: "daniela.herrera@inmobiliaria.mx", phone: "33 5555 1212", valuaciones: 3,  _mock_kyc: "under_review" },
  { id: 4, nombre: "Jorge Navarro Castillo", email: "jorge.navarro@inmobiliaria.mx",   phone: "",             valuaciones: 0,  _mock_kyc: "pending" },
];

/* ─── Modal Nuevo Anuncio ─────────────────────────────── */
const SLOTS_LIST = [
  { id: "reporte_pdf",      label: "Página de Reporte",        desc: "Aparece antes de descargar el PDF",    precio: 990  },
  { id: "directorio_top",   label: "Directorio · Destacado",   desc: "Posición top en el directorio",        precio: 690  },
  { id: "landing_banner",   label: "Banner Landing",           desc: "Banner en la página principal",        precio: 590  },
  { id: "dashboard_banner", label: "Banner Dashboard",         desc: "Banner en dashboards de usuarios",     precio: 490  },
];
const DURACIONES_AD = [{ d: 7, label: "7 días" }, { d: 15, label: "15 días" }, { d: 30, label: "30 días" }];

const ModalNuevoAnuncioInmo = ({ onClose, onCreado }) => {
  const [slot, setSlot] = useState(SLOTS_LIST[0].id);
  const [dias, setDias] = useState(30);
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [enviando, setEnviando] = useState(false);

  const slotCfg = SLOTS_LIST.find((s) => s.id === slot) || SLOTS_LIST[0];
  const precio = slotCfg.precio * (dias / 30);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/advertisers/anuncios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slot, duracion_dias: dias, titulo: titulo.trim(), url_destino: url.trim() }),
      });
      if (res.ok) {
        toast.success("Anuncio enviado — quedará activo al ser aprobado.");
        onCreado();
      } else {
        toast.error("No se pudo crear el anuncio. Intenta de nuevo.");
      }
    } catch {
      toast.error("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Crear anuncio</h3>
            <p className="text-[#D9ED92]/70 text-xs mt-0.5">Tu anuncio será revisado antes de publicarse</p>
          </div>
          <button onClick={onClose}><ChevronDown className="w-5 h-5 text-white/60 hover:text-white rotate-180" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Posición del anuncio</label>
            <div className="grid grid-cols-2 gap-2">
              {SLOTS_LIST.map((s) => (
                <button type="button" key={s.id} onClick={() => setSlot(s.id)}
                  className={`text-left p-3 rounded-xl border text-sm transition-colors ${slot === s.id ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 hover:border-slate-300"}`}>
                  <p className="font-semibold text-[#1B4332] text-xs">{s.label}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Duración</label>
            <div className="flex gap-2">
              {DURACIONES_AD.map(({ d, label }) => (
                <button type="button" key={d} onClick={() => setDias(d)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${dias === d ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Título del anuncio</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={80}
              placeholder="Ej. Propiedades en Guadalajara · La mejor oferta"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">URL de destino (opcional)</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url"
              placeholder="https://tu-sitio.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>
          <div className="bg-[#F0FAF5] rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Precio estimado</span>
            <span className="font-bold text-[#1B4332]">${precio.toLocaleString("es-MX")} MXN</span>
          </div>
          <button type="submit" disabled={enviando}
            className="w-full bg-[#1B4332] text-white font-bold py-3 rounded-xl hover:bg-[#2D6A4F] transition-colors disabled:opacity-60">
            {enviando ? "Enviando…" : "Enviar para revisión"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Component ─────────────────────────────────────────── */

const InmobiliariaDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [kycDocs, setKycDocs] = useState([]);
  const [kycSubiendo, setKycSubiendo] = useState({});
  const [kycError, setKycError] = useState("");
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [equipo, setEquipo] = useState(null); // null = no cargado, [] = sin asesores
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null); // { url, type, filename }
  const [calificarModal, setCalificarModal] = useState(null); // valuacion a calificar
  const [valuacionesList, setValuacionesList] = useState(MOCK_VALUACIONES);

  /* ── Resumen quick data ── */
  const [resumenResenas, setResumenResenas] = useState([]);
  const [resumenAnuncios, setResumenAnuncios] = useState([]);

  /* ── Mercado stats (compartido con Resumen y MercadoTab) ── */
  const [mercadoStats, setMercadoStats] = useState(null);
  const [mercadoTipoOp, setMercadoTipoOp] = useState("venta");

  useEffect(() => {
    fetch(`${API}/mercado/stats?tipo_op=${mercadoTipoOp}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setMercadoStats(d))
      .catch(() => {});
  }, [mercadoTipoOp]);

  useEffect(() => {
    if (!session) return;
    const perfilId = session.user_id;
    fetch(`${API}/directorio/inmobiliarias/${perfilId}/resenas`)
      .then(r => r.ok ? r.json() : { resenas: [] })
      .then(d => setResumenResenas(d.resenas || []))
      .catch(() => {});
    fetch(`${API}/advertisers/mis-anuncios`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { anuncios: [] })
      .then(d => setResumenAnuncios(d.anuncios || []))
      .catch(() => {});
  }, [session]);

  /* ── Billing state ── */
  const [billingData, setBillingData] = useState(null);
  const [billingPref, setBillingPref] = useState(null);
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/auth/billing-summary`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setBillingData(d); setBillingPref(d.billing_preference); } })
      .catch(() => {});
  }, [session]);

  const saveBillingPref = async (pref) => {
    setSavingPref(true);
    try {
      await fetch(`${API}/auth/billing-preference`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_preference: pref }),
      });
      setBillingPref(pref);
      setBillingData((d) => d ? { ...d, billing_preference: pref } : d);
      toast.success("Preferencia guardada");
    } catch { toast.error("No se pudo guardar"); }
    finally { setSavingPref(false); }
  };

  const DOCS_REQUERIDOS = [
    { key: "ine_frente",            label: "INE del representante (frente y vuelta)" },
    { key: "foto_profesional",      label: "Foto profesional del representante" },
    { key: "comprobante_domicilio", label: "Comprobante de domicilio del negocio" },
    { key: "cert_asociacion",       label: "Certificado de asociación inmobiliaria" },
    { key: "opinion_fiscal",        label: "Opinión de cumplimiento fiscal (SAT)" },
    { key: "constancia_rfc",        label: "Constancia de situación fiscal (RFC)" },
    { key: "firma_representante",   label: "Firma autógrafa del representante legal" },
    { key: "logo_empresa",          label: "Logo de empresa" },
  ];

  const DOC_HINTS = {
    ine_frente:            "Identificación oficial vigente del representante legal. Si incluye ambas caras en un solo archivo, súbelo aquí.",
    foto_profesional:      "Fotografía reciente de frente, fondo neutro, vestimenta formal. Aparecerá en tu perfil público del directorio.",
    comprobante_domicilio: "Recibo de luz, agua, internet o renta con la dirección del negocio (no mayor a 3 meses). También se acepta recibo de celular a nombre de la empresa.",
    cert_asociacion:       "Credencial o carta de membresía activa en AMPI, CANACO, CIPS u otra asociación inmobiliaria reconocida.",
    opinion_fiscal:        "Documento descargable desde el portal del SAT que acredita que tu empresa está al corriente en sus obligaciones fiscales.",
    constancia_rfc:        "Constancia de situación fiscal actualizada del SAT (formato PDF o imagen). Incluye el RFC y régimen fiscal.",
    firma_representante:   "Escaneo o fotografía de la firma manuscrita del representante legal sobre papel blanco. Aparecerá en documentos y reportes.",
    logo_empresa:          "Logotipo de la empresa en formato PNG o JPG, fondo transparente o blanco. Aparecerá en tu perfil del directorio.",
  };

  const DOC_LABELS = {
    ine_frente:            "INE del representante (frente y vuelta)",
    foto_profesional:      "Foto profesional del representante",
    comprobante_domicilio: "Comprobante de domicilio del negocio",
    cert_asociacion:       "Certificado de asociación inmobiliaria (AMPI/CANACO/CIPS)",
    opinion_fiscal:        "Opinión de cumplimiento fiscal (SAT)",
    constancia_rfc:        "Constancia de situación fiscal (RFC)",
    firma_representante:   "Firma autógrafa del representante legal",
    logo_empresa:          "Logo de empresa (opcional)",
  };

  const cargarDocs = () => {
    fetch(`${API}/kyc/mis-documentos`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setKycDocs(d.documentos || []))
      .catch(() => {});
  };

  const subirDocumento = async (docTipo, file) => {
    if (!file) return;
    setKycSubiendo((p) => ({ ...p, [docTipo]: true }));
    setKycError("");
    const fd = new FormData();
    fd.append("doc_tipo", docTipo);
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/kyc/upload`, { method: "POST", credentials: "include", body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error al subir"); }
      cargarDocs();
    } catch (e) {
      setKycError(e.message);
    } finally {
      setKycSubiendo((p) => ({ ...p, [docTipo]: false }));
    }
  };

  const docSubido = (key) => kycDocs.find((d) => d.doc_tipo === key);

  useEffect(() => {
    const fromState = location.state?.user;
    if (fromState) {
      setSession(fromState);
      localStorage.setItem("inmobiliaria_session", JSON.stringify(fromState));
      cargarDocs();
      if (location.state?.showDocsReminder) setShowDocsModal(true);
      // Refresh from backend to get all fields (async, non-blocking)
      fetch(`${API}/auth/me`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(fresh => {
          if (fresh?.email) {
            const merged = { ...fromState, ...fresh };
            setSession(merged);
            localStorage.setItem("inmobiliaria_session", JSON.stringify(merged));
          }
        })
        .catch(() => {});
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("inmobiliaria_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
        cargarDocs();
        // Refresh from backend in background
        fetch(`${API}/auth/me`, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(fresh => {
            if (fresh?.email) {
              const merged = { ...stored, ...fresh };
              setSession(merged);
              localStorage.setItem("inmobiliaria_session", JSON.stringify(merged));
            }
          })
          .catch(() => {});
      } else {
        navigate("/login", { state: { role: "realtor" } });
      }
    } catch {
      navigate("/login", { state: { role: "realtor" } });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // silently ignore network errors on logout
    }
    localStorage.removeItem("inmobiliaria_session");
    navigate("/login");
  };

  const handleComprarCreditos = () => {
    navigate("/checkout/pro", {
      state: {
        role: "realtor",
        user: session,
        credits: session?.credits || 0,
      },
    });
  };

  if (!session) return null;

  const credits = session.credits ?? 0;
  const planKeyGlobal = session?.plan || (() => {
    const n = parseInt(session?.num_asesores) || 0;
    if (n >= 6)  return "inmobiliaria_premier";
    if (n >= 2)  return "inmobiliaria_pro20";
    if (n === 1) return "inmobiliaria_lite10";
    return "inmobiliaria_lite5";
  })();
  const planMaxCredits = { inmobiliaria_lite5: 5, inmobiliaria_lite10: 10, inmobiliaria_pro20: 20, inmobiliaria_premier: 50 }[planKeyGlobal] ?? 10;
  const creditsLow = credits < Math.ceil(planMaxCredits * 0.2);
  const showKycBanner = !session?.kyc_status || session.kyc_status === "pending";
  const displayName = session.company_name || session.name || session.email;

  /* ── Tabs ── */
  const docsSubidos = DOCS_REQUERIDOS.filter((d) => docSubido(d.key)).length;
  const docsCompletos = docsSubidos === DOCS_REQUERIDOS.length;

  const solicitarVerificacion = async () => {
    const res = await fetch(`${API}/kyc/solicitar-entrevista`, { method: "POST", credentials: "include" });
    if (res.ok) {
      const updated = { ...session, kyc_status: "under_review" };
      setSession(updated);
      localStorage.setItem("inmobiliaria_session", JSON.stringify(updated));
      toast.success("Solicitud enviada — te contactaremos para activar tu verificación.");
    } else { toast.error("No se pudo enviar la solicitud, intenta de nuevo."); }
  };

  const esTitular = session.inmobiliaria_tipo === "titular" || !session.inmobiliaria_tipo;

  const TABS = [
    { id: "resumen",      label: "Resumen" },
    { id: "mercado",      label: "Mercado" },
    { id: "valuaciones",  label: "Valuaciones" },
    ...(esTitular ? [{ id: "equipo", label: "👥 Equipo" }] : []),
    { id: "documentos",   label: "Documentos", badge: docsSubidos < DOCS_REQUERIDOS.length ? DOCS_REQUERIDOS.length - docsSubidos : null },
    { id: "perfil",       label: "Perfil" },
    { id: "resenas",      label: "Reseñas" },
    { id: "facturacion",  label: "Facturación", badge: billingData?.billing_status === "blocked" || billingData?.days_to_cutoff <= 5 },
    { id: "publicidad",   label: "Publicidad" },
  ];

  /* ── Facturación Tab ── */
  const FacturacionTab = () => {
    if (!billingData) return <p className="text-slate-400 text-sm p-4">Cargando...</p>;
    const { next_cutoff, days_to_cutoff, cycle_start, earnings_this_cycle,
            plan_cost, balance, billing_status } = billingData;
    const alerta = days_to_cutoff <= 5;
    const fmtMXN = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);
    const PREF_OPTIONS = [
      { value: "auto",        label: "Automático",         desc: "Se descuenta del saldo al corte sin confirmación" },
      { value: "ask_monthly", label: "Confirmar cada mes", desc: "PropValu te avisa 5 días antes para que autorices" },
      { value: "manual",      label: "Solo tarjeta",       desc: "Siempre se cobra a tu tarjeta registrada" },
    ];
    return (
      <div className="space-y-5">
        {billing_status === "blocked" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Acceso suspendido por pago pendiente</p>
              <p className="text-xs text-red-500 mt-0.5">Autoriza el pago para reactivar tu cuenta.</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`border-0 shadow-sm ${alerta ? "bg-amber-50" : "bg-white"}`}>
            <CardContent className="p-5">
              <p className={`text-xs mb-1 ${alerta ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                {alerta ? "⚠️ Próximo corte" : "Próximo corte"}
              </p>
              <p className={`text-2xl font-bold font-['Outfit'] ${alerta ? "text-amber-600" : "text-[#1B4332]"}`}>
                {days_to_cutoff} días
              </p>
              <p className="text-xs text-slate-400 mt-1">{next_cutoff} · Desde {cycle_start}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">Balance proyectado</p>
              <p className={`text-2xl font-bold font-['Outfit'] ${balance >= 0 ? "text-[#1B4332]" : "text-red-600"}`}>
                {balance >= 0 ? "+" : ""}{fmtMXN(balance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {balance >= 0 ? "A depositar en tu cuenta" : `Diferencia a cobrar: ${fmtMXN(Math.abs(balance))}`}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Desglose del ciclo</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ganancias por encargos</span>
                <span className="font-semibold text-[#1B4332]">{fmtMXN(earnings_this_cycle)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Costo plan ({session?.plan || "—"})</span>
                <span className="font-semibold text-slate-700">− {fmtMXN(plan_cost)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-bold">
                <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>
                  {balance >= 0 ? "A depositar" : "A cobrar"}
                </span>
                <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>{fmtMXN(Math.abs(balance))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Preferencia de renovación</p>
            <div className="space-y-2">
              {PREF_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => saveBillingPref(opt.value)} disabled={savingPref}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${billingPref === opt.value ? "border-[#52B788] bg-[#F0FAF5]" : "border-slate-200 bg-white hover:border-[#52B788]/50"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${billingPref === opt.value ? "border-[#52B788]" : "border-slate-300"}`}>
                      {billingPref === opt.value && <div className="w-2 h-2 rounded-full bg-[#52B788]" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {savingPref && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Guardando...</p>}
          </CardContent>
        </Card>
        <p className="text-[11px] text-slate-400 text-center">
          El cobro y depósito automáticos estarán disponibles al activar la pasarela de pagos.
        </p>
      </div>
    );
  };

  /* ── Publicidad Tab ── */
  const PublicidadTab = () => {
    const [anuncios, setAnuncios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalNuevo, setModalNuevo] = useState(false);

    useEffect(() => {
      fetch(`${API}/advertisers/mis-anuncios`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : { anuncios: [] })
        .then((d) => setAnuncios(d.anuncios || []))
        .catch(() => setAnuncios([]))
        .finally(() => setCargando(false));
    }, []);

    const ESTADO_AD = {
      aprobado:  { label: "Activo",      cls: "bg-green-100 text-green-700" },
      pendiente: { label: "En revisión", cls: "bg-amber-100 text-amber-700" },
      rechazado: { label: "Rechazado",   cls: "bg-red-100 text-red-600"     },
      pausado:   { label: "Pausado",     cls: "bg-slate-100 text-slate-500"  },
    };

    const SLOTS = {
      reporte_pdf:      "Página de Reporte (PDF)",
      directorio_top:   "Directorio · posición destacada",
      landing_banner:   "Banner landing",
      dashboard_banner: "Banner dashboard",
    };

    return (
      <div className="space-y-5">
        {/* Header CTA */}
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-lg">Mis anuncios en PropValu</p>
            <p className="text-[#D9ED92]/80 text-sm mt-1">
              Llega a cientos de propietarios que solicitan valuaciones. Sin verificación adicional — ya estás dada de alta.
            </p>
          </div>
          <button
            onClick={() => setModalNuevo(true)}
            className="flex items-center gap-2 bg-[#D9ED92] text-[#1B4332] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#B7E4C7] transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Crear anuncio
          </button>
        </div>

        {/* Lista de anuncios */}
        {cargando ? (
          <div className="bg-white rounded-2xl border border-[#B7E4C7] p-8 text-center text-sm text-slate-400">Cargando anuncios…</div>
        ) : anuncios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#B7E4C7] p-10 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="font-semibold text-slate-600 mb-1">Aún no tienes anuncios</p>
            <p className="text-sm text-slate-400 mb-4">Crea tu primer anuncio y empieza a captar leads directamente desde la plataforma.</p>
            <button onClick={() => setModalNuevo(true)}
              className="inline-flex items-center gap-2 bg-[#1B4332] text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-[#2D6A4F] transition-colors">
              <Plus className="w-4 h-4" /> Crear mi primer anuncio
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {anuncios.map((ad) => {
              const est = ESTADO_AD[ad.estado] || ESTADO_AD.pendiente;
              return (
                <div key={ad.ad_id} className="bg-white rounded-2xl border border-[#B7E4C7] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {ad.imagen_url && (
                    <img src={ad.imagen_url} alt="banner" className="w-24 h-14 rounded-lg object-cover shrink-0 border border-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1B4332] truncate">{ad.titulo || "Sin título"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{SLOTS[ad.slot] || ad.slot || "—"} · {ad.duracion_dias ? `${ad.duracion_dias} días` : "—"}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${est.cls}`}>{est.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {modalNuevo && <ModalNuevoAnuncioInmo onClose={() => setModalNuevo(false)} onCreado={() => { setModalNuevo(false); setCargando(true); }} />}
      </div>
    );
  };

  const DocumentosTab = () => {
    const docsSubidosCount = DOCS_REQUERIDOS.filter(({ key }) => docSubido(key)).length;
    const pct = Math.round((docsSubidosCount / DOCS_REQUERIDOS.length) * 100);
    return (
      <div className="space-y-4">

        {/* Hero: progreso */}
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#D9ED92]" />
              <div>
                <p className="font-['Outfit'] font-bold text-white text-sm leading-tight">
                  {session?.kyc_status === "approved" ? "Cuenta verificada ✅"
                  : session?.kyc_status === "under_review" ? "Verificación pendiente"
                  : docsSubidosCount === DOCS_REQUERIDOS.length ? "Listo para verificar 🎯"
                  : "Falta de documentos"}
                </p>
                <p className="text-xs text-[#D9ED92]/80 mt-0.5">
                  {session?.kyc_status === "approved" ? "Tu cuenta está completamente activa"
                  : session?.kyc_status === "under_review" ? "PropValu está revisando tu expediente"
                  : docsSubidosCount === DOCS_REQUERIDOS.length
                    ? "Todos los documentos subidos — solicita la verificación"
                    : `Faltan ${DOCS_REQUERIDOS.length - docsSubidosCount} documento${DOCS_REQUERIDOS.length - docsSubidosCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-[#D9ED92]/70 mb-1">
                <span>Progreso</span>
                <span className="font-bold text-[#D9ED92]">{docsSubidosCount} / {DOCS_REQUERIDOS.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${docsSubidosCount === DOCS_REQUERIDOS.length ? "bg-[#D9ED92]" : "bg-[#52B788]"}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
            {(docsSubidosCount === DOCS_REQUERIDOS.length && (!session?.kyc_status || session?.kyc_status === "pending")) ? (
              <button onClick={solicitarVerificacion}
                className="flex-shrink-0 flex items-center gap-1.5 bg-[#D9ED92] hover:bg-white text-[#1B4332] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                🎯 Solicitar verificación
              </button>
            ) : null}
          </div>
        </div>

        {/* Grupos de documentos */}
        {kycError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">{kycError}</div>
        )}
        {[
          { label: "Identificación", emoji: "🪪", keys: ["ine_frente"] },
          { label: "Fotografía y firma", emoji: "📷", keys: ["foto_profesional", "firma_representante"] },
          { label: "Domicilio y fiscales", emoji: "🏢", keys: ["comprobante_domicilio", "opinion_fiscal", "constancia_rfc"] },
          { label: "Asociación y marca", emoji: "🏛️", keys: ["cert_asociacion", "logo_empresa"] },
        ].map(grupo => {
          const grupoSubidos = grupo.keys.filter(k => docSubido(k)).length;
          const grupoCompleto = grupoSubidos === grupo.keys.length;
          return (
            <div key={grupo.label} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              <div className={`px-4 py-3 flex items-center justify-between ${grupoCompleto ? "bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]" : "bg-gradient-to-r from-[#52B788] to-[#40916C]"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{grupo.emoji}</span>
                  <span className="font-['Outfit'] font-bold text-white text-sm">{grupo.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/80">{grupoSubidos}/{grupo.keys.length}</span>
                  {grupoCompleto
                    ? <span className="text-xs font-bold bg-[#D9ED92] text-[#1B4332] px-2.5 py-0.5 rounded-full">✓ Completo</span>
                    : <span className="text-xs font-bold bg-white/25 text-white px-2.5 py-0.5 rounded-full">Pendiente</span>
                  }
                </div>
              </div>
              <div className="p-3 space-y-2">
                {grupo.keys.map(key => {
                  const doc = docSubido(key);
                  const subiendo = kycSubiendo[key];
                  const hint = DOC_HINTS[key];
                  const label = DOC_LABELS[key] || key;
                  const isOptional = key === "logo_empresa";
                  const isImg = doc && (doc.content_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(doc.filename || ""));
                  const docUrl = doc ? `${API}/kyc/documento/${doc.doc_id}` : null;
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${doc ? "bg-[#F0FAF5] border border-[#B7E4C7]" : "bg-white border border-slate-100"}`}>
                      {doc ? (
                        <button onClick={() => setPreviewDoc({ url: docUrl, type: doc.content_type, filename: doc.filename })}
                          className="group relative w-12 h-12 rounded-lg overflow-hidden border-2 border-[#52B788] bg-white flex-shrink-0 flex items-center justify-center hover:border-[#1B4332] transition-colors">
                          {isImg
                            ? <img src={docUrl} alt={label} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                            : <FileText className="w-5 h-5 text-[#52B788]" />}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                            <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">Ver</span>
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex-shrink-0 flex items-center justify-center bg-slate-50">
                          <Clock className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-semibold ${doc ? "text-[#1B4332]" : "text-slate-600"}`}>{label}</p>
                          {isOptional && <span className="text-xs text-slate-400 italic">(opcional)</span>}
                        </div>
                        {doc
                          ? <p className="text-xs text-[#52B788] font-medium mt-0.5">✓ {new Date(doc.subido_at).toLocaleDateString("es-MX")} {doc.size_bytes ? `· ${(doc.size_bytes / 1024).toFixed(0)} KB` : ""}</p>
                          : hint && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{hint}</p>
                        }
                      </div>
                      <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors flex-shrink-0 ${
                        doc ? "border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10" : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"
                      } ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {subiendo ? "Subiendo…" : doc ? "Cambiar" : "Subir"}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                          disabled={subiendo} onChange={e => subirDocumento(key, e.target.files?.[0])} />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-400">Formatos aceptados: PDF, JPG, PNG, WEBP · Máximo 10 MB por archivo</p>

        {/* Lightbox */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewDoc(null)}>
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium truncate">{previewDoc.filename}</span>
                <button onClick={() => setPreviewDoc(null)} className="text-white/70 hover:text-white ml-4 flex-shrink-0">✕</button>
              </div>
              {previewDoc.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(previewDoc.filename || "")
                ? <img src={previewDoc.url} alt={previewDoc.filename} className="max-h-[80vh] object-contain rounded-lg mx-auto" />
                : <iframe src={previewDoc.url} title={previewDoc.filename} className="w-full h-[80vh] rounded-lg bg-white" />
              }
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Sub-sections ── */

  const StatCards = () => (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Créditos disponibles</p>
              <p
                className={`text-3xl font-bold font-['Outfit'] ${
                  creditsLow ? "text-red-600" : "text-[#1B4332]"
                }`}
              >
                {credits}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                creditsLow ? "bg-red-50" : "bg-[#D9ED92]/40"
              }`}
            >
              <CreditCard
                className={`w-5 h-5 ${creditsLow ? "text-red-500" : "text-[#1B4332]"}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Valuaciones del mes</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">8</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#52B788]/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-[#52B788]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Valor portafolio</p>
              <p className="text-xl font-bold text-[#1B4332] font-['Outfit']">
                {formatMXN(18400000)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#1B4332]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Asesores activos</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">4</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#52B788]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#52B788]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const dias = billingData?.days_to_cutoff;
        const alerta = dias != null && dias <= 5;
        return (
          <Card className={`border-0 shadow-sm ${alerta ? "bg-amber-50" : "bg-white"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs mb-1 ${alerta ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                    {alerta ? "⚠️ Próximo corte" : "Próximo corte"}
                  </p>
                  <p className={`text-3xl font-bold font-['Outfit'] ${alerta ? "text-amber-600" : dias != null ? "text-[#1B4332]" : "text-slate-300"}`}>
                    {dias != null ? `${dias}d` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{billingData?.next_cutoff || "Sin plan activo"}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${alerta ? "bg-amber-100" : "bg-[#F0FAF5]"}`}>
                  {alerta
                    ? <Bell className="w-5 h-5 text-amber-500" />
                    : <Calendar className="w-5 h-5 text-[#1B4332]" />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );

  const PLAN_INFO_INMO = {
    inmobiliaria_lite5:   { label: "Lite 5",   precio: "$1,400", periodo: "mes", badge: "bg-slate-200 text-slate-700",      border: "border-slate-200 bg-slate-50",       valuaciones: 5,  usuarios: "1 titular",          extras: [] },
    inmobiliaria_lite10:  { label: "Lite 10",  precio: "$2,700", periodo: "mes", badge: "bg-slate-200 text-slate-700",      border: "border-slate-200 bg-slate-50",       valuaciones: 10, usuarios: "1 titular",          extras: [] },
    inmobiliaria_pro20:   { label: "Pro 20",   precio: "$5,200", periodo: "mes", badge: "bg-[#52B788] text-white",          border: "border-[#52B788]/30 bg-[#F0FAF5]",  valuaciones: 20, usuarios: "Hasta 5 asesores",   extras: ["Reporte de mercado mensual"] },
    inmobiliaria_premier: { label: "Premier",  precio: "$7,500", periodo: "mes", badge: "bg-[#1B4332] text-white",          border: "border-[#1B4332]/20 bg-[#1B4332]/5", valuaciones: 50, usuarios: "Hasta 50 usuarios",  extras: ["Reporte de mercado mensual", "Soporte dedicado", "Sin publicidad"] },
  };

  const derivePlanFromAsesores = () => {
    const n = parseInt(session?.num_asesores) || 0;
    if (n >= 6)  return "inmobiliaria_premier";
    if (n >= 2)  return "inmobiliaria_pro20";
    if (n === 1) return "inmobiliaria_lite10";
    return "inmobiliaria_lite5";
  };

  const PlanCard = () => {
    const planKey = session?.plan || derivePlanFromAsesores();
    const plan = PLAN_INFO_INMO[planKey];
    if (!plan) return (
      <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-white p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Sin plan activo</p>
          <p className="text-xs text-slate-400 mt-0.5">Activa un plan para solicitar valuaciones y acceder a todos los beneficios.</p>
        </div>
        <button onClick={handleComprarCreditos}
          className="shrink-0 bg-[#1B4332] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#163828] transition-colors">
          Ver planes
        </button>
      </div>
    );
    return (
      <div className={`mb-6 rounded-2xl border p-5 ${plan.border}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.badge}`}>Plan {plan.label}</span>
              <span className="text-xs text-slate-500">{plan.precio} MXN + IVA / {plan.periodo}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{plan.valuaciones} valuaciones/mes
              </span>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{plan.usuarios}
              </span>
              {plan.extras.map(e => (
                <span key={e} className="text-xs text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{e}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Valuaciones</p>
              <p className={`text-2xl font-bold font-['Outfit'] ${creditsLow ? "text-red-500" : "text-[#1B4332]"}`}>{credits}</p>
              <p className="text-[10px] text-slate-400">de {plan.valuaciones}</p>
            </div>
            <button onClick={handleComprarCreditos}
              className="bg-[#1B4332] hover:bg-[#163828] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              Renovar plan
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ResumenExtra = () => {
    const avgResenas = resumenResenas.length
      ? (resumenResenas.reduce((s, r) => s + r.calificacion, 0) / resumenResenas.length).toFixed(1)
      : null;
    const anunciosActivos = resumenAnuncios.filter(a => a.estado === "aprobado").length;
    const anunciosPendientes = resumenAnuncios.filter(a => a.estado === "pendiente").length;
    const kycOk = session?.kyc_status === "approved";
    const kycLabel = { approved: "Verificada", under_review: "En revisión", pending: "Sin verificar", rejected: "Rechazada" }[session?.kyc_status] || "Sin verificar";
    const kycColor = { approved: "text-[#52B788]", under_review: "text-amber-500", pending: "text-slate-400", rejected: "text-red-500" }[session?.kyc_status] || "text-slate-400";

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Reseñas */}
        <button onClick={() => setActiveTab("resenas")} className="text-left">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Reseñas</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              {avgResenas ? (
                <>
                  <p className="text-3xl font-bold font-['Outfit'] text-[#1B4332]">{avgResenas}</p>
                  <p className="text-xs text-slate-400 mt-1">{resumenResenas.length} reseña{resumenResenas.length !== 1 ? "s" : ""} · toca para ver</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-500">Sin reseñas aún</p>
                  <p className="text-xs text-slate-400 mt-1">Pide a tus clientes que califiquen</p>
                </>
              )}
            </CardContent>
          </Card>
        </button>

        {/* Publicidad */}
        <button onClick={() => setActiveTab("publicidad")} className="text-left">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Publicidad</p>
                <div className="w-8 h-8 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-[#52B788]" />
                </div>
              </div>
              <p className="text-3xl font-bold font-['Outfit'] text-[#1B4332]">{anunciosActivos}</p>
              <p className="text-xs text-slate-400 mt-1">
                anuncio{anunciosActivos !== 1 ? "s" : ""} activo{anunciosActivos !== 1 ? "s" : ""}
                {anunciosPendientes > 0 && ` · ${anunciosPendientes} en revisión`}
              </p>
            </CardContent>
          </Card>
        </button>

        {/* Verificación */}
        <button onClick={() => setActiveTab("documentos")} className="text-left">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Verificación</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kycOk ? "bg-[#D9ED92]/40" : "bg-slate-100"}`}>
                  <ShieldCheck className={`w-4 h-4 ${kycOk ? "text-[#52B788]" : "text-slate-400"}`} />
                </div>
              </div>
              <p className={`text-lg font-bold font-['Outfit'] ${kycColor}`}>{kycLabel}</p>
              <p className="text-xs text-slate-400 mt-1">{kycOk ? "Perfil público habilitado" : "Toca para subir documentos"}</p>
            </CardContent>
          </Card>
        </button>
      </div>
    );
  };

  /* ── Resumen Mercado (mini-charts para el tab Resumen) ── */
  const ResumenMercado = () => {
    const fmtMXN = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);
    const COLORS = ["#1B4332", "#52B788", "#D9ED92", "#74C69D", "#40916C", "#95D5B2"];
    const disponible = mercadoStats?.disponible;

    // Datos para los mini-charts
    const porTipo = disponible
      ? mercadoStats.por_tipo.slice(0, 5).map(r => ({ name: r.name, value: r.total }))
      : valuacionesList.reduce((acc, v) => {
          const t = acc.find(x => x.name === v.tipo);
          t ? t.value++ : acc.push({ name: v.tipo, value: 1 });
          return acc;
        }, []);

    const porZona = disponible
      ? mercadoStats.por_municipio.slice(0, 5).map(r => ({ name: r.name, value: r.total, precio_avg: r.precio_avg }))
      : [];

    const precioM2 = disponible
      ? mercadoStats.precio_m2_por_zona.slice(0, 5).map(r => ({ zona: r.name.split(" ")[0], pm2: Math.round(r.precio_m2_avg) }))
      : [];

    const renderTooltipMini = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      return (
        <div className="bg-white border border-slate-100 rounded-lg shadow px-3 py-2 text-xs">
          <p className="font-bold text-slate-700">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {p.value > 1000 ? fmtMXN(p.value) : p.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Header con link a Mercado */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Inteligencia de mercado</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {disponible
                ? `${mercadoStats.total.toLocaleString()} props scrapeadas · ${mercadoTipoOp} · GDL metro`
                : "Datos de tus valuaciones · mercado en actualización"}
            </p>
          </div>
          <button onClick={() => setActiveTab("mercado")}
            className="text-xs text-[#52B788] font-semibold hover:underline flex items-center gap-1">
            Ver análisis completo →
          </button>
        </div>

        {/* Fila de mini-charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tipos de propiedad */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Tipos de propiedad {disponible ? "· mercado" : "· mis avalúos"}
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={porTipo} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={renderTooltipMini} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Zonas más activas (solo si hay datos scraper) */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Zonas más activas {disponible ? "· mercado" : "· pendiente"}
              </p>
              {disponible && porZona.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={porZona} barSize={18} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={renderTooltipMini} />
                    <Bar dataKey="value" name="Propiedades" radius={[4, 4, 0, 0]}>
                      {porZona.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Map className="w-8 h-8" />
                  <p className="text-xs text-center">Ejecuta<br/><code className="text-[11px]">import_to_mongo.py</code></p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Precio/m² por zona */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Precio / m² por zona {disponible ? `· ${mercadoTipoOp}` : "· pendiente"}
              </p>
              {disponible && precioM2.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={precioM2} barSize={32} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="zona" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={renderTooltipMini} />
                    <Bar dataKey="pm2" name="$/m²" fill="#52B788" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="pm2" position="top" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ fontSize: 11, fill: "#1B4332", fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <BarChart2 className="w-8 h-8" />
                  <p className="text-xs text-center">Sin datos de mercado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fila de métricas clave del mercado */}
        {disponible && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {mercadoStats.por_municipio.slice(0, 4).map((z, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium">{z.name}</p>
                <p className="text-base font-bold text-[#1B4332] font-['Outfit'] mt-0.5">
                  {z.precio_avg ? fmtMXN(z.precio_avg) : "—"}
                </p>
                <p className="text-xs text-slate-400">{z.total.toLocaleString()} propiedades</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ValuacionesTable = () => (
    <Card className="bg-white border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4">
        <p className="font-['Outfit'] font-bold text-white text-base">Valuaciones recientes</p>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-[#1B4332]">Dirección</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Tipo</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Valuador</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Fecha</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Valor estimado</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
                <TableHead className="font-semibold text-[#1B4332]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuacionesList.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#52B788] shrink-0" />
                      <span className="text-sm text-[#1B4332]">{v.direccion}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {v.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {v.valuador_nombre || <span className="text-slate-300">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{v.fecha}</TableCell>
                  <TableCell className="font-semibold text-[#1B4332] text-sm">
                    {v.estado === "pendiente" ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      formatMXN(v.valor)
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.estado} />
                  </TableCell>
                  <TableCell>
                    {v.estado === "completada" && v.valuador_id && !v.calificada && (
                      <button
                        onClick={() => setCalificarModal(v)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Star className="w-3 h-3" />
                        Calificar
                      </button>
                    )}
                    {v.calificada && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        {v.calificacion_dada ?? "★"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const EquipoTable = () => {
    useEffect(() => {
      if (equipo !== null) return; // ya cargado
      fetch(`${API}/inmobiliaria/equipo`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(data => setEquipo(Array.isArray(data) ? data : []))
        .catch(() => setEquipo([]));
    }, []);

    const kycLabel = (s) => ({
      approved:     { label: "Verificado", cls: "bg-green-100 text-green-700" },
      under_review: { label: "En revisión", cls: "bg-blue-100 text-blue-700" },
      pending:      { label: "Pendiente",   cls: "bg-amber-100 text-amber-700" },
      rejected:     { label: "Rechazado",   cls: "bg-red-100 text-red-700" },
    }[s] || { label: s || "—", cls: "bg-slate-100 text-slate-500" });

    return (
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#D9ED92]" />
          <p className="font-['Outfit'] font-bold text-white text-base">
            Equipo de asesores
            {equipo && equipo.length > 0 && (
              <span className="text-sm font-normal text-[#D9ED92]/70 ml-1.5">({equipo.length})</span>
            )}
          </p>
        </div>
        <CardContent className="p-0">
          {equipo === null ? (
            <p className="text-sm text-slate-400 text-center py-10">Cargando equipo…</p>
          ) : (
            <>
              {equipo.length === 0 && (
                <div className="mx-6 mt-4 mb-2 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Ningún asesor vinculado aún. Los asesores que se registren poniendo <strong>"{session.company_name || "tu empresa"}"</strong> en el campo "Empresa afiliada" aparecerán aquí. <span className="text-amber-600 italic">Vista previa con datos de ejemplo:</span>
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-[#1B4332]">Asesor</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Contacto</TableHead>
                      <TableHead className="font-semibold text-[#1B4332] text-center">OPIs este mes</TableHead>
                      <TableHead className="font-semibold text-[#1B4332] text-center">Total histórico</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(equipo.length > 0 ? equipo : MOCK_ASESORES).map((a, i) => {
                      const kyc = kycLabel(equipo.length > 0 ? a.kyc_status : a._mock_kyc);
                      const isMock = equipo.length === 0;
                      return (
                        <TableRow key={isMock ? i : a.user_id} className={`hover:bg-slate-50 ${isMock ? "opacity-50" : ""}`}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#52B788] to-[#1B4332] flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">
                                  {(isMock ? a.nombre : a.nombre).split(" ").map(n => n[0]).slice(0,2).join("")}
                                </span>
                              </div>
                              <span className="font-medium text-[#1B4332] text-sm">{isMock ? a.nombre : a.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-500">{isMock ? a.email : a.email}</p>
                            {!isMock && a.phone && <p className="text-xs text-slate-400">{a.phone}</p>}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-base font-bold text-[#1B4332]">
                              {isMock ? a.valuaciones : a.valuaciones_mes}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-slate-500">
                              {isMock ? a.valuaciones * 3 : a.valuaciones_total}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kyc.cls}`}>{kyc.label}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const PerfilCard = () => {
    const fotoDoc = kycDocs.find(d => d.doc_tipo === "foto_profesional");
    const logoDoc = kycDocs.find(d => d.doc_tipo === "logo_empresa");
    const rs = session.redes_sociales || {};

    const medallaExp = {
      "Menos de 1 año": { emoji: "🌱", label: "Nueva en el mercado" },
      "1-3 años":       { emoji: "⭐", label: "En consolidación" },
      "3-5 años":       { emoji: "🌟", label: "Establecida" },
      "5-10 años":      { emoji: "💫", label: "Experimentada" },
      "Más de 10 años": { emoji: "🏆", label: "Experta del mercado" },
    }[session.q_anos_mercado] || null;

    const badgeCartera = {
      "1-5":       { emoji: "🏡", label: "1–5 propiedades" },
      "6-15":      { emoji: "🏘️", label: "6–15 propiedades" },
      "16-30":     { emoji: "🏙️", label: "16–30 propiedades" },
      "Más de 30": { emoji: "🌆", label: "30+ propiedades" },
    }[session.q_cartera_propiedades] || null;

    const allMedals = [
      medallaExp ? { ...medallaExp, color: "bg-amber-50 text-amber-800 border-amber-200" } : null,
      badgeCartera ? { ...badgeCartera, color: "bg-blue-50 text-blue-800 border-blue-200" } : null,
      session.asociacion ? { emoji: "🏛️", label: session.asociacion, color: "bg-[#F0FAF4] text-[#1B4332] border-[#52B788]/30" } : null,
      session.cursos ? { emoji: "🎓", label: session.cursos, color: "bg-purple-50 text-purple-800 border-purple-200" } : null,
      session.galardones ? { emoji: "🏅", label: session.galardones, color: "bg-yellow-50 text-yellow-800 border-yellow-200" } : null,
      session.q_oficina ? { emoji: "🏢", label: "Oficina física", color: "bg-slate-50 text-slate-700 border-slate-200" } : null,
      session.q_seguro_rc ? { emoji: "🛡️", label: "Seguro RC", color: "bg-green-50 text-green-700 border-green-200" } : null,
      session.kyc_status === "approved" ? { emoji: "✅", label: "Verificado PropValu", color: "bg-[#1B4332] text-white border-transparent" } : null,
    ].filter(Boolean);

    // Siempre visible — muestra "Pendiente" con botón editar si no hay valor
    const DataRow = ({ icon: Icon, label, value }) => (
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 text-[#52B788] flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500 mb-0.5">{label}</p>
          {value ? (
            <p className="text-sm text-slate-800 leading-snug">{value}</p>
          ) : (
            <button onClick={abrirEdicion}
              className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors font-medium">
              ✏️ Pendiente — completar
            </button>
          )}
        </div>
      </div>
    );

    // Helpers locales
    const Pending = () => (
      <button onClick={abrirEdicion}
        className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors font-semibold mt-0.5">
        ✏️ Pendiente
      </button>
    );
    const F = ({ label, value, span = 1 }) => (
      <div className={span === 2 ? "col-span-2" : span === 4 ? "col-span-4" : ""}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        {value ? <p className="text-sm text-slate-800 font-medium leading-snug">{value}</p> : <Pending />}
      </div>
    );
    const SH = ({ icon: Icon, title }) => (
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#D9ED92]" />
          <span className="font-['Outfit'] font-semibold text-white text-sm">{title}</span>
        </div>
        <button onClick={abrirEdicion}
          className="flex items-center gap-1 text-[#D9ED92] hover:text-white text-xs font-semibold transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
      </div>
    );

    return (
      <div className="space-y-4">

        {/* ── Header: empresa + foto ── */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-6 py-5 flex items-center gap-5">
            {/* Logo */}
            <div className="flex-shrink-0">
              {logoDoc ? (
                <img src={`${API}/kyc/documento/${logoDoc.doc_id}`} alt="Logo"
                  className="w-16 h-16 object-contain rounded-xl bg-white p-1.5 shadow" />
              ) : (
                <button onClick={() => setActiveTab("documentos")} title="Subir logo en Documentos"
                  className="w-16 h-16 rounded-xl bg-white/10 border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-0.5 hover:bg-white/20 transition-colors">
                  <Upload className="w-5 h-5 text-white/60" />
                  <span className="text-[9px] text-white/60 font-semibold leading-tight text-center">Subir<br/>logo</span>
                </button>
              )}
            </div>
            {/* Nombre + info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-['Outfit'] text-2xl font-bold text-white leading-tight truncate">
                {session.company_name || session.name || "Mi empresa"}
              </h2>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                {session.inmobiliaria_tipo === "titular" && <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">Titular</span>}
                {session.inmobiliaria_tipo === "asesor"  && <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">Asesor</span>}
                {session.kyc_status === "approved"      ? <span className="text-xs font-semibold bg-[#52B788] text-white px-2.5 py-0.5 rounded-full">✅ Verificado</span>
                : session.kyc_status === "under_review"  ? <span className="text-xs font-semibold bg-blue-400/80 text-white px-2.5 py-0.5 rounded-full">🔍 Verificación pendiente</span>
                : docsCompletos                           ? <span className="text-xs font-semibold bg-blue-400/80 text-white px-2.5 py-0.5 rounded-full">🎯 Listo — verificar</span>
                :                                          <span className="text-xs font-semibold bg-amber-400/80 text-white px-2.5 py-0.5 rounded-full">⚠️ Falta documentos</span>}
                {[session.municipio, session.estado].filter(Boolean).length > 0 && (
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{[session.municipio, session.estado].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>
            {/* Foto representante */}
            {fotoDoc ? (
              <img src={`${API}/kyc/documento/${fotoDoc.doc_id}`} alt="Foto"
                className="w-14 h-14 rounded-xl object-cover border-2 border-[#52B788]/60 shadow flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white/40" />
              </div>
            )}
          </div>
        {/* Medallas */}
        {allMedals.length > 0 && (
          <div className="px-6 py-3 bg-slate-50/60 flex flex-wrap gap-2">
            {allMedals.map((m, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${m.color}`}>
                <span className="text-base leading-none">{m.emoji}</span>{m.label}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* ── Contacto ── */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <SH icon={User} title="Contacto" />
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-4">
          <F label="Representante"     value={session.name} />
          <F label="Teléfono"          value={session.phone} />
          <F label="Email"             value={session.email} span={2} />
          <F label="Dirección oficina" value={session.q_dir_oficina} span={2} />
          {esTitular
            ? <F label="Nº de asesores"   value={session.num_asesores} />
            : <F label="Empresa afiliada" value={session.empresa_afiliada} />}
          <F label="Google Maps"
             value={session.q_maps_url
               ? <a href={session.q_maps_url} target="_blank" rel="noopener noreferrer" className="text-[#1B4332] hover:underline">Ver perfil ↗</a>
               : null} />
        </div>
      </div>

      {/* ── Redes y contacto digital ── */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <SH icon={Globe} title="Redes y contacto digital" />
        <div className="p-5">
          {(rs.website || rs.instagram || rs.facebook || rs.whatsapp) ? (
            <div className="flex flex-wrap gap-4">
              {rs.website   && <a href={rs.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#1B4332] hover:text-[#52B788] font-medium"><Globe className="w-3.5 h-3.5"/>{rs.website.replace(/^https?:\/\/(www\.)?/,"")}</a>}
              {rs.instagram && <a href={`https://instagram.com/${rs.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"><span>📸</span>{rs.instagram}</a>}
              {rs.facebook  && <a href={rs.facebook.startsWith("http") ? rs.facebook : `https://facebook.com/${rs.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><span>🔵</span>{rs.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//,"")}</a>}
              {rs.whatsapp  && <a href={`https://wa.me/${rs.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"><MessageCircle className="w-3.5 h-3.5"/>{rs.whatsapp}</a>}
            </div>
          ) : (
            <button onClick={abrirEdicion} className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 font-semibold">✏️ Pendiente — agregar redes</button>
          )}
        </div>
      </div>

      {/* ── Perfil operativo ── */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <SH icon={TrendingUp} title="Perfil operativo" />
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-4">
          <F label="Años en el mercado" value={session.q_anos_mercado} />
          <F label="Cartera activa"      value={session.q_cartera_propiedades} />
          <F label="CRM / Herramientas" value={session.q_crm} />
          <F label="Idiomas"             value={session.q_idiomas} />
          <F label="Software"            value={session.q_software} />
          <F label="Asociación"          value={session.asociacion} />
          <F label="Cursos y certs."     value={session.cursos} span={2} />
          {session.q_tipo_operaciones && Object.values(session.q_tipo_operaciones).some(Boolean) && (
            <div className="col-span-4 flex flex-wrap gap-1.5 pt-1">
              <p className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de operaciones</p>
              {Object.entries(session.q_tipo_operaciones).filter(([,v]) => v).map(([k]) => (
                <span key={k} className="text-xs px-2.5 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332] font-medium">{k.replace(/_/g," ")}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Trayectoria y cobertura ── */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <SH icon={Star} title="Trayectoria y cobertura" />
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-4">
          <F label="Galardones" value={session.galardones} span={2} />
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Zona de cobertura</p>
            {(session.estados?.length > 0 || session.municipios?.filter(Boolean).length > 0) ? (
              <div className="flex flex-wrap gap-1">
                {session.estados?.map(e => <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332] font-medium">{e}</span>)}
                {session.municipios?.filter(Boolean).map((m,i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{m}</span>)}
              </div>
            ) : <Pending />}
          </div>
        </div>
      </div>

    </div>
    );
  };

  const docsReminderList = session?.inmobiliaria_tipo === "titular"
    ? [
        { icon: "🪪", doc: "INE vigente (frente y vuelta)" },
        { icon: "📷", doc: "Foto profesional (fondo neutro, vestimenta formal)" },
        { icon: "🏢", doc: "Comprobante de domicilio del negocio (máx 3 meses)" },
        { icon: "🏛️", doc: "Certificado de asociación inmobiliaria (AMPI/CANACO/CIPS)" },
        { icon: "📋", doc: "Opinión de cumplimiento fiscal (SAT)" },
        { icon: "📄", doc: "Constancia de situación fiscal / RFC" },
        { icon: "🖼️", doc: "Logo de empresa (opcional)" },
      ]
    : [
        { icon: "🪪", doc: "INE vigente (frente y vuelta)" },
        { icon: "📷", doc: "Foto profesional (fondo neutro, vestimenta formal)" },
        { icon: "🏢", doc: "Comprobante de domicilio del negocio (máx 3 meses)" },
        { icon: "🪪", doc: "Credencial de empresa (gafete o carta de asesor activo)" },
        { icon: "🎓", doc: "Certificación de curso (AMPI/CANACO/CIPS/INFONAVIT)" },
      ];

  /* ────────────────────────────────────────────────────────
     EditarPerfilForm — editar redes sociales y datos de contacto
  ──────────────────────────────────────────────────────── */
  const abrirEdicion = () => {
    const rs = session.redes_sociales || {};
    setEditForm({
      phone:       session.phone       || "",
      q_dir_oficina: session.q_dir_oficina || "",
      q_maps_url:  session.q_maps_url  || "",
      asociacion:  session.asociacion  || "",
      cursos:      session.cursos      || "",
      galardones:  session.galardones  || "",
      redes_web:   rs.website    || "",
      redes_ig:    rs.instagram  || "",
      redes_wa:    rs.whatsapp   || "",
      redes_fb:    rs.facebook   || "",
    });
    setEditandoPerfil(true);
  };

  const guardarPerfil = async () => {
    setGuardando(true);
    try {
      const payload = {
        phone:        editForm.phone,
        q_dir_oficina: editForm.q_dir_oficina,
        q_maps_url:   editForm.q_maps_url,
        asociacion:   editForm.asociacion,
        cursos:       editForm.cursos,
        galardones:   editForm.galardones,
        redes_sociales: {
          website:   editForm.redes_web   || undefined,
          instagram: editForm.redes_ig    || undefined,
          whatsapp:  editForm.redes_wa    || undefined,
          facebook:  editForm.redes_fb    || undefined,
        },
      };
      const res = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("error");
      const updated = { ...session, ...payload };
      setSession(updated);
      localStorage.setItem("inmobiliaria_session", JSON.stringify(updated));
      setEditandoPerfil(false);
      toast.success("Perfil actualizado");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const EF = ({ label, field, placeholder, type = "text" }) => (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={editForm[field] || ""}
        onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#52B788] bg-[#F8FAF9]"
      />
    </div>
  );

  /* ────────────────────────────────────────────────────────
     ReseñasTab — reseñas de clientes + respuestas + Google Maps
  ──────────────────────────────────────────────────────── */
  const ReseñasTab = () => {
    const [resenas, setResenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyOpen, setReplyOpen] = useState({});   // { [id]: bool }
    const [replyText, setReplyText] = useState({});   // { [id]: string }
    const [sending, setSending] = useState({});       // { [id]: bool }

    const perfilId = session.id || session.email;

    useEffect(() => {
      fetch(`${API}/directorio/inmobiliarias/${perfilId}/resenas`)
        .then(r => r.json())
        .then(data => { setResenas(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }, [perfilId]);

    const avg = resenas.length
      ? (resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length).toFixed(1)
      : null;

    const dist = [5, 4, 3, 2, 1].map(n => ({
      n,
      count: resenas.filter(r => r.calificacion === n).length,
    }));

    const Stars = ({ value, size = "w-4 h-4" }) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`${size} ${i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
          />
        ))}
      </div>
    );

    const handleReply = async (resenaId) => {
      const text = (replyText[resenaId] || "").trim();
      if (!text) return;
      setSending(s => ({ ...s, [resenaId]: true }));
      try {
        const res = await fetch(
          `${API}/directorio/inmobiliarias/${perfilId}/resenas/${resenaId}/respuesta`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ respuesta: text }),
          }
        );
        if (!res.ok) throw new Error("error");
        setResenas(prev =>
          prev.map(r => r.id === resenaId ? { ...r, respuesta: text } : r)
        );
        setReplyOpen(s => ({ ...s, [resenaId]: false }));
        setReplyText(s => ({ ...s, [resenaId]: "" }));
        toast.success("Respuesta publicada");
      } catch {
        toast.error("No se pudo publicar la respuesta");
      } finally {
        setSending(s => ({ ...s, [resenaId]: false }));
      }
    };

    return (
      <div className="space-y-4">

        {/* Google Maps CTA */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-['Outfit'] font-semibold text-[#1B4332] text-base">
                Perfil en Google Maps
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Comparte tu perfil de Google para que clientes dejen reseñas ahí también.
              </p>
            </div>
            {session.q_maps_url ? (
              <a
                href={session.q_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-[#1B4332] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2D6A4F] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver mi perfil en Maps
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Agrega tu URL de Google Maps en el formulario de perfil
              </span>
            )}
          </CardContent>
        </Card>

        {/* Resumen de calificaciones */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <p className="font-['Outfit'] font-bold text-white text-base">Reseñas de clientes</p>
          </div>
          <CardContent className="p-5">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Cargando reseñas…</p>
            ) : resenas.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Aún no tienes reseñas</p>
                <p className="text-sm text-slate-400 mt-1">
                  Comparte tu perfil de PropValu con tus clientes para recibir las primeras.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Promedio + distribución */}
                <div className="flex items-center gap-8 pb-5 border-b border-slate-100">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-[#1B4332] font-['Outfit']">{avg}</p>
                    <Stars value={Math.round(avg)} size="w-5 h-5" />
                    <p className="text-xs text-slate-400 mt-1">{resenas.length} reseña{resenas.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {dist.map(({ n, count }) => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-3">{n}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: resenas.length ? `${(count / resenas.length) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista de reseñas */}
                <div className="space-y-4">
                  {resenas.map((r) => (
                    <div key={r.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{r.nombre_cliente}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(r.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        <Stars value={r.calificacion} />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{r.comentario}</p>

                      {/* Respuesta existente */}
                      {r.respuesta && (
                        <div className="bg-[#F0FAF4] border border-[#52B788]/30 rounded-lg p-3 mt-2">
                          <p className="text-[11px] font-semibold text-[#1B4332] mb-1">Tu respuesta</p>
                          <p className="text-sm text-[#2D6A4F]">{r.respuesta}</p>
                        </div>
                      )}

                      {/* Botón responder (solo si no hay respuesta aún) */}
                      {!r.respuesta && (
                        <div className="pt-1">
                          <button
                            onClick={() => setReplyOpen(s => ({ ...s, [r.id]: !s[r.id] }))}
                            className="flex items-center gap-1.5 text-xs text-[#1B4332] hover:text-[#52B788] font-medium transition-colors"
                          >
                            {replyOpen[r.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {replyOpen[r.id] ? "Cancelar" : "Responder"}
                          </button>
                          {replyOpen[r.id] && (
                            <div className="mt-2 flex gap-2">
                              <textarea
                                rows={2}
                                placeholder="Escribe tu respuesta…"
                                value={replyText[r.id] || ""}
                                onChange={e => setReplyText(s => ({ ...s, [r.id]: e.target.value }))}
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#52B788]"
                              />
                              <button
                                onClick={() => handleReply(r.id)}
                                disabled={sending[r.id] || !replyText[r.id]?.trim()}
                                className="flex-shrink-0 self-end bg-[#1B4332] text-white px-3 py-2 rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Manrope']">
      {/* Modal — documentos pendientes */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDocsModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#52B788] flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1B4332]">¡Registro completado! 🎉</h2>
                <p className="text-sm text-slate-500 mt-0.5">Ve preparando estos documentos para verificar tu cuenta</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed bg-[#F0FAF5] rounded-lg p-3">
              Tu cuenta ya está activa. Cuando tengas los documentos listos, súbelos desde la pestaña <strong>Documentos</strong> de tu panel para activar la verificación completa.
            </p>
            <div className="space-y-2 mb-5">
              {docsReminderList.map(({ icon, doc }) => (
                <div key={doc} className="flex gap-3 items-start bg-slate-50 rounded-xl p-2.5">
                  <span className="text-lg shrink-0">{icon}</span>
                  <p className="text-sm text-[#1B4332] font-medium leading-snug">{doc}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDocsModal(false)}
              className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors"
            >
              Entendido, iré preparando mis documentos
            </button>
          </div>
        </div>
      )}
      {/* Sticky Nav */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo + label */}
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
            <span className="hidden sm:block text-slate-300 select-none">|</span>
            <span className="hidden sm:block text-sm font-medium text-slate-500">
              Dashboard Inmobiliaria
            </span>
          </div>

          {/* Right: company chip + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-[#D9ED92]/40 rounded-full max-w-xs">
              {(() => {
                const fotoDoc = kycDocs.find(d => d.doc_tipo === "foto_profesional");
                const logoDoc = kycDocs.find(d => d.doc_tipo === "logo_empresa");
                const imgDoc = fotoDoc || logoDoc;
                return imgDoc ? (
                  <img src={`${API}/kyc/documento/${imgDoc.doc_id}`} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#52B788]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-300/60 border border-dashed border-slate-400/50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                );
              })()}
              <span className="text-sm font-medium text-[#1B4332] truncate pr-1">
                {displayName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-[#1B4332]"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KYC Banner */}
        {showKycBanner && (
          <div className={`mb-6 flex items-start justify-between gap-3 rounded-lg px-4 py-3 border ${docsCompletos ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${docsCompletos ? "text-blue-500" : "text-amber-600"}`} />
              <p className={`text-sm ${docsCompletos ? "text-blue-800" : "text-amber-800"}`}>
                <span className="font-semibold">{docsCompletos ? "Documentos completos" : "Falta de documentos"}</span> —
                {docsCompletos
                  ? " ya puedes solicitar tu verificación PropValu."
                  : " sube los documentos requeridos para solicitar la verificación."}
              </p>
            </div>
            {docsCompletos ? (
              <button onClick={solicitarVerificacion}
                className="text-xs font-semibold text-blue-700 border border-blue-300 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 whitespace-nowrap shrink-0">
                🎯 Solicitar verificación
              </button>
            ) : (
              <button onClick={() => setActiveTab("documentos")}
                className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 whitespace-nowrap shrink-0">
                Ver documentos
              </button>
            )}
          </div>
        )}

        {/* Tab Nav + Plan badge */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#1B4332] text-white shadow-sm"
                    : "text-slate-500 hover:text-[#1B4332]"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Plan — misma fila que tabs */}
          {(() => {
            const planKey = session?.plan || derivePlanFromAsesores();
            const plan = PLAN_INFO_INMO[planKey];
            if (!plan) return (
              <button onClick={handleComprarCreditos}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50 transition-colors shrink-0">
                <CreditCard className="w-3.5 h-3.5"/> Activar plan
              </button>
            );
            return (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border shrink-0 ${plan.border}`}>
                {/* Badge + precio */}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full w-fit ${plan.badge}`}>Plan {plan.label}</span>
                  <span className="text-[10px] text-slate-400">{plan.precio} MXN / {plan.periodo}</span>
                </div>
                {/* Separador */}
                <div className="w-px h-8 bg-slate-200"/>
                {/* Beneficios */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0"/>{plan.valuaciones} valuaciones/mes
                  </span>
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0"/>{plan.usuarios}
                  </span>
                  {plan.extras.slice(0,1).map(e => (
                    <span key={e} className="text-[11px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0"/>{e}
                    </span>
                  ))}
                </div>
                {/* Separador */}
                <div className="w-px h-8 bg-slate-200"/>
                {/* Créditos */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400">Créditos</span>
                  <span className={`text-xl font-bold font-['Outfit'] leading-none ${creditsLow ? "text-red-500" : "text-[#1B4332]"}`}>{credits}</span>
                  <span className="text-[10px] text-slate-400">de {plan.valuaciones}</span>
                </div>
                {/* Botón */}
                <button onClick={handleComprarCreditos}
                  className="bg-[#1B4332] hover:bg-[#163828] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                  Renovar plan
                </button>
              </div>
            );
          })()}
        </div>

        {/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <>
            <StatCards />
            <ResumenExtra />
            <ResumenMercado />
          </>
        )}

        {/* Tab: Mercado */}
        {activeTab === "mercado" && (
          <MercadoViewM
            modo="inmobiliaria"
            nombreUsuario={session?.empresa || session?.name || "Inmobiliaria"}
            valuacionesPropias={valuacionesList}
            planId={session?.plan || ""}
            API={API}
          />
        )}

        {/* Tab: Valuaciones */}
        {activeTab === "valuaciones" && (
          <>
            <div className="flex items-center justify-end mb-4">
              <Button
                onClick={() => navigate("/valuar")}
                className="bg-[#52B788] hover:bg-[#40916C] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Valuación
              </Button>
            </div>
            <ValuacionesTable />
          </>
        )}

        {/* Tab: Equipo */}
        {activeTab === "equipo" && <EquipoTable />}

        {/* Tab: Documentos */}
        {activeTab === "documentos" && <DocumentosTab />}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={editandoPerfil ? () => setEditandoPerfil(false) : abrirEdicion}
                className="text-sm font-semibold text-[#1B4332] hover:text-[#52B788] transition-colors flex items-center gap-1.5"
              >
                {editandoPerfil ? "✕ Cancelar" : "✏️ Editar perfil"}
              </button>
            </div>

            {editandoPerfil && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <p className="font-['Outfit'] font-semibold text-[#1B4332] text-base">Editar datos de perfil</p>

                <div className="grid grid-cols-2 gap-4">
                  <EF label="Teléfono" field="phone" placeholder="55 1234 5678" />
                  <EF label="Dirección de oficina" field="q_dir_oficina" placeholder="Av. López Mateos 123, Zapopan" />
                  <EF label="Google Maps URL" field="q_maps_url" placeholder="https://maps.google.com/..." />
                  <EF label="Asociación (AMPI, CANACO...)" field="asociacion" placeholder="AMPI Jalisco" />
                  <div className="col-span-2">
                    <EF label="Cursos y certificaciones" field="cursos" placeholder="Certificado AMPI 2023, Curso INFONAVIT..." />
                  </div>
                  <div className="col-span-2">
                    <EF label="Galardones y reconocimientos" field="galardones" placeholder="Premio AMPI 2023, Mejor Agente del Año..." />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Redes sociales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <EF label="Sitio web" field="redes_web" placeholder="https://miinmobiliaria.mx" />
                    <EF label="Instagram" field="redes_ig" placeholder="@miinmobiliaria" />
                    <EF label="WhatsApp" field="redes_wa" placeholder="33 1234 5678" />
                    <EF label="Facebook" field="redes_fb" placeholder="/miinmobiliaria o URL" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setEditandoPerfil(false)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarPerfil}
                    disabled={guardando}
                    className="bg-[#1B4332] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
                  >
                    {guardando ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}

            <PerfilCard />
          </div>
        )}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && <ReseñasTab />}
        {activeTab === "facturacion" && <FacturacionTab />}

        {/* Tab: Publicidad */}
        {activeTab === "publicidad" && <PublicidadTab />}
      </main>

      {/* Modal calificar valuador */}
      {calificarModal && (
        <ModalCalificarValuador
          valuacion={calificarModal}
          onClose={() => setCalificarModal(null)}
          onCalificado={(id, stars) => {
            setValuacionesList((prev) =>
              prev.map((v) => v.id === id ? { ...v, calificada: true, calificacion_dada: stars } : v)
            );
          }}
        />
      )}
    </div>
  );
};

export default InmobiliariaDashboardPage;
