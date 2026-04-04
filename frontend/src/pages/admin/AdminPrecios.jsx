import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import { DollarSign, Save, CheckCircle2, AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

const PRECIOS_INICIALES = {
  // ── Público ──────────────────────────────────────────────────────
  publico_individual: {
    label: "Individual (1 reporte)", grupo: "Público", iva: true, moneda: "MXN",
    precio: 241.38, precio_con_iva: 280,
    descripcion: "Precio unitario para usuario sin cuenta",
  },
  publico_bronce: {
    label: "Bronce (3 reportes)", grupo: "Público", iva: true, moneda: "MXN",
    precio: 702.59, precio_con_iva: 815,
    descripcion: "Pack de 3 reportes con descuento",
  },
  publico_plata: {
    label: "Plata (5 reportes)", grupo: "Público", iva: true, moneda: "MXN",
    precio: 1135.34, precio_con_iva: 1317,
    descripcion: "Pack de 5 reportes — el más popular",
  },
  publico_oro: {
    label: "Oro (10 reportes)", grupo: "Público", iva: true, moneda: "MXN",
    precio: 2202.59, precio_con_iva: 2555,
    descripcion: "Pack de 10 reportes — mejor precio por unidad",
  },
  addon_valuador: {
    label: "Add-on: Revisión Valuador Certificado", grupo: "Público", iva: true, moneda: "MXN",
    precio: 301.72, precio_con_iva: 350,
    descripcion: "Por avalúo — firma y cédula CNBV/INDAABIN",
  },
  addon_visita: {
    label: "Add-on: Verificación m² en sitio", grupo: "Público", iva: true, moneda: "MXN",
    precio: 517.24, precio_con_iva: 600,
    descripcion: "Por visita — medición física de la propiedad",
  },
  // ── Valuadores ───────────────────────────────────────────────────
  valuador_independiente: {
    label: "Plan Independiente — Valuador", grupo: "Valuadores", iva: true, moneda: "MXN",
    precio: 724.14, precio_con_iva: 840,
    descripcion: "5 avalúos/mes · 1 perito",
  },
  valuador_despacho: {
    label: "Plan Despacho — Valuador", grupo: "Valuadores", iva: true, moneda: "MXN",
    precio: 1379.31, precio_con_iva: 1600,
    descripcion: "10 avalúos/mes · hasta 3 peritos",
  },
  valuador_pro: {
    label: "Plan Pro — Valuador", grupo: "Valuadores", iva: true, moneda: "MXN",
    precio: 2672.41, precio_con_iva: 3100,
    descripcion: "20 avalúos/mes · hasta 5 peritos · Data Analysis",
  },
  valuador_corporativo: {
    label: "Plan Corporativo — Valuador", grupo: "Valuadores", iva: true, moneda: "MXN",
    precio: 3879.31, precio_con_iva: 4500,
    descripcion: "40+ avalúos/mes · hasta 10 peritos · cuenta manager",
  },
  // ── Inmobiliarias ────────────────────────────────────────────────
  inmobiliaria_lite5: {
    label: "Plan Lite 5 — Inmobiliaria", grupo: "Inmobiliarias", iva: true, moneda: "MXN",
    precio: 1206.90, precio_con_iva: 1400,
    descripcion: "5 avalúos/mes · 1 usuario",
  },
  inmobiliaria_lite10: {
    label: "Plan Lite 10 — Inmobiliaria", grupo: "Inmobiliarias", iva: true, moneda: "MXN",
    precio: 2327.59, precio_con_iva: 2700,
    descripcion: "10 avalúos/mes · 1 usuario",
  },
  inmobiliaria_pro20: {
    label: "Plan Pro 20 — Inmobiliaria", grupo: "Inmobiliarias", iva: true, moneda: "MXN",
    precio: 4482.76, precio_con_iva: 5200,
    descripcion: "20 avalúos/mes · hasta 5 usuarios · ficha completa",
  },
  inmobiliaria_premier: {
    label: "Plan Premier — Inmobiliaria", grupo: "Inmobiliarias", iva: true, moneda: "MXN",
    precio: 6465.52, precio_con_iva: 7500,
    descripcion: "30–50+ avalúos/mes · hasta 50 usuarios · sin publicidad",
  },
  // ── Publicidad — precio por impresión (sin IVA) ──────────────────
  ad_slot1_15s: {
    label: "Slot 1 · 15 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 15, precio_con_iva: 15,
    descripcion: "ComparablesPage — pantalla completa, usuario bloqueado",
  },
  ad_slot1_30s: {
    label: "Slot 1 · 30 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 25, precio_con_iva: 25,
    descripcion: "ComparablesPage — pantalla completa, usuario bloqueado",
  },
  ad_slot1_60s: {
    label: "Slot 1 · 60 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 38, precio_con_iva: 38,
    descripcion: "ComparablesPage — pantalla completa, usuario bloqueado",
  },
  ad_slot2_15s: {
    label: "Slot 2 · 15 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 10, precio_con_iva: 10,
    descripcion: "ReportPage — mientras IA genera el reporte",
  },
  ad_slot2_30s: {
    label: "Slot 2 · 30 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 18, precio_con_iva: 18,
    descripcion: "ReportPage — mientras IA genera el reporte",
  },
  ad_slot3_15s: {
    label: "Slot 3 · 15 seg/impresión", grupo: "Publicidad", iva: false, moneda: "MXN",
    precio: 5, precio_con_iva: 5,
    descripcion: "ReportPage — antes de descargar el PDF",
  },
};

const GRUPOS_ORDEN = ["Público", "Valuadores", "Inmobiliarias", "Publicidad"];

const GRUPO_INFO = {
  Público: "Precios que ve el usuario en /comprar. Todos incluyen IVA.",
  Valuadores: "Planes mensuales en /valuadores. Precio con IVA.",
  Inmobiliarias: "Planes mensuales en /inmobiliaria. Precio con IVA.",
  Publicidad: "Precio por impresión en MXN. No aplica IVA (B2B). Cambios afectan el gasto de campañas activas.",
};

const AdminPrecios = () => {
  const [precios, setPrecios] = useState(PRECIOS_INICIALES);
  const [editados, setEditados] = useState({});
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/precios")
      .then((data) => {
        const { updated_at, _id, ...rest } = data;
        if (Object.keys(rest).length > 0) {
          setPrecios((prev) => {
            const merged = { ...prev };
            for (const [key, val] of Object.entries(rest)) {
              if (merged[key]) merged[key] = { ...merged[key], ...val };
            }
            return merged;
          });
        }
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
            <p className="text-slate-400 text-sm mt-0.5">Cambios se reflejan en tiempo real en todas las páginas del sitio</p>
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
            <span className="text-sm text-green-700 font-semibold">Precios actualizados — visibles en el sitio de inmediato</span>
          </div>
        )}

        {totalCambios > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span><strong>{totalCambios} precio{totalCambios > 1 ? "s" : ""} modificado{totalCambios > 1 ? "s" : ""}</strong> — pendiente de guardar.</span>
          </div>
        )}

        {grupos.map(({ grupo, items }) => (
          <div key={grupo}>
            <div className="mb-3">
              <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-base">{grupo}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{GRUPO_INFO[grupo]}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(([key, p]) => (
                <div key={key} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${editados[key] ? "border-[#52B788]" : "border-slate-100"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-[#1B4332] text-sm">{p.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.descripcion}</p>
                    </div>
                    {editados[key] && (
                      <button onClick={() => resetPrecio(key)} className="text-slate-300 hover:text-slate-500 flex-shrink-0" title="Restablecer">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {p.iva ? "Precio sin IVA (MXN)" : "Precio por impresión (MXN)"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input
                          type="number" step="0.01" min="1"
                          value={p.precio}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className={`w-full border rounded-xl pl-6 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 transition-colors ${editados[key] ? "border-[#52B788] text-[#1B4332]" : "border-slate-200 text-slate-600"}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {p.iva ? "Precio con IVA 16%" : "Precio final (sin IVA)"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input
                          type="text" readOnly
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
          <p>Los precios se guardan en <code className="bg-slate-100 px-1 rounded">/api/admin/precios</code> y el frontend los carga al montar cada página. No se requiere redeploy. Las páginas de publicidad, valuadores, inmobiliarias y checkout reflejan los cambios de inmediato. Los precios de publicidad también afectan el gasto de campañas activas en tiempo real.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPrecios;
