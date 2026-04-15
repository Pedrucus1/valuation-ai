import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  FileText, Users, ShieldCheck, MessageSquare, Activity,
  Clock, Building2, ClipboardList, AlertCircle, TrendingUp,
  ArrowRight, CheckCircle2, XCircle, BarChart2, Star,
} from "lucide-react";

/* ── Actividad mock (hasta que haya endpoint real) ── */
const ACTIVIDAD_MOCK = [
  { id: 1, tipo: "kyc",       mensaje: "Nueva solicitud de verificación recibida",  nivel: "info" },
  { id: 2, tipo: "valuacion", mensaje: "Reporte de valuación completado",            nivel: "ok"   },
  { id: 3, tipo: "queja",     mensaje: "Queja o sugerencia recibida sin responder",  nivel: "warn" },
];

const NIVEL_COLOR = {
  ok:    "text-[#1B4332] bg-[#D9ED92]",
  info:  "text-blue-700 bg-blue-100",
  warn:  "text-amber-700 bg-amber-100",
  error: "text-red-700 bg-red-100",
};

/* ── KPI card ── */
const KpiCard = ({ icon: Icon, label, valor, sub, stripe, iconBg, iconColor, href, alerta }) => {
  const content = (
    <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full">
      <div className={`h-1 ${stripe}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          {alerta && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              Atención
            </span>
          )}
        </div>
        <p className="font-['Outfit'] text-3xl font-bold text-[#1B4332] leading-none">{valor}</p>
        <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        {href && (
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#52B788]">
            Ver detalle <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : <div>{content}</div>;
};

/* ── Acceso rápido card ── */
const QuickCard = ({ icon: Icon, title, desc, href, badge }) => (
  <Link to={href}
    className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
    <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#D9ED92]" />
        <span className="font-['Outfit'] font-semibold text-white text-sm">{title}</span>
      </div>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
    <div className="px-4 py-3 flex items-center justify-between">
      <p className="text-xs text-slate-500">{desc}</p>
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#52B788] transition-colors" />
    </div>
  </Link>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    valuaciones_total: 0,
    valuaciones_completadas: 0,
    usuarios_activos: 0,
    kyc_pendientes: 0,
    anuncios_revision: 0,
    quejas_abiertas: 0,
    valuadores_activos: 0,
    inmobiliarias_pendientes: 0,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then((data) => {
        setStats({
          valuaciones_total:        data.total_valuaciones || 0,
          valuaciones_completadas:  data.valuaciones_completadas || 0,
          usuarios_activos:         data.total_usuarios || 0,
          kyc_pendientes:           data.kyc_pendiente || 0,
          anuncios_revision:        data.anuncios_revision || 0,
          quejas_abiertas:          data.feedback_abierto || 0,
          valuadores_activos:       data.valuadores_activos || 0,
          inmobiliarias_pendientes: data.inmobiliarias_pendientes || 0,
        });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const admin = JSON.parse(localStorage.getItem("pv_admin") || "{}");

  const badges = {
    kyc: stats.kyc_pendientes,
    ads: stats.anuncios_revision,
    inmobiliarias: stats.inmobiliarias_pendientes,
    quejas: stats.quejas_abiertas,
  };

  const hayAlertas = stats.kyc_pendientes > 0 || stats.anuncios_revision > 0
    || stats.quejas_abiertas > 0 || stats.inmobiliarias_pendientes > 0;

  if (cargando) {
    return (
      <AdminLayout badges={badges}>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
          <Activity className="w-4 h-4 animate-pulse" /> Cargando estadísticas…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-2xl px-6 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-[#D9ED92]/60 text-[11px] uppercase tracking-widest font-semibold">
                Panel de control
              </p>
              <h1 className="font-['Outfit'] text-2xl font-bold text-white mt-0.5">
                Bienvenido, {admin.nombre || "Admin"}
              </h1>
              <p className="text-[#D9ED92]/70 text-xs mt-1">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            {/* Chips de alerta rápida */}
            <div className="flex flex-wrap gap-2 items-start">
              {stats.kyc_pendientes > 0 && (
                <Link to="/admin/kyc"
                  className="flex items-center gap-1.5 bg-amber-400/90 hover:bg-amber-300 text-[#1B4332] text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {stats.kyc_pendientes} KYC pendiente{stats.kyc_pendientes > 1 ? "s" : ""}
                </Link>
              )}
              {stats.inmobiliarias_pendientes > 0 && (
                <Link to="/admin/inmobiliarias"
                  className="flex items-center gap-1.5 bg-amber-400/90 hover:bg-amber-300 text-[#1B4332] text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                  <Building2 className="w-3.5 h-3.5" />
                  {stats.inmobiliarias_pendientes} inmobiliaria{stats.inmobiliarias_pendientes > 1 ? "s" : ""}
                </Link>
              )}
              {stats.quejas_abiertas > 0 && (
                <Link to="/admin/feedback"
                  className="flex items-center gap-1.5 bg-red-400/90 hover:bg-red-300 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {stats.quejas_abiertas} queja{stats.quejas_abiertas > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── KPIs fila 1 — Actividad ── */}
        <div>
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden mb-0">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D9ED92]" />
              <span className="font-['Outfit'] font-semibold text-white text-sm">Actividad de la plataforma</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {[
                {
                  icon: FileText, label: "Valuaciones totales", valor: stats.valuaciones_total.toLocaleString(),
                  sub: "Desde el inicio", stripe: "bg-blue-400", iconBg: "bg-blue-50", iconColor: "text-blue-600",
                  href: "/admin/usuarios",
                },
                {
                  icon: CheckCircle2, label: "Valuaciones completadas", valor: stats.valuaciones_completadas.toLocaleString(),
                  sub: "Estado: completada", stripe: "bg-[#52B788]", iconBg: "bg-[#F0FAF5]", iconColor: "text-[#1B4332]",
                },
                {
                  icon: Users, label: "Usuarios registrados", valor: stats.usuarios_activos.toLocaleString(),
                  sub: "Total en la plataforma", stripe: "bg-purple-400", iconBg: "bg-purple-50", iconColor: "text-purple-600",
                  href: "/admin/usuarios",
                },
                {
                  icon: ClipboardList, label: "Valuadores activos", valor: stats.valuadores_activos.toLocaleString() || "—",
                  sub: "Con cuenta verificada", stripe: "bg-indigo-400", iconBg: "bg-indigo-50", iconColor: "text-indigo-600",
                  href: "/admin/valuadores",
                },
              ].map((k, i) => (
                <KpiCard key={i} {...k} />
              ))}
            </div>
          </div>
        </div>

        {/* ── KPIs fila 2 — Pendientes ── */}
        <div>
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D9ED92]" />
              <span className="font-['Outfit'] font-semibold text-white text-sm">Pendientes de atención</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {[
                {
                  icon: ShieldCheck, label: "Verificaciones KYC", valor: stats.kyc_pendientes,
                  sub: "Solicitudes de verificación", stripe: stats.kyc_pendientes > 0 ? "bg-amber-400" : "bg-slate-200",
                  iconBg: stats.kyc_pendientes > 0 ? "bg-amber-50" : "bg-slate-50",
                  iconColor: stats.kyc_pendientes > 0 ? "text-amber-600" : "text-slate-400",
                  alerta: stats.kyc_pendientes > 0, href: "/admin/kyc",
                },
                {
                  icon: Building2, label: "Inmobiliarias pendientes", valor: stats.inmobiliarias_pendientes,
                  sub: "Esperando aprobación", stripe: stats.inmobiliarias_pendientes > 0 ? "bg-orange-400" : "bg-slate-200",
                  iconBg: stats.inmobiliarias_pendientes > 0 ? "bg-orange-50" : "bg-slate-50",
                  iconColor: stats.inmobiliarias_pendientes > 0 ? "text-orange-600" : "text-slate-400",
                  alerta: stats.inmobiliarias_pendientes > 0, href: "/admin/inmobiliarias",
                },
                {
                  icon: MessageSquare, label: "Feedback sin resolver", valor: stats.quejas_abiertas,
                  sub: "Quejas y sugerencias", stripe: stats.quejas_abiertas > 0 ? "bg-red-400" : "bg-slate-200",
                  iconBg: stats.quejas_abiertas > 0 ? "bg-red-50" : "bg-slate-50",
                  iconColor: stats.quejas_abiertas > 0 ? "text-red-500" : "text-slate-400",
                  alerta: stats.quejas_abiertas > 0, href: "/admin/feedback",
                },
                {
                  icon: BarChart2, label: "Anuncios en revisión", valor: stats.anuncios_revision,
                  sub: "Publicidad pendiente", stripe: stats.anuncios_revision > 0 ? "bg-yellow-400" : "bg-slate-200",
                  iconBg: stats.anuncios_revision > 0 ? "bg-yellow-50" : "bg-slate-50",
                  iconColor: stats.anuncios_revision > 0 ? "text-yellow-600" : "text-slate-400",
                  href: "/admin/ads-analytics",
                },
              ].map((k, i) => (
                <KpiCard key={i} {...k} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Dos columnas: Accesos rápidos + Actividad ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#D9ED92]" />
              <span className="font-['Outfit'] font-semibold text-white text-sm">Accesos rápidos</span>
            </div>
            <div className="p-3 grid grid-cols-1 gap-2">
              <QuickCard icon={ShieldCheck} title="Verificaciones KYC"
                desc={stats.kyc_pendientes > 0 ? `${stats.kyc_pendientes} solicitudes esperando revisión` : "Sin solicitudes pendientes"}
                href="/admin/kyc" badge={stats.kyc_pendientes} />
              <QuickCard icon={Building2} title="Inmobiliarias"
                desc={stats.inmobiliarias_pendientes > 0 ? `${stats.inmobiliarias_pendientes} pendientes de aprobación` : "Gestiona cuentas de inmobiliarias"}
                href="/admin/inmobiliarias" badge={stats.inmobiliarias_pendientes} />
              <QuickCard icon={ClipboardList} title="Valuadores"
                desc="Ver expedientes y estados de cuenta"
                href="/admin/valuadores" />
              <QuickCard icon={MessageSquare} title="Feedback y quejas"
                desc={stats.quejas_abiertas > 0 ? `${stats.quejas_abiertas} sin resolver` : "Sin quejas pendientes"}
                href="/admin/feedback" badge={stats.quejas_abiertas} />
              <QuickCard icon={BarChart2} title="Ingresos"
                desc="Reportes financieros y facturación"
                href="/admin/reportes" />
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-white rounded-xl border border-[#B7E4C7] shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D9ED92]" />
                <span className="font-['Outfit'] font-semibold text-white text-sm">Actividad reciente</span>
              </div>
              <span className="text-[11px] text-[#D9ED92]/60">Últimas 24 h</span>
            </div>
            <div className="divide-y divide-slate-50">
              {ACTIVIDAD_MOCK.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide flex-shrink-0 ${NIVEL_COLOR[a.nivel]}`}>
                    {a.tipo}
                  </span>
                  <p className="text-sm text-slate-600 flex-1 leading-snug">{a.mensaje}</p>
                  <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Estado del sistema */}
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Estado del sistema</p>
              <div className="space-y-2">
                {[
                  { label: "API Backend",    ok: true },
                  { label: "Base de datos",  ok: true },
                  { label: "Almacenamiento", ok: true },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{s.label}</span>
                    <span className={`flex items-center gap-1 font-semibold ${s.ok ? "text-[#1B4332]" : "text-red-500"}`}>
                      {s.ok
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Operativo</>
                        : <><XCircle className="w-3.5 h-3.5" /> Error</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
