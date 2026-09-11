import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard } from "@/components/AdminUI";
import { adminFetch, getAdminToken } from "@/lib/adminFetch";
import { API } from "@/App";
import { DollarSign, Check, X, FileText } from "lucide-react";
import { toast } from "sonner";

const ESTADO_CFG = {
  pendiente_comprobante: { label: "Esperando comprobante", cls: "bg-slate-100 text-slate-600" },
  pendiente_revision:    { label: "Por revisar",           cls: "bg-amber-100 text-amber-700" },
  pagado:                { label: "Pagado",                cls: "bg-green-100 text-green-700" },
  rechazado:              { label: "Rechazado",             cls: "bg-red-100 text-red-600" },
};

const AdminCreditos = () => {
  const [compras, setCompras] = useState([]);
  const [filtro, setFiltro] = useState("pendiente_revision");
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    adminFetch(`/api/admin/creditos/compras?estado=${filtro === "todos" ? "" : filtro}`)
      .then((d) => setCompras(d.compras || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [filtro]);

  const confirmar = async (purchase_id) => {
    try {
      await adminFetch(`/api/admin/creditos/compras/${purchase_id}/confirmar`, { method: "POST" });
      toast.success("Créditos aplicados");
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const rechazar = async (purchase_id) => {
    try {
      await adminFetch(`/api/admin/creditos/compras/${purchase_id}/rechazar`, { method: "POST" });
      toast.success("Solicitud rechazada");
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader icon={DollarSign} title="Créditos" subtitle="Compras de créditos por transferencia bancaria" />

        <div className="flex gap-1 bg-white border border-[#B7E4C7] rounded-lg p-1 w-fit">
          {[
            { id: "pendiente_revision", label: "Por revisar" },
            { id: "pagado", label: "Pagadas" },
            { id: "rechazado", label: "Rechazadas" },
            { id: "todos", label: "Todas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtro === f.id ? "bg-[#1B4332] text-white" : "text-slate-500 hover:text-[#1B4332]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <AdminCard>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando…</div>
          ) : compras.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay solicitudes en este filtro</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {compras.map((c) => (
                <div key={c.purchase_id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[#1B4332]">{c.nombre} <span className="text-slate-400 font-normal">— {c.email}</span></p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.package_id} · {c.creditos} créditos ({c.tipo}) · ${c.monto.toLocaleString("es-MX")} MXN
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {c.created_at ? new Date(c.created_at).toLocaleString("es-MX") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(ESTADO_CFG[c.estado] || {}).cls}`}>
                      {(ESTADO_CFG[c.estado] || {}).label || c.estado}
                    </span>
                    {c.comprobante_doc_id && (
                      <button
                        onClick={async () => {
                          const res = await fetch(`${API}/admin/creditos/comprobante/${c.purchase_id}`, {
                            headers: { "X-Admin-Token": getAdminToken() },
                          });
                          if (!res.ok) return toast.error("No se pudo abrir el comprobante");
                          const blob = await res.blob();
                          window.open(URL.createObjectURL(blob), "_blank");
                        }}
                        className="text-xs text-[#52B788] hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> comprobante
                      </button>
                    )}
                    {c.estado === "pendiente_revision" && (
                      <>
                        <button
                          onClick={() => confirmar(c.purchase_id)}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                          title="Confirmar pago"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rechazar(c.purchase_id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          title="Rechazar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
};

export default AdminCreditos;
