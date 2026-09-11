import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogOut, MapPin, User, Mail, Phone, Plus, Wallet } from "lucide-react";
import { API } from "@/App";
import CreditosCheckoutModal from "@/components/CreditosCheckoutModal";

const formatMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG = {
  completada: { label: "Completada", className: "bg-green-100 text-green-700" },
  en_proceso: { label: "En proceso", className: "bg-amber-100 text-amber-700" },
  pendiente:  { label: "Pendiente",  className: "bg-slate-100 text-slate-600" },
};
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
};

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
    status: (v.status || "").toLowerCase(),
    purpose: v.purpose || "opi",
  };
}

function destinoValuacion(v) {
  if (v.estado === "completada" || v.status === "calculated") return `/reporte/${v.id}`;
  return `/comparables/${v.id}`;
}

const TABS = [
  { id: "resumen",     label: "Resumen" },
  { id: "valuaciones", label: "Valuaciones" },
  { id: "perfil",      label: "Perfil" },
];

const InversionistaDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [valuaciones, setValuaciones] = useState([]);
  const [purposeFilter, setPurposeFilter] = useState("todos"); // todos | opi | flipping
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fromState = location.state?.user;
    if (fromState) {
      setSession(fromState);
      localStorage.setItem("investor_session", JSON.stringify(fromState));
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("investor_session") || "{}");
      if (stored && stored.email) {
        setSession(stored);
      } else {
        navigate("/login", { state: { role: "investor" } });
      }
    } catch {
      navigate("/login", { state: { role: "investor" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me) {
          setSession((prev) => ({ ...prev, credits: me.credits }));
          localStorage.setItem("investor_session", JSON.stringify({ ...session, credits: me.credits }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.email, showCheckout]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/valuations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setValuaciones((data || []).map(normalizeValuacion)))
      .catch(() => {});
  }, [session]);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // silently ignore network errors on logout
    }
    localStorage.removeItem("investor_session");
    navigate("/login");
  };

  if (!session) return null;

  const valuacionesFiltradas = valuaciones.filter(
    (v) => purposeFilter === "todos" || v.purpose === purposeFilter
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Manrope']">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#1B4332]" />
            <span className="font-['Outfit'] text-xl font-bold text-[#1B4332]">
              Prop<span className="text-[#52B788]">Valu</span>
            </span>
            <span className="hidden sm:block text-slate-300 select-none">|</span>
            <span className="hidden sm:block text-sm font-medium text-slate-500">
              Dashboard Inversionista
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#D9ED92]/40 rounded-full max-w-xs">
              <User className="w-3.5 h-3.5 text-[#1B4332]" />
              <span className="text-sm font-medium text-[#1B4332] truncate">{session.name || session.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-[#1B4332]">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "bg-[#1B4332] text-white shadow-sm" : "text-slate-500 hover:text-[#1B4332]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/valuar")} variant="outline" className="border-[#52B788] text-[#1B4332]">
              <Plus className="w-4 h-4 mr-1" /> Nueva OPI
            </Button>
            <Button onClick={() => navigate("/flipping")} className="bg-[#52B788] hover:bg-[#40916C] text-white">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Flipping
            </Button>
          </div>
        </div>

        {activeTab === "resumen" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-2">Total valuaciones</p>
                <p className="text-2xl font-bold text-[#1B4332]">{valuaciones.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-2">Flipping</p>
                <p className="text-2xl font-bold text-[#1B4332]">
                  {valuaciones.filter((v) => v.purpose === "flipping").length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-2">OPIs</p>
                <p className="text-2xl font-bold text-[#1B4332]">
                  {valuaciones.filter((v) => v.purpose === "opi").length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "valuaciones" && (
          <>
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit mb-4">
              {[
                { id: "todos", label: "Todos" },
                { id: "flipping", label: "Flipping" },
                { id: "opi", label: "OPI" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPurposeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    purposeFilter === f.id ? "bg-[#1B4332] text-white" : "text-slate-500 hover:text-[#1B4332]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4">
                <p className="font-['Outfit'] font-bold text-white text-base">Mis valuaciones</p>
              </div>
              <CardContent className="p-0">
                {valuacionesFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Aún no tienes valuaciones registradas</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-semibold text-[#1B4332]">Dirección</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Tipo</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Origen</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Fecha</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Valor estimado</TableHead>
                          <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {valuacionesFiltradas.map((v) => (
                          <TableRow
                            key={v.id}
                            onClick={() =>
                              v.estado === "completada"
                                ? window.open(destinoValuacion(v), "_blank")
                                : navigate(destinoValuacion(v))
                            }
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#52B788] shrink-0" />
                                <span className="text-sm text-[#1B4332]">{v.direccion}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{v.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={v.purpose === "flipping" ? "bg-[#D9ED92] text-[#1B4332]" : "bg-slate-100 text-slate-600"}>
                                {v.purpose === "flipping" ? "Flipping" : "OPI"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">{v.fecha}</TableCell>
                            <TableCell className="font-semibold text-[#1B4332] text-sm">
                              {v.estado === "pendiente" ? <span className="text-slate-400">—</span> : formatMXN(v.valor)}
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
          </>
        )}

        {activeTab === "perfil" && (
          <div className="space-y-4 max-w-lg">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D9ED92]/40 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[#1B4332]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Créditos disponibles</p>
                    <p className="text-2xl font-bold text-[#1B4332]">{session.credits ?? 0}</p>
                  </div>
                </div>
                <Button onClick={() => setShowCheckout(true)} className="bg-[#52B788] hover:bg-[#40916C] text-white">
                  Comprar más
                </Button>
              </CardContent>
            </Card>
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nombre
                </Label>
                <Input value={session.name || ""} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Correo
                </Label>
                <Input value={session.email || ""} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Teléfono
                </Label>
                <Input value={session.phone || ""} disabled className="bg-slate-50" />
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </main>

      <CreditosCheckoutModal open={showCheckout} onOpenChange={setShowCheckout} session={session} />
    </div>
  );
};

export default InversionistaDashboardPage;
