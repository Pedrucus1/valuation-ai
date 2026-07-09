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

// Estado de conservación (escala, sin remodelación — eso es un eje aparte).
const CONSERVACIONES = [
  "Nuevo", "Excelente", "Bueno", "Regular Bueno", "Regular", "Regular Malo", "Malo", "Muy Malo",
];
// Grado de remodelación → con el año calcula la edad efectiva ponderada.
const GRADOS_REMOD = [
  { value: "ligera", label: "Ligera / cosmética (pintura, pisos, un baño o cocina)" },
  { value: "basica", label: "Básica (acabados completos)" },
  { value: "intermedia", label: "Intermedia (acabados + instalaciones)" },
  { value: "completa", label: "Completa (+ estructura, casi nueva)" },
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

// PINCALI guarda la URL en inglés (/en/home/) porque el enricher del servidor
// recibe 422 en español; pero en el navegador la versión ES abre bien. Para el
// humano mostramos siempre el link en español.
const linkEs = (url) => (url || "").replace("/en/home/", "/inmueble/");

// Clase de etiqueta de campo (reutilizada en cada control del formulario)
const LBL = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1";
// Cajas con gris un poco más contrastante (menos pálido) que resalta sobre la ficha blanca
const INP = "h-9 text-sm bg-slate-100 border-slate-200 focus:bg-white";

// Convierte un rango de edad a los años calendario que representa (año en curso).
const yearSpan = (v) => {
  const y = new Date().getFullYear();
  if (v === "nuevo") return `${y}`;
  if (v === "50+") return `antes de ${y - 50}`;
  const [a, b] = v.split("-").map(Number);
  return `${y - b}–${y - a}`;
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
  const [hechos, setHechos] = useState({});         // id_unico -> guardado
  const [puntos, setPuntos] = useState(null);
  // Campos por fila (id_unico -> valor)
  const [edadRango, setEdadRango] = useState({});   // año construcción por rango
  const [anioConst, setAnioConst] = useState({});   // año construcción exacto
  const [conserv, setConserv]     = useState({});   // estado de conservación
  const [remodGrado, setRemodGrado] = useState({}); // grado de remodelación
  const [remodAnio, setRemodAnio]   = useState({}); // año de remodelación
  const [guardando, setGuardando]   = useState({}); // id -> bool
  const set = (setter) => (id, v) => setter(prev => ({ ...prev, [id]: v }));

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

  const saltar = (it) => setHechos(prev => ({ ...prev, [it.id_unico]: "no_se" }));

  const guardar = async (it) => {
    const id = it.id_unico;
    const body = { id_unico: id };
    if (conjuntos[id]) body.conjunto = conjuntos[id];
    if (anioConst[id]) body.anio_exacto = Number(anioConst[id]);
    else if (edadRango[id]) body.edad_rango = edadRango[id];
    if (conserv[id]) body.conservacion = conserv[id];
    if (remodGrado[id]) {
      body.grado_remodelacion = remodGrado[id];
      if (remodAnio[id]) body.anio_remodelacion = Number(remodAnio[id]);
    }
    if (!body.anio_exacto && !body.edad_rango && !body.conservacion && !body.grado_remodelacion) {
      toast.error("Indica al menos edad, conservación o remodelación");
      return;
    }
    set(setGuardando)(id, true);
    try {
      const res = await fetch(`${API}/edad-estimada`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHechos(prev => ({ ...prev, [id]: true }));
      if (data.puntos != null) setPuntos(data.puntos);
      toast.success(
        data.edad_efectiva != null
          ? `Guardado. Edad efectiva estimada: ${data.edad_efectiva} años`
          : "Guardado. ¡Gracias!"
      );
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      set(setGuardando)(id, false);
    }
  };

  const pendientes = items.filter(it => !hechos[it.id_unico]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
          {pendientes.map(it => (
            <Card key={it.id_unico} className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              {/* Encabezado de la propiedad */}
              <div className="px-4 pt-3 pb-2.5 bg-gradient-to-r from-[#EAF3EE] to-[#F4F8F6] border-b border-slate-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[#1B4332] font-semibold text-sm">
                      <MapPin className="w-4 h-4 text-[#52B788] shrink-0" />
                      <span className="truncate">{it.colonia || "Sin colonia"}</span>
                    </div>
                    {it.calle_numero && <p className="text-xs text-slate-500 mt-0.5 truncate">{it.calle_numero}</p>}
                  </div>
                  {it.url_original?.startsWith("http") && (
                    <a href={linkEs(it.url_original)} target="_blank" rel="noopener noreferrer"
                       className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-white bg-[#52B788] hover:bg-[#40916C] rounded-full px-2.5 py-1">
                      Ver <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{it.tipo_propiedad}</span>
                  {it.precio ? <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{formatCurrency(it.precio)}</span> : null}
                  {it.m2_construccion ? <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{it.m2_construccion} m²</span> : null}
                </div>
              </div>

              {/* Formulario de estimación */}
              <div className="p-4 space-y-2.5">
                {/* Edad de construcción: rango + año exacto */}
                <div>
                  <label className={LBL}>Edad de construcción</label>
                  <div className="flex gap-2">
                    <Select value={edadRango[it.id_unico] || ""} onValueChange={v => set(setEdadRango)(it.id_unico, v)}>
                      <SelectTrigger className={INP + " flex-1"}><SelectValue placeholder="Rango" /></SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label} <span className="text-slate-400">· {yearSpan(r.value)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1900" max={new Date().getFullYear()} placeholder="Año"
                           value={anioConst[it.id_unico] || ""} onChange={e => set(setAnioConst)(it.id_unico, e.target.value)}
                           className={INP + " w-16"} title="Año exacto si lo sabes" />
                  </div>
                </div>
                {/* Remodelación: grado + año + leyenda de grados */}
                <div>
                  <label className={LBL}>Remodelación <span className="normal-case font-normal text-slate-400">(si aplica)</span></label>
                  <div className="flex gap-2">
                    <Select value={remodGrado[it.id_unico] || ""} onValueChange={v => set(setRemodGrado)(it.id_unico, v)}>
                      <SelectTrigger className={INP + " flex-1"}><SelectValue placeholder="Grado" /></SelectTrigger>
                      <SelectContent>
                        {GRADOS_REMOD.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1900" max={new Date().getFullYear()} placeholder="Año"
                           value={remodAnio[it.id_unico] || ""} onChange={e => set(setRemodAnio)(it.id_unico, e.target.value)}
                           className={INP + " w-16"} title="Año de la remodelación" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Ligera: pintura/pisos · Básica: acabados · Intermedia: +instalaciones · Completa: +estructura
                  </p>
                </div>
                {/* Conservación + Conjunto en una fila (cajas más chicas) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={LBL}>Conservación</label>
                    <Select value={conserv[it.id_unico] || ""} onValueChange={v => set(setConserv)(it.id_unico, v)}>
                      <SelectTrigger className={INP}><SelectValue placeholder="Estado" /></SelectTrigger>
                      <SelectContent>
                        {CONSERVACIONES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={LBL}>Coto / conjunto</label>
                    <Input value={conjuntos[it.id_unico] || ""}
                           onChange={e => setConjuntos(prev => ({ ...prev, [it.id_unico]: e.target.value }))}
                           placeholder="Opcional" className={INP} />
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex justify-end gap-2 pt-2.5 mt-0.5 border-t border-slate-100">
                  <Button onClick={() => saltar(it)} variant="outline"
                          className="h-9 border-slate-300 text-slate-500 hover:bg-slate-50">No sé</Button>
                  <Button onClick={() => guardar(it)} disabled={guardando[it.id_unico]}
                          className="h-9 px-6 bg-[#52B788] hover:bg-[#40916C] text-white shadow-sm">
                    {guardando[it.id_unico] ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
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
