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
  const TABS = [
    { id: "resumen", label: "Resumen" },
    { id: "valuaciones", label: "Valuaciones" },
    { id: "perfil", label: "Perfil" },
    { id: "kyc", label: "Documentos KYC" },
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

  const DOC_TIPOS = [
    { key: "ine_pasaporte",      label: "INE / Pasaporte" },
    { key: "cedula_profesional", label: "Cédula profesional SEP" },
    { key: "cert_indaabin",      label: "Certificación INDAABIN" },
    { key: "rfc_sat",            label: "RFC activo SAT" },
    { key: "seguro_rc",          label: "Seguro RC vigente" },
    { key: "foto_profesional",   label: "Foto profesional" },
  ];

  const docSubido = (key) => kycDocs.find((d) => d.doc_tipo === key);

  const KYCTab = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Documentos de verificación (KYC)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-slate-500">
          Sube tus documentos para que el equipo PropValu verifique tu perfil y puedas operar como valuador verificado.
          Los archivos deben ser PDF, JPG o PNG, máximo 5 MB.
        </p>
        {kycError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {kycError}
          </div>
        )}
        <div className="space-y-3">
          {DOC_TIPOS.map(({ key, label }) => {
            const doc = docSubido(key);
            const subiendo = kycSubiendo[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {doc ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1B4332]">{label}</p>
                    {doc && (
                      <p className="text-xs text-slate-400 truncate">
                        {doc.filename} · {new Date(doc.subido_at).toLocaleDateString("es-MX")}
                      </p>
                    )}
                  </div>
                </div>
                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors flex-shrink-0 ${
                  doc
                    ? "border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10"
                    : "bg-[#1B4332] text-white hover:bg-[#163828]"
                } ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <Upload className="w-3.5 h-3.5" />
                  {subiendo ? "Subiendo…" : doc ? "Reemplazar" : "Subir"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    disabled={subiendo}
                    onChange={(e) => subirDocumento(key, e.target.files[0])}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
          {kycDocs.length}/{DOC_TIPOS.length} documentos subidos.
          {kycDocs.length === DOC_TIPOS.length
            ? " ✅ Documentación completa — en revisión por el equipo PropValu."
            : " Completa todos los documentos para acelerar tu verificación."}
        </div>
      </CardContent>
    </Card>
  );

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
            <p className="font-semibold text-[#1B4332]">{session.name || "—"}</p>
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
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Tu cuenta está en revisión</span> — te
              contactaremos para una entrevista de verificación.
            </p>
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#1B4332]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <>
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

        {/* Tab: KYC */}
        {activeTab === "kyc" && <KYCTab />}
      </main>
    </div>
  );
};

export default ValuadorDashboardPage;
