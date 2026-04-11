import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard, GradThead, FilterBar } from "@/components/AdminUI";
import { adminFetch } from "@/lib/adminFetch";
import {
  Search, ChevronDown, ChevronUp, ShieldCheck, Phone, Mail, Ban, CheckCircle2, X,
  ChevronLeft, ChevronRight, ExternalLink, ClipboardList, BarChart2,
  Activity, Star, Eye, EyeOff, Users, TrendingUp, MapPin, Award,
  RefreshCw, AlertTriangle, MoreVertical, MessageSquare, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend, RadialBarChart, RadialBar,
} from "recharts";

const KYC_STATUS_MAP = {
  pending:      "pendiente",
  under_review: "info_solicitada",
  approved:     "aprobado",
  rejected:     "rechazado",
};

function normalizeValuador(u) {
  return {
    id: u.user_id,
    nombre: u.name || u.email,
    email: u.email,
    telefono: u.phone || "",
    ciudad: u.municipio || u.ciudad || "—",
    plan: u.plan || "basico",
    estado: u.kyc_status === "pending" ? "kyc_pendiente" : (u.cuenta_estado || "activo"),
    kyc: KYC_STATUS_MAP[u.kyc_status] || "pendiente",
    certs: u.certificaciones || [],
    especialidades: u.especialidades || [],
    experiencia: u.experiencia || 0,
    calificacion: u.calificacion || 0,
    totalReportes: u.total_valuaciones || 0,
    avaluosMes: u.avaluos_mes ?? null,
    ingresos: 0,
    quejas: u.total_quejas || 0,
    fecha_registro: u.created_at ? u.created_at.split("T")[0] : "-",
    cedula: u.cedula || "—",
    bio: u.bio || "",
    // Servicios prestados
    servicios_visita:        u.servicios_visita        ?? u.visitas_realizadas   ?? 0,
    servicios_verificacion:  u.servicios_verificacion  ?? u.verificaciones_completadas ?? 0,
    servicios_urgente:       u.servicios_urgente        ?? u.avaluos_urgentes     ?? 0,
    servicios_comparativo:   u.servicios_comparativo    ?? u.reportes_comparativos ?? 0,
    // Anuncios
    ads_activos:   u.ads_activos   ?? 0,
    ads_pendientes: u.ads_pendientes ?? 0,
    // campos directorio (podrían venir del backend o inicializarse aquí)
    directorio_visible: u.directorio_visible !== false,
    destacado: u.destacado || false,
    perfil_pct: u.perfil_pct || Math.min(100, 40
      + (u.phone ? 10 : 0)
      + (u.bio ? 15 : 0)
      + (u.cedula ? 15 : 0)
      + ((u.certificaciones?.length || 0) > 0 ? 20 : 0)),
  };
}

const PLAN_BADGE  = { enterprise: "bg-[#1B4332] text-white", pro: "bg-[#52B788] text-white", basico: "bg-slate-100 text-slate-600", despacho: "bg-blue-100 text-blue-700", corporativo: "bg-purple-100 text-purple-700", independiente: "bg-slate-100 text-slate-600" };
const KYC_BADGE   = { aprobado: "bg-green-100 text-green-700", pendiente: "bg-amber-100 text-amber-700", info_solicitada: "bg-orange-100 text-orange-700", rechazado: "bg-red-100 text-red-600" };
const KYC_LABEL   = { aprobado: "Verificado", pendiente: "Pendiente", info_solicitada: "Info solicitada", rechazado: "Rechazado" };
const ESTADO_BADGE= { activo: "bg-green-100 text-green-700", suspendido: "bg-red-100 text-red-600", kyc_pendiente: "bg-amber-100 text-amber-700" };

const SERVICIOS_VAL = [
  { key: "servicios_visita",       label: "Visita",  Icon: MapPin,     color: "text-blue-600"   },
  { key: "servicios_verificacion", label: "Verif.",  Icon: ShieldCheck,color: "text-green-600"  },
  { key: "servicios_urgente",      label: "Urg.",    Icon: Zap,        color: "text-amber-600"  },
  { key: "servicios_comparativo",  label: "Comp.",   Icon: BarChart2,  color: "text-purple-600" },
];

const TABS = [
  { id: "resumen",        label: "Resumen",         icon: BarChart2   },
  { id: "valuadores",     label: "Valuadores",      icon: Users       },
  { id: "verificaciones", label: "Nuevas altas",    icon: ShieldCheck },
  { id: "actividad",      label: "Actividad",       icon: Activity    },
];

const PAGE_SIZE = 8;

/* ─── KPI card ─── */
const KpiCard = ({ icon: Icon, label, val, sub, color, alerta, stripe }) => (
  <div className={`bg-white rounded-2xl border overflow-hidden ${alerta ? "border-amber-200" : "border-[#B7E4C7]"}`}>
    <div className={`h-1 ${stripe || "bg-[#52B788]"}`} />
    <div className="p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{val}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const CHART_COLORS = ["#1B4332", "#52B788", "#D9ED92", "#40916C", "#74C69D", "#B7E4C7"];

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
const TabResumen = ({ valuadores }) => {
  const stats = useMemo(() => {
    const total       = valuadores.length;
    const verificados = valuadores.filter((v) => v.kyc === "aprobado").length;
    const pendientes  = valuadores.filter((v) => v.kyc === "pendiente").length;
    const rechazados  = valuadores.filter((v) => v.kyc === "rechazado").length;
    const activos     = valuadores.filter((v) => v.estado === "activo").length;
    const quejas      = valuadores.reduce((s, v) => s + v.quejas, 0);
    const reportes    = valuadores.reduce((s, v) => s + v.totalReportes, 0);
    const ciudades    = [...new Set(valuadores.map((v) => v.ciudad).filter((c) => c !== "—"))].length;
    const proPlusMas  = valuadores.filter((v) => ["enterprise","corporativo","pro","despacho"].includes(v.plan)).length;
    const tasaVerif   = total > 0 ? Math.round((verificados / total) * 100) : 0;
    return { total, verificados, pendientes, rechazados, activos, quejas, reportes, ciudades, proPlusMas, tasaVerif };
  }, [valuadores]);

  // Top 8 por reportes
  const top8 = useMemo(() =>
    [...valuadores]
      .sort((a, b) => b.totalReportes - a.totalReportes)
      .slice(0, 8)
      .map((v) => ({
        name: v.nombre.split(" ")[0] + (v.nombre.split(" ")[1] ? " " + v.nombre.split(" ")[1][0] + "." : ""),
        reportes: v.totalReportes,
        quejas: v.quejas,
      })),
    [valuadores]
  );

  // KYC donut
  const pieKyc = [
    { name: "Verificados",  value: stats.verificados, fill: "#52B788" },
    { name: "Pendientes",   value: stats.pendientes,  fill: "#F59E0B" },
    { name: "Rechazados",   value: stats.rechazados,  fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Distribución plan
  const byPlan = useMemo(() => {
    const grupos = {};
    valuadores.forEach((v) => {
      const p = v.plan || "sin plan";
      grupos[p] = (grupos[p] || 0) + 1;
    });
    return Object.entries(grupos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [valuadores]);

  // Nuevos por mes (últimos 6)
  const nuevosPorMes = useMemo(() => {
    const meses = {};
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses[key] = { mes: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }), nuevos: 0 };
    }
    valuadores.forEach((v) => {
      if (!v.fecha_registro || v.fecha_registro === "-") return;
      const key = v.fecha_registro.slice(0, 7);
      if (meses[key]) meses[key].nuevos++;
    });
    return Object.values(meses);
  }, [valuadores]);

  // Top calificación
  const topCalif = useMemo(() =>
    [...valuadores]
      .filter((v) => v.calificacion > 0)
      .sort((a, b) => b.calificacion - a.calificacion)
      .slice(0, 8)
      .map((v) => ({
        name: v.nombre.split(" ")[0] + (v.nombre.split(" ")[1] ? " " + v.nombre.split(" ")[1][0] + "." : ""),
        calif: parseFloat(v.calificacion.toFixed(1)),
        quejas: v.quejas,
      })),
    [valuadores]
  );

  // Servicios totales
  const serviciosTotalesVal = useMemo(() =>
    SERVICIOS_VAL.map(({ key, label }) => ({
      name: label,
      total: valuadores.reduce((s, v) => s + (v[key] ?? 0), 0),
    })),
    [valuadores]
  );

  // Ciudades top
  const ciudadesTop = useMemo(() =>
    Object.entries(
      valuadores.reduce((acc, v) => {
        if (v.ciudad && v.ciudad !== "—") acc[v.ciudad] = (acc[v.ciudad] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [valuadores]
  );

  // Radar de salud: porcentajes
  const saludData = [
    { metric: "Verificados",   pct: stats.tasaVerif,                                                                 fill: "#52B788" },
    { metric: "Activos",       pct: stats.total ? Math.round((stats.activos / stats.total) * 100) : 0,              fill: "#1B4332" },
    { metric: "Sin quejas",    pct: stats.total ? Math.round(((stats.total - (valuadores.filter(v=>v.quejas>0).length)) / stats.total) * 100) : 100, fill: "#D9ED92" },
    { metric: "Plan Pro+",     pct: stats.total ? Math.round((stats.proPlusMas / stats.total) * 100) : 0,           fill: "#40916C" },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}         label="Valuadores registrados"     val={stats.total}       color="bg-blue-100 text-blue-600"     stripe="bg-blue-400" />
        <KpiCard icon={ShieldCheck}   label="Verificados y activos"      val={stats.verificados} color="bg-green-100 text-green-600"   stripe="bg-[#52B788]" />
        <KpiCard icon={AlertTriangle} label="Pendientes de verificación" val={stats.pendientes}  color="bg-amber-100 text-amber-600"   stripe="bg-amber-400" alerta={stats.pendientes > 0} />
        <KpiCard icon={TrendingUp}    label="Avalúos generados (total)"  val={stats.reportes}    color="bg-purple-100 text-purple-600" stripe="bg-purple-400" />
        <KpiCard icon={MapPin}        label="Ciudades con cobertura"     val={stats.ciudades}    color="bg-[#B7E4C7] text-[#1B4332]"  stripe="bg-[#2D6A4F]" />
        <KpiCard icon={Activity}      label="Valuadores activos"         val={stats.activos}     color="bg-green-50 text-green-700"    stripe="bg-green-300" />
        <KpiCard icon={MessageSquare} label="Quejas activas"             val={stats.quejas}      color={stats.quejas > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"} stripe={stats.quejas > 0 ? "bg-red-400" : "bg-slate-200"} alerta={stats.quejas > 0} />
        <KpiCard icon={Award}         label="Tasa de verificación"       val={`${stats.tasaVerif}%`} color="bg-[#D9ED92]/60 text-[#1B4332]" stripe="bg-[#D9ED92]" />
      </div>

      {/* Fila 1: Donut KYC + Top valuadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut KYC */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Estado de verificación (KYC)</p>
          <p className="text-xs text-slate-400 mb-4">Absorción del proceso de alta: qué porcentaje está activo y verificado</p>
          {pieKyc.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p> : (
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
                    <span className="text-slate-400">Tasa de verificación</span>
                    <span className="font-bold text-[#52B788]">{stats.tasaVerif}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top valuadores por avalúos */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Top valuadores por avalúos generados</p>
          <p className="text-xs text-slate-400 mb-4">Producción individual · rojo indica quejas activas</p>
          {top8.every((d) => d.reportes === 0) ? <p className="text-sm text-slate-400 py-8 text-center">Sin datos</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top8} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#1B4332" }} width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="reportes" name="Avalúos" radius={[0, 4, 4, 0]} barSize={11}>
                  {top8.map((d, i) => <Cell key={i} fill={d.quejas > 0 ? "#EF4444" : "#52B788"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fila 2: Plan + Ciudades + Salud */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Distribución por plan */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Distribución por plan</p>
          <p className="text-xs text-slate-400 mb-4">Tipo de suscripción activa</p>
          {byPlan.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Sin datos</p> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={byPlan} cx="50%" cy="50%" outerRadius={60} paddingAngle={2} dataKey="value">
                    {byPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<TooltipCustom />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {byPlan.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-slate-600 capitalize">{d.name}</span>
                    </span>
                    <span className="font-bold text-[#1B4332]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Salud del equipo */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Salud del equipo</p>
          <p className="text-xs text-slate-400 mb-4">Indicadores clave de comportamiento</p>
          <ResponsiveContainer width="100%" height={140}>
            <RadialBarChart cx="50%" cy="50%" innerRadius={15} outerRadius={65} data={saludData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="pct" cornerRadius={4} label={false}>
                {saludData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </RadialBar>
              <Tooltip content={({ active, payload }) => active && payload?.length
                ? <div className="bg-white border border-[#B7E4C7] rounded-xl shadow px-3 py-1.5 text-xs"><p className="font-bold text-[#1B4332]">{payload[0].payload.metric}: {payload[0].value}%</p></div>
                : null} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {saludData.map((d) => (
              <div key={d.metric} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                <span className="text-slate-600">{d.metric}</span>
                <span className="ml-auto font-bold text-[#1B4332]">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ciudades principales */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Ciudades con cobertura</p>
          <p className="text-xs text-slate-400 mb-4">Absorción geográfica del producto</p>
          {ciudadesTop.length === 0 ? <p className="text-xs text-slate-400">Sin datos.</p> : (
            <div className="space-y-2">
              {ciudadesTop.map(([ciudad, n], i) => (
                <div key={ciudad} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#52B788]"
                      style={{ width: `${Math.round((n / (ciudadesTop[0][1] || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-600 font-medium min-w-[80px] truncate">{ciudad}</span>
                  <span className="text-xs font-bold text-[#1B4332] w-5 text-right">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fila 3: Nuevos por mes + Top calificación + Servicios totales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Valuadores nuevos por mes */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Valuadores nuevos por mes</p>
          <p className="text-xs text-slate-400 mb-4">Incorporaciones en los últimos 6 meses</p>
          {nuevosPorMes.every((m) => m.total === 0) ? (
            <p className="text-xs text-slate-400">Sin datos históricos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={nuevosPorMes} barSize={20}>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {nuevosPorMes.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top por calificación */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Top por calificación</p>
          <p className="text-xs text-slate-400 mb-4">Los mejor evaluados · rojo = tiene quejas</p>
          {topCalif.length === 0 ? (
            <p className="text-xs text-slate-400">Sin calificaciones aún.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topCalif} layout="vertical" barSize={12} margin={{ left: 4 }}>
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="calificacion" radius={[0, 4, 4, 0]}>
                  {topCalif.map((v, i) => (
                    <Cell key={i} fill={v.quejas > 0 ? "#ef4444" : "#52B788"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Servicios contratados totales */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm p-5">
          <p className="font-semibold text-[#1B4332] text-sm mb-1">Servicios contratados (totales)</p>
          <p className="text-xs text-slate-400 mb-4">Suma de todos los servicios por tipo</p>
          {serviciosTotalesVal.every((s) => s.total === 0) ? (
            <p className="text-xs text-slate-400">Sin servicios registrados aún.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={serviciosTotalesVal} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {serviciosTotalesVal.map((_, i) => (
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


/* ─── Visor de documentos valuador ─── */
const DocViewerValuador = ({ valuador, onClose }) => {
  const DOCS_REQ = ["INE/Pasaporte", "Cédula Prof.", "Certificación INDAABIN/IVS", "RFC", "Seguro RC"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Documentos KYC</h3>
            <p className="text-[#D9ED92]/70 text-xs mt-0.5">{valuador.nombre} · {valuador.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Datos registrados */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Cédula profesional", valuador.cedula],
              ["Experiencia",        `${valuador.experiencia} año${valuador.experiencia !== 1 ? "s" : ""}`],
              ["Plan",               valuador.plan],
              ["Registro",           valuador.fecha_registro],
              ["Especialidades",     valuador.especialidades?.join(", ") || "—"],
              ["Certificaciones",    valuador.certs?.join(", ") || "—"],
            ].map(([k, val]) => (
              <div key={k} className={`bg-[#F0FAF5] border rounded-xl p-3 ${val && val !== "—" ? "border-[#B7E4C7]" : "border-slate-100 opacity-60"}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}</p>
                <p className="text-sm text-[#1B4332] font-semibold mt-0.5 truncate">{val || "—"}</p>
              </div>
            ))}
          </div>
          {/* Archivos */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Archivos requeridos</p>
            <div className="flex flex-wrap gap-2">
              {DOCS_REQ.map((doc) => {
                const subido = valuador.certs?.length > 0 && ["INE/Pasaporte","Cédula Prof.","Certificación INDAABIN/IVS"].includes(doc);
                return (
                  <span key={doc} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${subido ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {subido ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {doc}
                  </span>
                );
              })}
            </div>
          </div>
          {valuador.bio && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Bio</p>
              <p className="text-xs text-slate-600 leading-relaxed">{valuador.bio}</p>
            </div>
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

/* ─── Tab Verificaciones ─── */
const TabVerificaciones = ({ valuadores, onApprobar, onRechazar, onSolicitarInfo }) => {
  const [modal, setModal] = useState(null);
  const [docViewer, setDocViewer] = useState(null);
  const [motivo, setMotivo] = useState("");
  const pendientes = valuadores.filter((v) => v.kyc === "pendiente" || v.kyc === "info_solicitada");

  if (pendientes.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
        <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-green-300" />
        <p className="text-sm font-semibold text-slate-600">Sin verificaciones pendientes</p>
        <p className="text-xs text-slate-400 mt-1">Todos los valuadores están al día</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendientes.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{v.nombre}</p>
                <p className="text-[#D9ED92]/70 text-xs truncate">{v.email} · {v.ciudad}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
                <button onClick={() => setDocViewer(v)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Docs
                </button>
                <button onClick={() => onApprobar(v.id)}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#D9ED92] text-[#1B4332] hover:bg-white transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" /> Aprobar
                </button>
                <button onClick={() => { setModal(v); setMotivo(""); }}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors">
                  <X className="w-3.5 h-3.5" /> Rechazar
                </button>
                <button onClick={() => onSolicitarInfo(v.id)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1B4332] transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Registro",        v.fecha_registro],
                  ["Cédula prof.",    v.cedula],
                  ["Experiencia",     `${v.experiencia} año${v.experiencia !== 1 ? "s" : ""}`],
                  ["Plan",            v.plan],
                  ["Ciudad",          v.ciudad],
                  ["Calificación",    v.calificacion > 0 ? `${v.calificacion.toFixed(1)} ★` : "Sin calif."],
                  ["Valuaciones",     v.totalReportes],
                  ["Quejas",          v.quejas || "—"],
                ].map(([k, val]) => (
                  <div key={k} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Especialidades y certificaciones */}
              {(v.especialidades?.length > 0 || v.certs?.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {v.especialidades?.map((e) => (
                    <span key={e} className="text-[11px] bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{e}</span>
                  ))}
                  {v.certs?.map((c) => (
                    <span key={c} className="text-[11px] bg-[#F0FAF5] border border-[#B7E4C7] text-[#1B4332] px-2.5 py-1 rounded-full font-semibold">{c}</span>
                  ))}
                </div>
              )}

              {/* Contacto */}
              <div className="flex flex-wrap gap-2">
                <a href={`mailto:${v.email}`}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {v.email}
                </a>
                {v.telefono && (
                  <a href={`https://wa.me/52${v.telefono}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-[#1B4332]">Motivo de rechazo</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Se enviará un email automático a {modal.email}</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
              placeholder="Ej: La cédula profesional no corresponde al nombre registrado..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { onRechazar(modal.id, motivo); setModal(null); }}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600">
                Confirmar rechazo
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {docViewer && <DocViewerValuador valuador={docViewer} onClose={() => setDocViewer(null)} />}
    </>
  );
};

/* ─── Tab Actividad ─── */
const TabActividad = ({ valuadores }) => {
  const [busqueda, setBusqueda] = useState("");
  const [planFiltro, setPlanFiltro] = useState("todos");

  const datos = useMemo(() =>
    [...valuadores]
      .sort((a, b) => b.totalReportes - a.totalReportes)
      .filter((v) => {
        const q = busqueda.toLowerCase();
        const matchQ = !busqueda || v.nombre.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.ciudad.toLowerCase().includes(q);
        const matchP = planFiltro === "todos" || v.plan === planFiltro;
        return matchQ && matchP;
      }),
    [valuadores, busqueda, planFiltro]
  );

  if (valuadores.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
        <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-400">Sin valuadores registrados aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Nota explicativa */}
      <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-xl px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-[#52B788] flex-shrink-0" />
        <span><strong className="text-[#1B4332]">Actividad de valuadores:</strong> resumen de producción por valuador — cuántos avalúos han generado, su plan activo, créditos disponibles y alertas de quejas.</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, email o ciudad…" className="text-sm flex-1 outline-none bg-transparent" />
        </div>
        <select value={planFiltro} onChange={(e) => setPlanFiltro(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="todos">Todos los planes</option>
          {["enterprise","corporativo","pro","despacho","basico","independiente"].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Valuador</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Plan activo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Verificación</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Estado</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Avalúos totales</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Avalúos este mes</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Calificación</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Quejas</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/80 uppercase tracking-wide">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {datos.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400 text-sm">Sin resultados</td></tr>
              )}
              {datos.map((v) => (
                <tr key={v.id} className="hover:bg-[#F0FAF5]/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-[#1B4332] leading-snug">{v.nombre}</p>
                    <p className="text-xs text-slate-400">{v.email}</p>
                    <p className="text-xs text-slate-300 flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />{v.ciudad}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[v.plan] || "bg-slate-100 text-slate-600"}`}>
                      {v.plan || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[v.estado]}`}>
                      {v.estado === "kyc_pendiente" ? "Verif. pend." : v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-[#1B4332]">{v.totalReportes}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{v.avaluosMes ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {v.calificacion > 0
                      ? <span className="text-xs font-semibold text-amber-600">{v.calificacion.toFixed(1)} ★</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.quejas > 0
                      ? <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{v.quejas}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{v.fecha_registro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ─── Fila expandible de valuador ─── */
const FilaValuador = ({ v, onToggle, suspender }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-[#F0FAF5]/50 cursor-pointer transition-colors"
        onClick={() => setAbierto((x) => !x)}
      >
        {/* Valuador */}
        <td className="px-4 py-3 align-top">
          <p className="text-sm font-semibold text-[#1B4332] leading-snug">{v.nombre}</p>
          <p className="text-xs text-slate-400">{v.email}</p>
          <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" />{v.ciudad}
          </p>
        </td>
        {/* Plan */}
        <td className="px-4 py-3 align-top">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[v.plan] || "bg-slate-100 text-slate-600"}`}>{v.plan}</span>
        </td>
        {/* Verificación */}
        <td className="px-4 py-3 align-top">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KYC_BADGE[v.kyc]}`}>{KYC_LABEL[v.kyc]}</span>
        </td>
        {/* Estado */}
        <td className="px-4 py-3 align-top">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[v.estado]}`}>
            {v.estado === "kyc_pendiente" ? "Verif. pend." : v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
          </span>
        </td>
        {/* Directorio */}
        <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggle(v.id, "directorio_visible")}
            title={v.directorio_visible ? "Ocultar del directorio" : "Mostrar en directorio"}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${v.directorio_visible ? "bg-[#52B788]" : "bg-slate-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${v.directorio_visible ? "translate-x-[18px]" : "translate-x-0"}`} />
          </button>
        </td>
        {/* Anuncios */}
        <td className="px-4 py-3 align-top">
          {v.ads_activos > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 w-fit">
              <TrendingUp className="w-3 h-3" />{v.ads_activos}
            </span>
          ) : v.ads_pendientes > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 w-fit">
              <TrendingUp className="w-3 h-3" />{v.ads_pendientes} pend.
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>
        {/* Quejas */}
        <td className="px-4 py-3 align-top">
          {v.quejas > 0 ? <span className="text-sm font-bold text-red-500">{v.quejas}</span> : <span className="text-sm text-slate-300">—</span>}
        </td>
        {/* Expand */}
        <td className="px-4 py-3 align-top text-right">
          {abierto ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={8} className="bg-[#F8FDF9] border-t border-[#B7E4C7] px-5 py-4">
            <div className="space-y-3">
              {/* Una sola fila: métricas + servicios */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[
                  ["Reportes",    v.totalReportes],
                  ["Calif.",      v.calificacion > 0 ? `${v.calificacion.toFixed(1)} ★` : "—"],
                  ["Cédula",      v.cedula],
                  ["Exp.",        `${v.experiencia} años`],
                  ["Alta",        v.fecha_registro],
                ].map(([k, val]) => (
                  <div key={k} className="flex items-baseline gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}</span>
                    <span className="text-sm font-semibold text-[#1B4332]">{val}</span>
                  </div>
                ))}
                <span className="text-slate-200 select-none">|</span>
                {SERVICIOS_VAL.map(({ key, label, Icon, color }) => {
                  const n = v[key] ?? 0;
                  return (
                    <div key={key} className={`flex items-center gap-1 text-[11px] font-semibold ${n > 0 ? color : "text-slate-300"}`}>
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{label}</span>
                      <span className={`font-bold ${n > 0 ? "" : "opacity-50"}`}>{n}</span>
                    </div>
                  );
                })}
              </div>

              {/* Especialidades y certs */}
              {(v.especialidades?.length > 0 || v.certs?.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {v.especialidades?.map((e) => (
                    <span key={e} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#D9ED92]/60 text-[#1B4332] border border-[#B7E4C7]">{e}</span>
                  ))}
                  {v.certs?.map((c) => (
                    <span key={c} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{c}</span>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-1.5 pt-1 border-t border-[#B7E4C7]">
                <a href={`https://wa.me/52${v.telefono}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                  className="p-2 rounded-lg bg-[#25D366] text-white hover:opacity-90 transition-opacity">
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a href={`mailto:${v.email}`} title="Email"
                  className="p-2 rounded-lg bg-blue-500 text-white hover:opacity-90 transition-opacity">
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => suspender(v.id)} title={v.estado === "activo" ? "Suspender" : "Reactivar"}
                  className={`p-2 rounded-lg transition-colors ${v.estado === "activo" ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                  {v.estado === "activo" ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/* ─── Main ─── */
const AdminValuadores = () => {
  const [activeTab, setActiveTab] = useState("resumen");
  const [valuadores, setValuadores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [planFiltro, setPlanFiltro] = useState("todos");
  const [kycFiltro, setKycFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);

  const cargar = () => {
    adminFetch("/api/admin/valuadores")
      .then((d) => setValuadores((d.valuadores || []).map(normalizeValuador)))
      .catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  // Directorio toggle
  const onToggle = async (id, campo) => {
    setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, [campo]: !v[campo] } : v));
    try {
      await adminFetch(`/api/admin/valuadores/${id}/directorio`, {
        method: "PATCH",
        body: JSON.stringify({ [campo]: !valuadores.find((v) => v.id === id)?.[campo] }),
      });
    } catch { /* silencioso — actualizar local ya hecho */ }
  };

  // KYC actions
  const onApprobar = async (id) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/aprobar`, { method: "POST", body: JSON.stringify({}) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "aprobado", estado: "activo" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };
  const onRechazar = async (id, motivo) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/rechazar`, { method: "POST", body: JSON.stringify({ motivo }) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "rechazado" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };
  const onSolicitarInfo = async (id) => {
    try {
      await adminFetch(`/api/admin/kyc/${id}/solicitar-info`, { method: "POST", body: JSON.stringify({}) });
      setValuadores((prev) => prev.map((v) => v.id === id ? { ...v, kyc: "info_solicitada" } : v));
    } catch (e) { alert("Error: " + e.message); }
  };

  const suspender = async (id) => {
    const v = valuadores.find((x) => x.id === id);
    const nuevoEstado = v?.estado === "activo" ? "suspendido" : "activo";
    try {
      await adminFetch(`/api/admin/usuarios/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: nuevoEstado }) });
      setValuadores((p) => p.map((x) => x.id === id ? { ...x, estado: nuevoEstado } : x));
    } catch (e) { alert("Error: " + e.message); }
    setMenu(null);
  };

  // Tab Directorio legacy (tabla con filtros, para ver todos con acciones de gestión)
  const filtrados = useMemo(() => valuadores.filter((v) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda || v.nombre.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.ciudad.toLowerCase().includes(q);
    const matchP = planFiltro === "todos" || v.plan === planFiltro;
    const matchK = kycFiltro === "todos" || v.kyc === kycFiltro;
    return matchQ && matchP && matchK;
  }).sort((a, b) => {
    const po = { enterprise: 0, corporativo: 0, pro: 1, despacho: 1, basico: 2, independiente: 2 };
    return (po[a.plan] ?? 2) - (po[b.plan] ?? 2) || b.totalReportes - a.totalReportes;
  }), [valuadores, busqueda, planFiltro, kycFiltro]);

  const totalPags = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const pendientesKyc = valuadores.filter((v) => v.kyc === "pendiente").length;

  const tabs = TABS.map((t) => ({
    ...t,
    badge: t.id === "verificaciones" && pendientesKyc > 0 ? pendientesKyc : null,
  }));

  return (
    <AdminLayout badges={{ kyc: pendientesKyc }}>
      <div className="max-w-6xl mx-auto space-y-5">

        <PageHeader icon={ClipboardList} title="Valuadores"
          subtitle={`${valuadores.length} registrados · ${valuadores.filter((v) => v.kyc === "aprobado").length} verificados · ${valuadores.filter((v) => v.directorio_visible).length} en directorio`}>
          <button onClick={cargar}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-3 py-2.5 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </PageHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === id ? "bg-white text-[#1B4332] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        {activeTab === "resumen" && <TabResumen valuadores={valuadores} />}

        {activeTab === "verificaciones" && (
          <TabVerificaciones valuadores={valuadores}
            onApprobar={onApprobar} onRechazar={onRechazar} onSolicitarInfo={onSolicitarInfo} />
        )}

        {activeTab === "actividad" && <TabActividad valuadores={valuadores} />}

        {activeTab === "valuadores" && (
          <AdminCard icon={ClipboardList}
            title={`Lista completa (${filtrados.length})`}
            action={null}>
            <div className="p-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Nombre, email o ciudad..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
              {[
                { val: planFiltro, set: (v) => { setPlanFiltro(v); setPagina(1); }, opts: [["todos","Todos los planes"],["enterprise","Enterprise"],["corporativo","Corporativo"],["pro","Pro"],["despacho","Despacho"],["basico","Básico"],["independiente","Independiente"]] },
                { val: kycFiltro, set: (v) => { setKycFiltro(v); setPagina(1); }, opts: [["todos","Verificación: Todos"],["aprobado","Aprobado"],["pendiente","Pendiente"],["info_solicitada","Info solicitada"],["rechazado","Rechazado"]] },
              ].map(({ val, set, opts }, i) => (
                <div key={i} className="relative">
                  <select value={val} onChange={(e) => set(e.target.value)}
                    className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none pr-8">
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <GradThead cols={["Valuador","Plan","Verificación","Estado","Directorio","Anuncios","Quejas",""]} />
                <tbody className="divide-y divide-slate-50">
                  {paginados.map((v) => (
                    <FilaValuador key={v.id} v={v} onToggle={onToggle} suspender={suspender} />
                  ))}
                </tbody>
              </table>
            </div>
            {totalPags > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#B7E4C7]">
                <span className="text-xs text-slate-400">{(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: totalPags }, (_, i) => (
                    <button key={i} onClick={() => setPagina(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${pagina === i + 1 ? "bg-[#1B4332] text-white" : "text-slate-500 hover:bg-slate-100"}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </AdminCard>
        )}
      </div>

      {/* Modal detalle */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-white text-lg">{modal.nombre}</h2>
                <p className="text-[#D9ED92]/70 text-sm">{modal.email} · {modal.ciudad}</p>
              </div>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-white/50 hover:text-white" /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ["Cédula", modal.cedula],
                  ["Plan", modal.plan],
                  ["Experiencia", `${modal.experiencia} años`],
                  ["Reportes", modal.totalReportes],
                  ["Calificación", modal.calificacion > 0 ? `${modal.calificacion} ⭐` : "Sin calificaciones"],
                  ["Quejas", modal.quejas || "—"],
                  ["Verificación", KYC_LABEL[modal.kyc]],
                  ["Directorio", modal.directorio_visible ? "Visible" : "Oculto"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#F0FAF5] border border-[#B7E4C7] rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/52${modal.telefono}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-bold">
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
                <a href={`mailto:${modal.email}`}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50">
                  <Mail className="w-4 h-4" /> Email
                </a>
                <button onClick={() => setModal(null)}
                  className="px-4 border border-slate-200 text-slate-400 rounded-xl py-2.5 text-sm hover:bg-slate-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminValuadores;
