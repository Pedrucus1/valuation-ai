import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { PageHeader, AdminCard } from "@/components/AdminUI";
import { adminFetch, getAdminToken } from "@/lib/adminFetch";
import { API } from "@/App";
import { DollarSign, Check, X, FileText, Ticket, Ban, Pencil } from "lucide-react";
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
  const [promos, setPromos] = useState([]);
  const [nuevoCode, setNuevoCode] = useState("");
  const [nuevoCreditos, setNuevoCreditos] = useState(2);
  const [nuevoDiasCodigo, setNuevoDiasCodigo] = useState(30);
  const [nuevoDiasCredito, setNuevoDiasCredito] = useState(60);
  const [editando, setEditando] = useState(null); // code en edición, o null = modo crear

  const cargar = () => {
    setLoading(true);
    adminFetch(`/api/admin/creditos/compras?estado=${filtro === "todos" ? "" : filtro}`)
      .then((d) => setCompras(d.compras || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const cargarPromos = () => {
    adminFetch("/api/admin/creditos/promo")
      .then((d) => setPromos(d.codigos || []))
      .catch((e) => toast.error(e.message));
  };

  useEffect(cargar, [filtro]);
  useEffect(cargarPromos, []);

  const limpiarForm = () => {
    setEditando(null);
    setNuevoCode("");
    setNuevoCreditos(2);
    setNuevoDiasCodigo(30);
    setNuevoDiasCredito(60);
  };

  // Al editar, los días de vigencia arrancan vacíos: son "días desde HOY", no
  // tiene sentido precargar un número viejo. Vacío = no tocar esa vigencia.
  const empezarEdicion = (p) => {
    setEditando(p.code);
    setNuevoCreditos(p.creditos);
    setNuevoDiasCodigo("");
    setNuevoDiasCredito("");
  };

  const crearPromo = async () => {
    const code = nuevoCode.trim().toUpperCase();
    if (!code || !nuevoCreditos) return toast.error("Código y créditos son requeridos");
    try {
      await adminFetch("/api/admin/creditos/promo", {
        method: "POST",
        body: JSON.stringify({
          code, creditos: Number(nuevoCreditos), uso: "flipping", max_usos: 100,
          dias_vigencia_codigo: Number(nuevoDiasCodigo) || 0,
          dias_vigencia_credito: Number(nuevoDiasCredito) || 0,
        }),
      });
      toast.success("Código creado");
      limpiarForm();
      cargarPromos();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const guardarEdicion = async () => {
    const cambios = { creditos: Number(nuevoCreditos) };
    if (nuevoDiasCodigo !== "") cambios.dias_vigencia_codigo = Number(nuevoDiasCodigo);
    if (nuevoDiasCredito !== "") cambios.dias_vigencia_credito = Number(nuevoDiasCredito);
    try {
      await adminFetch(`/api/admin/creditos/promo/${editando}/editar`, {
        method: "POST",
        body: JSON.stringify(cambios),
      });
      toast.success("Código actualizado");
      limpiarForm();
      cargarPromos();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const desactivarPromo = async (code) => {
    try {
      await adminFetch(`/api/admin/creditos/promo/${code}/desactivar`, { method: "POST" });
      toast.success("Código desactivado");
      cargarPromos();
    } catch (e) {
      toast.error(e.message);
    }
  };

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

        <PageHeader icon={Ticket} title="Códigos de prueba" subtitle="Créditos gratis para nuevos usuarios (1 código por usuario, de por vida)" />
        <AdminCard>
          <div className="p-4 flex items-end gap-2 border-b border-slate-100 flex-wrap">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Código</label>
              <input
                value={nuevoCode}
                onChange={(e) => setNuevoCode(e.target.value)}
                placeholder="BIENVENIDA5"
                disabled={!!editando}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-40 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Créditos</label>
              <input
                type="number"
                value={nuevoCreditos}
                onChange={(e) => setNuevoCreditos(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-20"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1" title="Días que el código se puede canjear desde hoy">
                Vigencia código (días)
              </label>
              <input
                type="number"
                value={nuevoDiasCodigo}
                onChange={(e) => setNuevoDiasCodigo(e.target.value)}
                placeholder={editando ? "sin cambio" : "0 = sin límite"}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-32"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1" title="Días que dura el crédito una vez canjeado">
                Vigencia crédito (días)
              </label>
              <input
                type="number"
                value={nuevoDiasCredito}
                onChange={(e) => setNuevoDiasCredito(e.target.value)}
                placeholder={editando ? "sin cambio" : "0 = no vence"}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-32"
              />
            </div>
            <button
              onClick={editando ? guardarEdicion : crearPromo}
              className="px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-sm font-medium"
            >
              {editando ? "Guardar cambios" : "Crear código"}
            </button>
            {editando && (
              <button onClick={limpiarForm} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500">
                Cancelar
              </button>
            )}
          </div>
          {promos.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Sin códigos creados</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {promos.map((p) => (
                <div key={p.code} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[#1B4332]">{p.code}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.creditos} créditos ({p.uso}) · usado {p.usados}/{p.max_usos} veces
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Código {p.expira_en ? `vence ${new Date(p.expira_en).toLocaleDateString("es-MX")}` : "sin vencimiento"}
                      {" · "}
                      Crédito {p.dias_vigencia_credito ? `dura ${p.dias_vigencia_credito} días` : "no vence"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.activo ? "Activo" : "Desactivado"}
                    </span>
                    <button
                      onClick={() => empezarEdicion(p)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {p.activo && (
                      <button
                        onClick={() => desactivarPromo(p.code)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                        title="Desactivar"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
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
