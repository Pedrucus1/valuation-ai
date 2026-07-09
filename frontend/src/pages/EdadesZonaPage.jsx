import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, ArrowLeft, ExternalLink, MapPin, Search, Check, Award } from "lucide-react";
import { API } from "@/App";

// Rangos finos (Ross-Heidecke). "No sé" salta sin escribir.
const AGE_RANGES = [
  { value: "nuevo", label: "Nuevo" },
  { value: "1-5", label: "1–5 años" },
  { value: "6-10", label: "6–10 años" },
  { value: "11-15", label: "11–15 años" },
  { value: "16-20", label: "16–20 años" },
  { value: "21-25", label: "21–25 años" },
  { value: "26-30", label: "26–30 años" },
  { value: "31-35", label: "31–35 años" },
  { value: "36-40", label: "36–40 años" },
  { value: "41-45", label: "41–45 años" },
  { value: "46-50", label: "46–50 años" },
  { value: "50+", label: "50+ años" },
];

const MUNICIPIOS = [
  "Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá",
  "Tlajomulco de Zúñiga", "Chapala", "Ajijic", "El Salto",
];
const TIPOS = ["Casa", "Departamento", "Terreno", "Local", "Oficina"];

// Headers: si hay token admin en localStorage, mandarlo (el panel sirve para
// valuador/inmobiliaria vía cookie de sesión, y para super_admin vía X-Admin-Token).
const authHeaders = (extra = {}) => {
  const h = { ...extra };
  try {
    const t = JSON.parse(localStorage.getItem("pv_admin") || "{}")?.token;
    if (t) h["X-Admin-Token"] = t;
  } catch { /* noop */ }
  return h;
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
};

const EdadesZonaPage = () => {
  const navigate = useNavigate();
  const [municipio, setMunicipio] = useState("");
  const [colonia, setColonia] = useState("");
  const [tipo, setTipo] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [conjuntos, setConjuntos] = useState({});   // id_unico -> texto conjunto
  const [hechos, setHechos] = useState({});         // id_unico -> edad guardada
  const [puntos, setPuntos] = useState(null);

  const buscar = async () => {
    setLoading(true);
    setBuscado(true);
    try {
      const params = new URLSearchParams();
      if (municipio) params.set("municipio", municipio);
      if (colonia) params.set("colonia", colonia.trim());
      if (tipo) params.set("tipo", tipo);
      params.set("limit", "40");
      const res = await fetch(`${API}/comps-sin-edad?${params}`, { credentials: "include", headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error("Error al buscar propiedades");
    } finally {
      setLoading(false);
    }
  };

  // rango: clave de AGE_RANGES ("no_se" = saltar). anioExacto: año tecleado (prioridad).
  const guardar = async (it, { rango, anioExacto } = {}) => {
    if (rango === "no_se") {                     // válido: no escribe, solo pasa
      setHechos(prev => ({ ...prev, [it.id_unico]: "no_se" }));
      return;
    }
    const body = { id_unico: it.id_unico, conjunto: conjuntos[it.id_unico] || null };
    if (anioExacto) body.anio_exacto = Number(anioExacto);
    else if (rango) body.edad_rango = rango;
    else return;
    try {
      const res = await fetch(`${API}/edad-estimada`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHechos(prev => ({ ...prev, [it.id_unico]: anioExacto || rango }));
      if (data.puntos != null) setPuntos(data.puntos);
      toast.success("Edad guardada. ¡Gracias!");
    } catch {
      toast.error("No se pudo guardar");
    }
  };

  const pendientes = items.filter(it => !hechos[it.id_unico]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-[#1B4332] hover:bg-[#D9ED92]/30">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#1B4332]" />
            <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332]">Edades por zona</h1>
          </div>
          {puntos != null && (
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4332] bg-[#D9ED92]/40 border border-[#52B788]/40 rounded-full px-3 py-1">
              <Award className="w-4 h-4 text-[#52B788]" /> {puntos} pts
            </div>
          )}
        </div>
        <p className="text-slate-600 mb-6 text-sm">
          Estima la edad de propiedades sin dato en la zona que conoces. Mejora la base para futuros comparables.
        </p>

        {/* Filtros */}
        <Card className="bg-white shadow-sm border-0 mb-6">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Municipio</label>
              <Select value={municipio} onValueChange={setMunicipio}>
                <SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {MUNICIPIOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Colonia</label>
              <Input value={colonia} onChange={e => setColonia(e.target.value)}
                     placeholder="Ej. Providencia" className="h-9 w-52 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={buscar} disabled={loading}
                    className="bg-[#52B788] hover:bg-[#40916C] text-white h-9">
              <Search className="w-4 h-4 mr-2" /> {loading ? "Buscando..." : "Buscar"}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {buscado && !loading && pendientes.length === 0 && (
          <p className="text-center text-slate-500 py-10">
            {items.length === 0 ? "No hay propiedades sin edad con esos filtros." : "¡Listo! Etiquetaste todas. 🎉"}
          </p>
        )}

        <div className="space-y-3">
          {pendientes.map(it => (
            <Card key={it.id_unico} className="bg-white shadow-sm border-0">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[#1B4332] font-semibold">
                    <MapPin className="w-4 h-4 text-[#52B788] shrink-0" />
                    <span className="truncate">{it.colonia || "Sin colonia"}</span>
                  </div>
                  {it.calle_numero && <p className="text-xs text-slate-500 mt-0.5 truncate">{it.calle_numero}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">
                    {it.tipo_propiedad} · {formatCurrency(it.precio)}
                    {it.m2_construccion ? ` · ${it.m2_construccion} m²` : ""}
                  </p>
                  {it.url_original?.startsWith("http") && (
                    <a href={it.url_original} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-[#52B788] hover:underline inline-flex items-center gap-1 mt-1">
                      ver anuncio (foto/mapa) <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    value={conjuntos[it.id_unico] || ""}
                    onChange={e => setConjuntos(prev => ({ ...prev, [it.id_unico]: e.target.value }))}
                    placeholder="Coto / conjunto (opcional)"
                    className="h-9 w-full sm:w-44 text-sm"
                  />
                  <Input
                    type="number" min="1900" max={new Date().getFullYear()}
                    placeholder="Año exacto"
                    className="h-9 w-full sm:w-28 text-sm"
                    title="Año exacto si lo sabes"
                    onKeyDown={e => { if (e.key === "Enter" && e.target.value) guardar(it, { anioExacto: e.target.value }); }}
                    onBlur={e => { if (e.target.value) guardar(it, { anioExacto: e.target.value }); }}
                  />
                  <Select onValueChange={v => guardar(it, { rango: v })}>
                    <SelectTrigger className="h-9 w-full sm:w-36 text-sm border-[#52B788] text-[#1B4332] font-semibold">
                      <SelectValue placeholder="¿Edad?" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      <SelectItem value="no_se" className="text-slate-400">No sé (saltar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confirmados */}
        {Object.keys(hechos).length > 0 && (
          <p className="text-center text-xs text-[#52B788] font-semibold mt-6 inline-flex items-center gap-1 w-full justify-center">
            <Check className="w-4 h-4" /> {Object.keys(hechos).length} propiedades etiquetadas esta sesión
          </p>
        )}
      </div>
    </div>
  );
};

export default EdadesZonaPage;
