import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Search, TrendingUp, MapPin, BarChart2 } from "lucide-react";
import { API } from "@/App";

const PROPERTY_TYPES = ["Casa", "Departamento", "Terreno", "Local comercial", "Oficina", "Bodega"];

const fmt = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(v);

const HistoricoPage = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    state: "", municipality: "", neighborhood: "", property_type: "",
  });

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const fetchData = async (pg = 1) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 20 });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    try {
      const [resData, statsData] = await Promise.all([
        fetch(`${API}/historico?${params}`).then(r => r.ok ? r.json() : { results: [], total: 0, pages: 1 }),
        fetch(`${API}/historico/stats?${params}`).then(r => r.ok ? r.json() : null),
      ]);
      setResults(resData.results || []);
      setTotal(resData.total || 0);
      setTotalPages(resData.pages || 1);
      setStats(statsData);
      setPage(pg);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => { fetchData(1); }, []);

  const handleSearch = (e) => { e.preventDefault(); fetchData(1); };

  const confidenceColor = (lvl) =>
    lvl === "ALTO" ? "bg-[#D9ED92] text-[#1B4332]" :
    lvl === "MEDIO" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/")} className="text-[#1B4332] -ml-3 mb-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Inicio
            </Button>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-[#1B4332]" />
              <h1 className="font-['Outfit'] text-xl font-bold text-[#1B4332]">Base de Datos Histórica</h1>
            </div>
          </div>
          <Button onClick={() => navigate("/valuar")} className="bg-[#52B788] hover:bg-[#40916C] text-white gap-2">
            Nueva Valuación
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Búsqueda y filtros */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                value={filters.state}
                onChange={e => setF("state", e.target.value)}
                placeholder="Estado"
                className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              />
              <input
                value={filters.municipality}
                onChange={e => setF("municipality", e.target.value)}
                placeholder="Municipio"
                className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              />
              <input
                value={filters.neighborhood}
                onChange={e => setF("neighborhood", e.target.value)}
                placeholder="Colonia"
                className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40"
              />
              <select
                value={filters.property_type}
                onChange={e => setF("property_type", e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#52B788]/40 text-slate-600"
              >
                <option value="">Todos los tipos</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Button type="submit" disabled={isLoading} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white gap-2">
                <Search className="w-4 h-4" />
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Estadísticas de mercado */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Valuaciones" value={stats.total.toLocaleString("es-MX")} icon="📊" />
            <StatCard label="Valor Promedio" value={fmt(stats.value_stats?.avg || 0)} icon="💰" />
            <StatCard label="Valor Mediana" value={fmt(stats.value_stats?.median || 0)} icon="📈" />
            <StatCard label="$/m² Promedio" value={stats.psqm_stats ? fmt(stats.psqm_stats.avg) : "—"} icon="📐" />
          </div>
        )}

        {/* Top colonias */}
        {stats?.top_neighborhoods?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#52B788]" />
                <p className="text-sm font-bold text-slate-700">Colonias con mayor precio por m²</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.top_neighborhoods.slice(0, 8).map(n => (
                  <div key={n.name} className="flex items-center gap-2 bg-[#f0faf4] border border-[#b7e4c7] rounded-xl px-3 py-2">
                    <MapPin className="w-3 h-3 text-[#52B788]" />
                    <span className="text-xs font-semibold text-[#1B4332]">{n.name}</span>
                    <span className="text-xs text-slate-500">{fmt(n.avg_psqm)}/m²</span>
                    <span className="text-xs text-slate-400">({n.count})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Por tipo de propiedad */}
        {stats?.by_property_type?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.by_property_type.map(t => (
              <Card key={t.type} className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">{t.type}</p>
                  <p className="font-bold text-[#1B4332] text-sm">{fmt(t.avg_value)}</p>
                  <p className="text-xs text-slate-400">promedio</p>
                  <Badge variant="secondary" className="mt-1 text-xs">{t.count} avalúos</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabla de resultados */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">
                {total > 0 ? `${total.toLocaleString("es-MX")} valuaciones encontradas` : "Sin resultados"}
              </p>
              {total > 0 && (
                <p className="text-xs text-slate-400">Página {page} de {totalPages}</p>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="spinner"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <BarChart2 className="w-10 h-10 mb-3" />
                <p className="text-sm">No hay datos para los filtros seleccionados.</p>
                <p className="text-xs mt-1">Intenta ampliar tu búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold">Ubicación</th>
                      <th className="text-right px-4 py-3 font-semibold">m²</th>
                      <th className="text-right px-4 py-3 font-semibold">Valor estimado</th>
                      <th className="text-right px-4 py-3 font-semibold">$/m²</th>
                      <th className="text-center px-4 py-3 font-semibold">Confianza</th>
                      <th className="text-center px-4 py-3 font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{v.property_type}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="font-medium">{v.neighborhood}</span>
                          <span className="text-slate-400">, {v.municipality}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {v.construction_area}
                          {v.land_area && v.land_area !== v.construction_area
                            ? <span className="text-xs text-slate-400 block">T: {v.land_area}</span>
                            : null}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1B4332]">
                          {fmt(v.estimated_value)}
                          <span className="block text-xs text-slate-400 font-normal">
                            {fmt(v.value_range_min)} – {fmt(v.value_range_max)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{v.price_per_sqm ? fmt(v.price_per_sqm) : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`text-xs ${confidenceColor(v.confidence_level)}`}>
                            {v.confidence_level}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400">
                          {new Date(v.created_at).toLocaleDateString("es-MX")}
                          {v.requires_recovery_fee && (
                            <span className="block text-amber-500 font-semibold">+$80 MXN acceso</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-slate-100">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchData(page - 1)}
                  className="border-slate-200 text-slate-600">← Anterior</Button>
                <span className="text-xs text-slate-500">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchData(page + 1)}
                  className="border-slate-200 text-slate-600">Siguiente →</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="font-['Outfit'] font-bold text-[#1B4332] text-sm">{value}</p>
    </CardContent>
  </Card>
);

export default HistoricoPage;
