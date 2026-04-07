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
    cedula:                  "Cédula Profesional (arquitecto/ingeniero)",
    cedula_profesional:      "Cédula profesional SEP",
    cedula_valuador:         "Cédula de Perito Valuador",
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
                const hint = DOC_HINTS[key];
                return (
                  <div key={key} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {doc?.estado === "ratificado"
                          ? <ShieldCheck className="w-5 h-5 text-indigo-500" />
                          : doc
                            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                            : <Clock className="w-5 h-5 text-slate-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#1B4332]">{label}</p>
                          {doc?.estado === "ratificado" && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_DEFS[key]?.cls || "bg-indigo-100 text-indigo-700 border-indigo-200"}`}>
                              {BADGE_DEFS[key]?.emoji} Ratificado
                            </span>
                          )}
                        </div>
                        {hint && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{hint}</p>}
                        {doc && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
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

  const Pendiente = () => (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 ml-1">
      Pendiente
    </span>
  );

  const Campo = ({ label, value, icon: Icon }) => (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        {value
          ? <p className="text-sm text-slate-700">{value}</p>
          : <p className="text-sm text-slate-400 italic">No registrado <Pendiente /></p>
        }
      </div>
    </div>
  );

  const medallaExp = (() => {
    const exp = session?.q_experiencia;
    if (!exp) return null;
    if (exp === "Más de 10 años") return { emoji: "🥇", nivel: "Oro", title: "Más de 10 años — Nivel Oro" };
    if (exp === "5-10 años" || exp === "3-5 años") return { emoji: "🥈", nivel: "Plata", title: `${exp} — Nivel Plata` };
    if (exp === "1-3 años") return { emoji: "🥉", nivel: "Bronce", title: "1-3 años — Nivel Bronce" };
    return null;
  })();

  const PROFESION_LABELS = {
    arquitecto: "Arquitecto",
    ing_civil: "Ing. Civil",
    ing_estructural: "Ing. Estructural",
    otro: "Otra carrera afín",
  };

  const PerfilCard = () => (
    <div className="space-y-4">

      {/* Información personal */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
            <User className="w-4 h-4" /> Información personal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Nombre</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#1B4332]">{session.name || "—"}</p>
                {medallaExp && <span title={medallaExp.title} className="text-lg">{medallaExp.emoji}</span>}
              </div>
            </div>
            <Campo label="Correo electrónico" value={session.email} icon={Mail} />
            <Campo label="Teléfono de contacto" value={session.phone} icon={Phone} />
            <Campo label="Años de experiencia" value={session.q_experiencia
              ? `${session.q_experiencia}${medallaExp ? ` ${medallaExp.emoji} Nivel ${medallaExp.nivel}` : ""}`
              : null} />
          </div>
        </CardContent>
      </Card>

      {/* Cédulas */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
            🎓 Cédulas profesionales
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Profesión de base" value={PROFESION_LABELS[session.profesion_base] || session.profesion_base} />
            <Campo label="Núm. cédula (arq./ing.)" value={session.num_cedula_base} />
            <Campo label="Núm. cédula Perito Valuador" value={session.num_cedula_valuador} />
          </div>
        </CardContent>
      </Card>

      {/* Ubicación y oficina */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Ubicación y oficina
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Estado" value={session.estado} />
            <div>
              <p className="text-xs text-slate-400 mb-1">Municipios donde trabaja</p>
              {session.municipios?.filter(Boolean).length > 0
                ? <div className="flex flex-wrap gap-1.5">
                    {session.municipios.filter(Boolean).map((m, i) => (
                      <span key={i} className="text-xs bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-2 py-0.5 rounded-full">{m}</span>
                    ))}
                  </div>
                : <p className="text-sm text-slate-400 italic">No registrado <Pendiente /></p>
              }
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Dirección de oficina" value={session.q_dir_oficina} icon={MapPin} />
            <Campo label="Google Maps" value={session.q_maps_url} />
          </div>
          {!session.q_oficina && !session.q_dir_oficina && (
            <p className="text-xs text-slate-400 italic">No indicó dirección de oficina física. <Pendiente /></p>
          )}
        </CardContent>
      </Card>

      {/* Tipos de avalúo y servicios */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Tipos de avalúo y servicios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {checkedServices.length > 0
            ? <div>
                <p className="text-xs text-slate-400 mb-2">Servicios registrados</p>
                <div className="flex flex-wrap gap-2">
                  {checkedServices.map(svc => (
                    <Badge key={svc} className="bg-[#52B788]/15 text-[#1B4332] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />{serviceLabel(svc)}
                    </Badge>
                  ))}
                </div>
              </div>
            : <p className="text-sm text-slate-400 italic">Sin servicios registrados <Pendiente /></p>
          }
          {session.peritajes_tipos?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Tipos de peritaje</p>
              <div className="flex flex-wrap gap-2">
                {session.peritajes_tipos.map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {session.servicios_otros?.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Otros servicios</p>
              <div className="flex flex-wrap gap-2">
                {session.servicios_otros.filter(Boolean).map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {(session.services?.infonavit || session.services?.fovissste) && (
            <Campo label="Unidad de Valuación (Infonavit/Fovissste)" value={session.q_unidad_valuacion} />
          )}
        </CardContent>
      </Card>

      {/* Perfil profesional */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="font-['Outfit'] text-base text-[#1B4332] flex items-center gap-2">
            📋 Perfil profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Equipo de trabajo" value={
              { solo: "Solo yo", "1-3": "1 a 3 personas", "4-10": "4 a 10 personas", "10+": "Más de 10" }[session.q_equipo]
              || session.q_equipo
            } />
            <Campo label="Tiempo promedio de entrega" value={session.q_tiempo_entrega} />
            <Campo label="Software que utiliza" value={session.q_software} />
            <Campo label="Idiomas (además del español)" value={session.q_idiomas} />
            <div>
              <p className="text-xs text-slate-400 mb-1">Seguro de responsabilidad civil</p>
              <p className="text-sm text-slate-700">
                {session.q_seguro_rc === true ? "✅ Sí cuenta con seguro RC" : session.q_seguro_rc === false ? "No cuenta con seguro RC" : <span className="text-slate-400 italic">No indicado</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Modo de participación</p>
              <p className="text-sm text-slate-700">
                {session.modo_perfil === "completo" ? "Perfil completo (encargos externos)" : session.modo_perfil === "basico" ? "Perfil básico" : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
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
