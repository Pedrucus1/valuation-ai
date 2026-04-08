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
  CreditCard,
  TrendingUp,
  Users,
  BarChart2,
  Plus,
  MapPin,
  AlertTriangle,
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

/* ─── Mock data ─────────────────────────────────────────── */

const MOCK_VALUACIONES = [
  {
    id: 1,
    direccion: "Blvd. Puerta de Hierro 4965, Zapopan",
    tipo: "Casa",
    fecha: "15 mar 2026",
    valor: 6200000,
    estado: "completada",
  },
  {
    id: 2,
    direccion: "Av. López Mateos Sur 3080, Guadalajara",
    tipo: "Departamento",
    fecha: "13 mar 2026",
    valor: 2850000,
    estado: "completada",
  },
  {
    id: 3,
    direccion: "Calle Niños Héroes 1455, Col. Moderna",
    tipo: "Casa",
    fecha: "11 mar 2026",
    valor: 3900000,
    estado: "en_proceso",
  },
  {
    id: 4,
    direccion: "Av. Mariano Otero 2963, Zapopan",
    tipo: "Departamento",
    fecha: "08 mar 2026",
    valor: 1750000,
    estado: "completada",
  },
  {
    id: 5,
    direccion: "Calle Reforma 210, Tlaquepaque",
    tipo: "Casa",
    fecha: "04 mar 2026",
    valor: 2200000,
    estado: "pendiente",
  },
];

const MOCK_ASESORES = [
  { id: 1, nombre: "Sofía Ramírez Torres",   email: "sofia.ramirez@inmobiliaria.mx",    valuaciones: 4, activo: true },
  { id: 2, nombre: "Carlos Mendoza Ibarra",  email: "carlos.mendoza@inmobiliaria.mx",   valuaciones: 2, activo: true },
  { id: 3, nombre: "Daniela Herrera López",  email: "daniela.herrera@inmobiliaria.mx",  valuaciones: 2, activo: true },
  { id: 4, nombre: "Jorge Navarro Castillo", email: "jorge.navarro@inmobiliaria.mx",    valuaciones: 0, activo: false },
];

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

  const DOCS_REQUERIDOS = [
    { key: "ine_frente",            label: "INE del representante (frente y vuelta)" },
    { key: "foto_profesional",      label: "Foto profesional" },
    { key: "comprobante_domicilio", label: "Comprobante de domicilio del negocio" },
    { key: "cert_asociacion",       label: "Certificado de asociación inmobiliaria (AMPI/CANACO/CIPS)" },
    { key: "opinion_fiscal",        label: "Opinión de cumplimiento fiscal (SAT)" },
    { key: "constancia_rfc",        label: "Constancia de situación fiscal (RFC)" },
    { key: "logo_empresa",          label: "Logo de empresa (opcional)" },
  ];

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
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("inmobiliaria_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
        cargarDocs();
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

  const credits = session.credits ?? 15;
  const creditsLow = credits <= 3;
  const showKycBanner = !session?.kyc_status || session.kyc_status === "pending";
  const displayName = session.company_name || session.name || session.email;

  /* ── Tabs ── */
  const docsSubidos = DOCS_REQUERIDOS.filter((d) => docSubido(d.key)).length;

  const TABS = [
    { id: "resumen",      label: "Resumen" },
    { id: "valuaciones",  label: "Valuaciones" },
    { id: "equipo",       label: "Equipo" },
    { id: "documentos",   label: "Documentos", badge: docsSubidos < DOCS_REQUERIDOS.length ? DOCS_REQUERIDOS.length - docsSubidos : null },
    { id: "perfil",       label: "Perfil" },
  ];

  const DocumentosTab = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Documentos de verificación
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Sube los documentos requeridos para que el equipo PropValu verifique tu empresa y puedas operar con tu plan completo.
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {kycError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">{kycError}</div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {DOCS_REQUERIDOS.map(({ key, label }) => {
            const doc = docSubido(key);
            const subiendo = kycSubiendo[key];
            return (
              <div key={key} className={`rounded-xl border p-4 ${doc ? "border-[#52B788]/40 bg-[#F0FAF5]" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-4 h-4 ${doc ? "text-[#52B788]" : "text-slate-400"}`} />
                    <span className="text-sm font-medium text-[#1B4332]">{label}</span>
                  </div>
                  {doc
                    ? <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> Subido</span>
                    : <span className="flex items-center gap-1 text-[11px] font-semibold text-yellow-600"><Clock className="w-3.5 h-3.5" /> Pendiente</span>
                  }
                </div>
                {doc && (
                  <p className="text-[11px] text-slate-400 mb-3 truncate">{doc.filename}</p>
                )}
                <label className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  subiendo ? "bg-slate-100 text-slate-400" :
                  doc ? "bg-white border border-[#52B788]/40 text-[#52B788] hover:bg-[#52B788]/10" :
                  "bg-[#1B4332] text-white hover:bg-[#163828]"
                }`}>
                  <Upload className="w-3.5 h-3.5" />
                  {subiendo ? "Subiendo..." : doc ? "Reemplazar" : "Subir archivo"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={subiendo}
                    onChange={(e) => subirDocumento(key, e.target.files?.[0])}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">Formatos aceptados: PDF, JPG, PNG · Máximo 5 MB por archivo</p>
        {docsSubidos === DOCS_REQUERIDOS.length && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Todos los documentos subidos — el equipo PropValu los revisará pronto.
          </div>
        )}
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
    </div>
  );

  const PLAN_INFO_INMO = {
    basico:    { label: "Básico",    precio: "$950",   periodo: "mes", badge: "bg-slate-200 text-slate-700",    border: "border-slate-200 bg-slate-50",    valuaciones: 5,  usuarios: "1 titular",    extras: [] },
    estandar:  { label: "Estándar", precio: "$2,800", periodo: "mes", badge: "bg-[#52B788] text-white",       border: "border-[#52B788]/30 bg-[#F0FAF5]", valuaciones: 20, usuarios: "Hasta 5 asesores", extras: ["Reporte de mercado mensual"] },
    premier:   { label: "Premier",  precio: "$7,200", periodo: "mes", badge: "bg-[#1B4332] text-white",       border: "border-[#1B4332]/20 bg-[#1B4332]/5", valuaciones: 50, usuarios: "Ilimitados",  extras: ["Reporte de mercado mensual", "Soporte dedicado", "Sin publicidad"] },
  };

  const PlanCard = () => {
    const plan = session?.plan ? PLAN_INFO_INMO[session.plan] : null;
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${plan.badge}`}>Plan {plan.label}</span>
              <span className="text-xs text-slate-500">{plan.precio} MXN + IVA / {plan.periodo}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{plan.valuaciones} valuaciones/mes
              </span>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />Usuarios: {plan.usuarios}
              </span>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />Reporte PDF PropValu
              </span>
              {plan.extras.map(e => (
                <span key={e} className="text-xs text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#52B788] shrink-0" />{e}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Créditos disponibles</p>
            <p className="text-2xl font-bold text-[#1B4332] font-['Outfit']">{credits}</p>
            <button onClick={handleComprarCreditos}
              className="mt-1 text-[10px] text-[#52B788] hover:underline">
              Renovar / cambiar plan
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CreditsCta = () => (
    <Card className="bg-white border-0 shadow-sm mb-6">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {creditsLow ? (
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-[#1B4332]" />
            </div>
          )}
          <div>
            {creditsLow ? (
              <p className="text-sm font-semibold text-red-700">
                Créditos bajos — recarga tu plan
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#1B4332]">
                Tienes {credits} crédito{credits !== 1 ? "s" : ""} disponible
                {credits !== 1 ? "s" : ""}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Cada valuación consume 1 crédito
            </p>
          </div>
        </div>
        <Button
          onClick={handleComprarCreditos}
          className="bg-[#52B788] hover:bg-[#40916C] text-white shrink-0"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Comprar más créditos
        </Button>
      </CardContent>
    </Card>
  );

  const ValuacionesTable = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332]">
          Valuaciones recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
              {MOCK_VALUACIONES.map((v) => (
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
      </CardContent>
    </Card>
  );

  const EquipoTable = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
          <Users className="w-5 h-5" />
          Equipo de asesores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-[#1B4332]">Nombre</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Email</TableHead>
                <TableHead className="font-semibold text-[#1B4332]">
                  Valuaciones del mes
                </TableHead>
                <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ASESORES.map((a) => (
                <TableRow key={a.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-[#1B4332] text-sm">
                    {a.nombre}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{a.email}</TableCell>
                  <TableCell className="text-sm text-slate-700">{a.valuaciones}</TableCell>
                  <TableCell>
                    {a.activo ? (
                      <Badge className="bg-green-100 text-green-700">Activo</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500">Inactivo</Badge>
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

  const PerfilCard = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Perfil de empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {session.company_name && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Empresa</p>
              <p className="font-semibold text-[#1B4332]">{session.company_name}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 mb-1">Nombre del contacto</p>
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
            <p className="text-xs text-slate-400 mb-1">Tipo de cuenta</p>
            {session.inmobiliaria_tipo === "titular" ? (
              <Badge className="bg-[#1B4332] text-white">Titular</Badge>
            ) : session.inmobiliaria_tipo === "asesor" ? (
              <Badge variant="outline">Asesor</Badge>
            ) : (
              <Badge variant="outline">{session.inmobiliaria_tipo || "—"}</Badge>
            )}
          </div>
          {session.asociacion && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Asociación</p>
              <p className="text-sm text-slate-700">{session.asociacion}</p>
            </div>
          )}
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

        {/* Logo */}
        {(() => {
          const logoDoc = kycDocs.find(d => d.doc_tipo === "logo_empresa");
          return (
            <div>
              <p className="text-xs text-slate-400 mb-2">Logo de empresa</p>
              {logoDoc ? (
                <img
                  src={`${API}/kyc/documento/${logoDoc.doc_id}`}
                  alt="Logo"
                  className="h-14 w-auto object-contain rounded-lg border border-slate-100 bg-slate-50 p-1"
                />
              ) : (
                <p className="text-xs text-slate-400 italic">Sin logo — puedes subirlo desde Documentos</p>
              )}
            </div>
          );
        })()}

        {/* Cuestionario */}
        {(session.q_anos_mercado || session.q_cartera_propiedades || session.q_tipo_operaciones || session.q_crm) && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Perfil de operaciones</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {session.q_anos_mercado && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Años en el mercado</p>
                  <p className="text-sm text-slate-700">{session.q_anos_mercado}</p>
                </div>
              )}
              {session.q_cartera_propiedades && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Promedio de propiedades en cartera</p>
                  <p className="text-sm text-slate-700">{session.q_cartera_propiedades}</p>
                </div>
              )}
              {session.q_tipo_operaciones && Object.values(session.q_tipo_operaciones).some(Boolean) && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Tipo de operaciones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(session.q_tipo_operaciones)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-[#D9ED92] text-[#1B4332] font-medium">
                          {k.replace(/_/g, " ")}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {session.q_crm && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">CRM / Herramientas</p>
                  <p className="text-sm text-slate-700">{session.q_crm}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#D9ED92]/40 rounded-full">
              <Briefcase className="w-4 h-4 text-[#1B4332]" />
              <span className="text-sm font-medium text-[#1B4332]">
                {displayName?.split(" ").slice(0, 2).join(" ")}
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
          <div className="mb-6 flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Verificación pendiente</span> — sube tus documentos para activar tu cuenta completa.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("documentos")}
              className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              Subir documentos
            </button>
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
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

        {/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <>
            <PlanCard />
            <StatCards />
            <CreditsCta />
            <ValuacionesTable />
          </>
        )}

        {/* Tab: Valuaciones */}
        {activeTab === "valuaciones" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Outfit'] text-xl font-semibold text-[#1B4332]">
                Valuaciones del portafolio
              </h2>
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
        {activeTab === "equipo" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Outfit'] text-xl font-semibold text-[#1B4332]">
                Equipo
              </h2>
            </div>
            <EquipoTable />
          </>
        )}

        {/* Tab: Documentos */}
        {activeTab === "documentos" && <DocumentosTab />}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && <PerfilCard />}
      </main>
    </div>
  );
};

export default InmobiliariaDashboardPage;
