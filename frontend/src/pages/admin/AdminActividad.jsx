import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { adminFetch } from "@/lib/adminFetch";
import {
  ScrollText, RefreshCw, Search, ChevronLeft, ChevronRight,
  AlertCircle, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/AdminUI";

const TIPO_CFG = {
  error:  { label: "Error",  cls: "bg-red-100 text-red-600",   icon: <AlertCircle className="w-3.5 h-3.5" /> },
  evento: { label: "Evento", cls: "bg-blue-100 text-blue-700", icon: <Info className="w-3.5 h-3.5" /> },
};

const STATUS_CLS = (status) => {
  if (!status) return "text-slate-400";
  if (status >= 500) return "text-red-600 font-bold";
  if (status >= 400) return "text-orange-500 font-semibold";
  return "text-green-600";
};

const fmtFecha = (ts) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-MX", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return ts;
  }
};

const AdminActividad = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [skip, setSkip] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const limit = 50;

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const params = new URLSearchParams({ skip, limit });
      if (tipo) params.set("tipo", tipo);
      if (q) params.set("q", q);
      const data = await adminFetch(`/api/admin/activity-log?${params}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [tipo, q, skip]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setSkip(0); }, [tipo, q]);

  const buscar = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(skip / limit) + 1;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <PageHeader icon={ScrollText} title="Log de actividad"
          subtitle="Errores de backend y eventos clave de negocio, sin depender de Railway" />

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {[{ id: "", label: "Todos" }, { id: "error", label: "Errores" }, { id: "evento", label: "Eventos" }].map((t) => (
              <button key={t.id} onClick={() => setTipo(t.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  tipo === t.id ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>{t.label}</button>
            ))}
          </div>
          <form onSubmit={buscar} className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar en endpoint, mensaje o email…"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#52B788] w-72" />
          </form>
          <button onClick={cargar}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#52B788] text-[#1B4332] hover:bg-[#52B788]/10 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            Error: {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#B7E4C7] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#B7E4C7] bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
            <span className="text-sm font-semibold text-white">
              {cargando ? "Cargando…" : `${total.toLocaleString()} registros`}
            </span>
            <span className="text-xs text-white/60">Página {page} de {totalPages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F]">
                  {["Fecha", "Tipo", "Usuario", "Endpoint", "Status", "Mensaje"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cargando && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-3 py-2.5">
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                  </td></tr>
                ))}
                {!cargando && items.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                    {error ? "—" : "Sin registros para este filtro"}
                  </td></tr>
                )}
                {!cargando && items.map((item, i) => {
                  const key = `${item.ts || ""}-${i}`;
                  const abierto = expandido === key;
                  const esError = item.tipo === "error";
                  const cfg = TIPO_CFG[item.tipo] || TIPO_CFG.evento;
                  return (
                    <React.Fragment key={key}>
                      <tr
                        onClick={() => esError && setExpandido(abierto ? null : key)}
                        className={`transition-colors ${esError ? "cursor-pointer hover:bg-red-50/40" : "hover:bg-slate-50/60"}`}>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtFecha(item.ts)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate" title={item.email || ""}>
                          {item.email || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate font-mono" title={item.path || ""}>
                          {item.method ? `${item.method} ` : ""}{item.path || "—"}
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap ${STATUS_CLS(item.status)}`}>
                          {item.status ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-[320px] truncate" title={esError ? "" : (item.mensaje || "")}>
                          <span className="flex items-center gap-1.5">
                            {esError && (abierto ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />)}
                            <span className="truncate">{item.mensaje || "—"}</span>
                          </span>
                        </td>
                      </tr>
                      {esError && abierto && (
                        <tr>
                          <td colSpan={6} className="px-3 py-3 bg-red-50/40 border-t border-red-100">
                            <pre className="text-[11px] text-red-700 whitespace-pre-wrap break-words font-mono max-h-80 overflow-y-auto">
                              {item.mensaje || "Sin detalle"}
                            </pre>
                            <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-slate-400">
                              {item.ip && <span>IP: {item.ip}</span>}
                              {item.duration_ms != null && <span>Duración: {item.duration_ms} ms</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#B7E4C7]">
              <button onClick={() => setSkip((s) => Math.max(0, s - limit))} disabled={skip === 0}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#1B4332] disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-xs text-slate-400">{page} / {totalPages}</span>
              <button onClick={() => setSkip((s) => (page < totalPages ? s + limit : s))} disabled={page >= totalPages}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#1B4332] disabled:opacity-30">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminActividad;
