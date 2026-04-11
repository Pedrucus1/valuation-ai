import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  UserCog, Plus, Edit2, Ban, CheckCircle2, ShieldCheck,
  X, Eye, EyeOff,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

const ROL_PERMISOS = {
  superadmin: {
    label: "Super Admin",
    color: "bg-[#1B4332] text-white",
    descripcion: "Acceso total a todos los módulos sin restricciones.",
    permisos: ["dashboard", "usuarios", "kyc", "moderacion", "feedback", "roles", "broadcast", "cfdi", "cobertura"],
  },
  moderador: {
    label: "Moderador",
    color: "bg-blue-600 text-white",
    descripcion: "Puede revisar y aprobar/rechazar anuncios y verificaciones. Sin acceso a finanzas ni roles.",
    permisos: ["dashboard", "kyc", "moderacion", "feedback"],
  },
  finanzas: {
    label: "Finanzas",
    color: "bg-purple-600 text-white",
    descripcion: "Acceso a reportes de ingresos, CFDI y planes de usuarios. Sin acceso a verificaciones ni moderación.",
    permisos: ["dashboard", "usuarios", "cfdi"],
  },
  soporte: {
    label: "Soporte",
    color: "bg-orange-500 text-white",
    descripcion: "Ve quejas y usuarios. Puede responder feedback. Sin acceso a roles ni finanzas.",
    permisos: ["dashboard", "usuarios", "feedback"],
  },
  contenido: {
    label: "Contenido",
    color: "bg-pink-500 text-white",
    descripcion: "Gestiona el CMS legal y modera anuncios. Sin acceso a datos de usuarios.",
    permisos: ["dashboard", "moderacion"],
  },
};

const ADMINS_MOCK = [
  { id: "a1", nombre: "Pedro Admin",         email: "admin@propvalu.mx",    rol: "superadmin", estado: "activo",    ultimo_acceso: "2026-03-20" },
  { id: "a2", nombre: "Diana Moderadora",    email: "diana@propvalu.mx",    rol: "moderador",  estado: "activo",    ultimo_acceso: "2026-03-19" },
  { id: "a3", nombre: "Ricardo Finanzas",    email: "ricardo@propvalu.mx",  rol: "finanzas",   estado: "activo",    ultimo_acceso: "2026-03-18" },
  { id: "a4", nombre: "Sofía Soporte",       email: "sofia@propvalu.mx",    rol: "soporte",    estado: "suspendido",ultimo_acceso: "2026-03-10" },
];

const PERMISOS_LABELS = {
  dashboard:   "Dashboard",
  usuarios:    "Usuarios",
  kyc:         "Verificación",
  moderacion:  "Moderación",
  feedback:    "Quejas",
  roles:       "Roles",
  broadcast:   "Broadcast",
  cfdi:        "CFDI",
  cobertura:   "Cobertura",
};

const AdminRoles = () => {
  const [admins, setAdmins] = useState(ADMINS_MOCK);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "moderador" });
  const [mostrarPass, setMostrarPass] = useState(false);
  const [errForm, setErrForm] = useState("");

  const cambiarEstado = (id, estado) => {
    setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, estado } : a));
  };

  const crearAdmin = () => {
    if (!form.nombre || !form.email || !form.password) {
      setErrForm("Todos los campos son requeridos.");
      return;
    }
    if (form.password.length < 8) {
      setErrForm("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const nuevo = {
      id: `a${Date.now()}`,
      nombre: form.nombre,
      email: form.email,
      rol: form.rol,
      estado: "activo",
      ultimo_acceso: "—",
    };
    setAdmins((prev) => [...prev, nuevo]);
    setForm({ nombre: "", email: "", password: "", rol: "moderador" });
    setModalNuevo(false);
    setErrForm("");
  };

  // Solo el superadmin ve esta página en producción
  const adminActual = JSON.parse(localStorage.getItem("pv_admin") || "{}");
  const esSuperAdmin = adminActual.rol === "superadmin";

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        <PageHeader icon={UserCog} title="Roles de Administrador"
          subtitle="Gestiona quién puede acceder al panel y con qué permisos">
          {esSuperAdmin && (
            <button onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Nuevo admin
            </button>
          )}
        </PageHeader>

        {/* Tabla admins */}
        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#B7E4C7]">
            <h2 className="font-semibold text-[#1B4332] text-sm">Administradores activos</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {admins.map((admin) => {
              const rolInfo = ROL_PERMISOS[admin.rol];
              return (
                <div key={admin.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#F8F9FA] border border-[#B7E4C7] flex items-center justify-center text-[#1B4332] font-bold text-sm flex-shrink-0">
                    {admin.nombre.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1B4332]">{admin.nombre}</p>
                    <p className="text-xs text-slate-400">{admin.email}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${rolInfo.color}`}>
                    {rolInfo.label}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${admin.estado === "activo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {admin.estado === "activo" ? "Activo" : "Suspendido"}
                  </span>
                  <span className="text-xs text-slate-300 whitespace-nowrap hidden md:block">
                    {admin.ultimo_acceso}
                  </span>
                  {esSuperAdmin && admin.rol !== "superadmin" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModalDetalle(admin)}
                        className="p-1.5 text-slate-400 hover:text-[#1B4332] hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {admin.estado === "activo" ? (
                        <button
                          onClick={() => cambiarEstado(admin.id, "suspendido")}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarEstado(admin.id, "activo")}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Referencia de roles */}
        <div>
          <h2 className="font-semibold text-[#1B4332] text-sm mb-3">Descripción de roles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ROL_PERMISOS).map(([key, rol]) => (
              <div key={key} className="bg-white rounded-2xl border border-[#B7E4C7] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${rol.color}`}>{rol.label}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{rol.descripcion}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(PERMISOS_LABELS).map((p) => (
                    <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rol.permisos.includes(p) ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-300"}`}>
                      {PERMISOS_LABELS[p]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal nuevo admin */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-bold text-[#1B4332]">Nuevo administrador</h2>
              <button onClick={() => setModalNuevo(false)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="nuevo@propvalu.mx"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contraseña temporal</label>
                <div className="relative">
                  <input type={mostrarPass ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 pr-10" />
                  <button type="button" onClick={() => setMostrarPass((p) => !p)}
                    className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500">
                    {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rol</label>
                <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40">
                  {Object.entries(ROL_PERMISOS).filter(([k]) => k !== "superadmin").map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {errForm && <p className="text-xs text-red-500">{errForm}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={crearAdmin}
                className="flex-1 bg-[#1B4332] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#163828] transition-colors">
                Crear admin
              </button>
              <button onClick={() => setModalNuevo(false)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar rol */}
      {modalDetalle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-bold text-[#1B4332]">Editar rol: {modalDetalle.nombre}</h2>
              <button onClick={() => setModalDetalle(null)}><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rol</label>
              <select
                defaultValue={modalDetalle.rol}
                onChange={(e) => {
                  setAdmins((prev) => prev.map((a) => a.id === modalDetalle.id ? { ...a, rol: e.target.value } : a));
                  setModalDetalle(null);
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              >
                {Object.entries(ROL_PERMISOS).filter(([k]) => k !== "superadmin").map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setModalDetalle(null)}
              className="w-full mt-4 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRoles;
