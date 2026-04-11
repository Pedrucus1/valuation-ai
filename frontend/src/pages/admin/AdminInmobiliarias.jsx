import { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Building2, Users, ShieldCheck, BarChart2, CreditCard,
  Search, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Clock, MapPin, Mail, Phone, AlertTriangle, Activity,
  FileText, Send, Download, Star, Ban, X, TrendingUp, Zap,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const KYC_CFG = {
  approved: { label: "Aprobada",  cls: "bg-green-100 text-green-700" },
  pending:  { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rechazada", cls: "bg-red-100 text-red-600"   },
};
const ESTADO_CFG = {
  activo:     { label: "Activa",     cls: "bg-green-100 text-green-700" },
  suspendido: { label: "Suspendida", cls: "bg-red-100 text-red-600"   },
};

const PLAN_CFG = {
  enterprise:   { label: "Enterprise",   cls: "bg-[#1B4332] text-white" },
  corporativo:  { label: "Corporativo",  cls: "bg-purple-100 text-purple-700" },
  pro:          { label: "Pro",          cls: "bg-[#52B788] text-white" },
  despacho:     { label: "Despacho",     cls: "bg-blue-100 text-blue-700" },
  basico:       { label: "Básico",       cls: "bg-slate-100 text-slate-600" },
  sin_plan:     { label: "Sin plan",     cls: "bg-slate-50 text-slate-400" },
};

const SERVICIOS_INMO = [
  { key: "visitas_presenciales",  label: "Visita presencial",   Icon: MapPin,     color: "bg-blue-50 text-blue-700 border-blue-200"    },
  { key: "verificacion_valuador", label: "Verif. valuador",     Icon: ShieldCheck,color: "bg-green-50 text-green-700 border-green-200"  },
  { key: "reportes_comparativos", label: "Comparativo",         Icon: BarChart2,  color: "bg-purple-50 text-purple-700 border-purple-200"},
  { key: "avaluos_urgentes",      label: "Urgente",             Icon: Zap,        color: "bg-amber-50 text-amber-700 border-amber-200"  },
];

const Chip = ({ cfg }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg?.cls || "bg-slate-100 text-slate-500"}`}>
    {cfg?.label || "—"}
  </span>
);

/* ─── KPI card ─── */
const KpiCard = ({ icon: Icon, label, val, color, alerta }) => (
  <div className={`bg-white rounded-2xl border p-5 ${alerta ? "border-amber-200" : "border-slate-100"}`}>
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
  </div>
);

const CHART_COLORS = ["#1B4332", "#52B788", "#D9ED92", "#B7E4C7", "#40916C", "#74C69D"];

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#B7E4C7] rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-[#1B4332] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || "#1B4332" }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

/* ─── Tab Resumen ─── */
const TabResumen = ({ inmobiliarias }) => {
  const stats = useMemo(() => {
    const total       = inmobiliarias.length;
    const aprobadas   = inmobiliarias.filter((r) => r.kyc_status === "approved").length;
    const pendientes  = inmobiliarias.filter((r) => r.kyc_status === "pending").length;
    const rechazadas  = inmobiliarias.filter((r) => r.kyc_status === "rejected").length;
    const creditos    = inmobiliarias.reduce((s, r) => s + (r.credits || 0), 0);
    const avaluosMes  = inmobiliarias.reduce((s, r) => s + (r.avaluos_mes || 0), 0);
    const avaluosTotal= inmobiliarias.reduce((s, r) => s + (r.total_avaluos || 0), 0);
    const conCreditosBajos = inmobiliarias.filter((r) => (r.credits ?? 0) <= 2 && r.kyc_status === "approved").length;
    const tasaAprobacion = total > 0 ? Math.round((aprobadas / total) * 100) : 0;
    return { total, aprobadas, pendientes, rechazadas, creditos, avaluosMes, avaluosTotal, conCreditosBajos, tasaAprobacion };
  }, [inmobiliarias]);

  // Datos para gráficas
  const pieKyc = [
    { name: "Aprobadas",  value: stats.aprobadas,  fill: "#52B788" },
    { name: "Pendientes", value: stats.pendientes, fill: "#F59E0B" },
    { name: "Rechazadas", value: stats.rechazadas, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const top8Avaluos = useMemo(() =>
    [...inmobiliarias]
      .sort((a, b) => (b.total_avaluos || 0) - (a.total_avaluos || 0))
      .slice(0, 8)
      .map((r) => ({ name: (r.company_name || r.email || "—").slice(0, 18), avaluos: r.total_avaluos || 0, mes: r.avaluos_mes || 0 })),
    [inmobiliarias]
  );

  const top8Creditos = useMemo(() =>
    [...inmobiliarias]
      .filter((r) => r.kyc_status === "approved")
      .sort((a, b) => (b.credits || 0) - (a.credits || 0))
      .slice(0, 8)
      .map((r) => ({ name: (r.company_name || r.email || "—").slice(0, 18), creditos: r.credits || 0 })),
    [inmobiliarias]
  );

  // Empresas nuevas por mes (últimos 6 meses)
  const nuevasPorMes = useMemo(() => {
    const meses = {};
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses[key] = { mes: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }), nuevas: 0 };
    }
    inmobiliarias.forEach((r) => {
      if (!r.created_at) return;
      const key = r.created_at.slice(0, 7);
      if (meses[key]) meses[key].nuevas++;
    });
    return Object.values(meses);
  }, [inmobiliarias]);

  // Servicios adicionales totales
  const serviciosTotales = useMemo(() =>
    SERVICIOS_INMO.map(({ key, label }) => ({
      name: label,
      total: inmobiliarias.reduce((s, r) => s + (r[key] ?? 0), 0),
    })),
    [inmobiliarias]
  );

  const byPlan = useMemo(() => {
    const grupos = {};
    inmobiliarias.forEach((r) => {
      const p = r.plan_tipo || r.plan || "Sin plan";
      grupos[p] = (grupos[p] || 0) + 1;
    });
    return Object.entries(grupos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inmobiliarias]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2}   label="Empresas registradas"     val={stats.total}              color="bg-blue-100 text-blue-600" />
        <KpiCard icon={ShieldCheck} label="Verificadas y activas"    val={stats.aprobadas}          color="bg-green-100 text-green-600" />
        <KpiCard icon={Clock}       label="Pendientes de revisión"   val={stats.pendientes}         color="bg-amber-100 text-amber-600" alerta={stats.pendientes > 0} />
        <KpiCard icon={BarChart2}   label="Avalúos este mes"         val={stats.avaluosMes}         color="bg-[#52B788]/20 text-[#1B4332]" />
        <KpiCard icon={FileText}    label="Avalúos histórico total"  val={stats.avaluosTotal}       color="bg-slate-100 text-slate-600" />
        <KpiCard icon={CreditCard}  label="Créditos en circulación"  val={stats.creditos}           color="bg-purple-100 text-purple-600" />
        <KpiCard icon={AlertTriangle} label="Con créditos ≤ 2"      val={stats.conCreditosBajos}   color={stats.conCreditosBajos > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"} alerta={stats.conCreditosBajos > 0} />
        <KpiCard icon={TrendingUp}  label="Tasa de aprobación"       val={`${stats.tasaAprobacion}%`} color="bg-[#D9ED92]/60 text-[#1B4332]" />
      </div>

      {/* Fila 1: Donut KYC + Top avalúos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut estado verificación */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Estado de verificación (KYC)</p>
          <p className="text-xs text-slate-400 mb-4">Distribución de empresas por estado de verificación</p>
          {pieKyc.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={pieKyc} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieKyc.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {pieKyc.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600">{d.name}</span>
                    </span>
                    <span className="font-bold text-[#1B4332]">{d.value}</span>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tasa de aprobación</span>
                    <span className="font-bold text-[#52B788]">{stats.tasaAprobacion}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top empresas — barras horizontales */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Top empresas por avalúos</p>
          <p className="text-xs text-slate-400 mb-4">Histórico total · color más claro = mes actual</p>
          {top8Avaluos.every((d) => d.avaluos === 0) ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top8Avaluos} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#1B4332" }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="avaluos" name="Total" fill="#1B4332" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="mes"     name="Este mes" fill="#B7E4C7" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fila 2: Créditos + Distribución plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Créditos disponibles por empresa */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Créditos disponibles por empresa</p>
          <p className="text-xs text-slate-400 mb-4">Solo empresas verificadas · rojo = crítico (≤ 2)</p>
          {top8Creditos.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top8Creditos} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#1B4332" }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="creditos" name="Créditos" radius={[0, 4, 4, 0]} barSize={12}>
                  {top8Creditos.map((d, i) => (
                    <Cell key={i} fill={d.creditos <= 2 ? "#EF4444" : d.creditos <= 5 ? "#F59E0B" : "#52B788"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución por plan */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Distribución por plan</p>
          <p className="text-xs text-slate-400 mb-4">Tipo de suscripción de cada empresa</p>
          {byPlan.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={byPlan} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                    {byPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {byPlan.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-slate-600">{d.name}</span>
                    </span>
                    <span className="font-bold text-[#1B4332]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fila 3: Nuevas por mes + Servicios adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Empresas nuevas por mes</p>
          <p className="text-xs text-slate-400 mb-4">Ritmo de captación de nuevas inmobiliarias</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={nuevasPorMes} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipCustom />} />
              <Bar dataKey="nuevas" name="Nuevas" radius={[4, 4, 0, 0]} barSize={28}>
                {nuevasPorMes.map((_, i) => (
                  <Cell key={i} fill={i === nuevasPorMes.length - 1 ? "#1B4332" : "#52B788"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Servicios adicionales contratados</p>
          <p className="text-xs text-slate-400 mb-4">Usos totales acumulados por tipo de servicio</p>
          {serviciosTotales.every((s) => s.total === 0) ? (
            <div className="flex flex-col items-center justify-center h-32 gap-1.5">
              <BarChart2 className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-300 text-center">Se registrarán aquí cuando<br />las empresas contraten servicios adicionales</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={serviciosTotales} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="total" name="Contrataciones" radius={[4, 4, 0, 0]} barSize={36}>
                  {serviciosTotales.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Fila expandible de empresa ─── */
const FilaEmpresa = ({ r, onNotificar, onKYC, onToggle, onBloquear }) => {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDet, setCargandoDet] = useState(false);
  const [notaModal, setNotaModal] = useState(false);
  const [notaMsj, setNotaMsj] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarDetalle = async () => {
    if (detalle) return;
    setCargandoDet(true);
    try {
      const d = await adminFetch(`/api/admin/inmobiliarias/${r.user_id}`);
      setDetalle(d);
    } catch { /* silencioso */ }
    setCargandoDet(false);
  };

  const toggleAbierto = () => {
    if (!abierto) cargarDetalle();
    setAbierto((v) => !v);
  };

  const enviarNota = async () => {
    if (!notaMsj.trim()) return;
    setEnviando(true);
    try {
      await adminFetch(`/api/admin/inmobiliarias/${r.user_id}/notificar`, {
        method: "POST",
        body: JSON.stringify({ mensaje: notaMsj, tipo: "info" }),
      });
      setNotaModal(false);
      setNotaMsj("");
      onNotificar?.();
    } catch (e) { alert("Error: " + e.message); }
    setEnviando(false);
  };

  const creditsLow = (r.credits ?? 0) <= 2;

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={toggleAbierto}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D9ED92]/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-[#1B4332]" />
            </div>
            <div>
              <p className="font-semibold text-[#1B4332] text-sm">{r.company_name || r.name || "—"}</p>
              <p className="text-[11px] text-slate-400">{r.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {[r.municipio, r.estado].filter(Boolean).join(", ") || "—"}
        </td>
        <td className="px-4 py-3">
          <Chip cfg={KYC_CFG[r.kyc_status] || { label: "Sin verificación", cls: "bg-slate-100 text-slate-400" }} />
        </td>
        <td className="px-4 py-3">
          <Chip cfg={ESTADO_CFG[r.cuenta_estado] || ESTADO_CFG.activo} />
        </td>
        <td className="px-4 py-3">
          <Chip cfg={PLAN_CFG[r.plan_tipo || r.plan] || PLAN_CFG.sin_plan} />
        </td>
        <td className="px-4 py-3 text-sm text-slate-700 text-center">
          <span className={creditsLow ? "text-red-600 font-bold" : ""}>{r.credits ?? 0}</span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 text-center">{r.avaluos_mes ?? 0}</td>
        <td className="px-4 py-3 text-sm text-slate-400">{fmtFecha(r.created_at)}</td>
        <td className="px-4 py-3 text-right">
          {abierto ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={9} className="bg-slate-50 border-t border-slate-100 px-4 py-4">
            {cargandoDet ? (
              <p className="text-sm text-slate-400 py-4 text-center">Cargando detalle…</p>
            ) : (
              <div className="space-y-4">
                {/* Info básica */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Contacto</p>
                    <p className="font-medium text-[#1B4332]">{r.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Teléfono</p>
                    <p className="font-medium text-[#1B4332]">{r.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Asociación</p>
                    <p className="font-medium text-[#1B4332]">{r.asociacion || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-0.5">Total avalúos</p>
                    <p className="font-medium text-[#1B4332]">{r.total_avaluos ?? 0}</p>
                  </div>
                </div>

                {/* Servicios contratados */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Servicios adicionales contratados</p>
                  <div className="flex flex-wrap gap-2">
                    {SERVICIOS_INMO.map(({ key, label, Icon, color }) => {
                      const n = r[key] ?? detalle?.[key] ?? 0;
                      return (
                        <div key={key} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-opacity ${n > 0 ? color : "bg-slate-50 text-slate-300 border-slate-100 opacity-60"}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                          <span className={`text-[10px] font-bold min-w-[18px] text-center px-1 py-0.5 rounded-full ${n > 0 ? "bg-white/70" : "bg-slate-100 text-slate-300"}`}>{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Últimas valuaciones */}
                {detalle?.valuaciones?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Últimas valuaciones</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Dirección</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Estado</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Valor</th>
                            <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {detalle.valuaciones.map((v) => (
                            <tr key={v.valuation_id} className="bg-white">
                              <td className="px-3 py-2 text-slate-700">
                                {v.property_data?.street
                                  ? `${v.property_data.street}, ${v.property_data.municipio || ""}`
                                  : v.valuation_id?.slice(-8)}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  v.status === "completed" ? "bg-green-100 text-green-700" :
                                  v.status === "draft"     ? "bg-slate-100 text-slate-500" :
                                  "bg-amber-100 text-amber-600"
                                }`}>{v.status}</span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#1B4332]">
                                {v.final_value ? fmt(v.final_value) : "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-400">{fmtFecha(v.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 pt-1 items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setNotaModal(true); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar nota interna
                  </button>
                  {r.kyc_status === "pending" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onKYC(r.user_id, "aprobar"); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar verificación
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onKYC(r.user_id, "rechazar"); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rechazar verificación
                      </button>
                    </>
                  )}
                  {/* Directorio toggle */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] text-slate-400">En directorio</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggle?.(r.user_id, "directorio_visible"); }}
                      title={r.directorio_visible !== false ? "Quitar del directorio" : "Mostrar en directorio"}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${r.directorio_visible !== false ? "bg-[#52B788]" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.directorio_visible !== false ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-[11px] text-slate-400 ml-2">Destacada</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggle?.(r.user_id, "destacado"); }}
                      title={r.destacado ? "Quitar destacado" : "Marcar como destacada"}
                      className={`p-1 rounded-lg transition-colors ${r.destacado ? "text-amber-400 bg-amber-50" : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${r.destacado ? "fill-amber-400" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onBloquear?.(r.user_id, r.cuenta_estado); }}
                      title={r.cuenta_estado === "suspendido" ? "Reactivar empresa" : "Suspender empresa"}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        r.cuenta_estado === "suspendido"
                          ? "border-green-200 text-green-700 hover:bg-green-50"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <Ban className="w-3 h-3" />
                      {r.cuenta_estado === "suspendido" ? "Reactivar" : "Suspender"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}

      {/* Modal nota interna */}
      {notaModal && (
        <tr>
          <td colSpan={8}>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNotaModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-lg mb-1">Nota interna</h3>
                <p className="text-xs text-slate-400 mb-4">Para: {r.company_name || r.email}</p>
                <textarea
                  value={notaMsj}
                  onChange={(e) => setNotaMsj(e.target.value)}
                  placeholder="Escribe tu nota aquí…"
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#52B788]"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setNotaModal(false)} className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700">Cancelar</button>
                  <button
                    onClick={enviarNota}
                    disabled={enviando || !notaMsj.trim()}
                    className="text-sm font-semibold px-4 py-2 bg-[#1B4332] text-white rounded-xl hover:bg-[#40916C] disabled:opacity-50 transition-colors"
                  >
                    {enviando ? "Enviando…" : "Guardar nota"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/* ─── Tab Empresas ─── */
const TabEmpresas = ({ inmobiliarias, onReload, onToggle, onBloquear }) => {
  const [q, setQ]           = useState("");
  const [filtroKyc, setFiltroKyc] = useState("todos");

  const filtradas = inmobiliarias.filter((r) => {
    const matchQ = !q || [r.company_name, r.email, r.name].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchK = filtroKyc === "todos" || r.kyc_status === filtroKyc;
    return matchQ && matchK;
  });

  const handleKYC = async (userId, accion) => {
    try {
      await adminFetch(`/api/admin/kyc/${userId}/${accion}`, { method: "POST", body: JSON.stringify({}) });
      onReload();
    } catch (e) { alert("Error: " + e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa, email…"
            className="text-sm flex-1 outline-none bg-transparent"
          />
        </div>
        <select
          value={filtroKyc}
          onChange={(e) => setFiltroKyc(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none"
        >
          <option value="todos">Todas las verificaciones</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Empresa</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Ubicación</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Verificación</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Plan</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Créditos</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Avalúos/mes</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Alta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Sin resultados</td>
                </tr>
              ) : (
                filtradas.map((r) => (
                  <FilaEmpresa key={r.user_id} r={r} onNotificar={onReload} onKYC={handleKYC} onToggle={onToggle} onBloquear={onBloquear} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Visor de documentos KYC ─── */
const DocViewer = ({ userId, onClose }) => {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    adminFetch(`/api/admin/inmobiliarias/${userId}`)
      .then((d) => setDetalle(d))
      .catch(() => setDetalle(null))
      .finally(() => setCargando(false));
  }, [userId]);

  const DOCS = [
    { label: "RFC",                  campo: "rfc"            },
    { label: "Razón social",         campo: "razon_social"   },
    { label: "Cédula / Matrícula",   campo: "cedula"         },
    { label: "Asociación",           campo: "asociacion"     },
    { label: "Sitio web",            campo: "website"        },
    { label: "Años de operación",    campo: "anos_operacion" },
    { label: "No. agentes",          campo: "num_agentes"    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Documentos KYC</h3>
            <p className="text-[#D9ED92]/70 text-xs mt-0.5">{detalle?.company_name || detalle?.email || userId}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
        </div>
        <div className="p-5">
          {cargando ? (
            <p className="text-center text-sm text-slate-400 py-8">Cargando documentos…</p>
          ) : !detalle ? (
            <p className="text-center text-sm text-slate-400 py-8">No se pudieron cargar los documentos.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {DOCS.map(({ label, campo }) => (
                  <div key={campo} className={`bg-[#F0FAF5] border rounded-xl p-3 ${detalle[campo] ? "border-[#B7E4C7]" : "border-slate-100 opacity-50"}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5 truncate">{detalle[campo] || "—"}</p>
                  </div>
                ))}
              </div>
              {/* Documentos subidos */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Archivos requeridos</p>
                <div className="flex flex-wrap gap-2">
                  {["Constancia SAT", "Acta constitutiva", "Identificación titular", "Comprobante domicilio"].map((doc) => {
                    const subido = detalle.documentos_kyc?.includes(doc) || false;
                    return (
                      <span key={doc} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${subido ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                        {subido ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {doc}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="text-sm font-semibold px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Tab Nuevas Altas ─── */
const TabNuevasAltas = ({ inmobiliarias, onReload }) => {
  const [docViewer, setDocViewer] = useState(null);
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivo, setMotivo] = useState("");

  const pendientes = inmobiliarias
    .filter((r) => r.kyc_status === "pending")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleKYC = async (userId, accion, motivoTexto = "") => {
    try {
      await adminFetch(`/api/admin/kyc/${userId}/${accion}`, { method: "POST", body: JSON.stringify({ motivo: motivoTexto }) });
      onReload();
    } catch (e) { alert("Error: " + e.message); }
  };

  if (pendientes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#B7E4C7] p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="font-semibold text-[#1B4332]">Todo al día</p>
        <p className="text-sm text-slate-400 mt-1">No hay empresas pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{pendientes.length} empresa{pendientes.length !== 1 ? "s" : ""} esperando verificación</p>
        {pendientes.map((r) => (
          <div key={r.user_id} className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            {/* Header degradado — igual que Verificaciones en Valuadores */}
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{r.company_name || r.name || "Sin nombre"}</p>
                <p className="text-[#D9ED92]/70 text-xs truncate">
                  {r.email}
                  {r.phone && ` · ${r.phone}`}
                  {(r.municipio || r.estado) && ` · ${[r.municipio, r.estado].filter(Boolean).join(", ")}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  Pendiente
                </span>
                <button onClick={() => setDocViewer(r.user_id)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Docs
                </button>
                <button onClick={() => handleKYC(r.user_id, "aprobar")}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#D9ED92] text-[#1B4332] hover:bg-white transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                </button>
                <button onClick={() => { setModalRechazo(r); setMotivo(""); }}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                </button>
                <button onClick={() => handleKYC(r.user_id, "solicitar-info")}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1B4332] transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Datos */}
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Alta",            fmtFecha(r.created_at)],
                  ["Asociación",      r.asociacion || "—"],
                  ["Plan",            r.plan_tipo || r.plan || "—"],
                  ["Créditos",        r.credits ?? 0],
                  ["Municipio",       r.municipio || "—"],
                  ["Estado",          r.estado || "—"],
                  ["Avalúos/mes",     r.avaluos_mes ?? 0],
                  ["Total avalúos",   r.total_avaluos ?? 0],
                ].map(([k, val]) => (
                  <div key={k} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Contacto adicional */}
              <div className="flex flex-wrap gap-2 mb-4">
                <a href={`mailto:${r.email}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {r.email}
                </a>
                {r.phone && (
                  <a href={`https://wa.me/52${r.phone}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                {r.website && (
                  <a href={r.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                    Sitio web ↗
                  </a>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Modal rechazo */}
      {modalRechazo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModalRechazo(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Se notificará a {modalRechazo.company_name || modalRechazo.email}</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
              placeholder="Ej: La documentación presentada está incompleta..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { handleKYC(modalRechazo.user_id, "rechazar", motivo); setModalRechazo(null); }}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600">
                Confirmar rechazo
              </button>
              <button onClick={() => setModalRechazo(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {docViewer && <DocViewer userId={docViewer} onClose={() => setDocViewer(null)} />}
    </>
  );
};

/* ─── Alerta de créditos bajos ─── */
const AlertaCreditosBajos = ({ inmobiliarias }) => {
  const [enviando, setEnviando] = useState({});
  const criticos = (inmobiliarias || [])
    .filter((r) => r.kyc_status === "approved" && (r.credits ?? 0) <= 2)
    .sort((a, b) => (a.credits ?? 0) - (b.credits ?? 0));

  if (criticos.length === 0) return null;

  const enviarRecordatorio = async (userId, canal) => {
    setEnviando((p) => ({ ...p, [`${userId}-${canal}`]: true }));
    try {
      await adminFetch(`/api/admin/inmobiliarias/${userId}/notificar`, {
        method: "POST",
        body: JSON.stringify({
          tipo: "creditos_bajos",
          canal,
          mensaje: "Tus créditos de avalúo están por agotarse. Recarga ahora para seguir solicitando avalúos sin interrupciones.",
        }),
      });
    } catch { /* silencioso */ }
    setEnviando((p) => ({ ...p, [`${userId}-${canal}`]: false }));
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-sm font-bold text-red-700">{criticos.length} empresa{criticos.length !== 1 ? "s" : ""} con créditos críticos (≤ 2)</p>
      </div>
      {criticos.map((r) => (
        <div key={r.user_id} className="bg-white rounded-xl border border-red-100 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(r.credits ?? 0) === 0 ? "bg-red-500 text-white" : "bg-amber-100 text-amber-700"}`}>
              {r.credits ?? 0}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B4332]">{r.company_name || r.name || r.email}</p>
              <p className="text-xs text-slate-400">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${(r.credits ?? 0) === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {(r.credits ?? 0) === 0 ? "Sin créditos" : `${r.credits} crédito${r.credits !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => enviarRecordatorio(r.user_id, "email")}
              disabled={enviando[`${r.user_id}-email`]}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {enviando[`${r.user_id}-email`] ? "Enviando…" : "Recordatorio email"}
            </button>
            {r.phone && (
              <a
                href={`https://wa.me/52${r.phone}?text=${encodeURIComponent("Hola, te recordamos que tus créditos de avalúo están por agotarse en PropValu. Recarga ahora para continuar sin interrupciones: https://propvalu.mx/creditos")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            <a
              href="/admin/inmobiliarias/creditos"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1B4332] text-white hover:bg-[#2D6A4F] transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" /> Enviar a recargar
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Tab Actividad ─── */
const TabActividad = ({ cargandoAct, actividad, inmobiliarias }) => {
  // Mapa rápido empresa → plan + créditos
  const inmoMap = Object.fromEntries(
    (inmobiliarias || []).map((r) => [
      r.company_name || r.name || r.email,
      { plan: r.plan_tipo || r.plan || "—", credits: r.credits ?? 0, total_avaluos: r.total_avaluos ?? 0 },
    ])
  );

  if (cargandoAct) {
    return <div className="text-center py-12 text-slate-400 text-sm">Cargando…</div>;
  }
  if (!actividad.length) {
    return (
      <div className="bg-white rounded-2xl border border-[#B7E4C7] p-12 text-center">
        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-semibold">Sin avalúos registrados aún</p>
        <p className="text-xs text-slate-300 mt-1">Aquí aparecerán los avalúos solicitados por cada empresa</p>
      </div>
    );
  }

  const STATUS_CFG = {
    completed: { label: "Completado", cls: "bg-green-100 text-green-700" },
    draft:     { label: "Borrador",   cls: "bg-slate-100 text-slate-500" },
    pending:   { label: "Pendiente",  cls: "bg-amber-100 text-amber-600" },
  };

  return (
    <div className="space-y-3">
      <AlertaCreditosBajos inmobiliarias={inmobiliarias} />

      {/* Nota explicativa */}
      <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-xl px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0" />
        <span><strong className="text-[#1B4332]">Historial de avalúos:</strong> cada fila es un avalúo de propiedad solicitado por una empresa. El <strong>valor del avalúo</strong> es el precio estimado de esa propiedad según el reporte.</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Empresa</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Propiedad valuada</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Estado del reporte</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Valor del avalúo</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Crédito usado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {actividad.map((v) => {
                const info = inmoMap[v.empresa] || {};
                const sc = STATUS_CFG[v.status] || STATUS_CFG.pending;
                return (
                  <tr key={v.valuation_id} className="hover:bg-[#F0FAF5]/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1B4332] text-xs">{v.empresa || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold bg-[#1B4332]/10 text-[#1B4332] px-2 py-0.5 rounded-full">
                        {info.plan || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">
                      {v.property_data?.street
                        ? `${v.property_data.street}${v.property_data.municipio ? ", " + v.property_data.municipio : ""}`
                        : `ID …${v.valuation_id?.slice(-8)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1B4332]">
                      {v.final_value ? fmt(v.final_value) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-500">−1</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtFecha(v.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


/* ─── Componente principal ─── */
const AdminInmobiliarias = () => {
  const [tab, setTab]                 = useState("resumen");
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [actividad, setActividad]     = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [cargandoAct, setCargandoAct] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    adminFetch("/api/admin/inmobiliarias")
      .then((d) => setInmobiliarias(d.inmobiliarias || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const cargarActividad = useCallback(() => {
    setCargandoAct(true);
    adminFetch("/api/admin/inmobiliarias-actividad")
      .then((d) => setActividad(d.valuaciones || []))
      .catch(() => {})
      .finally(() => setCargandoAct(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (tab === "actividad" && actividad.length === 0) cargarActividad();
  }, [tab]);

  const pendientesKyc = inmobiliarias.filter((r) => r.kyc_status === "pending").length;

  // Toggle directorio_visible / destacado
  const onToggleDirectorio = async (userId, campo) => {
    setInmobiliarias((prev) => prev.map((r) =>
      r.user_id === userId ? { ...r, [campo]: !r[campo] } : r
    ));
    try {
      await adminFetch(`/api/admin/inmobiliarias/${userId}/directorio`, {
        method: "PATCH",
        body: JSON.stringify({ [campo]: !inmobiliarias.find((r) => r.user_id === userId)?.[campo] }),
      });
    } catch { /* actualización local ya hecha */ }
  };

  const onBloquear = async (userId, estadoActual) => {
    const nuevoEstado = estadoActual === "suspendido" ? "activo" : "suspendido";
    try {
      await adminFetch(`/api/admin/usuarios/${userId}/estado`, { method: "PATCH", body: JSON.stringify({ estado: nuevoEstado }) });
      setInmobiliarias((prev) => prev.map((r) => r.user_id === userId ? { ...r, cuenta_estado: nuevoEstado } : r));
    } catch (e) { alert("Error: " + e.message); }
  };

  const TABS = [
    { id: "resumen",   label: "Resumen",                                                               icon: BarChart2    },
    { id: "empresas",  label: `Empresas (${inmobiliarias.length})`,                                    icon: Building2    },
    { id: "nuevas",    label: pendientesKyc > 0 ? `Nuevas altas (${pendientesKyc})` : "Nuevas altas", icon: ShieldCheck  },
    { id: "actividad", label: "Actividad",                                                             icon: Activity     },
  ];

  const descargarCSV = () => {
    const cols = ["Empresa", "Email", "Verificación", "Estado", "Créditos", "Avalúos/mes", "Total avalúos", "Alta"];
    const rows = inmobiliarias.map((r) =>
      [r.company_name || r.name || "", r.email, r.kyc_status || "", r.cuenta_estado || "",
       r.credits ?? 0, r.avaluos_mes ?? 0, r.total_avaluos ?? 0, r.created_at || ""].join(",")
    );
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PropValu_Inmobiliarias_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout badges={{ inmobiliarias: pendientesKyc }}>
      <div className="max-w-6xl mx-auto space-y-5">

        <PageHeader icon={Building2} title="Inmobiliarias"
          subtitle="Seguimiento de empresas, créditos y actividad">
          <button onClick={cargar} disabled={cargando}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-3 py-2.5 rounded-xl transition-colors">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
          <button onClick={descargarCSV}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </PageHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === id ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === "nuevas" && pendientesKyc > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendientesKyc}
                </span>
              )}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando…</div>
        ) : (
          <>
            {tab === "resumen"   && <TabResumen     inmobiliarias={inmobiliarias} />}
            {tab === "empresas"  && <TabEmpresas    inmobiliarias={inmobiliarias} onReload={cargar} onToggle={onToggleDirectorio} onBloquear={onBloquear} />}
            {tab === "nuevas"    && <TabNuevasAltas inmobiliarias={inmobiliarias} onReload={cargar} />}
            {tab === "actividad" && <TabActividad   cargandoAct={cargandoAct} actividad={actividad} inmobiliarias={inmobiliarias} />}
          </>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminInmobiliarias;
