import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { DollarSign, Save, CheckCircle2, AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

// En producción: GET/PUT /api/admin/precios
// Permite modificar precios sin hacer un nuevo deploy
const PRECIOS_INICIALES = {
  reporte_publico: {
    label: "Reporte público (usuario sin cuenta)",
    grupo: "Público",
    precio: 241.38,
    iva: true,
    precio_con_iva: 280,
    moneda: "MXN",
    descripcion: "Precio por reporte unitario para usuarios sin registro",
  },
  valuador_basico: {
    label: "Plan Básico — Valuador",
    grupo: "Valuadores",
    precio: 400,
    iva: true,
    precio_con_iva: 464,
    moneda: "MXN",
    descripcion: "5 reportes/mes, sin soporte prioritario",
  },
  valuador_pro: {
    label: "Plan Pro — Valuador",
    grupo: "Valuadores",
    precio: 689.66,
    iva: true,
    precio_con_iva: 800,
    moneda: "MXN",
    descripcion: "20 reportes/mes, directorio destacado, soporte email",
  },
  valuador_enterprise: {
    label: "Plan Enterprise — Valuador",
    grupo: "Valuadores",
    precio: 1293.10,
    iva: true,
    precio_con_iva: 1500,
    moneda: "MXN",
    descripcion: "Reportes ilimitados, API, account manager",
  },
  inmobiliaria_starter: {
    label: "Plan Starter — Inmobiliaria",
    grupo: "Inmobiliarias",
    precio: 517.24,
    iva: true,
    precio_con_iva: 600,
    moneda: "MXN",
    descripcion: "10 consultas/mes",
  },
  inmobiliaria_pro: {
    label: "Plan Pro — Inmobiliaria",
    grupo: "Inmobiliarias",
    precio: 1034.48,
    iva: true,
    precio_con_iva: 1200,
    moneda: "MXN",
    descripcion: "50 consultas/mes, logo en directorio",
  },
  anuncio_basico: {
    label: "Anuncio Básico (30 días)",
    grupo: "Anunciantes",
    precio: 1000,
    iva: true,
    precio_con_iva: 1160,
    moneda: "MXN",
    descripcion: "1 slot, zona definida, 30 días",
  },
  anuncio_premium: {
    label: "Anuncio Premium (30 días)",
    grupo: "Anunciantes",
    precio: 2155.17,
    iva: true,
    precio_con_iva: 2500,
    moneda: "MXN",
    descripcion: "3 slots prioritarios, todas las zonas, 30 días",
  },
};

const GRUPOS_ORDEN = ["Público", "Valuadores", "Inmobiliarias", "Anunciantes"];

const AdminPrecios = () => {
  const [precios, setPrecios] = useState(PRECIOS_INICIALES);
  const [editados, setEditados] = useState({});
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/precios")
      .then((data) => {
        const { updated_at, ...rest } = data;
        if (Object.keys(rest).length > 0) setPrecios(rest);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key, valor) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) return;
    const conIva = precios[key].iva ? Math.round(num * 1.16 * 100) / 100 : num;
    setPrecios((p) => ({ ...p, [key]: { ...p[key], precio: num, precio_con_iva: conIva } }));
    setEditados((p) => ({ ...p, [key]: true }));
  };

  const resetPrecio = (key) => {
    setPrecios((p) => ({ ...p, [key]: PRECIOS_INICIALES[key] }));
    setEditados((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await adminFetch("/api/admin/precios", {
        method: "PUT",
        body: JSON.stringify(precios),
      });
      setEditados({});
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setGuardando(false);
    }
  };

  const totalCambios = Object.keys(editados).length;

  const grupos = GRUPOS_ORDEN.map((g) => ({
    grupo: g,
    items: Object.entries(precios).filter(([, v]) => v.grupo === g),
  }));

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold text-[#1B4332]">Gestión de Precios</h1>
            <p className="text-slate-400 text-sm mt-0.5">Modifica precios sin necesidad de hacer un deploy</p>
          </div>
          <button onClick={guardar} disabled={totalCambios === 0 || guardando}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#163828] disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {totalCambios > 0 ? `Guardar ${totalCambios} cambio${totalCambios > 1 ? "s" : ""}` : "Sin cambios"}
          </button>
        </div>

        {guardado && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-semibold">Precios actualizados — los cambios son inmediatos en la plataforma</span>
          </div>
        )}

        {totalCambios > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span><strong>{totalCambios} precio{totalCambios > 1 ? "s" : ""} modificado{totalCambios > 1 ? "s" : ""}</strong> — los cambios son visibles en el sitio inmediatamente al guardar.</span>
          </div>
        )}

        {grupos.map(({ grupo, items }) => (
          <div key={grupo}>
            <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-base mb-3">{grupo}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(([key, p]) => (
                <div key={key} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${editados[key] ? "border-[#52B788]" : "border-slate-100"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-[#1B4332] text-sm">{p.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.descripcion}</p>
                    </div>
                    {editados[key] && (
                      <button onClick={() => resetPrecio(key)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Precio sin IVA (MXN)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={p.precio}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className={`w-full border rounded-xl pl-6 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 transition-colors ${editados[key] ? "border-[#52B788] text-[#1B4332]" : "border-slate-200 text-slate-600"}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Precio con IVA 16%
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input
                          type="text"
                          readOnly
                          value={p.precio_con_iva.toFixed(2)}
                          className="w-full border border-slate-100 bg-slate-50 rounded-xl pl-6 pr-3 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {editados[key] && (
                    <div className="mt-2 text-[11px] text-[#52B788] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Modificado — pendiente de guardar
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-[#1B4332]/5 border border-[#52B788]/20 rounded-2xl p-4 text-xs text-slate-600">
          <p className="font-semibold text-[#1B4332] mb-1">¿Cómo funciona?</p>
          <p>Los precios se guardan en <code className="bg-slate-100 px-1 rounded">/api/admin/precios</code> y el frontend los carga al montar las páginas de pricing. No se requiere redeploy. Los valores de IVA se calculan automáticamente (precio × 1.16).</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPrecios;
