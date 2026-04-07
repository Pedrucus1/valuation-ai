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
} from "lucide-react";
import { API } from "@/App";

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
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("valuador_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
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

  /* ── KYC state ── */
  const [kycDocs, setKycDocs] = useState([]);
  const [kycSubiendo, setKycSubiendo] = useState({});
  const [kycError, setKycError] = useState("");

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/kyc/mis-documentos`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setKycDocs(d.documentos || []))
      .catch(() => {});
  }, [session]);

  if (!session) return null;

  /* ── Tabs ── */
  const docsRequeridos = session?.modo_perfil === "completo"
    ? ["ine_frente","cedula","foto_profesional","comprobante_experiencia","firma_autografa",
       "comprobante_domicilio","carta_recomendacion","curriculum","avaluo_muestra_1","avaluo_muestra_2","avaluo_muestra_3"]
    : ["ine_frente","cedula","foto_profesional","comprobante_experiencia","firma_autografa"];

  const docsCompletos = docsRequeridos.every(k => kycDocs.find(d => d.doc_tipo === k));

  const TABS = [
    { id: "resumen",     label: "Resumen" },
    { id: "valuaciones", label: "Valuaciones" },
    { id: "perfil",      label: "Perfil" },
    { id: "expediente",  label: "Mi expediente", badge: !docsCompletos && session?.kyc_status !== "approved" },
  ];

  const subirDocumento = async (docTipo, file) => {
    if (!file) return;
    setKycSubiendo((p) => ({ ...p, [docTipo]: true }));
    setKycError("");
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
    cedula:                  "Cédula Profesional",
    cedula_profesional:      "Cédula profesional SEP",
    foto_profesional:        "Foto profesional",
    comprobante_experiencia: "Comprobante de experiencia",
    firma_autografa:         "Firma autógrafa digital",
    comprobante_adicional:   "Comprobante adicional (tarjeta, web, etc.)",
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

  // Medallitas — cada doc_tipo → credencial que acredita
  const BADGE_DEFS = {
    ine_pasaporte:           { key: "identidad",   emoji: "🪪", label: "Identidad",           cls: "bg-blue-100 text-blue-700 border-blue-200" },
    ine_frente:              { key: "identidad",   emoji: "🪪", label: "Identidad",           cls: "bg-blue-100 text-blue-700 border-blue-200" },
    cedula:                  { key: "cedula",      emoji: "🎓", label: "Cédula SEP",          cls: "bg-purple-100 text-purple-700 border-purple-200" },
    cedula_profesional:      { key: "cedula",      emoji: "🎓", label: "Cédula SEP",          cls: "bg-purple-100 text-purple-700 border-purple-200" },
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
    pendiente: { label: "Expediente incompleto",       cls: "bg-amber-50 border-amber-200 text-amber-800",   icon: "📋" },
    listo:     { label: "Listo para entrevista",        cls: "bg-blue-50 border-blue-200 text-blue-800",      icon: "🎯" },
    revision:  { label: "En revisión por PropValu",     cls: "bg-purple-50 border-purple-200 text-purple-800",icon: "🔍" },
    aprobado:  { label: "Cuenta verificada ✅",          cls: "bg-green-50 border-green-200 text-green-800",   icon: "✅" },
  };

  const ExpedienteTab = () => {
    const etapa = etapaExpediente();
    const cfg = ETAPA_CFG[etapa];
    const subidos = docsRequeridos.filter(k => docSubido(k)).length;

    return (
      <div className="space-y-5">

        {/* Estado actual */}
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${cfg.cls}`}>
          <span className="text-2xl">{cfg.icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">{cfg.label}</p>
            {etapa === "pendiente" && (
              <p className="text-xs mt-0.5">
                Sube todos los documentos requeridos para poder agendar tu entrevista de verificación.
                Faltan <strong>{docsRequeridos.length - subidos}</strong> documento{docsRequeridos.length - subidos !== 1 ? "s" : ""}.
              </p>
            )}
            {etapa === "listo" && (
              <p className="text-xs mt-0.5">
                Tu expediente está completo. El equipo PropValu te contactará para agendar la entrevista por videollamada.
              </p>
            )}
            {etapa === "revision" && (
              <p className="text-xs mt-0.5">Tus documentos están siendo revisados. Te notificaremos por correo y WhatsApp con el resultado.</p>
            )}
            {etapa === "aprobado" && (
              <p className="text-xs mt-0.5">Tu perfil está activo. Bienvenido a la red de valuadores PropValu.</p>
            )}
          </div>
          {etapa === "listo" && (
            <button
              onClick={async () => {
                await fetch(`${API}/kyc/solicitar-entrevista`, { method: "POST", credentials: "include" });
                toast.success("Solicitud enviada — te contactaremos pronto para agendar la videollamada.");
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Solicitar entrevista
            </button>
          )}
        </div>

        {/* Medallitas ganadas */}
        {badgesGanados.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Credenciales verificadas</p>
            <div className="flex flex-wrap gap-2">
              {badgesGanados.map((b) => (
                <span key={b.key} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${b.cls}`}>
                  <span>{b.emoji}</span>
                  {b.label}
                  <ShieldCheck className="w-3 h-3" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Progreso del expediente</span>
            <span>{subidos}/{docsRequeridos.length}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${docsCompletos ? "bg-green-400" : "bg-[#52B788]"}`}
              style={{ width: `${Math.round((subidos / docsRequeridos.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* Lista de documentos */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Documentos requeridos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {kycError && (
              <div className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <XCircle className="w-4 h-4 flex-shrink-0" />{kycError}
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {docsRequeridos.map((key) => {
                const doc = docSubido(key);
                const subiendo = kycSubiendo[key];
                const label = DOC_LABELS[key] || key;
                return (
                  <div key={key} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {doc?.estado === "ratificado"
                        ? <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        : doc
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          : <Clock className="w-5 h-5 text-slate-300 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#1B4332]">{label}</p>
                          {doc?.estado === "ratificado" && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_DEFS[key]?.cls || "bg-indigo-100 text-indigo-700 border-indigo-200"}`}>
                              {BADGE_DEFS[key]?.emoji} Ratificado
                            </span>
                          )}
                        </div>
                        {doc && (
                          <p className="text-xs text-slate-400 truncate">
                            {doc.filename} · {new Date(doc.subido_at).toLocaleDateString("es-MX")}
                          </p>
                        )}
                      </div>
                    </div>
                    <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors flex-shrink-0 ${
                      doc ? "border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10" : "bg-[#1B4332] text-white hover:bg-[#163828]"
                    } ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <Upload className="w-3.5 h-3.5" />
                      {subiendo ? "Subiendo…" : doc ? "Reemplazar" : "Subir"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        disabled={subiendo} onChange={(e) => subirDocumento(key, e.target.files[0])} />
                    </label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-[11px] text-slate-400">Formatos aceptados: PDF, JPG, PNG · Máx. 5 MB por archivo</p>
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
        <button onClick={() => navigate("/checkout/pro")}
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
            <button onClick={() => navigate("/checkout/pro")}
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
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332]">
          {titulo}
        </CardTitle>
      </CardHeader>
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

  const PerfilCard = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
          <User className="w-5 h-5" />
          Perfil profesional
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Nombre</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#1B4332]">{session.name || "—"}</p>
              {(() => {
                const exp = session.q_experiencia;
                if (!exp) return null;
                if (exp === "Más de 10 años") return <span title="Más de 10 años — Nivel Oro" className="text-lg">🥇</span>;
                if (exp === "5-10 años" || exp === "3-5 años") return <span title={`${exp} — Nivel Plata`} className="text-lg">🥈</span>;
                if (exp === "1-3 años") return <span title="1-3 años — Nivel Bronce" className="text-lg">🥉</span>;
                return null;
              })()}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Correo electrónico</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-700">{session.email || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Teléfono</p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-700">{session.phone || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Ubicación</p>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-700">
                {[session.municipio, session.estado].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {checkedServices.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Servicios</p>
            <div className="flex flex-wrap gap-2">
              {checkedServices.map((svc) => (
                <Badge
                  key={svc}
                  className="bg-[#52B788]/15 text-[#1B4332] flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {serviceLabel(svc)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {session.peritajes && session.peritajes.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Peritajes</p>
            <div className="flex flex-wrap gap-2">
              {session.peritajes.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#D9ED92]/40 rounded-full">
              <User className="w-4 h-4 text-[#1B4332]" />
              <span className="text-sm font-medium text-[#1B4332]">
                {session.name?.split(" ")[0] || session.email}
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
          <div className="mb-6 flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Verificación pendiente</span> —
                {docsCompletos
                  ? " tu expediente está completo. Te contactaremos para agendar la entrevista."
                  : " completa tu expediente para poder agendar la entrevista de verificación."}
              </p>
            </div>
            <button onClick={() => setActiveTab("expediente")}
              className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 whitespace-nowrap shrink-0">
              Ver expediente
            </button>
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
      </main>
    </div>
  );
};

export default ValuadorDashboardPage;
