import { useState, useEffect } from "react";
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
  Star,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  Plus,
  MapPin,
  AlertTriangle,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Upload,
  Calendar,
  Bell,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Clock,
  XCircle,
  Pencil,
  X,
  Save,
  Globe,
  Briefcase,
  Award,
  MessageCircle,
  ExternalLink,
  Send,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Map,
  Activity,
  Building,
  Home,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Maximize2,
  Download,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/App";
import { compressFile } from "@/lib/compressFile";

/* ─── PropValu Watermark ─────────────────────────────── */
const PropValuWatermark = ({ nombre, fecha }) => (
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
      <p className="text-[10px] font-semibold text-slate-600">{nombre || "Análisis de mercado"}</p>
      <p className="text-[9px] text-slate-400">{fecha || new Date().toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" })} · GDL metro</p>
    </div>
  </div>
);

/* ─── ChartModal (fullscreen) ────────────────────────── */
const ChartModal = ({ open, onClose, title, children, nombre }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-['Outfit'] font-bold text-[#1B4332] text-base">{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <PropValuWatermark nombre={nombre} />
        </div>
      </div>
    </div>
  );
};

/* ─── ChartCard (card con botón expand) ──────────────── */
const ChartCard = ({ title, subtitle, icon, children, modalChildren, className = "", nombre }) => {
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
                <p className="text-sm font-bold text-[#1B4332]">{title}</p>
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
      <ChartModal open={open} onClose={() => setOpen(false)} title={title} nombre={nombre}>
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

/* ─── Helpers ─────────────────────────────────────────────── */

function normalizeValuacion(v) {
  const statusMap = { completed: "completada", draft: "pendiente" };
  return {
    id: v.valuation_id,
    direccion: v.property_data?.street_address || "Sin dirección",
    tipo: v.property_data?.property_type || "—",
    fecha: v.created_at
      ? new Date(v.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    valor: v.result?.estimated_value || 0,
    estado: statusMap[v.status] || "en_proceso",
  };
}

/* ─── Modal Nuevo Anuncio ─────────────────────────────── */
const SLOTS_LIST = [
  { id: "reporte_pdf",      label: "Página de Reporte",        desc: "Aparece antes de descargar el PDF",    precio: 990  },
  { id: "directorio_top",   label: "Directorio · Destacado",   desc: "Posición top en el directorio",        precio: 690  },
  { id: "landing_banner",   label: "Banner Landing",           desc: "Banner en la página principal",        precio: 590  },
  { id: "dashboard_banner", label: "Banner Dashboard",         desc: "Banner en dashboards de usuarios",     precio: 490  },
];
const DURACIONES = [{ d: 7, label: "7 días" }, { d: 15, label: "15 días" }, { d: 30, label: "30 días" }];

const ModalNuevoAnuncio = ({ session, onClose, onCreado }) => {
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
      const token = session?.session_token || "";
      const res = await fetch(`${API}/advertisers/anuncios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
          <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
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
              {DURACIONES.map(({ d, label }) => (
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
              placeholder="Ej. Valuaciones comerciales en Guadalajara"
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

const ValuadorDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");

  useEffect(() => {
    const fromState = location.state?.user;
    if (fromState) {
      setSession(fromState);
      localStorage.setItem("valuador_session", JSON.stringify(fromState));
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("valuador_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
        // Refrescar kyc_status desde el servidor para reflejar cambios del admin
        fetch(`${API}/auth/me`, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(me => {
            if (me && me.kyc_status !== stored.kyc_status) {
              const updated = { ...stored, kyc_status: me.kyc_status };
              setSession(updated);
              localStorage.setItem("valuador_session", JSON.stringify(updated));
            }
          })
          .catch(() => {});
      } else {
        navigate("/login", { state: { role: "appraiser" } });
      }
    } catch {
      navigate("/login", { state: { role: "appraiser" } });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // silently ignore network errors on logout
    }
    localStorage.removeItem("valuador_session");
    navigate("/login");
  };

  const showKycBanner =
    !session?.kyc_status || session.kyc_status === "pending";

  const checkedServices = session?.services
    ? Object.entries(session.services)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : [];

  const serviceLabel = (key) => {
    const map = {
      infonavit: "Infonavit",
      fovissste: "Fovissste",
      comerciales: "Comerciales",
      catastrales: "Catastrales",
      inspeccion: "Inspección",
      peritajes: "Peritajes",
      otros: "Otros",
    };
    return map[key] || key;
  };

  /* ── Valuaciones state ── */
  const [valuaciones, setValuaciones] = useState([]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/valuations`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setValuaciones((data || []).map(normalizeValuacion)))
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

  /* ── Mercado stats ── */
  const [mercadoStats, setMercadoStats] = useState(null);
  const [mercadoTipoOp, setMercadoTipoOp] = useState("venta");

  useEffect(() => {
    fetch(`${API}/mercado/stats?tipo_op=${mercadoTipoOp}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setMercadoStats(d))
      .catch(() => {});
  }, [mercadoTipoOp]);

  /* ── Resumen quick data ── */
  const [resumenResenas, setResumenResenas] = useState([]);
  const [resumenAnuncios, setResumenAnuncios] = useState([]);

  useEffect(() => {
    if (!session) return;
    const id = session.user_id || session.id || session.email;
    fetch(`${API}/directorio/valuadores/${id}/resenas`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setResumenResenas(Array.isArray(d) ? d : []))
      .catch(() => {});
    const token = session?.session_token || "";
    fetch(`${API}/advertisers/mis-anuncios`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : { anuncios: [] })
      .then(d => setResumenAnuncios(d.anuncios || []))
      .catch(() => {});
  }, [session]);

  /* ── Docs state ── */
  const [kycDocs, setKycDocs] = useState([]);
  const [kycSubiendo, setKycSubiendo] = useState({});
  const [kycError, setKycError] = useState("");

  /* ── Perfil edit state ── */
  const [editSection, setEditSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingSection, setSavingSection] = useState(false);

  /* ── Doc preview lightbox ── */
  const [previewDoc, setPreviewDoc] = useState(null); // { url, type, filename }

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/kyc/mis-documentos`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setKycDocs(d.documentos || []))
      .catch(() => {});
  }, [session]);

  if (!session) return null;

  /* ── Tabs ── */
  const docsBase = ["ine_frente","cedula","cedula_valuador","foto_profesional","comprobante_experiencia","firma_autografa","comprobante_adicional"];
  const docsInfonav = (session?.services?.infonavit || session?.services?.fovissste) ? ["carta_unidad"] : [];
  const docsCapta = (session?.services?.catastrales || session?.services?.obras_publicas) ? ["comprobante_catastro"] : [];
  const docsCompleto = session?.modo_perfil === "completo"
    ? ["comprobante_domicilio","carta_recomendacion","curriculum","avaluo_muestra_1","avaluo_muestra_2","avaluo_muestra_3"]
    : [];
  const docsRequeridos = [...docsBase, ...docsInfonav, ...docsCapta, ...docsCompleto];

  const docsCompletos = docsRequeridos.every(k => kycDocs.find(d => d.doc_tipo === k));

  const tienePlan = !!(session?.plan);
  const credits = session?.credits ?? 0;
  const creditsLow = tienePlan && credits <= 2;

  const TABS = [
    { id: "resumen",      label: "Resumen" },
    ...(tienePlan ? [{ id: "mercado", label: "Mercado" }] : []),
    { id: "valuaciones",  label: "Valuaciones" },
    { id: "expediente",   label: "Documentos", badge: !docsCompletos && session?.kyc_status !== "approved" },
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
    const PREF_OPTIONS = [
      { value: "auto",        label: "Automático",      desc: "Se descuenta del saldo al corte sin confirmación" },
      { value: "ask_monthly", label: "Confirmar cada mes", desc: "PropValu te avisa 5 días antes para que autorices" },
      { value: "manual",      label: "Solo tarjeta",    desc: "Siempre se cobra a tu tarjeta registrada" },
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

        {/* Ciclo actual */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`border-0 shadow-sm ${alerta ? "bg-amber-50" : "bg-white"}`}>
            <CardContent className="p-5">
              <p className={`text-xs mb-1 ${alerta ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
                {alerta ? "⚠️ Próximo corte" : "Próximo corte"}
              </p>
              <p className={`text-2xl font-bold font-['Outfit'] ${alerta ? "text-amber-600" : "text-[#1B4332]"}`}>
                {days_to_cutoff} días
              </p>
              <p className="text-xs text-slate-400 mt-1">{next_cutoff} · Ciclo desde {cycle_start}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">Balance proyectado</p>
              <p className={`text-2xl font-bold font-['Outfit'] ${balance >= 0 ? "text-[#1B4332]" : "text-red-600"}`}>
                {balance >= 0 ? "+" : ""}{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(balance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {balance >= 0
                  ? "A depositar en tu cuenta"
                  : `Diferencia a cobrar: ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Math.abs(balance))}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Desglose */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Desglose del ciclo</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ganancias por encargos</span>
                <span className="font-semibold text-[#1B4332]">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(earnings_this_cycle)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Costo plan ({session?.plan || "—"})</span>
                <span className="font-semibold text-slate-700">
                  − {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(plan_cost)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-bold">
                <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>
                  {balance >= 0 ? "A depositar" : "A cobrar"}
                </span>
                <span className={balance >= 0 ? "text-[#1B4332]" : "text-red-600"}>
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Math.abs(balance))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferencia de cobro */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">Preferencia de renovación</p>
            <div className="space-y-2">
              {PREF_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => saveBillingPref(opt.value)}
                  disabled={savingPref}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    billingPref === opt.value
                      ? "border-[#52B788] bg-[#F0FAF5]"
                      : "border-slate-200 bg-white hover:border-[#52B788]/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      billingPref === opt.value ? "border-[#52B788]" : "border-slate-300"
                    }`}>
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
      const token = session?.session_token || "";
      fetch(`${API}/advertisers/mis-anuncios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
        .then((r) => r.ok ? r.json() : { anuncios: [] })
        .then((d) => setAnuncios(d.anuncios || []))
        .catch(() => setAnuncios([]))
        .finally(() => setCargando(false));
    }, []);

    const ESTADO_AD = {
      aprobado:  { label: "Activo",     cls: "bg-green-100 text-green-700" },
      pendiente: { label: "En revisión",cls: "bg-amber-100 text-amber-700" },
      rechazado: { label: "Rechazado",  cls: "bg-red-100 text-red-600"     },
      pausado:   { label: "Pausado",    cls: "bg-slate-100 text-slate-500"  },
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
              Llega a cientos de propietarios que solicitan valuaciones cada mes. Sin verificación adicional — ya estás dado de alta.
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
            <p className="text-sm text-slate-400 mb-4">Crea tu primer anuncio y empieza a captar clientes directamente en la plataforma.</p>
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

        {/* Modal nuevo anuncio */}
        {modalNuevo && <ModalNuevoAnuncio session={session} onClose={() => setModalNuevo(false)} onCreado={() => { setModalNuevo(false); setCargando(true); }} />}
      </div>
    );
  };

  /* ── Mercado Tab ── */
  const MercadoTab = () => {
    const tipoOp = mercadoTipoOp;
    const setTipoOp = setMercadoTipoOp;
    const stats = mercadoStats;
    const cargando = stats === undefined;
    const [coloniaData, setColoniaData] = useState(null);
    const [coloniaBusqueda, setColoniaBusqueda] = useState("");
    const [coloniaPagina, setColoniaPagina] = useState(1);
    const [coloniaOrden, setColoniaOrden] = useState({ col: "total", asc: false });
    const [coloniaFiltroMunicipio, setColoniaFiltroMunicipio] = useState("");
    const [coloniaFiltroSegmento, setColoniaFiltroSegmento] = useState("");
    const [coloniaFiltrosRango, setColoniaFiltrosRango] = useState({ totalMin: "", totalMax: "", precioMin: "", precioMax: "", m2Min: "", m2Max: "", pctMin: "", pctMax: "" });
    const [coloniaFiltrosExpanded, setColoniaFiltrosExpanded] = useState(false);
    const COLONIAS_POR_PAG = 20;

    const valuadorNombre = session?.name || "Valuador";

    useEffect(() => {
      setColoniaData(null);
      fetch(`${API}/mercado/colonias?tipo_op=${tipoOp}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setColoniaData(d))
        .catch(() => {});
    }, [tipoOp]);

    const fmtMXN = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

    const COORDS_M = {
      "zapopan":     [20.721, -103.401],
      "guadalajara": [20.659, -103.349],
      "tlaquepaque": [20.640, -103.312],
      "tonalá":      [20.624, -103.235],
      "tlajomulco":  [20.474, -103.444],
      "default":     [20.666, -103.350],
    };
    const getMunicipio = (dir) => {
      const d = (dir || "").toLowerCase();
      for (const k of Object.keys(COORDS_M)) {
        if (d.includes(k)) return k;
      }
      return "default";
    };
    const puntosValuador = valuaciones.map((v, i) => {
      const mun = getMunicipio(v.direccion);
      const [lat, lng] = COORDS_M[mun];
      return { ...v, lat: lat + (Math.sin(i * 1.3) * 0.008), lng: lng + (Math.cos(i * 1.7) * 0.008) };
    });

    const porZona = Object.entries(
      valuaciones.reduce((acc, v) => {
        const m = getMunicipio(v.direccion);
        const label = m === "default" ? "Otra zona" : m.charAt(0).toUpperCase() + m.slice(1);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    const porTipo = Object.entries(
      valuaciones.reduce((acc, v) => {
        acc[v.tipo] = (acc[v.tipo] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    const tendencia = [
      { mes: "Oct", avaluos: 2 },
      { mes: "Nov", avaluos: 3 },
      { mes: "Dic", avaluos: 2 },
      { mes: "Ene", avaluos: 4 },
      { mes: "Feb", avaluos: 5 },
      { mes: "Mar", avaluos: valuaciones.filter(v => v.fecha?.includes("mar")).length || 4 },
    ];

    const mercadoDisponible = stats?.disponible;
    const porTipoMercado = mercadoDisponible ? stats.por_tipo.map(r => ({ name: r.name, value: r.total })) : porTipo;
    const porZonaMercado = mercadoDisponible ? stats.por_municipio.map(r => ({ name: r.name, value: r.total })) : porZona;
    const precioM2Zonas = mercadoDisponible
      ? stats.precio_m2_por_zona.map(r => ({ zona: r.name, mercado: Math.round(r.precio_m2_avg) }))
      : [];
    const totalMercado = stats?.total ?? 0;
    const tiposPorZona = stats?.tipos_por_zona ?? [];
    const tiposUnicos = mercadoDisponible
      ? [...new Set(tiposPorZona.flatMap(z => Object.keys(z).filter(k => k !== "municipio")))]
      : [];

    const getSegmento = (precio) => {
      if (!precio) return "Sin dato";
      if (tipoOp === "venta") {
        if (precio < 1_000_000) return "Económico";
        if (precio < 3_000_000) return "Medio";
        if (precio < 7_000_000) return "Medio-Alto";
        if (precio < 15_000_000) return "Alto";
        if (precio < 30_000_000) return "Premium";
        if (precio < 60_000_000) return "Lujo";
        return "Super Lujo";
      } else {
        if (precio < 5_000) return "Económico";
        if (precio < 12_000) return "Medio";
        if (precio < 25_000) return "Medio-Alto";
        if (precio < 50_000) return "Alto";
        if (precio < 100_000) return "Premium";
        if (precio < 200_000) return "Lujo";
        return "Super Lujo";
      }
    };
    const SEGMENTO_COLORS = { "Económico":"#52B788","Medio":"#1B4332","Medio-Alto":"#F4A261","Alto":"#9B5DE5","Premium":"#E63946","Lujo":"#C77DFF","Super Lujo":"#FF6B6B","Sin dato":"#94a3b8" };

    const analisisMercado = (() => {
      if (!mercadoDisponible) return null;
      const tipos = stats.por_tipo;
      const zonas = stats.por_municipio;
      const precios = stats.precio_m2_por_zona;
      const topTipo = tipos[0];
      const topZona = zonas[0];
      const preciosOrdenados = [...(precios || [])].sort((a,b) => b.precio_m2_avg - a.precio_m2_avg);
      const topPrecio = preciosOrdenados[0];
      const zonaBarata = preciosOrdenados[preciosOrdenados.length - 1];
      const totalTipos = tipos.reduce((s,t) => s + t.total, 0);
      const pctTop = topTipo ? Math.round(topTipo.total / totalTipos * 100) : 0;
      const opLabel = tipoOp === "venta" ? "venta" : "renta";
      const fmtM = v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`;

      const colonias = coloniaData?.colonias ?? [];
      const TIPOS_LIST = ["Casa","Departamento","Terreno","Local","Bodega","Oficina"];

      const tiposPorMunicipio = {};
      colonias.forEach(c => {
        if (!c.municipio || c.municipio === "—") return;
        const mun = c.municipio.replace(/\s+de\s+Zú?[ñn]iga/i,"").trim();
        if (!tiposPorMunicipio[mun]) tiposPorMunicipio[mun] = {};
        TIPOS_LIST.forEach(t => {
          tiposPorMunicipio[mun][t] = (tiposPorMunicipio[mun][t] || 0) + (c[t] || 0);
        });
      });
      const topTipoPorMunicipio = Object.entries(tiposPorMunicipio)
        .map(([mun, counts]) => {
          const sorted = Object.entries(counts).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
          if (!sorted.length) return null;
          const [tipo, count] = sorted[0];
          const pct = Math.round(count / Object.values(counts).reduce((s,v)=>s+v,0) * 100);
          return { mun, tipo, count, pct, segundo: sorted[1] };
        })
        .filter(Boolean).sort((a,b) => b.count - a.count).slice(0, 5);

      const medianaPrecioM2 = (() => {
        const vals = colonias.flatMap(c => TIPOS_LIST.map(t => c[`${t}_pm2`]).filter(Boolean)).sort((a,b)=>a-b);
        return vals.length ? vals[Math.floor(vals.length/2)] : 0;
      })();

      const conteoSegmentos = {};
      colonias.forEach(c => {
        if (!c.precio_avg) return;
        const s = getSegmento(c.precio_avg);
        conteoSegmentos[s] = (conteoSegmentos[s] || 0) + (c.total || 0);
      });
      const segOrden = ["Económico","Medio","Medio-Alto","Alto","Premium","Lujo","Super Lujo"];
      const topSegmento = segOrden.reduce((top, s) => (!top || (conteoSegmentos[s]||0) > (conteoSegmentos[top]||0)) ? s : top, null);
      const segPresentes = segOrden.filter(s => conteoSegmentos[s] > 0);
      const hayLujo = (conteoSegmentos["Lujo"]||0) + (conteoSegmentos["Super Lujo"]||0) > 0;

      const oportunidades = colonias
        .filter(c => {
          const pm2s = TIPOS_LIST.map(t => c[`${t}_pm2`]).filter(Boolean);
          const avgPm2 = pm2s.length ? pm2s.reduce((s,v)=>s+v,0)/pm2s.length : null;
          return c.total >= 10 && avgPm2 && avgPm2 < medianaPrecioM2 * 0.75;
        })
        .sort((a,b) => b.total - a.total).slice(0, 3);

      const coloniaTopPrecio = colonias
        .map(c => {
          const pm2s = TIPOS_LIST.map(t => c[`${t}_pm2`]).filter(Boolean);
          return { ...c, avgPm2: pm2s.length ? Math.round(pm2s.reduce((s,v)=>s+v,0)/pm2s.length) : 0 };
        })
        .filter(c => c.avgPm2 > 0).sort((a,b) => b.avgPm2 - a.avgPm2)[0];

      const precioSpread = topPrecio && zonaBarata && zonaBarata.name !== topPrecio.name
        ? Math.round((topPrecio.precio_m2_avg - zonaBarata.precio_m2_avg) / zonaBarata.precio_m2_avg * 100) : 0;
      const tiposActivos = tipos.filter(t => t.total > 0).length;
      const ultimosMeses = tendencia.slice(-2);
      const tendDir = ultimosMeses.length === 2
        ? (ultimosMeses[1].avaluos > ultimosMeses[0].avaluos ? "al alza ↑" : ultimosMeses[1].avaluos < ultimosMeses[0].avaluos ? "a la baja ↓" : "estable →") : "estable →";

      const textoComposicion = topTipoPorMunicipio.length > 0
        ? topTipoPorMunicipio.map(r => `${r.mun}: ${r.tipo.toLowerCase()} (${r.pct}%${r.segundo ? `, seguido de ${r.segundo[0].toLowerCase()}` : ""})`).join(" · ")
        : "";

      const textoSegmentos = (() => {
        if (!topSegmento) return "";
        const partes = [];
        partes.push(`El segmento dominante es ${topSegmento} con ${(conteoSegmentos[topSegmento]||0).toLocaleString()} propiedades.`);
        if (hayLujo) {
          const totalLujo = (conteoSegmentos["Lujo"]||0) + (conteoSegmentos["Super Lujo"]||0);
          const pctLujo = Math.round(totalLujo / totalMercado * 100);
          partes.push(`Hay ${totalLujo.toLocaleString()} propiedades en segmento Lujo/Super Lujo (${pctLujo}% del mercado).`);
        }
        const econ = conteoSegmentos["Económico"] || 0;
        if (econ > 0) partes.push(`Segmento Económico: ${econ.toLocaleString()} unidades (${Math.round(econ / totalMercado * 100)}%).`);
        partes.push(`Segmentos activos: ${segPresentes.join(", ")}.`);
        return partes.join(" ");
      })();

      return [
        { titulo: "Panorama general", texto: `El mercado de ${opLabel} en GDL metro registra ${totalMercado.toLocaleString()} propiedades activas. La oferta se distribuye en ${tiposActivos} tipos, concentrándose en ${zonas.slice(0,3).map(z=>z.name).join(", ")}.` },
        { titulo: "Composición por municipio", texto: textoComposicion || `${topZona?.name} concentra ${topZona?.total?.toLocaleString()} propiedades · tipo predominante: ${topTipo?.name}.` },
        { titulo: "Precio/m² y spread", texto: topPrecio ? `${topPrecio.name} lidera con ${fmtM(topPrecio.precio_m2_avg)}/m²${zonaBarata && zonaBarata.name !== topPrecio.name ? `; ${zonaBarata.name} es la zona más accesible con ${fmtM(zonaBarata.precio_m2_avg)}/m²` : ""}${precioSpread > 0 ? ` — brecha del ${precioSpread}%.` : "."}${coloniaTopPrecio ? ` Colonia con mayor $/m²: ${coloniaTopPrecio.colonia} ($${coloniaTopPrecio.avgPm2.toLocaleString()}/m²).` : ""}` : "" },
        { titulo: "Segmentos de precio", texto: textoSegmentos },
        { titulo: "Oportunidades detectadas", texto: oportunidades.length > 0 ? `Colonias con alta oferta y precio/m² bajo la mediana ($${medianaPrecioM2.toLocaleString()}/m²): ${oportunidades.map(c => { const pm2s = TIPOS_LIST.map(t => c[`${t}_pm2`]).filter(Boolean); const avgPm2 = pm2s.length ? Math.round(pm2s.reduce((s,v)=>s+v,0)/pm2s.length) : null; return `${c.colonia} (${c.total} props · $${avgPm2?.toLocaleString()}/m²)`; }).join(", ")}.` : `Sin colonias con precio/m² significativamente bajo la mediana ($${medianaPrecioM2.toLocaleString()}/m²).` },
        { titulo: "Pulso del mes", texto: `Tus avalúos van ${tendDir} respecto al mes anterior. Tipo más activo en mercado: ${topTipo?.name || "—"} (${topTipo?.total?.toLocaleString() || 0} unidades · ${pctTop}% del mercado). Colonia más activa: ${colonias[0]?.colonia || "—"} con ${colonias[0]?.total || 0} propiedades.` },
      ].filter(p => p.texto);
    })();

    const COLORS = ["#1B4332", "#52B788", "#D9ED92", "#74C69D", "#40916C"];
    const TIPO_COLORS = { Casa: "#1B4332", Departamento: "#52B788", Terreno: "#95B849", Local: "#F4A261", Bodega: "#9B5DE5", Oficina: "#00BBF9", Otro: "#94a3b8" };

    const exportarPDF = (orientacion = "landscape") => {
      const styleId = "propvalu-print-style";
      if (!document.getElementById(styleId)) {
        const s = document.createElement("style");
        s.id = styleId;
        s.innerHTML = `@media print { @page { size: ${orientacion === "landscape" ? "letter landscape" : "letter portrait"}; margin: 10mm 8mm; } body > * { display: none !important; } #propvalu-print-root { display: block !important; } #propvalu-print-root .no-print { display: none !important; } .print-header { background: #1B4332; color: white; padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; } .print-header h1 { font-size: 16px; font-weight: bold; margin: 0 0 2px; } .print-header p { font-size: 10px; margin: 0; opacity: 0.85; } .recharts-wrapper, .recharts-surface { overflow: visible !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } } @media screen { #propvalu-print-root { display: none; } }`;
        document.head.appendChild(s);
      }
      const existing = document.getElementById("propvalu-print-root");
      if (existing) existing.remove();
      const root = document.createElement("div");
      root.id = "propvalu-print-root";
      const header = document.createElement("div");
      header.className = "print-header";
      header.innerHTML = `<h1>PropValu — Análisis de Mercado</h1><p>${valuadorNombre} · ${tipoOp.charAt(0).toUpperCase()+tipoOp.slice(1)} · GDL metro · ${new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</p>`;
      root.appendChild(header);
      const src = document.getElementById("mercado-pdf-root");
      if (src) {
        const clone = src.cloneNode(true);
        clone.querySelectorAll("button, [data-no-print]").forEach(el => el.style.display = "none");
        root.appendChild(clone);
      }
      document.body.appendChild(root);
      window.print();
      setTimeout(() => { root.remove(); }, 500);
    };

    const renderTooltip = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
          <p className="font-bold text-slate-700 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {typeof p.value === "number" && p.value > 10000 ? fmtMXN(p.value) : p.value}
            </p>
          ))}
        </div>
      );
    };

    if (cargando) return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Cargando datos de mercado…
      </div>
    );

    const TIPOS_COL = coloniaData?.tipos ?? ["Casa","Departamento","Terreno","Local","Bodega","Oficina"];
    const municipiosUnicos = [...new Set((coloniaData?.colonias ?? []).map(r => r.municipio))].sort();

    const coloniasFiltradas = (() => {
      let rows = coloniaData?.colonias ?? [];
      if (coloniaBusqueda) rows = rows.filter(r => r.colonia.includes(coloniaBusqueda.toLowerCase()) || r.municipio.toLowerCase().includes(coloniaBusqueda.toLowerCase()));
      if (coloniaFiltroMunicipio) rows = rows.filter(r => r.municipio === coloniaFiltroMunicipio);
      if (coloniaFiltroSegmento) rows = rows.filter(r => getSegmento(r.precio_avg) === coloniaFiltroSegmento);
      const { totalMin, totalMax, precioMin, precioMax, m2Min, m2Max, pctMin, pctMax } = coloniaFiltrosRango;
      if (totalMin !== "") rows = rows.filter(r => r.total >= Number(totalMin));
      if (totalMax !== "") rows = rows.filter(r => r.total <= Number(totalMax));
      if (precioMin !== "") rows = rows.filter(r => (r.precio_avg || 0) >= Number(precioMin) * 1000);
      if (precioMax !== "") rows = rows.filter(r => (r.precio_avg || 0) <= Number(precioMax) * 1000);
      if (m2Min !== "") rows = rows.filter(r => TIPOS_COL.some(t => (r[`${t}_pm2`] || 0) >= Number(m2Min)));
      if (m2Max !== "") rows = rows.filter(r => TIPOS_COL.some(t => r[`${t}_pm2`] && r[`${t}_pm2`] <= Number(m2Max)));
      if (pctMin !== "") rows = rows.filter(r => r.pct >= Number(pctMin));
      if (pctMax !== "") rows = rows.filter(r => r.pct <= Number(pctMax));
      const { col, asc } = coloniaOrden;
      rows = [...rows].sort((a,b) => {
        const av = col === "segmento" ? (a.precio_avg ?? 0) : (a[col] ?? 0);
        const bv = col === "segmento" ? (b.precio_avg ?? 0) : (b[col] ?? 0);
        return asc ? av - bv : bv - av;
      });
      return rows;
    })();
    const totalPaginas = Math.ceil(coloniasFiltradas.length / COLONIAS_POR_PAG);
    const coloniasPagina = coloniasFiltradas.slice((coloniaPagina-1)*COLONIAS_POR_PAG, coloniaPagina*COLONIAS_POR_PAG);
    const ordenar = (col) => { setColoniaOrden(o => ({ col, asc: o.col === col ? !o.asc : false })); setColoniaPagina(1); };

    const GrafTiposMunicipio = ({ height = 280 }) => tiposPorZona.length > 0 ? (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={tiposPorZona} barSize={32} margin={{ top: 14, right: 16, left: -4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="municipio" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => v.charAt(0).toUpperCase()+v.slice(1).split(" ")[0]} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip content={renderTooltip} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {tiposUnicos.map(tipo => (
            <Bar key={tipo} dataKey={tipo} stackId="a" fill={TIPO_COLORS[tipo] || "#94a3b8"} name={tipo}
              radius={tipo === tiposUnicos[tiposUnicos.length-1] ? [5,5,0,0] : [0,0,0,0]}>
              <LabelList dataKey={tipo} position="center" formatter={v => v >= 150 ? v.toLocaleString() : ""} style={{ fontSize: 10, fill: "#fff", fontWeight: 700 }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    ) : <div className="flex items-center justify-center text-slate-300 text-xs" style={{height}}>Sin datos de mercado</div>;

    const GrafPie = ({ height = 220 }) => (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={mercadoDisponible ? porZonaMercado : porZona} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
            {(mercadoDisponible ? porZonaMercado : porZona).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );

    return (
      <div id="mercado-pdf-root" className="space-y-6">
        {/* Header + controles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-['Outfit'] font-bold text-[#1B4332] text-xl">Mercado GDL metro</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {mercadoDisponible
                ? `${totalMercado.toLocaleString()} propiedades · ${new Date().toLocaleDateString("es-MX",{month:"long",year:"numeric"})}`
                : "Datos de scraper pendientes"}
            </p>
          </div>
          <div className="flex items-center gap-2 no-print flex-wrap">
            {["venta", "renta"].map(op => (
              <button key={op} onClick={() => setTipoOp(op)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tipoOp === op ? (op==="venta" ? "bg-[#1B4332] text-white" : "bg-blue-600 text-white") : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {op.charAt(0).toUpperCase()+op.slice(1)}
              </button>
            ))}
            <button onClick={() => exportarPDF("landscape")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* KPIs del mercado */}
        {mercadoDisponible && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.por_municipio.slice(0,4).map((z,i) => (
              <div key={i} className="bg-white rounded-xl border-0 shadow-sm p-4">
                <p className="text-xs text-slate-400 font-medium">{z.name}</p>
                <p className="text-lg font-bold text-[#1B4332] font-['Outfit'] mt-0.5">{z.precio_avg ? fmtMXN(z.precio_avg) : "—"}</p>
                <p className="text-xs text-slate-400">{z.total.toLocaleString()} props</p>
              </div>
            ))}
          </div>
        )}

        {/* Gráficas principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tipos de propiedad */}
          <ChartCard title={`Tipos · ${tipoOp}`} subtitle={mercadoDisponible ? "Datos de mercado GDL" : "Mis avalúos"} icon={<Building className="w-4 h-4 text-[#1B4332]" />} nombre={valuadorNombre}>
            <GrafPie height={220} />
          </ChartCard>

          {/* Tipos por municipio */}
          <ChartCard title="Composición por municipio" subtitle="Propiedades por tipo y zona" icon={<MapPin className="w-4 h-4 text-[#1B4332]" />} nombre={valuadorNombre} className="lg:col-span-2">
            <GrafTiposMunicipio height={220} />
          </ChartCard>
        </div>

        {/* Precio/m² por zona */}
        {mercadoDisponible && precioM2Zonas.length > 0 && (
          <ChartCard title={`Precio / m² por zona · ${tipoOp}`} subtitle="Precio promedio por municipio" icon={<TrendingUp className="w-4 h-4 text-[#1B4332]" />} nombre={valuadorNombre}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={precioM2Zonas} barSize={32} margin={{ top: 18, right: 8, left: -4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="zona" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="mercado" name="$/m² mercado" fill="#52B788" radius={[5,5,0,0]}>
                  <LabelList dataKey="mercado" position="top" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ fontSize: 11, fill: "#1B4332", fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Mapa de propiedades scrapeadas */}
        {mercadoDisponible && (
          <MercadoMapa tipoOp={tipoOp} valuadorNombre={valuadorNombre} />
        )}

        {/* Tendencia de mis avalúos */}
        <ChartCard title="Tendencia de mis avalúos" subtitle="Últimos 6 meses" icon={<Activity className="w-4 h-4 text-[#1B4332]" />} nombre={valuadorNombre}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={tendencia} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAvaluos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52B788" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#52B788" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={renderTooltip} />
              <Area type="monotone" dataKey="avaluos" name="Mis avalúos" stroke="#52B788" strokeWidth={2.5} fill="url(#gradAvaluos)" dot={{ fill: "#52B788", r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Análisis de texto */}
        {analisisMercado && (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#1B4332]/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#1B4332]" />
                </div>
                <p className="text-sm font-bold text-[#1B4332]">Análisis de mercado GDL metro</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analisisMercado.map((sec, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-1.5">{sec.titulo}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{sec.texto}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de colonias */}
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Filtros */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row gap-3 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input value={coloniaBusqueda} onChange={e => { setColoniaBusqueda(e.target.value); setColoniaPagina(1); }}
                    placeholder="Buscar colonia o municipio..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#52B788]" />
                </div>
                <select value={coloniaFiltroMunicipio} onChange={e => { setColoniaFiltroMunicipio(e.target.value); setColoniaPagina(1); }}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#52B788]">
                  <option value="">Todos los municipios</option>
                  {municipiosUnicos.map(m => <option key={m} value={m}>{m.replace(/\s+de\s+Zú?[ñn]iga/i,"").trim()}</option>)}
                </select>
                <select value={coloniaFiltroSegmento} onChange={e => { setColoniaFiltroSegmento(e.target.value); setColoniaPagina(1); }}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#52B788]">
                  <option value="">Todos los segmentos</option>
                  {["Económico","Medio","Medio-Alto","Alto","Premium","Lujo","Super Lujo"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setColoniaFiltrosExpanded(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#1B4332] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 transition-colors">
                  Filtros {coloniaFiltrosExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              {coloniaFiltrosExpanded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  {[
                    { label:"Total mín", key:"totalMin" }, { label:"Total máx", key:"totalMax" },
                    { label:"Precio mín (k)", key:"precioMin" }, { label:"Precio máx (k)", key:"precioMax" },
                    { label:"$/m² mín", key:"m2Min" }, { label:"$/m² máx", key:"m2Max" },
                    { label:"% mercado mín", key:"pctMin" }, { label:"% mercado máx", key:"pctMax" },
                  ].map(f => (
                    <div key={f.key}>
                      <p className="text-[10px] text-slate-400 mb-1">{f.label}</p>
                      <input type="number" placeholder="—" value={coloniaFiltrosRango[f.key]}
                        onChange={e => { setColoniaFiltrosRango(r => ({ ...r, [f.key]: e.target.value })); setColoniaPagina(1); }}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#52B788]" />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">{coloniasFiltradas.length.toLocaleString()} colonias{coloniasFiltradas.length !== coloniaData?.colonias?.length ? ` de ${coloniaData?.colonias?.length?.toLocaleString()}` : ""}</p>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="sticky left-0 z-10 bg-slate-50 text-left px-4 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide cursor-pointer" onClick={() => ordenar("colonia")}>
                      <div className="flex items-center gap-1">Colonia <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                    </th>
                    <th className="text-left px-3 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide">Municipio</th>
                    <th className="text-center px-3 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide cursor-pointer" onClick={() => ordenar("total")}>
                      <div className="flex items-center justify-center gap-1">Total <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                    </th>
                    {TIPOS_COL.map(t => (
                      <th key={t} className="text-center px-3 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide cursor-pointer" onClick={() => ordenar(t)}>
                        <div className="flex items-center justify-center gap-1">{t} <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide cursor-pointer" onClick={() => ordenar("segmento")}>
                      <div className="flex items-center justify-center gap-1">Segmento <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                    </th>
                    <th className="text-center px-3 py-3 font-bold text-[#1B4332] text-[11px] uppercase tracking-wide cursor-pointer" onClick={() => ordenar("pct")}>
                      <div className="flex items-center justify-center gap-1">% Mercado <ArrowUpDown className="w-3 h-3 text-slate-300" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coloniasPagina.length === 0 ? (
                    <tr><td colSpan={99} className="text-center text-slate-400 py-8">Sin resultados con los filtros aplicados</td></tr>
                  ) : coloniasPagina.map((row, i) => {
                    const seg = getSegmento(row.precio_avg);
                    const segColor = SEGMENTO_COLORS[seg] || "#94a3b8";
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-[#1B4332] capitalize">{(row.colonia || "—").split(",")[0].trim()}</td>
                        <td className="px-3 py-2.5 text-slate-500">{(row.municipio || "—").replace(/\s+de\s+Zú?[ñn]iga/i,"").trim()}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-[#1B4332]">{(row.total || 0).toLocaleString()}</td>
                        {TIPOS_COL.map(t => (
                          <td key={t} className="px-3 py-2.5 text-center">
                            {row[t] ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-semibold text-slate-700">{row[t].toLocaleString()}</span>
                                {row[`${t}_pm2`] ? <span className="text-[10px] text-slate-400 tabular-nums">${row[`${t}_pm2`].toLocaleString()}/m²</span> : null}
                              </div>
                            ) : <span className="text-slate-200">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: segColor + "22", color: segColor }}>{seg}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-600">{row.pct != null ? `${row.pct.toFixed(1)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">Página {coloniaPagina} de {totalPaginas}</p>
                <div className="flex gap-1">
                  <button disabled={coloniaPagina === 1} onClick={() => setColoniaPagina(p => p-1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    const p = coloniaPagina <= 3 ? i+1 : coloniaPagina + i - 2;
                    if (p < 1 || p > totalPaginas) return null;
                    return (
                      <button key={p} onClick={() => setColoniaPagina(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === coloniaPagina ? "bg-[#1B4332] text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button disabled={coloniaPagina === totalPaginas} onClick={() => setColoniaPagina(p => p+1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  /* ── MercadoMapa (mapa de propiedades scrapeadas) ── */
  const MercadoMapa = ({ tipoOp, valuadorNombre }) => {
    const TIPOS = ["Todos", "Casa", "Departamento", "Terreno", "Local", "Bodega", "Oficina"];
    const COLORES = { Casa: "#1B4332", Departamento: "#52B788", Terreno: "#95B849", Local: "#F4A261", Bodega: "#9B5DE5", Oficina: "#00BBF9", Todos: "#52B788" };
    const [tipoProp, setTipoProp] = useState("Todos");
    const [puntos, setPuntos] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
      setCargando(true);
      const q = tipoProp === "Todos" ? "" : `&tipo_prop=${tipoProp}`;
      fetch(`${API}/mercado/mapa?tipo_op=${tipoOp}${q}`)
        .then(r => r.ok ? r.json() : { puntos: [] })
        .then(d => { setPuntos(d.puntos || []); setCargando(false); })
        .catch(() => setCargando(false));
    }, [tipoOp, tipoProp]);

    const fmtMXN = (v) => v ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v) : "—";
    const getColor = (p) => tipoProp === "Todos" ? (COLORES[p.tipo_prop] || "#94a3b8") : (COLORES[tipoProp] || "#52B788");

    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0">
                <Map className="w-4 h-4 text-[#1B4332]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1B4332]">Mapa de propiedades en mercado</p>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>
                </div>
                <p className="text-xs text-slate-400">{puntos.length.toLocaleString()} colonias geocodificadas</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end no-print">
              {TIPOS.map(t => (
                <button key={t} onClick={() => setTipoProp(t)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${tipoProp===t ? "bg-[#1B4332] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {cargando ? (
            <div className="flex items-center justify-center text-slate-300 gap-2" style={{ height: 380 }}>
              <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ height: 380 }}>
              <MapContainer center={[20.57, -103.38]} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {puntos.map((p, i) => (
                  <CircleMarker key={`${p.colonia}-${i}`} center={[p.lat, p.lng]} radius={5}
                    pathOptions={{ fillColor: getColor(p), color: "#fff", weight: 1, fillOpacity: 0.82 }}>
                    <Popup>
                      <div className="text-xs min-w-[150px]">
                        <p className="font-bold text-[#1B4332] text-sm mb-1 capitalize">{p.colonia}</p>
                        <p className="text-slate-400 text-xs mb-2">{p.municipio}</p>
                        <p className="text-slate-600">{p.total.toLocaleString()} propiedades</p>
                        {p.precio_avg && <p className="text-slate-500 mt-1">Precio avg: <span className="font-medium text-slate-700">{fmtMXN(p.precio_avg)}</span></p>}
                        {p.precio_m2_avg && <p className="text-slate-500">Precio/m²: <span className="font-medium text-slate-700">{fmtMXN(p.precio_m2_avg)}</span></p>}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(COLORES).filter(([k]) => k !== "Todos").map(([tipo, col]) => (
              <span key={tipo} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: col }} />{tipo}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const subirDocumento = async (docTipo, rawFile) => {
    if (!rawFile) return;
    setKycSubiendo((p) => ({ ...p, [docTipo]: true }));
    setKycError("");
    let file;
    try {
      file = await compressFile(rawFile);
    } catch (err) {
      toast.error(err.message);
      setKycSubiendo((p) => ({ ...p, [docTipo]: false }));
      return;
    }
    const fd = new FormData();
    fd.append("doc_tipo", docTipo);
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/kyc/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al subir");
      }
      // Recargar lista
      const d2 = await fetch(`${API}/kyc/mis-documentos`, { credentials: "include" }).then((r) => r.json());
      setKycDocs(d2.documentos || []);
    } catch (e) {
      setKycError(e.message);
    } finally {
      setKycSubiendo((p) => ({ ...p, [docTipo]: false }));
    }
  };

  const DOC_LABELS = {
    ine_frente:              "INE — Frente",
    ine_vuelta:              "INE — Vuelta",
    ine_pasaporte:           "INE / Pasaporte",
    cedula:                  "Cédula de carrera (arquitecto/ingeniero)",
    cedula_profesional:      "Cédula profesional SEP",
    cedula_valuador:         "Cédula de Perito Valuador",
    foto_profesional:        "Foto profesional",
    comprobante_experiencia: "Comprobante de experiencia",
    firma_autografa:         "Firma autógrafa digital",
    comprobante_adicional:   "Comprobante adicional (tarjeta de presentación, membresía, etc.)",
    carta_unidad:            "Carta SHF / Unidad de Valuación",
    comprobante_catastro:    "Comprobante catastral",
    seguro_rc:               "Seguro de responsabilidad civil (opcional)",
    comprobante_domicilio:   "Comprobante de domicilio de oficina o trabajo",
    carta_recomendacion:     "Carta de recomendación",
    curriculum:              "Currículum vitae",
    avaluo_muestra_1:        "Avalúo de muestra 1",
    avaluo_muestra_2:        "Avalúo de muestra 2",
    avaluo_muestra_3:        "Avalúo de muestra 3",
  };

  const DOC_HINTS = {
    ine_frente:              "Identificación oficial vigente, cara frontal.",
    ine_vuelta:              "Identificación oficial vigente, cara trasera.",
    cedula:                  "Foto o escaneo de tu cédula de Arquitecto, Ing. Civil, Ing. Estructural u otra carrera afín. Debe mostrar el número de cédula verificable en el Registro Nacional de Profesionistas (SEP-DGP).",
    cedula_valuador:         "Cédula expedida específicamente como Perito Valuador, independiente de la cédula de carrera base.",
    foto_profesional:        "Fotografía reciente de frente, fondo neutro, vestimenta formal. Aparecerá en los reportes y opiniones que generes en PropValu.",
    comprobante_experiencia: "Documenta los años de experiencia que declaraste. Acepta: título o cédula de maestría en valuación, avalúo o dictamen firmado con fecha de antigüedad, constancia o carta de un Colegio de Valuadores (CIEP, COVAC, AMPI, SVM, COPEVI u otro), o credencial de agremiado activo.",
    firma_autografa:         "Escaneo o fotografía de tu firma manuscrita sobre papel blanco, o imagen de tu firma digital personalizada. Aparecerá en los reportes y opiniones de valor que generes. (No es la e.firma del SAT.)",
    comprobante_adicional:   "Cualquier documento que refuerce tu trayectoria: tarjeta de presentación profesional, captura de tu sitio web o perfil en LinkedIn, directorio de colegio, membresía activa, etc.",
    carta_unidad:            "Carta de la SHF, de la Unidad de Valuación con la que colaboras, u oficio que acredite tu habilitación para realizar avalúos Infonavit / Fovissste.",
    comprobante_catastro:    "Credencial de perito valuador catastral, oficio de habilitación municipal o estatal, o un avalúo catastral previo con tu nombre y firma.",
    seguro_rc:               "Póliza de seguro de responsabilidad civil profesional vigente. No es indispensable para el registro, pero suma a tu perfil.",
    comprobante_domicilio:   "Recibo de luz, agua, internet o renta con la dirección de tu oficina o lugar de trabajo (no mayor a 3 meses). También se acepta recibo de celular a tu nombre.",
    carta_recomendacion:     "Carta de un cliente, empresa o colegio de valuadores que avale tu trabajo profesional.",
    curriculum:              "PDF con tu experiencia profesional: estudios, empresas donde has trabajado y avalúos o proyectos relevantes.",
    avaluo_muestra_1:        "Avalúo o dictamen con tu nombre y firma. Omite o tapa los datos del cliente. Puede ser comercial, catastral, opinión de valor u otro tipo.",
    avaluo_muestra_2:        "Segundo avalúo de muestra (mismo criterio que el anterior).",
    avaluo_muestra_3:        "Tercer avalúo de muestra (mismo criterio que los anteriores).",
  };

  // Medallitas — cada doc_tipo → credencial que acredita
  const BADGE_DEFS = {
    ine_pasaporte:           { key: "identidad",   emoji: "🪪", label: "Identidad",           cls: "bg-blue-100 text-blue-700 border-blue-200" },
    ine_frente:              { key: "identidad",   emoji: "🪪", label: "Identidad",           cls: "bg-blue-100 text-blue-700 border-blue-200" },
    cedula:                  { key: "cedula",          emoji: "🎓", label: "Cédula SEP",       cls: "bg-purple-100 text-purple-700 border-purple-200" },
    cedula_profesional:      { key: "cedula",          emoji: "🎓", label: "Cédula SEP",       cls: "bg-purple-100 text-purple-700 border-purple-200" },
    cedula_valuador:         { key: "cedula_valuador", emoji: "🏛️", label: "Cédula Valuador",  cls: "bg-violet-100 text-violet-700 border-violet-200" },
    foto_profesional:        { key: "foto",        emoji: "👤", label: "Foto profesional",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
    firma_autografa:         { key: "firma",       emoji: "✍️", label: "Firma digital",       cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    comprobante_adicional:   { key: "trayectoria", emoji: "🏅", label: "Trayectoria",         cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    carta_unidad:            { key: "hab_infonavit",emoji: "🏦",label: "Hab. Infonavit/SHF",  cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
    comprobante_catastro:    { key: "hab_catastro", emoji: "🗺️",label: "Hab. Catastral",      cls: "bg-lime-100 text-lime-700 border-lime-200" },
    seguro_rc:               { key: "seguro_rc",   emoji: "🛡️", label: "Seguro RC",           cls: "bg-orange-100 text-orange-700 border-orange-200" },
    comprobante_domicilio:   { key: "domicilio",   emoji: "🏢", label: "Domicilio trabajo",   cls: "bg-teal-100 text-teal-700 border-teal-200" },
    carta_recomendacion:     { key: "recomendado", emoji: "⭐", label: "Recomendado",         cls: "bg-amber-100 text-amber-700 border-amber-200" },
    curriculum:              { key: "curriculum",  emoji: "📄", label: "CV verificado",       cls: "bg-green-100 text-green-700 border-green-200" },
    avaluo_muestra_1:        { key: "avaluos",     emoji: "📊", label: "Avalúos",             cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    avaluo_muestra_2:        { key: "avaluos",     emoji: "📊", label: "Avalúos",             cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    avaluo_muestra_3:        { key: "avaluos",     emoji: "📊", label: "Avalúos",             cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    comprobante_experiencia: { key: "exp",         emoji: "📅", label: "Experiencia verificada",cls: "bg-rose-100 text-rose-700 border-rose-200" },
  };

  // Badges únicos ganados (docs con estado "ratificado")
  const badgesGanados = (() => {
    const seen = new Set();
    const result = [];
    for (const doc of kycDocs) {
      if (doc.estado === "ratificado") {
        const def = BADGE_DEFS[doc.doc_tipo];
        if (def && !seen.has(def.key)) {
          seen.add(def.key);
          result.push(def);
        }
      }
    }
    return result;
  })();

  const docSubido = (key) => kycDocs.find((d) => d.doc_tipo === key);

  const etapaExpediente = () => {
    if (session?.kyc_status === "approved") return "aprobado";
    if (session?.kyc_status === "under_review") return "revision";
    if (docsCompletos) return "listo";
    return "pendiente";
  };

  const ETAPA_CFG = {
    pendiente: { label: "Falta de documentos",          cls: "bg-amber-50 border-amber-200 text-amber-800",   icon: "📋" },
    listo:     { label: "Listo para verificar",         cls: "bg-blue-50 border-blue-200 text-blue-800",      icon: "🎯" },
    revision:  { label: "Verificación pendiente",       cls: "bg-purple-50 border-purple-200 text-purple-800",icon: "🔍" },
    aprobado:  { label: "Cuenta verificada ✅",          cls: "bg-green-50 border-green-200 text-green-800",   icon: "✅" },
  };

  const ExpedienteTab = () => {
    const etapa = etapaExpediente();
    const cfg = ETAPA_CFG[etapa];
    const subidos = docsRequeridos.filter(k => docSubido(k)).length;
    const pct = Math.round((subidos / Math.max(docsRequeridos.length, 1)) * 100);

    // Grupos de documentos
    const GRUPOS = [
      { id: "id",         label: "Identificación",           emoji: "🪪", keys: ["ine_frente","ine_vuelta"] },
      { id: "cedulas",    label: "Cédulas profesionales",     emoji: "🎓", keys: ["cedula","cedula_valuador"] },
      { id: "foto",       label: "Fotografía y firma",        emoji: "👤", keys: ["foto_profesional","firma_autografa"] },
      { id: "exp",        label: "Experiencia",               emoji: "📅", keys: ["comprobante_experiencia","comprobante_adicional"] },
      { id: "serv",       label: "Servicios especializados",  emoji: "🏦", keys: ["carta_unidad","comprobante_catastro"], conditional: true },
      { id: "completo",   label: "Perfil completo",           emoji: "📋", keys: ["comprobante_domicilio","carta_recomendacion","curriculum","avaluo_muestra_1","avaluo_muestra_2","avaluo_muestra_3"], conditional: true },
    ];

    const DocRow = ({ docKey }) => {
      const doc = docSubido(docKey);
      const subiendo = kycSubiendo[docKey];
      const label = DOC_LABELS[docKey] || docKey;
      const hint = DOC_HINTS[docKey];
      const isImg = doc && (doc.content_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(doc.filename || ""));
      const docUrl = doc ? `${API}/kyc/documento/${doc.doc_id}` : null;
      const isInList = docsRequeridos.includes(docKey);

      return (
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${doc ? "bg-[#F0FAF5] border border-[#B7E4C7]" : "bg-white border border-slate-100"}`}>
          {/* Thumbnail / status */}
          {doc ? (
            <button onClick={() => setPreviewDoc({ url: docUrl, type: doc.content_type, filename: doc.filename })}
              className="group relative w-12 h-12 rounded-lg overflow-hidden border-2 border-[#52B788] bg-white flex-shrink-0 flex items-center justify-center hover:border-[#1B4332] transition-colors">
              {isImg
                ? <img src={docUrl} alt={label} className="w-full h-full object-cover" onError={e => { e.target.style.display="none"; }} />
                : <FileText className="w-5 h-5 text-[#52B788]" />}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">Ver</span>
              </div>
              {doc.estado === "ratificado" && <ShieldCheck className="absolute -top-0.5 -right-0.5 w-4 h-4 text-indigo-500 bg-white rounded-full p-px" />}
            </button>
          ) : (
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex-shrink-0 flex items-center justify-center bg-slate-50">
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`text-sm font-semibold ${doc ? "text-[#1B4332]" : "text-slate-600"}`}>{label}</p>
              {!isInList && <span className="text-xs text-slate-400 italic">(opcional)</span>}
              {doc?.estado === "ratificado" && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${BADGE_DEFS[docKey]?.cls || "bg-indigo-100 text-indigo-700 border-indigo-200"}`}>
                  {BADGE_DEFS[docKey]?.emoji} Verificado
                </span>
              )}
            </div>
            {doc
              ? <p className="text-xs text-[#52B788] font-medium mt-0.5">
                  ✓ {new Date(doc.subido_at).toLocaleDateString("es-MX")} {doc.size_bytes ? `· ${(doc.size_bytes/1024).toFixed(0)} KB` : ""}
                </p>
              : hint && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{hint}</p>
            }
          </div>

          {/* Upload */}
          <label className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors flex-shrink-0 ${
            doc ? "border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10" : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"
          } ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}>
            <Upload className="w-3.5 h-3.5" />
            {subiendo ? "Subiendo…" : doc ? "Cambiar" : "Subir"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              disabled={subiendo} onChange={e => subirDocumento(docKey, e.target.files[0])} />
          </label>
        </div>
      );
    };

    return (
      <div className="space-y-4">

        {/* ── Hero card: estado + progreso en una sola fila ── */}
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-4">
            {/* Ícono + estado */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <p className="font-['Outfit'] font-bold text-white text-sm leading-tight">{cfg.label}</p>
                <p className="text-xs text-[#D9ED92]/80 mt-0.5">
                  {etapa === "pendiente" && `Faltan ${docsRequeridos.length - subidos} doc${docsRequeridos.length - subidos !== 1 ? "s" : ""}`}
                  {etapa === "listo" && "Todos los docs subidos — solicita la verificación"}
                  {etapa === "revision" && "PropValu está revisando tu expediente"}
                  {etapa === "aprobado" && "Verificado ✅"}
                </p>
              </div>
            </div>

            {/* Barra de progreso — ocupa el espacio restante */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-[#D9ED92]/70 mb-1">
                <span>Progreso del expediente</span>
                <span className="font-bold text-[#D9ED92]">{subidos} / {docsRequeridos.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${docsCompletos ? "bg-[#D9ED92]" : "bg-[#52B788]"}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Botón entrevista */}
            {etapa === "listo" && (
              <button
                onClick={async () => {
                  const res = await fetch(`${API}/kyc/solicitar-entrevista`, { method: "POST", credentials: "include" });
                  if (res.ok) {
                    const updated = { ...session, kyc_status: "under_review" };
                    setSession(updated);
                    localStorage.setItem("valuador_session", JSON.stringify(updated));
                    toast.success("Solicitud enviada — te contactaremos para agendar la videollamada.");
                  } else {
                    toast.error("No se pudo enviar la solicitud, intenta de nuevo.");
                  }
                }}
                className="flex-shrink-0 flex items-center gap-1.5 bg-[#D9ED92] hover:bg-white text-[#1B4332] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                🎯 Solicitar verificación
              </button>
            )}
          </div>
        </div>

        {/* ── Credenciales verificadas ── */}
        {badgesGanados.length > 0 && (
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Credenciales verificadas por PropValu</p>
            <div className="flex flex-wrap gap-2">
              {badgesGanados.map(b => (
                <span key={b.key} className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${b.cls}`}>
                  {b.emoji} {b.label} <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {kycError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0" />{kycError}
          </div>
        )}

        {/* ── Grupos de documentos ── */}
        {GRUPOS.map(grupo => {
          const keysVisibles = grupo.keys.filter(k => docsRequeridos.includes(k) || docSubido(k));
          if (keysVisibles.length === 0) return null;
          const grupoSubidos = keysVisibles.filter(k => docSubido(k)).length;
          const grupoCompleto = grupoSubidos === keysVisibles.length;
          return (
            <div key={grupo.id} className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
              {/* Header del grupo */}
              <div className={`px-4 py-3.5 flex items-center justify-between ${grupoCompleto ? "bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]" : "bg-gradient-to-r from-[#52B788] to-[#40916C]"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{grupo.emoji}</span>
                  <span className="font-['Outfit'] font-bold text-white text-base">{grupo.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/80">{grupoSubidos}/{keysVisibles.length}</span>
                  {grupoCompleto
                    ? <span className="text-xs font-bold bg-[#D9ED92] text-[#1B4332] px-2.5 py-0.5 rounded-full">✓ Completo</span>
                    : <span className="text-xs font-bold bg-white/25 text-white px-2.5 py-0.5 rounded-full">Pendiente</span>
                  }
                </div>
              </div>
              {/* Docs del grupo */}
              <div className="p-3 space-y-2">
                {/* Campo URL para comprobante_adicional */}
                {grupo.keys.includes("comprobante_adicional") && (
                  <div className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold text-[#1B4332]">🌐 Perfil web o enlace de referencia</p>
                    <p className="text-xs text-slate-500">Sitio web profesional, perfil de LinkedIn, directorio de colegio, o cualquier enlace que ratifique tu trayectoria.</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.tusitioweb.com o https://linkedin.com/in/..."
                        className="h-9 text-sm bg-white border-[#B7E4C7] focus:border-[#52B788]"
                        value={session.q_web_perfil || ""}
                        onChange={e => {
                          const val = e.target.value;
                          setSession(p => ({ ...p, q_web_perfil: val }));
                        }}
                        onBlur={async e => {
                          const val = e.target.value;
                          if (!val && !session.q_web_perfil) return;
                          await fetch(`${API}/auth/profile`, {
                            method: "PUT", credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ q_web_perfil: val }),
                          });
                          localStorage.setItem("valuador_session", JSON.stringify({ ...session, q_web_perfil: val }));
                        }}
                      />
                      {session.q_web_perfil && (
                        <a href={session.q_web_perfil} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 whitespace-nowrap flex-shrink-0">
                          <Globe className="w-3.5 h-3.5" /> Ver
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grupo.keys.map(k => {
                    if (!docsRequeridos.includes(k) && !docSubido(k)) return null;
                    return <DocRow key={k} docKey={k} />;
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <p className="text-[10px] text-slate-400 text-center">Imágenes: comprimidas automáticamente a menos de 200 KB · PDFs: máx. 1 MB</p>

      {/* Lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-medium truncate">{previewDoc.filename}</p>
              <button onClick={() => setPreviewDoc(null)} className="text-white/70 hover:text-white ml-4 flex-shrink-0">
                <X className="w-6 h-6" />
              </button>
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
              <p className="text-xs text-slate-500 mb-1">Avalúos del mes</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">
                {valuaciones.filter(v => v.fecha?.includes(new Date().toLocaleDateString("es-MX",{month:"short"}))).length || valuaciones.length || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#1B4332]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Ganancias del mes</p>
              <p className="text-xl font-bold text-[#1B4332] font-['Outfit']">
                {formatMXN(billingData?.earnings_this_cycle || 0)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#52B788]/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#52B788]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Calificación</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">
                4.8 <span className="text-lg text-amber-400">★</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Créditos restantes</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">{session?.credits ?? 0}</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#1B4332]" />
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

  const PLAN_INFO = {
    starter: {
      label: "Starter", precio: "$1,200", periodo: "mes", creditos: 5,
      border: "border-slate-200 bg-slate-50", badge: "bg-slate-200 text-slate-700",
      extras: [],
    },
    pro: {
      label: "Pro", precio: "$3,000", periodo: "mes", creditos: 20,
      border: "border-[#52B788]/30 bg-[#F0FAF5]", badge: "bg-[#52B788] text-white",
      extras: ["Encargos externos", "Perfil en directorio"],
    },
    premium: {
      label: "Premium", precio: "$6,500", periodo: "mes", creditos: 40,
      border: "border-[#1B4332]/20 bg-[#1B4332]/5", badge: "bg-[#1B4332] text-white",
      extras: ["Máxima prioridad", "Soporte dedicado", "Reporte mensual"],
    },
  };

  const PlanCard = () => {
    const plan = session?.plan ? PLAN_INFO[session.plan] : null;
    const credits = session?.credits ?? 0;
    if (!plan) return (
      <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Sin plan activo</p>
          <p className="text-xs text-slate-400 mt-0.5">Activa un plan para hacer valuaciones en la plataforma y recibir encargos.</p>
        </div>
        <button onClick={() => navigate("/checkout/pro", { state: { role: "valuador" } })}
          className="shrink-0 bg-[#1B4332] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#163828] transition-colors">
          Ver planes
        </button>
      </div>
    );
    return (
      <div className={`mb-6 rounded-2xl border p-4 ${plan.border}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.badge}`}>Plan {plan.label}</span>
              <span className="text-xs text-slate-500">{plan.precio} MXN + IVA / {plan.periodo}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{plan.creditos} avalúos/mes
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
              <p className="text-[10px] text-slate-400">Créditos</p>
              <p className="text-2xl font-bold text-[#1B4332] font-['Outfit']">{credits}</p>
              <p className="text-[10px] text-slate-400">de {plan.creditos}</p>
            </div>
            <button onClick={() => navigate("/checkout/pro", { state: { role: "valuador" } })}
              className="bg-[#52B788] hover:bg-[#40916C] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              Renovar plan
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CtaCard = () => (
    <Card
      className="border-0 shadow-sm mb-6 text-white"
      style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
    >
      <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-['Outfit'] text-lg font-semibold">
              ¿Listo para tu próxima valuación?
            </h3>
            <p className="text-white/75 text-sm">
              Genera un reporte profesional en minutos
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/valuar")}
          className="bg-[#52B788] hover:bg-[#40916C] text-white shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Valuación
        </Button>
      </CardContent>
    </Card>
  );

  const ValuacionesTable = ({ titulo = "Valuaciones recientes" }) => (
    <Card className="bg-white border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4">
        <p className="font-['Outfit'] font-bold text-white text-base">{titulo}</p>
      </div>
      <CardContent className="p-0">
        {valuaciones.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Aún no tienes valuaciones registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-[#1B4332]">Dirección</TableHead>
                  <TableHead className="font-semibold text-[#1B4332]">Tipo</TableHead>
                  <TableHead className="font-semibold text-[#1B4332]">Fecha</TableHead>
                  <TableHead className="font-semibold text-[#1B4332]">Valor estimado</TableHead>
                  <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuaciones.map((v) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  /* ── Resumen: tarjetas rápidas (reseñas, publicidad, verificación) ── */
  const ResumenExtra = () => {
    const avgResenas = resumenResenas.length
      ? (resumenResenas.reduce((s, r) => s + (r.calificacion || r.rating || 0), 0) / resumenResenas.length).toFixed(1)
      : null;
    const anunciosActivos   = resumenAnuncios.filter(a => a.estado === "aprobado").length;
    const anunciosPendientes = resumenAnuncios.filter(a => a.estado === "pendiente").length;
    const kycOk    = session?.kyc_status === "approved";
    const kycLabel = { approved:"Verificado", under_review:"En revisión", pending:"Sin verificar", rejected:"Rechazado" }[session?.kyc_status] || "Sin verificar";
    const kycColor = { approved:"text-[#52B788]", under_review:"text-amber-500", pending:"text-slate-400", rejected:"text-red-500" }[session?.kyc_status] || "text-slate-400";

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
        <button onClick={() => setActiveTab("expediente")} className="text-left">
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

  /* ── Resumen: mapa de avalúos + mini-charts ── */
  const ResumenActividad = () => {
    const COORDS = {
      "zapopan":    [20.721, -103.401],
      "guadalajara":[20.659, -103.349],
      "tlaquepaque":[20.640, -103.312],
      "tonalá":     [20.624, -103.235],
      "tlajomulco": [20.474, -103.444],
      "default":    [20.666, -103.350],
    };
    const getMunicipio = (dir) => {
      const d = (dir || "").toLowerCase();
      for (const k of Object.keys(COORDS)) { if (d.includes(k)) return k; }
      return "default";
    };
    const COLORES_TIPO = { Casa:"#1B4332", Departamento:"#52B788", Terreno:"#95B849", Local:"#F4A261", Bodega:"#9B5DE5", Oficina:"#00BBF9" };
    const COLORS = ["#1B4332", "#52B788", "#D9ED92", "#74C69D", "#40916C", "#95D5B2"];

    const puntos = valuaciones.map((v, i) => {
      const mun = getMunicipio(v.direccion);
      const [lat, lng] = COORDS[mun];
      return { ...v, lat: lat + (Math.sin(i * 1.3) * 0.007), lng: lng + (Math.cos(i * 1.7) * 0.007) };
    });

    const porTipo = Object.entries(
      valuaciones.reduce((acc, v) => { const t = v.tipo || "Otro"; acc[t] = (acc[t]||0)+1; return acc; }, {})
    ).map(([name, value]) => ({ name, value }));

    const porZona = Object.entries(
      valuaciones.reduce((acc, v) => {
        const m = getMunicipio(v.direccion);
        const label = m === "default" ? "Otra zona" : m.charAt(0).toUpperCase()+m.slice(1);
        acc[label] = (acc[label]||0)+1; return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);

    const disponible = mercadoStats?.disponible;
    const porTipoDisplay = disponible ? mercadoStats.por_tipo.slice(0,5).map(r=>({name:r.name,value:r.total})) : porTipo;
    const porZonaDisplay = disponible ? mercadoStats.por_municipio.slice(0,5).map(r=>({name:r.name,value:r.total})) : porZona;
    const precioM2 = disponible ? mercadoStats.precio_m2_por_zona.slice(0,5).map(r=>({zona:r.name.split(" ")[0],pm2:Math.round(r.precio_m2_avg)})) : [];

    const renderTooltipMini = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      return (
        <div className="bg-white border border-slate-100 rounded-lg shadow px-3 py-2 text-xs">
          <p className="font-bold text-slate-700">{label || payload[0].name}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.value > 1000 ? formatMXN(p.value) : p.value.toLocaleString()}</p>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {/* Header — igual que ResumenMercado de Inmobiliaria */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">
              {disponible ? "Inteligencia de mercado" : "Mi actividad valuadora"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {disponible
                ? `${mercadoStats.total.toLocaleString()} props scrapeadas · ${mercadoTipoOp} · GDL metro`
                : `${valuaciones.length} avalúo${valuaciones.length !== 1 ? "s" : ""} registrado${valuaciones.length !== 1 ? "s" : ""} · mis datos`}
            </p>
          </div>
          {tienePlan && (
            <button onClick={() => setActiveTab("mercado")}
              className="text-xs text-[#52B788] font-semibold hover:underline flex items-center gap-1">
              Ver análisis completo →
            </button>
          )}
        </div>

        {/* Fila de 3 mini-charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Mapa de mis avalúos */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Mapa de mis avalúos
              </p>
              {valuaciones.length > 0 ? (
                <div className="rounded-xl overflow-hidden" style={{ height: 150 }}>
                  <MapContainer center={[20.57, -103.38]} zoom={10} style={{ height:"100%", width:"100%" }} scrollWheelZoom={false} zoomControl={false} dragging={false} attributionControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {puntos.map((p, i) => (
                      <CircleMarker key={i} center={[p.lat, p.lng]} radius={6}
                        pathOptions={{ fillColor: COLORES_TIPO[p.tipo] || "#52B788", color:"#fff", weight:1.5, fillOpacity:0.88 }}>
                        <Popup>
                          <div className="text-xs min-w-[130px]">
                            <p className="font-bold text-[#1B4332]">{p.tipo || "Propiedad"}</p>
                            <p className="text-slate-400 truncate">{p.direccion}</p>
                            {p.valor > 0 && <p className="text-[#1B4332] font-semibold">{formatMXN(p.valor)}</p>}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <Map className="w-8 h-8" />
                  <p className="text-xs text-center">Sin avalúos<br/>registrados</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(COLORES_TIPO).slice(0,4).map(([tipo,col]) => (
                  <span key={tipo} className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:col}}/>{tipo}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Municipios donde he valuado */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Municipios · {disponible ? "mercado" : "mis avalúos"}
              </p>
              {porZonaDisplay.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={porZonaDisplay} barSize={18} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill:"#94a3b8" }} axisLine={false} tickLine={false}
                      tickFormatter={v => v.split(" ")[0]} />
                    <YAxis tick={{ fontSize: 9, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={renderTooltipMini} />
                    <Bar dataKey="value" name={disponible ? "Propiedades" : "Avalúos"} radius={[4,4,0,0]}>
                      {porZonaDisplay.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      <LabelList dataKey="value" position="top" style={{fontSize:9,fill:"#64748b",fontWeight:600}} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <MapPin className="w-8 h-8" />
                  <p className="text-xs text-center">Sin datos de zona</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipos de propiedad */}
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-3">
                Tipos de propiedad · {disponible ? "mercado" : "mis avalúos"}
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={porTipoDisplay} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {porTipoDisplay.map((entry, i) => (
                      <Cell key={i} fill={COLORES_TIPO[entry.name] || COLORS[i%COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipMini} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10}} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Métricas clave (si hay datos de mercado o mis avalúos) */}
        {disponible ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {mercadoStats.por_municipio.slice(0,4).map((z,i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium">{z.name}</p>
                <p className="text-base font-bold text-[#1B4332] font-['Outfit'] mt-0.5">
                  {z.precio_avg ? formatMXN(z.precio_avg) : "—"}
                </p>
                <p className="text-xs text-slate-400">{z.total.toLocaleString()} propiedades</p>
              </div>
            ))}
          </div>
        ) : porZona.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {porZona.slice(0,4).map((z,i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium">{z.name}</p>
                <p className="text-base font-bold text-[#1B4332] font-['Outfit'] mt-0.5">
                  {z.value} avalúo{z.value !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-400">
                  {Math.round(z.value / valuaciones.length * 100)}% del total
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Perfil: helpers y estado de edición ──────────────────────────────────
  const PROFESION_LABELS = { arquitecto:"Arquitecto", ing_civil:"Ing. Civil", ing_estructural:"Ing. Estructural" };
  const getProfesionLabel = (base, otro) => PROFESION_LABELS[base] || (base === "otro" && otro ? otro : base === "otro" ? "Otra carrera afín" : base) || null;
  const medallaExp = (() => {
    const e = session?.q_experiencia;
    if (!e) return null;
    if (e === "Más de 10 años") return { emoji:"🥇", nivel:"Oro",    title:"Más de 10 años — Nivel Oro" };
    if (e === "5-10 años" || e === "3-5 años") return { emoji:"🥈", nivel:"Plata",  title:`${e} — Nivel Plata` };
    if (e === "1-3 años")  return { emoji:"🥉", nivel:"Bronce", title:"1-3 años — Nivel Bronce" };
    return null;
  })();

  const openEdit = (section) => {
    const d = {};
    const rs = session.redes_sociales || {};
    if (section === "contacto")   Object.assign(d, { name: session.name||"", phone: session.phone||"", q_experiencia: session.q_experiencia||"" });
    if (section === "cedulas")    Object.assign(d, { profesion_base: session.profesion_base||"", num_cedula_base: session.num_cedula_base||"", num_cedula_valuador: session.num_cedula_valuador||"" });
    if (section === "ubicacion")  Object.assign(d, { estado: session.estado||"", q_dir_oficina: session.q_dir_oficina||"", q_maps_url: session.q_maps_url||"", municipios: session.municipios?.join(", ")||"" });
    if (section === "profesional") Object.assign(d, { q_equipo: session.q_equipo||"", q_tiempo_entrega: session.q_tiempo_entrega||"", q_software: session.q_software||"", q_idiomas: session.q_idiomas||"", q_unidad_valuacion: session.q_unidad_valuacion||"" });
    if (section === "redes")      Object.assign(d, { redes_web: rs.website||"", redes_ig: rs.instagram||"", redes_wa: rs.whatsapp||"", redes_fb: rs.facebook||"" });
    setEditData(d);
    setEditSection(section);
  };

  const saveEdit = async () => {
    setSavingSection(true);
    try {
      const payload = { ...editData };
      if (editSection === "ubicacion" && editData.municipios) {
        payload.municipios = editData.municipios.split(",").map(m => m.trim()).filter(Boolean);
        delete payload.municipios_raw;
      }
      if (editSection === "redes") {
        payload.redes_sociales = {
          website:   editData.redes_web  || undefined,
          instagram: editData.redes_ig   || undefined,
          whatsapp:  editData.redes_wa   || undefined,
          facebook:  editData.redes_fb   || undefined,
        };
        delete payload.redes_web;
        delete payload.redes_ig;
        delete payload.redes_wa;
        delete payload.redes_fb;
      }
      const res = await fetch(`${API}/auth/profile`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      setSession(prev => ({ ...prev, ...updated }));
      localStorage.setItem("valuador_session", JSON.stringify({ ...session, ...updated }));
      setEditSection(null);
      toast.success("Perfil actualizado");
    } catch { toast.error("No se pudo guardar"); }
    finally { setSavingSection(false); }
  };

  const SectionHeader = ({ icon: Icon, emoji, title, section }) => (
    <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center justify-between rounded-t-xl">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="w-4 h-4 text-[#D9ED92]" /> : <span className="text-base">{emoji}</span>}
        <span className="font-['Outfit'] font-semibold text-white text-sm">{title}</span>
      </div>
      <button onClick={() => editSection === section ? setEditSection(null) : openEdit(section)}
        className="flex items-center gap-1 text-[#D9ED92] hover:text-white text-xs font-semibold transition-colors">
        {editSection === section ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Pencil className="w-3.5 h-3.5" /> Editar</>}
      </button>
    </div>
  );

  const Dato = ({ label, value, empty = "Sin registrar" }) => (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      {value
        ? <p className="text-sm font-medium text-[#1B4332] break-words">{value}</p>
        : <p className="text-sm text-slate-300 italic">{empty} <span className="not-italic text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">pendiente</span></p>
      }
    </div>
  );

  const SaveBar = () => (
    <div className="px-5 pb-4 pt-1 flex justify-end">
      <button onClick={saveEdit} disabled={savingSection}
        className="flex items-center gap-1.5 bg-[#52B788] hover:bg-[#40916C] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
        <Save className="w-3.5 h-3.5" />
        {savingSection ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );

  const ef = editData; // shorthand

  const DocUploadInline = ({ docKey, label }) => {
    const doc = docSubido(docKey);
    const subiendo = kycSubiendo[docKey];
    const isImg = doc && (doc.content_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(doc.filename || ""));
    const docUrl = doc ? `${API}/kyc/documento/${doc.doc_id}` : null;
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          {doc ? (
            <button onClick={() => setPreviewDoc({ url: docUrl, type: doc.content_type, filename: doc.filename })}
              className="w-10 h-10 rounded-lg overflow-hidden border border-[#52B788] bg-[#F0FAF5] flex-shrink-0 flex items-center justify-center">
              {isImg ? <img src={docUrl} alt={label} className="w-full h-full object-cover" /> : <FileText className="w-4 h-4 text-[#52B788]" />}
            </button>
          ) : (
            <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-200 flex-shrink-0 flex items-center justify-center bg-slate-50">
              <Upload className="w-4 h-4 text-slate-300" />
            </div>
          )}
          <label className={`flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${doc ? "border border-[#52B788] text-[#1B4332]" : "bg-[#1B4332] text-white"} ${subiendo ? "opacity-50" : ""}`}>
            <Upload className="w-3 h-3" />
            {subiendo ? "Subiendo…" : doc ? "Cambiar" : "Subir"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={subiendo} onChange={e => subirDocumento(docKey, e.target.files[0])} />
          </label>
        </div>
      </div>
    );
  };

  const PerfilCard = () => (
    <div className="space-y-4">

      {/* ── Header de perfil — credencial 3 columnas ── */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_120px] sm:grid-cols-[130px_1fr_148px] divide-x divide-[#2D6A4F]/50">

          {/* Col 1 — Foto */}
          <div className="flex flex-col items-center justify-center gap-2 p-4 bg-black/10">
            {(() => {
              const fotoDoc = kycDocs.find(d => d.doc_tipo === "foto_profesional");
              return fotoDoc ? (
                <img
                  src={`${API}/kyc/documento/${fotoDoc.doc_id}`}
                  alt="Foto de perfil"
                  className="w-[72px] h-[88px] sm:w-24 sm:h-28 rounded-xl object-cover border-2 border-[#52B788] shadow-lg"
                />
              ) : (
                <div className="w-[72px] h-[88px] sm:w-24 sm:h-28 rounded-xl bg-white/10 border-2 border-dashed border-[#52B788]/60 flex flex-col items-center justify-center" title="Foto de perfil pendiente">
                  <User className="w-8 h-8 text-[#D9ED92]/50" />
                  <span className="text-[9px] text-[#D9ED92]/50 leading-tight text-center mt-1">foto<br/>pendiente</span>
                </div>
              );
            })()}
          </div>

          {/* Col 2 — Datos */}
          <div className="p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-['Outfit'] text-lg font-bold text-white">{session.name || "—"}</p>
              {medallaExp && <span title={medallaExp.title} className="text-xl">{medallaExp.emoji}</span>}
            </div>
            <p className="text-sm text-[#D9ED92]/80 mt-0.5">
              {getProfesionLabel(session.profesion_base, session.profesion_base_otro) || "Valuador"} · {session.q_experiencia || "Experiencia no indicada"}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Mail className="w-3.5 h-3.5 text-[#D9ED92]/60 flex-shrink-0" />
              <p className="text-xs text-[#D9ED92]/70">{session.email || "—"}</p>
            </div>
            {session.phone && (
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-[#D9ED92]/60 flex-shrink-0" />
                <p className="text-xs text-[#D9ED92]/70">{session.phone}</p>
              </div>
            )}
          </div>

          {/* Col 3 — Verificación + credenciales */}
          <div className="flex flex-col items-center justify-center gap-2.5 p-4 bg-black/10 text-center">
            <div>
              <p className="text-[10px] text-[#D9ED92]/60 uppercase tracking-wide">Verificación</p>
              <p className="text-xs font-semibold text-white mt-0.5">
                {session.kyc_status === "approved" ? "✅ Verificado" : session.kyc_status === "under_review" ? "🔍 Verificación pendiente" : docsCompletos ? "🎯 Listo — verificar" : "⚠️ Falta documentos"}
              </p>
            </div>
            <div className="border-t border-white/10 w-full pt-2">
              <p className="text-[10px] text-[#D9ED92]/60 uppercase tracking-wide mb-1.5">Credenciales</p>
              {badgesGanados.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-1">
                  {badgesGanados.map(b => (
                    <span key={b.key} title={b.label} className="text-base">{b.emoji}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[#D9ED92]/50">Sin credenciales aún</p>
              )}
            </div>
            <div className="border-t border-white/10 w-full pt-2">
              <p className="text-[10px] text-[#D9ED92]/60 uppercase tracking-wide">Modo</p>
              <p className="text-xs font-semibold text-white mt-0.5">{session.modo_perfil === "completo" ? "Completo" : "Básico"}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Grid 2 columnas ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Columna izquierda */}
        <div className="space-y-4">

          {/* Contacto */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <SectionHeader icon={User} title="Contacto" section="contacto" />
            <div className="p-5 grid grid-cols-2 gap-4">
              <Dato label="Nombre completo" value={session.name} />
              <Dato label="Correo" value={session.email} />
              <Dato label="Teléfono" value={session.phone} />
              <Dato label="Experiencia" value={session.q_experiencia ? `${session.q_experiencia}${medallaExp ? ` ${medallaExp.emoji}` : ""}` : null} />
            </div>
            <div className="border-t border-[#F0FAF5] px-5 py-3">
              <DocUploadInline docKey="comprobante_experiencia" label="Documento que avala la experiencia" />
            </div>
            {editSection === "contacto" && (
              <div className="border-t border-[#F0FAF5] px-5 pt-4 pb-1 grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1"><Label className="text-xs">Nombre</Label><Input value={ef.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Teléfono</Label><Input value={ef.phone} onChange={e=>setEditData(p=>({...p,phone:e.target.value}))} className="h-8 text-sm" /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Años de experiencia</Label>
                  <Input value={ef.q_experiencia} onChange={e=>setEditData(p=>({...p,q_experiencia:e.target.value}))} placeholder="ej. 8 años, 15 años..." className="h-8 text-sm" />
                </div>
              </div>
            )}
            {editSection === "contacto" && <SaveBar />}
          </div>

          {/* Cédulas */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <SectionHeader emoji="🎓" title="Cédulas profesionales" section="cedulas" />
            <div className="p-5 grid grid-cols-2 gap-4">
              <Dato label="Profesión" value={getProfesionLabel(session.profesion_base, session.profesion_base_otro)} />
              <Dato label="Núm. cédula (arq./ing.)" value={session.num_cedula_base} />
              <div className="col-span-2"><Dato label="Núm. cédula Perito Valuador" value={session.num_cedula_valuador} empty="No registrada (opcional)" /></div>
            </div>
            <div className="border-t border-[#F0FAF5] px-5 py-3 grid grid-cols-2 gap-3">
              <DocUploadInline docKey="cedula" label="Foto cédula de carrera" />
              <DocUploadInline docKey="cedula_valuador" label="Foto cédula valuador" />
            </div>
            {editSection === "cedulas" && (
              <div className="border-t border-[#F0FAF5] px-5 pt-4 pb-1 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Profesión de base</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[["arquitecto","Arquitecto"],["ing_civil","Ing. Civil"],["ing_estructural","Ing. Estructural"],["otro","Otra carrera"]].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>setEditData(p=>({...p,profesion_base:v}))}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${ef.profesion_base===v?"border-[#52B788] bg-[#F0FAF5] text-[#1B4332]":"border-slate-200 text-slate-600"}`}>{l}</button>
                    ))}
                  </div>
                  {ef.profesion_base === "otro" && (
                    <div className="mt-2 space-y-1">
                      <Label className="text-xs">Especifica tu profesión</Label>
                      <Input value={ef.profesion_base_otro||""} onChange={e=>setEditData(p=>({...p,profesion_base_otro:e.target.value}))} placeholder="ej. Ing. Topógrafo, Lic. Derecho..." className="h-8 text-sm" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Núm. cédula base</Label><Input value={ef.num_cedula_base} onChange={e=>setEditData(p=>({...p,num_cedula_base:e.target.value.replace(/\D/g,"")}))} className="h-8 text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Núm. cédula valuador</Label><Input value={ef.num_cedula_valuador} onChange={e=>setEditData(p=>({...p,num_cedula_valuador:e.target.value.replace(/\D/g,"")}))} className="h-8 text-sm" /></div>
                </div>
              </div>
            )}
            {editSection === "cedulas" && <SaveBar />}
          </div>

        </div>

        {/* Columna derecha */}
        <div className="space-y-4">

          {/* Ubicación */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <SectionHeader icon={MapPin} title="Ubicación y oficina" section="ubicacion" />
            <div className="p-5 grid grid-cols-2 gap-4">
              <Dato label="Estado" value={session.estado} />
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1">Municipios de servicio / Área de cobertura</p>
                {session.municipios?.filter(Boolean).length > 0
                  ? <div className="flex flex-wrap gap-1">{session.municipios.filter(Boolean).map((m,i)=><span key={i} className="text-xs bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-2 py-0.5 rounded-full">{m}</span>)}</div>
                  : <p className="text-sm text-slate-300 italic">Sin registrar <span className="not-italic text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">pendiente</span></p>
                }
              </div>
              <div className="col-span-2"><Dato label="Dirección de oficina" value={session.q_dir_oficina} /></div>
              {session.q_maps_url && <div className="col-span-2"><a href={session.q_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#52B788] font-semibold hover:underline"><Globe className="w-3.5 h-3.5" />Ver en Google Maps</a></div>}
            </div>
            {editSection === "ubicacion" && (
              <div className="border-t border-[#F0FAF5] px-5 pt-4 pb-1 grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Estado</Label><Input value={ef.estado} onChange={e=>setEditData(p=>({...p,estado:e.target.value}))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Municipios de servicio (separados por coma)</Label><Input value={ef.municipios} onChange={e=>setEditData(p=>({...p,municipios:e.target.value}))} className="h-8 text-sm" placeholder="Zapopan, Guadalajara..." /></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs">Dirección de oficina</Label><Input value={ef.q_dir_oficina} onChange={e=>setEditData(p=>({...p,q_dir_oficina:e.target.value}))} className="h-8 text-sm" /></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs">Link Google Maps</Label><Input value={ef.q_maps_url} onChange={e=>setEditData(p=>({...p,q_maps_url:e.target.value}))} className="h-8 text-sm" /></div>
              </div>
            )}
            {editSection === "ubicacion" && <SaveBar />}
          </div>

          {/* Perfil profesional */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <SectionHeader icon={Briefcase} title="Perfil profesional" section="profesional" />
            <div className="p-5 grid grid-cols-2 gap-4">
              <Dato label="Equipo" value={{solo:"Solo yo","1-3":"1-3 personas","4-10":"4-10 personas","10+":"Más de 10"}[session.q_equipo]||session.q_equipo} />
              <Dato label="Tiempo de entrega" value={session.q_tiempo_entrega} />
              <Dato label="Software" value={session.q_software} />
              <Dato label="Idiomas" value={session.q_idiomas} />
              <Dato label="Seguro RC" value={session.q_seguro_rc===true?"✅ Sí":session.q_seguro_rc===false?"No":null} empty="No indicado" />
              {(session.services?.infonavit||session.services?.fovissste) && <Dato label="Unidad de Valuación" value={session.q_unidad_valuacion} />}
            </div>
            {(session.services?.infonavit||session.services?.fovissste) && (
              <div className="border-t border-[#F0FAF5] px-5 py-3">
                <DocUploadInline docKey="carta_unidad" label="Documento: Unidad de Valuación / SHF" />
              </div>
            )}
            {editSection === "profesional" && (
              <div className="border-t border-[#F0FAF5] px-5 pt-4 pb-1 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Equipo</Label>
                  <select value={ef.q_equipo} onChange={e=>setEditData(p=>({...p,q_equipo:e.target.value}))} className="w-full h-8 px-2 text-sm border border-[#B7E4C7] rounded-md bg-[#F0FAF5] focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {[["solo","Solo yo"],["1-3","1-3 personas"],["4-10","4-10 personas"],["10+","Más de 10"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tiempo de entrega</Label>
                  <select value={ef.q_tiempo_entrega} onChange={e=>setEditData(p=>({...p,q_tiempo_entrega:e.target.value}))} className="w-full h-8 px-2 text-sm border border-[#B7E4C7] rounded-md bg-[#F0FAF5] focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {["24 horas","2-3 días","3-5 días","1 semana","Más de 1 semana"].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Software</Label><Input value={ef.q_software} onChange={e=>setEditData(p=>({...p,q_software:e.target.value}))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Idiomas</Label><Input value={ef.q_idiomas} onChange={e=>setEditData(p=>({...p,q_idiomas:e.target.value}))} className="h-8 text-sm" /></div>
                {(session.services?.infonavit||session.services?.fovissste) && (
                  <div className="col-span-2 space-y-1"><Label className="text-xs">Unidad de Valuación</Label><Input value={ef.q_unidad_valuacion} onChange={e=>setEditData(p=>({...p,q_unidad_valuacion:e.target.value}))} className="h-8 text-sm" /></div>
                )}
              </div>
            )}
            {editSection === "profesional" && <SaveBar />}
          </div>

        </div>
      </div>

      {/* Redes y contacto digital — ancho completo */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <SectionHeader icon={Globe} title="Redes y contacto digital" section="redes" />
        <div className="p-5">
          {(() => {
            const rs = session.redes_sociales || {};
            const hayRedes = rs.website || rs.instagram || rs.facebook || rs.whatsapp;
            if (hayRedes) return (
              <div className="flex flex-wrap gap-4">
                {rs.website   && <a href={rs.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#1B4332] hover:text-[#52B788] font-medium"><Globe className="w-3.5 h-3.5"/>{rs.website.replace(/^https?:\/\/(www\.)?/,"")}</a>}
                {rs.instagram && <a href={`https://instagram.com/${rs.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"><span>📸</span>{rs.instagram}</a>}
                {rs.facebook  && <a href={rs.facebook.startsWith("http") ? rs.facebook : `https://facebook.com/${rs.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><span>🔵</span>{rs.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//,"")}</a>}
                {rs.whatsapp  && <a href={`https://wa.me/${rs.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"><MessageCircle className="w-3.5 h-3.5"/>{rs.whatsapp}</a>}
              </div>
            );
            return (
              <button onClick={() => openEdit("redes")}
                className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors font-semibold">
                ✏️ Pendiente — agregar redes
              </button>
            );
          })()}
        </div>
        {editSection === "redes" && (
          <div className="border-t border-[#F0FAF5] px-5 pt-4 pb-1 grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Sitio web</Label><Input value={ef.redes_web} onChange={e=>setEditData(p=>({...p,redes_web:e.target.value}))} placeholder="https://mipagina.mx" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={ef.redes_ig} onChange={e=>setEditData(p=>({...p,redes_ig:e.target.value}))} placeholder="@miperfil" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input value={ef.redes_wa} onChange={e=>setEditData(p=>({...p,redes_wa:e.target.value}))} placeholder="33 1234 5678" className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Facebook</Label><Input value={ef.redes_fb} onChange={e=>setEditData(p=>({...p,redes_fb:e.target.value}))} placeholder="/mipagina o URL completa" className="h-8 text-sm" /></div>
          </div>
        )}
        {editSection === "redes" && <SaveBar />}
      </div>

      {/* Servicios — ancho completo */}
      <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center gap-2 rounded-t-xl">
          <Award className="w-4 h-4 text-[#D9ED92]" />
          <span className="font-['Outfit'] font-semibold text-white text-sm">Tipos de avalúo y servicios</span>
        </div>
        <div className="p-5 space-y-3">
          {checkedServices.length > 0
            ? <div className="flex flex-wrap gap-2">
                {checkedServices.map(svc=>(
                  <span key={svc} className="inline-flex items-center gap-1 text-xs font-medium bg-[#52B788]/15 text-[#1B4332] border border-[#52B788]/30 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-[#52B788]" />{serviceLabel(svc)}
                  </span>
                ))}
              </div>
            : <p className="text-sm text-slate-400 italic">Sin servicios registrados — <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">pendiente</span></p>
          }
          {session.peritajes_tipos?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 w-full">Peritajes:</span>
              {session.peritajes_tipos.map(p=><Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
            </div>
          )}
          {session.servicios_otros?.filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 w-full">Otros:</span>
              {session.servicios_otros.filter(Boolean).map((s,i)=><Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
            </div>
          )}
        </div>
      </div>

    </div>
  );

  /* ── Reseñas ─────────────────────────────────────────────── */
  const ReseñasTab = () => {
    const [resenas, setResenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyOpen, setReplyOpen] = useState({});
    const [replyText, setReplyText] = useState({});
    const [sending, setSending] = useState({});

    const perfilId = session.id || session.email;

    useEffect(() => {
      fetch(`${API}/directorio/valuadores/${perfilId}/resenas`)
        .then(r => r.json())
        .then(data => { setResenas(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }, [perfilId]);

    const avg = resenas.length
      ? (resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length).toFixed(1)
      : null;

    const dist = [5, 4, 3, 2, 1].map(n => ({
      n, count: resenas.filter(r => r.calificacion === n).length,
    }));

    const Stars = ({ value, size = "w-4 h-4" }) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${size} ${i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
        ))}
      </div>
    );

    const handleReply = async (resenaId) => {
      const text = (replyText[resenaId] || "").trim();
      if (!text) return;
      setSending(s => ({ ...s, [resenaId]: true }));
      try {
        const res = await fetch(
          `${API}/directorio/valuadores/${perfilId}/resenas/${resenaId}/respuesta`,
          { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ respuesta: text }) }
        );
        if (!res.ok) throw new Error("error");
        setResenas(prev => prev.map(r => r.id === resenaId ? { ...r, respuesta: text } : r));
        setReplyOpen(s => ({ ...s, [resenaId]: false }));
        setReplyText(s => ({ ...s, [resenaId]: "" }));
        toast.success("Respuesta publicada");
      } catch { toast.error("No se pudo publicar la respuesta"); }
      finally { setSending(s => ({ ...s, [resenaId]: false })); }
    };

    return (
      <div className="space-y-4">
        {/* Google Maps CTA */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-['Outfit'] font-semibold text-[#1B4332] text-base">Perfil en Google Maps</p>
              <p className="text-sm text-slate-500 mt-0.5">Comparte tu perfil de Google para que clientes dejen reseñas ahí también.</p>
            </div>
            {session.q_maps_url ? (
              <a href={session.q_maps_url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-[#1B4332] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2D6A4F] transition-colors">
                <ExternalLink className="w-4 h-4" /> Ver mi perfil en Maps
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">Agrega tu URL de Google Maps en el perfil</span>
            )}
          </CardContent>
        </Card>

        {/* Reseñas */}
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
                <p className="text-sm text-slate-400 mt-1">Comparte tu perfil de PropValu con tus clientes para recibir las primeras.</p>
              </div>
            ) : (
              <div className="space-y-6">
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
                          <div className="bg-amber-400 h-full rounded-full"
                            style={{ width: resenas.length ? `${(count / resenas.length) * 100}%` : "0%" }} />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {resenas.map(r => (
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
                      {r.respuesta && (
                        <div className="bg-[#F0FAF4] border border-[#52B788]/30 rounded-lg p-3 mt-2">
                          <p className="text-[11px] font-semibold text-[#1B4332] mb-1">Tu respuesta</p>
                          <p className="text-sm text-[#2D6A4F]">{r.respuesta}</p>
                        </div>
                      )}
                      {!r.respuesta && (
                        <div className="pt-1">
                          <button onClick={() => setReplyOpen(s => ({ ...s, [r.id]: !s[r.id] }))}
                            className="flex items-center gap-1.5 text-xs text-[#1B4332] hover:text-[#52B788] font-medium transition-colors">
                            {replyOpen[r.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {replyOpen[r.id] ? "Cancelar" : "Responder"}
                          </button>
                          {replyOpen[r.id] && (
                            <div className="mt-2 flex gap-2">
                              <textarea rows={2} placeholder="Escribe tu respuesta…"
                                value={replyText[r.id] || ""}
                                onChange={e => setReplyText(s => ({ ...s, [r.id]: e.target.value }))}
                                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#52B788]" />
                              <button onClick={() => handleReply(r.id)}
                                disabled={sending[r.id] || !replyText[r.id]?.trim()}
                                className="flex-shrink-0 self-end bg-[#1B4332] text-white px-3 py-2 rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
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
              Dashboard Valuador
            </span>
          </div>

          {/* Right: user chip + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-[#D9ED92]/40 rounded-full max-w-xs">
              {(() => {
                const fotoDoc = kycDocs.find(d => d.doc_tipo === "foto_profesional");
                return fotoDoc ? (
                  <img src={`${API}/kyc/documento/${fotoDoc.doc_id}`} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#52B788]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-300/60 border border-dashed border-slate-400/50 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                );
              })()}
              <span className="text-sm font-medium text-[#1B4332] truncate pr-1">
                {session.name || session.email}
              </span>
              {session.q_experiencia === "Más de 10 años" && <span className="text-sm">🥇</span>}
              {(session.q_experiencia === "5-10 años" || session.q_experiencia === "3-5 años") && <span className="text-sm">🥈</span>}
              {session.q_experiencia === "1-3 años" && <span className="text-sm">🥉</span>}
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
        {/* Banner expediente */}
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
              <button
                onClick={async () => {
                  const res = await fetch(`${API}/kyc/solicitar-entrevista`, { method: "POST", credentials: "include" });
                  if (res.ok) {
                    const updated = { ...session, kyc_status: "under_review" };
                    setSession(updated);
                    localStorage.setItem("valuador_session", JSON.stringify(updated));
                    toast.success("Solicitud enviada — te contactaremos pronto.");
                  } else { toast.error("No se pudo enviar la solicitud, intenta de nuevo."); }
                }}
                className="text-xs font-semibold text-blue-700 border border-blue-300 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 whitespace-nowrap shrink-0">
                🎯 Solicitar verificación
              </button>
            ) : (
              <button onClick={() => setActiveTab("expediente")}
                className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 whitespace-nowrap shrink-0">
                Ver documentos
              </button>
            )}
          </div>
        )}

        {/* Tab Nav + Plan card inline */}
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
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>
                )}
              </button>
            ))}
          </div>

          {/* Plan card inline */}
          {(() => {
            const plan = tienePlan ? PLAN_INFO[session.plan] : null;
            if (!plan) return (
              <button onClick={() => navigate("/checkout/pro", { state: { role: "valuador" } })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50 transition-colors shrink-0">
                <CreditCard className="w-3.5 h-3.5"/> Activar plan
              </button>
            );
            return (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border shrink-0 ${plan.border}`}>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full w-fit ${plan.badge}`}>Plan {plan.label}</span>
                  <span className="text-[10px] text-slate-400">{plan.precio} MXN / {plan.periodo}</span>
                </div>
                <div className="w-px h-8 bg-slate-200"/>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0"/>{plan.creditos} avalúos/mes
                  </span>
                  {plan.extras.slice(0,2).map(e => (
                    <span key={e} className="text-[11px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0"/>{e}
                    </span>
                  ))}
                </div>
                <div className="w-px h-8 bg-slate-200"/>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400">Créditos</span>
                  <span className={`text-xl font-bold font-['Outfit'] leading-none ${creditsLow ? "text-red-500" : "text-[#1B4332]"}`}>{credits}</span>
                  <span className="text-[10px] text-slate-400">de {plan.creditos}</span>
                </div>
                <button onClick={() => navigate("/checkout/pro", { state: { role: "valuador" } })}
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
            <ResumenActividad />
          </>
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
            <ValuacionesTable titulo="Todas mis valuaciones" />
          </>
        )}

        {/* Tab: Mercado */}
        {activeTab === "mercado" && <MercadoTab />}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && <PerfilCard />}

        {/* Tab: Expediente */}
        {activeTab === "expediente" && <ExpedienteTab />}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && <ReseñasTab />}
        {activeTab === "facturacion" && <FacturacionTab />}

        {/* Tab: Publicidad */}
        {activeTab === "publicidad" && <PublicidadTab />}
      </main>
    </div>
  );
};

export default ValuadorDashboardPage;
