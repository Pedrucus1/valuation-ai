import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  FileText, Users, ShieldCheck,
  MessageSquare, AlertCircle, Activity, Clock,
} from "lucide-react";

const ACTIVIDAD_RECIENTE = [
  { id: 1, tipo: "kyc",        mensaje: "Nueva verificación pendiente de revisión",       hora: "reciente",  nivel: "info" },
  { id: 2, tipo: "valuacion",  mensaje: "Reporte generado en la plataforma",              hora: "reciente",  nivel: "ok" },
  { id: 3, tipo: "queja",      mensaje: "Queja o sugerencia recibida",                    hora: "reciente",  nivel: "warn" },
];

const NIVEL_COLOR = {
  ok:    "text-green-600 bg-green-50",
  info:  "text-blue-600 bg-blue-50",
  warn:  "text-yellow-700 bg-yellow-50",
  error: "text-red-600 bg-red-50",
};


const KpiCard = ({ icon: Icon, label, valor, sub, color, alerta }) => (
  <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-2 ${alerta ? "border-red-200" : "border-slate-100"}`}>
    <div className="flex items-start justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      {alerta && (
        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
          Atención
        </span>
      )}
    </div>
    <div>
      <p className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">{valor}</p>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
    {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    valuaciones_mes: 0,
    valuaciones_mes_anterior: 0,
    usuarios_activos: 0,
    kyc_pendientes: 0,
    anuncios_revision: 0,
    quejas_abiertas: 0,
    valuadores_activos: 0,
    valuaciones_hoy: 0,
    inmobiliarias_pendientes: 0,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then((data) => {
        setStats({
          valuaciones_mes: data.total_valuaciones || 0,
          valuaciones_mes_anterior: 0,
          usuarios_activos: data.total_usuarios || 0,
          kyc_pendientes: data.kyc_pendiente || 0,
          anuncios_revision: 0,
          quejas_abiertas: data.feedback_abierto || 0,
          valuadores_activos: 0,
          valuaciones_hoy: data.valuaciones_completadas || 0,
          inmobiliarias_pendientes: data.inmobiliarias_pendientes || 0,
        });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);



  const badges = {
    kyc: stats.kyc_pendientes,
    ads: stats.anuncios_revision,
    inmobiliarias: stats.inmobiliarias_pendientes,
  };

  if (cargando) {
    return (
      <AdminLayout badges={badges}>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando estadísticas…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Título */}
        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Resumen operativo · {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* Alertas activas */}
        {(stats.kyc_pendientes > 0 || stats.anuncios_revision > 0 || stats.quejas_abiertas > 0 || stats.inmobiliarias_pendientes > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-semibold">Elementos que requieren atención:</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {stats.kyc_pendientes > 0 && (
                <a href="/admin/kyc" className="text-amber-700 underline">
                  {stats.kyc_pendientes} verificación{stats.kyc_pendientes > 1 ? "es" : ""} pendiente{stats.kyc_pendientes > 1 ? "s" : ""}
                </a>
              )}
              {stats.anuncios_revision > 0 && (
                <a href="/admin/moderacion" className="text-amber-700 underline">
                  {stats.anuncios_revision} anuncio{stats.anuncios_revision > 1 ? "s" : ""} en revisión
                </a>
              )}
              {stats.quejas_abiertas > 0 && (
                <a href="/admin/feedback" className="text-amber-700 underline">
                  {stats.quejas_abiertas} queja{stats.quejas_abiertas > 1 ? "s" : ""} abiertas
                </a>
              )}
              {stats.inmobiliarias_pendientes > 0 && (
                <a href="/admin/inmobiliarias" className="text-amber-700 underline">
                  {stats.inmobiliarias_pendientes} inmobiliaria{stats.inmobiliarias_pendientes > 1 ? "s" : ""} pendiente{stats.inmobiliarias_pendientes > 1 ? "s" : ""} de verificación
                </a>
              )}
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={FileText}
            label="Valuaciones totales"
            valor={stats.valuaciones_mes.toLocaleString()}
            color="bg-blue-100 text-blue-600"
          />
          <KpiCard
            icon={FileText}
            label="Valuaciones completadas"
            valor={stats.valuaciones_hoy.toLocaleString()}
            color="bg-blue-50 text-blue-500"
          />
          <KpiCard
            icon={Users}
            label="Usuarios registrados"
            valor={stats.usuarios_activos.toLocaleString()}
            color="bg-purple-100 text-purple-600"
          />
          <KpiCard
            icon={MessageSquare}
            label="Feedback abierto"
            valor={stats.quejas_abiertas}
            color="bg-red-100 text-red-500"
            alerta={stats.quejas_abiertas > 0}
          />
        </div>

        {/* Segunda fila KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <KpiCard
            icon={ShieldCheck}
            label="Verificaciones pendientes"
            valor={stats.kyc_pendientes}
            color="bg-yellow-100 text-yellow-600"
            alerta={stats.kyc_pendientes > 0}
          />
          <KpiCard
            icon={MessageSquare}
            label="Quejas / feedback sin resolver"
            valor={stats.quejas_abiertas}
            color="bg-red-100 text-red-500"
            alerta={stats.quejas_abiertas > 0}
          />
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-sm">Actividad reciente</h2>
            <span className="text-xs text-slate-400">Últimas 24 horas</span>
          </div>
          <div className="divide-y divide-slate-50">
            {ACTIVIDAD_RECIENTE.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-6 py-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide flex-shrink-0 ${NIVEL_COLOR[a.nivel]}`}>
                  {a.tipo}
                </span>
                <p className="text-sm text-slate-600 flex-1 leading-snug">{a.mensaje}</p>
                <span className="text-xs text-slate-300 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {a.hora}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
