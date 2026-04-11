import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/App";
import { compressFile } from "@/lib/compressFile";

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

  const TABS = [
    { id: "resumen",     label: "Resumen" },
    { id: "valuaciones", label: "Valuaciones" },
    { id: "perfil",      label: "Perfil" },
    { id: "expediente",  label: "Documentos", badge: !docsCompletos && session?.kyc_status !== "approved" },
    { id: "resenas",     label: "Reseñas" },
    { id: "publicidad",  label: "Publicidad" },
  ];

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Valuaciones del mes</p>
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">12</p>
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
              <p className="text-2xl font-bold text-[#1B4332] font-['Outfit']">
                {formatMXN(4680)}
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
              <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">18</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#1B4332]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PLAN_INFO = {
    starter: {
      label: "Starter", precio: "$1,200", periodo: "mes",
      color: "border-slate-200 bg-slate-50", badge: "bg-slate-200 text-slate-700",
      incluye: ["Valuaciones ilimitadas en la plataforma", "Reporte PDF PropValu", "Comparables en tiempo real"],
    },
    pro: {
      label: "Pro", precio: "$3,000", periodo: "mes",
      color: "border-[#52B788]/40 bg-[#F0FAF5]", badge: "bg-[#52B788] text-white",
      incluye: ["Todo Starter", "Encargos externos de PropValu", "Prioridad sobre Starter", "Perfil en directorio público"],
    },
    premium: {
      label: "Premium", precio: "$6,500", periodo: "mes",
      color: "border-[#1B4332]/30 bg-[#1B4332]/5", badge: "bg-[#1B4332] text-white",
      incluye: ["Todo Pro", "Máxima prioridad en asignación", "Soporte dedicado", "Reporte mensual de mercado"],
    },
  };

  const PlanCard = () => {
    const plan = session?.plan ? PLAN_INFO[session.plan] : null;
    if (!plan) return (
      <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-white p-5 flex items-center justify-between gap-4">
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
      <div className={`mb-6 rounded-2xl border p-5 ${plan.color}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.badge}`}>Plan {plan.label}</span>
              <span className="text-xs text-slate-500">{plan.precio} MXN + IVA / {plan.periodo}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {plan.incluye.map((item) => (
                <span key={item} className="text-xs text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{item}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Créditos disponibles</p>
            <p className="text-2xl font-bold text-[#1B4332] font-['Outfit']">{session.credits ?? 0}</p>
            <button onClick={() => navigate("/checkout/pro", { state: { role: "valuador" } })}
              className="mt-1 text-[10px] text-[#52B788] hover:underline">
              Renovar / cambiar plan
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

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit">
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
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <>
            <PlanCard />
            <StatCards />
            <CtaCard />
            <ValuacionesTable />
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

        {/* Tab: Perfil */}
        {activeTab === "perfil" && <PerfilCard />}

        {/* Tab: Expediente */}
        {activeTab === "expediente" && <ExpedienteTab />}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && <ReseñasTab />}

        {/* Tab: Publicidad */}
        {activeTab === "publicidad" && <PublicidadTab />}
      </main>
    </div>
  );
};

export default ValuadorDashboardPage;
