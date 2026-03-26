import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  Wrench, AlertTriangle, CheckCircle2, Save, Eye,
  Clock, Globe, X,
} from "lucide-react";

// En producción: GET/PUT /api/admin/mantenimiento
const CONFIG_INICIAL = {
  activo: false,
  titulo: "Mantenimiento programado",
  mensaje: "Estamos realizando mejoras en la plataforma. Estaremos de vuelta en breve.\nDisculpa los inconvenientes.",
  fin_estimado: "",
  permite_admin: true,
  permite_valuadores: false,
  bloquear_rutas: ["/valuar", "/comparables", "/reporte"],
  contacto: "soporte@propvalu.mx",
};

const RUTAS_DISPONIBLES = [
  "/valuar", "/comparables", "/reporte", "/comprar",
  "/checkout/pro", "/dashboard", "/dashboard/valuador",
  "/dashboard/inmobiliaria", "/anunciantes/consola",
];

const AdminMantenimiento = () => {
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [guardado, setGuardado] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/mantenimiento")
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          const { updated_at, ...rest } = data;
          setConfig((prev) => ({ ...prev, ...rest }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (key, val) => setConfig((p) => ({ ...p, [key]: val }));

  const toggleRuta = (ruta) => {
    set("bloquear_rutas",
      config.bloquear_rutas.includes(ruta)
        ? config.bloquear_rutas.filter((r) => r !== ruta)
        : [...config.bloquear_rutas, ruta]
    );
  };

  const guardar = async () => {
    if (config.activo && !confirmando) {
      setConfirmando(true);
      return;
    }
    setConfirmando(false);
    try {
      await adminFetch("/api/admin/mantenimiento", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Modo Mantenimiento</h1>
            <p className="text-slate-400 text-sm mt-0.5">Muestra un banner global o bloquea rutas específicas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={guardar}
              className={`flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors ${
                config.activo ? "bg-red-500 hover:bg-red-600" : "bg-[#1B4332] hover:bg-[#163828]"
              }`}>
              <Save className="w-4 h-4" />
              {config.activo ? "Activar mantenimiento" : "Guardar configuración"}
            </button>
          </div>
        </div>

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Configuración guardada — cambios aplicados en el sitio</span>
          </div>
        )}

        {/* Alerta de confirmación */}
        {confirmando && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700">¿Confirmas activar el modo mantenimiento?</p>
                <p className="text-sm text-red-600 mt-1">
                  Las rutas bloqueadas mostrarán la pantalla de mantenimiento a los usuarios.
                  Asegúrate de tener acceso admin para desactivarlo.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={guardar}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors">
                Sí, activar mantenimiento
              </button>
              <button onClick={() => setConfirmando(false)}
                className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Estado actual */}
        <div className={`flex items-center justify-between rounded-2xl border p-5 ${config.activo ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-center gap-3">
            {config.activo
              ? <><Wrench className="w-5 h-5 text-red-500" /><div><p className="font-bold text-red-700">Modo mantenimiento ACTIVO</p><p className="text-xs text-red-500">El sitio muestra banner a usuarios</p></div></>
              : <><Globe className="w-5 h-5 text-green-600" /><div><p className="font-bold text-green-700">Sitio operando normalmente</p><p className="text-xs text-green-500">Sin restricciones activas</p></div></>
            }
          </div>
          <button
            onClick={() => set("activo", !config.activo)}
            className={`relative w-14 h-7 rounded-full transition-colors ${config.activo ? "bg-red-400" : "bg-slate-200"}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.activo ? "translate-x-8" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Formulario de configuración */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Título del banner</label>
            <input type="text" value={config.titulo} onChange={(e) => set("titulo", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mensaje para usuarios</label>
            <textarea value={config.mensaje} onChange={(e) => set("mensaje", e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Fin estimado <span className="text-slate-300">(opcional)</span>
              </label>
              <input type="datetime-local" value={config.fin_estimado} onChange={(e) => set("fin_estimado", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Email de contacto</label>
              <input type="email" value={config.contacto} onChange={(e) => set("contacto", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Acceso durante mantenimiento
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "permite_admin", label: "Panel Admin (/admin/*)" },
                { key: "permite_valuadores", label: "Dashboard valuadores" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config[key]} onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 accent-[#1B4332]" />
                  <span className="text-sm text-slate-600">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Rutas bloqueadas — mostrará pantalla de mantenimiento
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {RUTAS_DISPONIBLES.map((ruta) => (
                <label key={ruta} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.bloquear_rutas.includes(ruta)} onChange={() => toggleRuta(ruta)}
                    className="w-4 h-4 accent-[#1B4332]" />
                  <span className="text-sm font-mono text-slate-500">{ruta}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Vista previa — así verá el usuario la pantalla de mantenimiento
            </div>
            <div className="bg-[#0D1F18] min-h-64 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#52B788]/20 flex items-center justify-center mx-auto mb-5">
                  <Wrench className="w-8 h-8 text-[#52B788]" />
                </div>
                <h1 className="font-['Outfit'] text-2xl font-bold text-white mb-3">{config.titulo}</h1>
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{config.mensaje}</p>
                {config.fin_estimado && (
                  <p className="text-white/40 text-xs mt-4 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Estimamos regresar: {new Date(config.fin_estimado).toLocaleString("es-MX")}
                  </p>
                )}
                {config.contacto && (
                  <p className="text-[#52B788] text-sm mt-3">{config.contacto}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMantenimiento;
