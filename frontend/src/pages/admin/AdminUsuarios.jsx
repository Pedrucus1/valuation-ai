import { useState, useMemo, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Search, Filter, ChevronDown, MoreVertical, ShieldCheck,
  Ban, CheckCircle2, Eye, ChevronLeft, ChevronRight, X,
} from "lucide-react";

const ROLE_LABEL = {
  public:      "public",
  appraiser:   "valuador",
  realtor:     "inmobiliaria",
  super_admin: "admin",
  advertiser:  "anunciante",
};

function normalizeUser(u) {
  return {
    id: u.user_id,
    nombre: u.name || u.email,
    email: u.email,
    tipo: ROLE_LABEL[u.role] || u.role,
    plan: u.plan || "-",
    estado: u.kyc_status === "pending" ? "kyc_pendiente" : (u.cuenta_estado || "activo"),
    fecha: u.created_at ? u.created_at.split("T")[0] : "-",
    valuaciones: u.valuaciones || 0,
  };
}

const TIPO_COLORS = {
  public:       "bg-slate-100 text-slate-500",
  valuador:     "bg-blue-100 text-blue-700",
  inmobiliaria: "bg-purple-100 text-purple-700",
  anunciante:   "bg-orange-100 text-orange-700",
};

const ESTADO_COLORS = {
  activo:        "bg-green-100 text-green-700",
  suspendido:    "bg-red-100 text-red-600",
  kyc_pendiente: "bg-yellow-100 text-yellow-700",
};

const ESTADO_LABELS = {
  activo:        "Activo",
  suspendido:    "Suspendido",
  kyc_pendiente: "Verificación pendiente",
};

const PAGE_SIZE = 6;

const AdminUsuarios = () => {
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [modalUsuario, setModalUsuario] = useState(null);

  useEffect(() => {
    setCargando(true);
    adminFetch("/api/admin/usuarios?skip=0&limit=100")
      .then((data) => {
        setUsuarios((data.usuarios || []).map(normalizeUser));
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchQ = !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
      const matchT = tipoFiltro === "todos" || u.tipo === tipoFiltro;
      const matchE = estadoFiltro === "todos" || u.estado === estadoFiltro;
      return matchQ && matchT && matchE;
    });
  }, [usuarios, busqueda, tipoFiltro, estadoFiltro]);

  const totalPaginas = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await adminFetch(`/api/admin/usuarios/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, estado: nuevoEstado } : u));
    } catch (e) {
      alert("Error: " + e.message);
    }
    setMenuAbierto(null);
  };

  const badges = { kyc: usuarios.filter((u) => u.estado === "kyc_pendiente").length };

  return (
    <AdminLayout badges={badges}>
      <div className="max-w-6xl mx-auto space-y-5">

        <div>
          <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Gestión de Usuarios</h1>
          <p className="text-slate-400 text-sm mt-0.5">{cargando ? "Cargando…" : `${total || usuarios.length} usuarios registrados`}</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
            />
          </div>
          <div className="relative">
            <select
              value={tipoFiltro}
              onChange={(e) => { setTipoFiltro(e.target.value); setPagina(1); }}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 pr-8"
            >
              <option value="todos">Todos los tipos</option>
              <option value="public">Público</option>
              <option value="valuador">Valuador</option>
              <option value="inmobiliaria">Inmobiliaria</option>
              <option value="anunciante">Anunciante</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={estadoFiltro}
              onChange={(e) => { setEstadoFiltro(e.target.value); setPagina(1); }}
              className="appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 pr-8"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="kyc_pendiente">Verificación pendiente</option>
              <option value="suspendido">Suspendido</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Val.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Registro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      No se encontraron usuarios con esos filtros
                    </td>
                  </tr>
                ) : (
                  paginados.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1B4332] leading-snug">{u.nombre}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[u.tipo]}`}>
                          {u.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{u.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[u.estado]}`}>
                          {ESTADO_LABELS[u.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{u.valuaciones}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{u.fecha}</td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setMenuAbierto(menuAbierto === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuAbierto === u.id && (
                          <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44">
                            <button
                              onClick={() => { setModalUsuario(u); setMenuAbierto(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            >
                              <Eye className="w-4 h-4" /> Ver detalle
                            </button>
                            {u.estado !== "activo" && (
                              <button
                                onClick={() => cambiarEstado(u.id, "activo")}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Reactivar
                              </button>
                            )}
                            {u.estado !== "suspendido" && (
                              <button
                                onClick={() => cambiarEstado(u.id, "suspendido")}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Ban className="w-4 h-4" /> Suspender
                              </button>
                            )}
                            {u.tipo === "valuador" && u.estado === "kyc_pendiente" && (
                              <button
                                onClick={() => { window.location.href = "/admin/kyc"; }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                              >
                                <ShieldCheck className="w-4 h-4" /> Revisar verificación
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagina(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      pagina === i + 1
                        ? "bg-[#1B4332] text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1B4332] disabled:opacity-30 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-lg">{modalUsuario.nombre}</h2>
                <p className="text-slate-400 text-sm">{modalUsuario.email}</p>
              </div>
              <button onClick={() => setModalUsuario(null)} className="text-slate-300 hover:text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Tipo", modalUsuario.tipo],
                ["Plan", modalUsuario.plan],
                ["Estado", ESTADO_LABELS[modalUsuario.estado]],
                ["Valuaciones", modalUsuario.valuaciones],
                ["Registro", modalUsuario.fecha],
                ["ID", modalUsuario.id],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#F8F9FA] rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{k}</p>
                  <p className="text-sm text-[#1B4332] font-semibold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              {modalUsuario.estado !== "suspendido" ? (
                <button
                  onClick={() => { cambiarEstado(modalUsuario.id, "suspendido"); setModalUsuario(null); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <Ban className="w-4 h-4" /> Suspender
                </button>
              ) : (
                <button
                  onClick={() => { cambiarEstado(modalUsuario.id, "activo"); setModalUsuario(null); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-green-200 text-green-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-green-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Reactivar
                </button>
              )}
              <button
                onClick={() => setModalUsuario(null)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsuarios;
