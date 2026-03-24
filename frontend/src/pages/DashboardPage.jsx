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
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  FileText,
  History,
  LogOut,
  User,
  Crown,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  Home,
  Percent,
  Briefcase,
  Image
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { API } from "@/App";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || null);
  const [valuations, setValuations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedValuation, setSelectedValuation] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, draft: 0 });

  // Admin: KYC applications
  const [kycApplications, setKycApplications] = useState([]);
  const [kycFilter, setKycFilter] = useState("pending");
  const [kycReviewId, setKycReviewId] = useState(null);
  const [kycNotes, setKycNotes] = useState("");

  // Admin: Newsletter
  const [newsletters, setNewsletters] = useState([]);
  const [nlSubscribers, setNlSubscribers] = useState({ total: 0 });
  const [nlForm, setNlForm] = useState({ subject: "", content: "", type: "weekly" });
  const [nlCreating, setNlCreating] = useState(false);

  // Admin: Payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutGenerating, setPayoutGenerating] = useState(false);
  const [payoutMonth, setPayoutMonth] = useState(new Date().getMonth() + 1);
  const [payoutYear, setPayoutYear] = useState(new Date().getFullYear());

  // Valuador: earnings
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    if (!user) {
      checkAuth();
    } else {
      fetchData();
      if (user.role === "admin") { fetchKycApplications("pending"); fetchNewsletterData(); fetchPayouts(); }
    if (user.role === "appraiser") fetchEarnings(user.email || user.user_id);
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (!response.ok) {
        navigate("/", { replace: true });
        return;
      }
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/", { replace: true });
    }
  };

  const fetchPayouts = async () => {
    try {
      const r = await fetch(`${API}/admin/payouts`, { credentials: "include" });
      if (r.ok) setPayouts(await r.json());
    } catch {}
  };

  const handleGeneratePayouts = async () => {
    setPayoutGenerating(true);
    try {
      const r = await fetch(`${API}/admin/payouts/generate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: payoutMonth, year: payoutYear }),
      });
      const data = await r.json();
      if (r.ok) { toast.success(`${data.generated_count} payouts generados · $${data.total_to_pay} MXN total`); fetchPayouts(); }
      else toast.error(data.error || "Error al generar");
    } catch { toast.error("Error"); } finally { setPayoutGenerating(false); }
  };

  const handleMarkPaid = async (payoutId) => {
    const ref = prompt("Referencia de pago (opcional):");
    try {
      const r = await fetch(`${API}/admin/payouts/${payoutId}/mark-paid`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref }),
      });
      if (r.ok) { toast.success("Marcado como pagado"); fetchPayouts(); }
    } catch {}
  };

  const fetchEarnings = async (email) => {
    if (!email) return;
    try {
      const r = await fetch(`${API}/appraiser/earnings?email=${encodeURIComponent(email)}`);
      if (r.ok) setEarnings(await r.json());
    } catch {}
  };

  const fetchNewsletterData = async () => {
    try {
      const [nlRes, subRes] = await Promise.all([
        fetch(`${API}/admin/newsletter`, { credentials: "include" }),
        fetch(`${API}/admin/newsletter/subscribers?active=true`, { credentials: "include" }),
      ]);
      if (nlRes.ok) setNewsletters(await nlRes.json());
      if (subRes.ok) setNlSubscribers(await subRes.json());
    } catch {}
  };

  const handleSendNewsletter = async (id) => {
    try {
      const r = await fetch(`${API}/admin/newsletter/${id}/send`, { method: "POST", credentials: "include" });
      if (r.ok) { toast.success("Newsletter enviado"); fetchNewsletterData(); }
      else { const e = await r.json(); toast.error(e.error); }
    } catch { toast.error("Error al enviar"); }
  };

  const handleCreateNewsletter = async () => {
    if (!nlForm.subject || !nlForm.content) { toast.error("Completa asunto y contenido"); return; }
    setNlCreating(true);
    try {
      const r = await fetch(`${API}/admin/newsletter`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nlForm),
      });
      if (r.ok) { toast.success("Newsletter creado"); setNlForm({ subject: "", content: "", type: "weekly" }); fetchNewsletterData(); }
    } catch {} finally { setNlCreating(false); }
  };

  const fetchKycApplications = async (status = "pending") => {
    try {
      const r = await fetch(`${API}/admin/kyc?status=${status}`, { credentials: "include" });
      if (r.ok) setKycApplications(await r.json());
    } catch {}
  };

  const handleKycReview = async (id, status) => {
    try {
      const r = await fetch(`${API}/admin/kyc/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewer_notes: kycNotes }),
      });
      if (r.ok) {
        toast.success(`Solicitud ${status === "approved" ? "aprobada" : "rechazada"}`);
        setKycReviewId(null); setKycNotes("");
        fetchKycApplications(kycFilter);
      }
    } catch { toast.error("Error al procesar solicitud"); }
  };

  const fetchData = async () => {
    try {
      const [valuationsRes, statsRes] = await Promise.all([
        fetch(`${API}/valuations`, { credentials: "include" }),
        fetch(`${API}/stats`)
      ]);

      if (valuationsRes.ok) {
        const data = await valuationsRes.json();
        setValuations(data);
        
        const completed = data.filter(v => v.status === "completed").length;
        const draft = data.filter(v => v.status !== "completed").length;
        setStats({
          total: data.length,
          completed,
          draft
        });

        // Select first completed valuation for charts
        const firstCompleted = data.find(v => v.status === "completed" && v.result);
        if (firstCompleted) {
          setSelectedValuation(firstCompleted);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleUpgradeRole = async () => {
    try {
      const response = await fetch(`${API}/auth/upgrade-role`, {
        method: "POST",
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(prev => ({ ...prev, role: data.role }));
        toast.success("¡Ahora tienes acceso al modo valuador!");
      }
    } catch (error) {
      console.error("Error upgrading role:", error);
      toast.error("Error al actualizar rol");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const statuses = {
      draft: { label: "Borrador", className: "bg-slate-100 text-slate-700" },
      comparables_ready: { label: "En proceso", className: "bg-amber-100 text-amber-700" },
      calculated: { label: "Calculado", className: "bg-blue-100 text-blue-700" },
      completed: { label: "Completado", className: "bg-green-100 text-green-700" }
    };
    const s = statuses[status] || statuses.draft;
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  // Prepare chart data
  const getValueBreakdownData = () => {
    if (!selectedValuation?.result) return [];
    const result = selectedValuation.result;
    return [
      { name: 'Terreno', value: result.land_value, color: '#1B4332' },
      { name: 'Construcción', value: result.construction_depreciated, color: '#52B788' }
    ];
  };

  const getComparisonData = () => {
    if (!selectedValuation?.result) return [];
    const result = selectedValuation.result;
    const metrics = result.market_metrics || {};
    
    return [
      { name: 'Mín', venta: result.value_range_min },
      { name: 'Promedio', venta: result.estimated_value },
      { name: 'Máx', venta: result.value_range_max }
    ];
  };

  // Get comparables vs subject data for price per sqm
  const getComparablesPricePerSqmData = () => {
    if (!selectedValuation?.comparables || !selectedValuation?.result) return [];
    const comparables = selectedValuation.comparables || [];
    const result = selectedValuation.result;
    const selected = selectedValuation.selected_comparables || [];
    
    // Filter active comparables
    const activeComparables = selected.length > 0 
      ? comparables.filter(c => selected.includes(c.comparable_id))
      : comparables.slice(0, 6);
    
    const data = activeComparables.slice(0, 6).map((comp, idx) => ({
      name: `C${idx + 1}`,
      value: comp.price_per_sqm,
      isSubject: false
    }));
    
    // Add subject property
    data.push({
      name: 'Sujeto',
      value: result.price_per_sqm,
      isSubject: true
    });
    
    return data;
  };

  // Get comparables vs subject data for total market value
  const getComparablesMarketValueData = () => {
    if (!selectedValuation?.comparables || !selectedValuation?.result) return [];
    const comparables = selectedValuation.comparables || [];
    const result = selectedValuation.result;
    const selected = selectedValuation.selected_comparables || [];
    
    // Filter active comparables
    const activeComparables = selected.length > 0 
      ? comparables.filter(c => selected.includes(c.comparable_id))
      : comparables.slice(0, 6);
    
    const data = activeComparables.slice(0, 6).map((comp, idx) => ({
      name: `C${idx + 1}`,
      value: comp.price,
      isSubject: false
    }));
    
    // Add subject property
    data.push({
      name: 'Sujeto',
      value: result.estimated_value,
      isSubject: true
    });
    
    return data;
  };

  const COLORS = ['#1B4332', '#52B788', '#D9ED92'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#1B4332]" />
              <span className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">
                Prop<span className="text-[#52B788]">Valu</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="hidden md:flex items-center gap-3">
                    {user.picture && (
                      <img 
                        src={user.picture} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#1B4332]">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    {user.role === "appraiser" && (
                      <Badge className="bg-[#1B4332] text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Valuador
                      </Badge>
                    )}
                    {user.role === "realtor" && (
                      <Badge className="bg-[#0D47A1] text-white">
                        <Briefcase className="w-3 h-3 mr-1" />
                        Inmobiliaria
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-slate-600 hover:text-[#1B4332]"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332]">
              {user?.role === "realtor"
                ? "Panel de Inmobiliaria"
                : "Panel de Valuador"}
            </h1>
            {user?.role === "appraiser" && (
              <Crown className="w-6 h-6 text-[#52B788]" />
            )}
            {user?.role === "realtor" && (
              <Briefcase className="w-6 h-6 text-[#0D47A1]" />
            )}
          </div>
          <p className="text-slate-500 text-sm mb-1">
            Bienvenido, {user?.name?.split(' ')[0]}
          </p>
          <p className="text-slate-600">
            {user?.role === "realtor"
              ? "Gestiona tu portafolio de propiedades y accede a reportes comerciales"
              : "Realiza valuaciones profesionales con respaldo de datos de mercado en tiempo real"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Valuaciones</p>
                  <p className="text-3xl font-bold text-[#1B4332] font-['Outfit']">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#D9ED92]/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#1B4332]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Completadas</p>
                  <p className="text-3xl font-bold text-[#52B788] font-['Outfit']">
                    {stats.completed}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#52B788]/20 flex items-center justify-center">
                  <History className="w-6 h-6 text-[#52B788]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">En Proceso</p>
                  <p className="text-3xl font-bold text-amber-600 font-['Outfit']">
                    {stats.draft}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── VALUADOR: Widget de Ganancias ──────────────────────────── */}
        {user?.role === "appraiser" && earnings && (
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💰</span>
                <h3 className="font-['Outfit'] text-base font-bold text-[#1B4332]">Mis Ganancias</h3>
                <span className="text-xs text-slate-400 ml-auto">Comisión PropValu: 20% · Tu parte: 80%</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#f0faf4] rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Cobrado total</p>
                  <p className="font-['Outfit'] font-bold text-[#1B4332] text-lg">
                    ${earnings.total_earned?.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Por cobrar</p>
                  <p className="font-['Outfit'] font-bold text-amber-700 text-lg">
                    ${earnings.pending_amount?.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Órdenes totales</p>
                  <p className="font-['Outfit'] font-bold text-slate-700 text-lg">{earnings.total_orders}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">Completadas</p>
                  <p className="font-['Outfit'] font-bold text-slate-700 text-lg">{earnings.completed_orders}</p>
                </div>
              </div>
              {earnings.recent_payouts?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Últimas liquidaciones</p>
                  <div className="flex flex-col gap-1">
                    {earnings.recent_payouts.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{p.month}/{p.year} · {p.order_count} órdenes</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1B4332]">${p.total_appraiser?.toLocaleString("es-MX")}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-[#D9ED92] text-[#1B4332]" : "bg-amber-100 text-amber-700"}`}>
                            {p.status === "paid" ? "✓ Pagado" : "Pendiente"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        {selectedValuation && selectedValuation.result && (
          <>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Value Breakdown Pie Chart */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Desglose de Valor Físico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={getValueBreakdownData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getValueBreakdownData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-3">
                    {getValueBreakdownData().map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-[#1B4332]">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#1B4332]">Total</span>
                        <span className="font-bold text-[#52B788]">
                          {formatCurrency(selectedValuation.result.estimated_value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Metrics */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Métricas de Mercado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F8F9FA] rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Valor Mínimo</p>
                    <p className="text-xl font-bold text-[#1B4332]">
                      {formatCurrency(selectedValuation.result.value_range_min)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F8F9FA] rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Valor Máximo</p>
                    <p className="text-xl font-bold text-[#1B4332]">
                      {formatCurrency(selectedValuation.result.value_range_max)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#D9ED92]/20 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Renta Mensual Est.</p>
                    <p className="text-xl font-bold text-[#52B788]">
                      {formatCurrency(selectedValuation.result.market_metrics?.monthly_rent_estimate || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-[#D9ED92]/20 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Cap Rate</p>
                    <p className="text-xl font-bold text-[#52B788]">
                      {(selectedValuation.result.market_metrics?.cap_rate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Plusvalía Anual</p>
                    <p className="text-xl font-bold text-amber-600">
                      {(selectedValuation.result.market_metrics?.annual_appreciation || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Props. Similares</p>
                    <p className="text-xl font-bold text-slate-700">
                      {selectedValuation.result.market_metrics?.similar_properties_count || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Charts: Comparables vs Subject */}
          {selectedValuation.comparables && selectedValuation.comparables.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Price per sqm comparison */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Valor por m² - Comparables vs Sujeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={getComparablesPricePerSqmData()} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis 
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${formatCurrency(value)}/m²`, 'Precio']}
                        labelFormatter={(label) => label === 'Sujeto' ? '⭐ Sujeto Analizado' : `Comparable ${label}`}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]}
                      >
                        {getComparablesPricePerSqmData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isSubject ? '#D9ED92' : '#52B788'}
                            stroke={entry.isSubject ? '#1B4332' : 'none'}
                            strokeWidth={entry.isSubject ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#52B788]" />
                      <span className="text-xs text-slate-600">Comparables</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#D9ED92] border-2 border-[#1B4332]" />
                      <span className="text-xs text-slate-600">Sujeto Analizado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Value comparison */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-['Outfit'] text-lg text-[#1B4332] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Valor de Mercado - Comparables vs Sujeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={getComparablesMarketValueData()} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis 
                        tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Valor']}
                        labelFormatter={(label) => label === 'Sujeto' ? '⭐ Sujeto Analizado' : `Comparable ${label}`}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]}
                      >
                        {getComparablesMarketValueData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isSubject ? '#D9ED92' : '#1B4332'}
                            stroke={entry.isSubject ? '#52B788' : 'none'}
                            strokeWidth={entry.isSubject ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#1B4332]" />
                      <span className="text-xs text-slate-600">Comparables</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#D9ED92] border-2 border-[#52B788]" />
                      <span className="text-xs text-slate-600">Sujeto Analizado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          </>
        )}

        {/* ── ADMIN PANEL: KYC de Valuadores ─────────────────────────── */}
        {user?.role === "admin" && (
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">KYC — Solicitudes de Valuadores</h3>
                </div>
                <div className="flex gap-2">
                  {["pending","approved","rejected"].map(s => (
                    <button key={s} onClick={() => { setKycFilter(s); fetchKycApplications(s); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                        kycFilter === s ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}>
                      {s === "pending" ? "⏳ Pendientes" : s === "approved" ? "✅ Aprobadas" : "❌ Rechazadas"}
                    </button>
                  ))}
                </div>
              </div>
              {kycApplications.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No hay solicitudes {kycFilter === "pending" ? "pendientes" : kycFilter === "approved" ? "aprobadas" : "rechazadas"}.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {kycApplications.map(app => (
                    <div key={app.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{app.full_name}</p>
                          <p className="text-xs text-slate-500">{app.email} · {app.phone || "sin tel."}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Cédula: <strong>{app.cedula_number}</strong>
                            {app.cnbv_number ? ` · CNBV: ${app.cnbv_number}` : ""}
                            {app.despacho ? ` · ${app.despacho}` : ""}
                          </p>
                          {app.states_coverage?.length > 0 && (
                            <p className="text-xs text-slate-500">Cobertura: {app.states_coverage.join(", ")}</p>
                          )}
                          {app.ine_doc_url && <a href={app.ine_doc_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline mr-2">Ver INE</a>}
                          {app.cedula_doc_url && <a href={app.cedula_doc_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">Ver Cédula</a>}
                          <p className="text-xs text-slate-400 mt-1">Enviada: {new Date(app.created_at).toLocaleDateString('es-MX')}</p>
                          {app.reviewer_notes && <p className="text-xs text-slate-600 mt-1 italic">Notas: {app.reviewer_notes}</p>}
                        </div>
                        {app.status === "pending" && (
                          <div className="flex flex-col gap-2 shrink-0">
                            {kycReviewId === app.id ? (
                              <div className="flex flex-col gap-2 w-56">
                                <textarea
                                  value={kycNotes}
                                  onChange={e => setKycNotes(e.target.value)}
                                  placeholder="Notas para el valuador (opcional)"
                                  rows={2}
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#52B788]"
                                />
                                <div className="flex gap-1">
                                  <button onClick={() => handleKycReview(app.id, "approved")}
                                    className="flex-1 text-xs bg-[#52B788] text-white rounded-lg px-2 py-1.5 font-semibold hover:bg-[#40916C]">✓ Aprobar</button>
                                  <button onClick={() => handleKycReview(app.id, "rejected")}
                                    className="flex-1 text-xs bg-red-500 text-white rounded-lg px-2 py-1.5 font-semibold hover:bg-red-600">✗ Rechazar</button>
                                  <button onClick={() => { setKycReviewId(null); setKycNotes(""); }}
                                    className="text-xs text-slate-400 px-1 hover:text-slate-600">✕</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setKycReviewId(app.id)}
                                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-700 hover:border-[#1B4332] hover:text-[#1B4332]">
                                Revisar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── ADMIN PANEL: Newsletter ─────────────────────────────────── */}
        {user?.role === "admin" && (
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Newsletter / Inteligencia de Mercado</h3>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {nlSubscribers.total || 0} suscriptores activos
                </span>
              </div>

              {/* Crear nuevo newsletter */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Nuevo Newsletter</p>
                <div className="flex gap-2 mb-3">
                  {["weekly","monthly"].map(t => (
                    <button key={t} onClick={() => setNlForm(f => ({ ...f, type: t }))}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${nlForm.type === t ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-slate-600 border-slate-200"}`}>
                      {t === "weekly" ? "📰 Semanal" : "📊 Mensual (Data Analysis)"}
                    </button>
                  ))}
                </div>
                <input
                  value={nlForm.subject}
                  onChange={e => setNlForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Asunto del newsletter"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                />
                <textarea
                  value={nlForm.content}
                  onChange={e => setNlForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Contenido del newsletter (HTML o texto plano)"
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
                />
                <Button onClick={handleCreateNewsletter} disabled={nlCreating}
                  className="bg-[#52B788] hover:bg-[#40916C] text-white text-sm gap-2">
                  {nlCreating ? "Creando..." : "+ Crear como borrador"}
                </Button>
              </div>

              {/* Lista de newsletters */}
              {newsletters.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No hay newsletters creados aún.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {newsletters.map(nl => (
                    <div key={nl.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-700">{nl.subject}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            nl.status === "sent" ? "bg-[#D9ED92] text-[#1B4332]" : "bg-amber-100 text-amber-700"
                          }`}>{nl.status === "sent" ? `✓ Enviado (${nl.sent_count})` : "📝 Borrador"}</span>
                          <span className="text-xs text-slate-400">{nl.type === "weekly" ? "Semanal" : "Mensual"}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {nl.sent_at ? `Enviado: ${new Date(nl.sent_at).toLocaleDateString("es-MX")}` : `Creado: ${new Date(nl.created_at).toLocaleDateString("es-MX")}`}
                        </p>
                      </div>
                      {nl.status === "draft" && (
                        <Button size="sm" onClick={() => handleSendNewsletter(nl.id)}
                          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs">
                          Enviar ahora
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── ADMIN PANEL: Payouts ──────────────────────────────────── */}
        {user?.role === "admin" && (
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">💳</span>
                <h3 className="font-['Outfit'] text-lg font-bold text-[#1B4332]">Módulo Financiero — Payouts a Valuadores</h3>
              </div>

              {/* Generar liquidación */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Generar Liquidación Mensual</p>
                <div className="flex gap-3 items-end flex-wrap">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mes</label>
                    <select value={payoutMonth} onChange={e => setPayoutMonth(Number(e.target.value))}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>{new Date(2000, m-1, 1).toLocaleDateString("es-MX", { month: "long" })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Año</label>
                    <input type="number" value={payoutYear} onChange={e => setPayoutYear(Number(e.target.value))}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 w-24 focus:outline-none"
                    />
                  </div>
                  <Button onClick={handleGeneratePayouts} disabled={payoutGenerating}
                    className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm gap-2">
                    {payoutGenerating ? "Generando..." : "⚡ Generar Liquidación"}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Se procesarán todas las órdenes completadas en el periodo seleccionado que aún no hayan sido liquidadas.</p>
              </div>

              {/* Lista de payouts */}
              {payouts.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No hay liquidaciones registradas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 uppercase">
                      <tr>
                        <th className="text-left py-2 px-3">Valuador</th>
                        <th className="text-center py-2 px-3">Periodo</th>
                        <th className="text-center py-2 px-3">Órdenes</th>
                        <th className="text-right py-2 px-3">Monto (80%)</th>
                        <th className="text-right py-2 px-3">Comisión PropValu</th>
                        <th className="text-center py-2 px-3">Estado</th>
                        <th className="text-center py-2 px-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payouts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-700 text-xs">{p.appraiser_email}</td>
                          <td className="py-2.5 px-3 text-center text-xs text-slate-500">{p.month}/{p.year}</td>
                          <td className="py-2.5 px-3 text-center">{p.order_count}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#1B4332]">${p.total_appraiser?.toLocaleString("es-MX")}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500 text-xs">${p.total_commission?.toLocaleString("es-MX")}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              p.status === "paid" ? "bg-[#D9ED92] text-[#1B4332]" :
                              p.status === "processing" ? "bg-blue-100 text-blue-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {p.status === "paid" ? "✓ Pagado" : p.status === "processing" ? "⏳ En proceso" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.status !== "paid" && (
                              <button onClick={() => handleMarkPaid(p.id)}
                                className="text-xs bg-[#52B788] text-white px-3 py-1 rounded-lg font-semibold hover:bg-[#40916C]">
                                Marcar pagado
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upgrade Card — only for users without a professional role */}
        {user?.role !== "appraiser" && user?.role !== "realtor" && user?.role !== "admin" && (
          <Card className="mb-8 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] border-0 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] text-lg font-semibold">
                      Accede al Modo Valuador
                    </h3>
                    <p className="text-white/80 text-sm">
                      Selecciona comparables manualmente y obtén reportes más detallados
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpgradeRole}
                  className="bg-[#D9ED92] text-[#1B4332] hover:bg-[#D9ED92]/90"
                  data-testid="upgrade-btn"
                >
                  Activar Modo Valuador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Realtor welcome banner */}
        {user?.role === "realtor" && (
          <Card className="mb-8 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-lg font-semibold">
                    Cuenta Inmobiliaria Activa
                  </h3>
                  <p className="text-white/80 text-sm">
                    Acceso a valuaciones masivas, reportes comerciales y gestión de portafolio
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => navigate("/valuar")}
            className="bg-[#52B788] hover:bg-[#40916C] text-white px-8"
            data-testid="new-valuation-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {user?.role === "realtor" ? "Nueva Valuación de Propiedad" : "Nueva Valuación"}
          </Button>
        </div>

        {/* Valuations Table */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="font-['Outfit'] text-xl text-[#1B4332]">
              {user?.role === "realtor" ? "Portafolio de Propiedades" : "Historial de Valuaciones"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {valuations.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-600 mb-2">No tienes valuaciones aún</p>
                <p className="text-slate-500 mb-4">Comienza creando tu primera valuación</p>
                <Button
                  onClick={() => navigate("/valuar")}
                  className="bg-[#52B788] hover:bg-[#40916C] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Valuación
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-[#1B4332]">Ubicación</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Tipo</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Superficie</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Valor Estimado</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Renta Est.</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Estado</TableHead>
                      <TableHead className="font-semibold text-[#1B4332]">Fecha</TableHead>
                      <TableHead className="font-semibold text-[#1B4332] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuations.map((val, index) => (
                      <TableRow 
                        key={val.valuation_id} 
                        className={`hover:bg-slate-50 cursor-pointer ${
                          selectedValuation?.valuation_id === val.valuation_id ? 'bg-[#D9ED92]/20' : ''
                        }`}
                        onClick={() => val.result && setSelectedValuation(val)}
                        data-testid={`valuation-row-${index}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#52B788]" />
                            <div>
                              <p className="font-medium text-[#1B4332]">
                                {val.property_data.neighborhood}
                              </p>
                              <p className="text-xs text-slate-500">
                                {val.property_data.municipality}, {val.property_data.state}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {val.property_data.property_type || 'Casa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{val.property_data.construction_area} m²</p>
                          <p className="text-xs text-slate-500">
                            Terreno: {val.property_data.land_area} m²
                          </p>
                        </TableCell>
                        <TableCell>
                          {val.result ? (
                            <p className="font-semibold text-[#1B4332]">
                              {formatCurrency(val.result.estimated_value)}
                            </p>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {val.result?.market_metrics ? (
                            <p className="text-sm text-[#52B788]">
                              {formatCurrency(val.result.market_metrics.monthly_rent_estimate)}/mes
                            </p>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(val.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(val.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reporte/${val.valuation_id}`);
                              }}
                              className="text-[#52B788] hover:text-[#1B4332] hover:bg-[#D9ED92]/30"
                              data-testid={`view-report-btn-${index}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            {user?.role === "realtor" && val.result && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/ficha/${val.valuation_id}`);
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Generar Ficha Comercial"
                              >
                                <Image className="w-4 h-4 mr-1" />
                                Ficha
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DashboardPage;
