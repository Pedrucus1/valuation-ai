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

  useEffect(() => {
    const fromState = location.state?.user;
    if (fromState) {
      setSession(fromState);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("inmobiliaria_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
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
  const TABS = [
    { id: "resumen",      label: "Resumen" },
    { id: "valuaciones",  label: "Valuaciones" },
    { id: "equipo",       label: "Equipo" },
    { id: "perfil",       label: "Perfil" },
  ];

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
            {session.inmobiliaria_tipo === "Titular" ? (
              <Badge className="bg-[#1B4332] text-white">Titular</Badge>
            ) : (
              <Badge variant="outline">Asesor</Badge>
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
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Tu cuenta está en revisión</span> — te
              contactaremos para una entrevista de verificación.
            </p>
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
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

        {/* Tab: Perfil */}
        {activeTab === "perfil" && <PerfilCard />}
      </main>
    </div>
  );
};

export default InmobiliariaDashboardPage;
