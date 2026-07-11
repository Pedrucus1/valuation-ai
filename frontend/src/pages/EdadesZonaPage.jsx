import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { Building2, ArrowLeft, ExternalLink, MapPin, Search, Check, Award, ChevronsUpDown, AlertTriangle } from "lucide-react";
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
  { value: "51-60", label: "51–60 años" },
  { value: "61-70", label: "61–70 años" },
  { value: "71-80", label: "71–80 años" },
  { value: "80+", label: "80+ años" },
];

// Estado de conservación (escala, sin remodelación — eso es un eje aparte).
const CONSERVACIONES = [
  "Nuevo", "Excelente", "Bueno", "Regular Bueno", "Regular", "Regular Malo", "Malo", "Muy Malo",
];
// Grado de remodelación → con el año calcula la edad efectiva ponderada.
const GRADOS_REMOD = [
  { value: "ligera", label: "Ligera / cosmética", hint: "(pintura, pisos, un baño o cocina)" },
  { value: "basica", label: "Básica", hint: "(acabados completos)" },
  { value: "intermedia", label: "Intermedia", hint: "(acabados + instalaciones)" },
  { value: "completa", label: "Completa", hint: "(+ estructura, casi nueva)" },
];
// Rango de antigüedad de la remodelación (si no se sabe el año exacto). Una
// remodelación relevante es reciente → tope 30 años. `mid` = punto medio en años,
// se convierte a año = añoActual − mid.
const REMOD_RANGES = [
  { value: "reciente", label: "Reciente (< 1 año)", mid: 0 },
  { value: "1-5",   label: "1–5 años",   mid: 3 },
  { value: "6-10",  label: "6–10 años",  mid: 8 },
  { value: "11-15", label: "11–15 años", mid: 13 },
  { value: "16-20", label: "16–20 años", mid: 18 },
  { value: "21-25", label: "21–25 años", mid: 23 },
  { value: "26-30", label: "26–30 años", mid: 28 },
];

const TIPOS = ["Casa", "Departamento", "Terreno", "Local", "Oficina"];
// Opciones para corregir el tipo scrapeado (valor en minúscula = como lo guarda el pool).
const TIPO_OPCIONES = [
  { v: "casa", l: "Casa" }, { v: "departamento", l: "Departamento" },
  { v: "terreno", l: "Terreno" }, { v: "local", l: "Local" },
  { v: "oficina", l: "Oficina" }, { v: "bodega", l: "Bodega" },
];

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
  if (v.endsWith("+")) return `antes de ${y - parseInt(v, 10)}`;
  const [a, b] = v.split("-").map(Number);
  return `${y - b}–${y - a}`;
};

// Agrupar variantes del mismo coto/colonia (ABIE Eco Hábitat ≈ Abié Residencial).
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
// Palabras genéricas de nombre de zona → NO agrupar solo por ellas (evita unir "Valle Real" con "Valle Imperial").
const GENERICO = new Set(["san", "santa", "las", "los", "el", "la", "valle", "lomas", "loma",
  "jardines", "jardin", "colonia", "col", "fracc", "fraccionamiento", "residencial", "coto",
  "real", "del", "de", "villa", "villas", "paseo", "paseos", "rincon", "puerta", "puertas"]);
const mismoGrupo = (a, b) => {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.split(" ")[0], tb = nb.split(" ")[0];
  return ta === tb && ta.length >= 4 && !GENERICO.has(ta);
};

const formatCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
};

const EdadesZonaPage = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [colonia, setColonia] = useState("");
  const [tipo, setTipo] = useState("");
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [coloniasOficiales, setColoniasOficiales] = useState([]); // SEPOMEX {nombre, cp}
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
  const [remodAnio, setRemodAnio]   = useState({}); // año de remodelación (exacto)
  const [remodRango, setRemodRango] = useState({}); // antigüedad remod por rango (si no hay año)
  const [remodOn, setRemodOn]       = useState({}); // id -> mostrar campos de remodelación
  const [guardando, setGuardando]   = useState({}); // id -> bool
  const [openCol, setOpenCol] = useState(false);    // popover del combo de colonia
  const [coloniaEdit, setColoniaEdit] = useState({}); // id -> colonia corregida
  const [tipoEdit, setTipoEdit] = useState({});       // id -> tipo corregido
  const [nivelEdit, setNivelEdit] = useState({});     // id -> nivel/piso (depto/local/oficina)
  const [retiradoChk, setRetiradoChk] = useState({}); // id -> anuncio retirado
  const [aplicarGrupo, setAplicarGrupo] = useState({}); // id -> aplicar al mismo coto
  const [coloniasExistentes, setColoniasExistentes] = useState([]); // nombres ya usados en la zona
  const [conjuntosExistentes, setConjuntosExistentes] = useState([]); // cotos ya usados en la zona

  // Otras pendientes del mismo coto/colonia (incluye variantes: ABIE Eco Hábitat ≈ Abié Residencial)
  const grupoDe = (it) => items.filter(o =>
    o.id_unico !== it.id_unico && !hechos[o.id_unico] && mismoGrupo(o.colonia, it.colonia));
  const set = (setter) => (id, v) => setter(prev => ({ ...prev, [id]: v }));

  // Mostrar/ocultar los campos de remodelación con un check; al desmarcar, limpiar
  // lo capturado para que no se envíe una remodelación fantasma.
  const toggleRemod = (id, v) => {
    set(setRemodOn)(id, v);
    if (!v) { set(setRemodGrado)(id, ""); set(setRemodRango)(id, ""); set(setRemodAnio)(id, ""); }
  };

  // Al elegir "Nuevo": conservación = Nuevo y año = año en curso (automático).
  const onEdadRango = (id, v) => {
    set(setEdadRango)(id, v);
    if (v === "nuevo") {
      set(setConserv)(id, "Nuevo");
      set(setAnioConst)(id, String(new Date().getFullYear()));
    }
  };

  // Cascada de zonas (nivel nacional, alimentada por los datos reales)
  const fetchZonas = async (params = {}) => {
    const qs = new URLSearchParams(params);
    try {
      const res = await fetch(`${API}/edad-zonas?${qs}`, { credentials: "include", headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).valores || [];
    } catch { return []; }
  };

  useEffect(() => {
    fetchZonas().then(es => {
      setEstados(es);
      if (es.length === 1) {            // sólo un estado con datos → seleccionarlo solo
        setEstado(es[0]);
        fetchZonas({ estado: es[0] }).then(setMunicipios);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEstado = (v) => {
    setEstado(v); setMunicipio(""); setColonia(""); setMunicipios([]); setColonias([]);
    fetchZonas({ estado: v }).then(setMunicipios);
  };
  const onMunicipio = (v) => {
    setMunicipio(v); setColonia(""); setColonias([]);
    fetchZonas({ estado, municipio: v }).then(setColonias);
    // Colonias oficiales SEPOMEX para sugerir al corregir
    fetch(`${API}/colonias-oficiales?municipio=${encodeURIComponent(v)}`, { credentials: "include", headers: authHeaders() })
      .then(r => r.ok ? r.json() : { colonias: [] })
      .then(d => setColoniasOficiales(d.colonias || []))
      .catch(() => setColoniasOficiales([]));
    // Nombres ya usados (colonia/coto) en la zona → autocompletar y homogenizar
    fetch(`${API}/nombres-zona?municipio=${encodeURIComponent(v)}`, { credentials: "include", headers: authHeaders() })
      .then(r => r.ok ? r.json() : { colonias: [], conjuntos: [] })
      .then(d => { setColoniasExistentes(d.colonias || []); setConjuntosExistentes(d.conjuntos || []); })
      .catch(() => { setColoniasExistentes([]); setConjuntosExistentes([]); });
  };

  const buscar = async () => {
    setLoading(true);
    setBuscado(true);
    try {
      const params = new URLSearchParams();
      if (estado) params.set("estado", estado);
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

  // Anticipar la búsqueda al elegir/limpiar colonia o tipo (con colonia puesta),
  // para ver al instante los otros tipos del fraccionamiento. El botón sigue.
  useEffect(() => {
    if (municipio && colonia) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colonia, tipo]);

  const saltar = (it) => setHechos(prev => ({ ...prev, [it.id_unico]: "no_se" }));

  const construirPayload = (it) => {
    const id = it.id_unico;
    const p = {};
    const colFix = (coloniaEdit[id] ?? "").trim();
    if (colFix && colFix !== it.colonia) {
      p.colonia = colFix;   // corrección de colonia
      const of = coloniasOficiales.find(c => c.nombre === colFix);   // si es oficial SEPOMEX, adjunta CP
      if (of?.cp) p.cp = of.cp;
    }
    if (conjuntos[id]) p.conjunto = conjuntos[id];
    if (tipoEdit[id] && tipoEdit[id] !== it.tipo_propiedad) p.tipo = tipoEdit[id];  // corrección de tipo
    if (nivelEdit[id] !== undefined && nivelEdit[id] !== "") p.nivel = Number(nivelEdit[id]);  // piso/nivel
    if (retiradoChk[id]) p.retirado = true;   // anuncio ya no publicado
    if (anioConst[id]) p.anio_exacto = Number(anioConst[id]);
    else if (edadRango[id]) p.edad_rango = edadRango[id];
    if (conserv[id]) p.conservacion = conserv[id];
    if (remodGrado[id]) {
      p.grado_remodelacion = remodGrado[id];
      if (remodAnio[id]) {
        p.anio_remodelacion = Number(remodAnio[id]);
      } else if (remodRango[id]) {
        const mid = REMOD_RANGES.find(r => r.value === remodRango[id])?.mid;
        if (mid != null) p.anio_remodelacion = new Date().getFullYear() - mid;
      }
    }
    return p;
  };

  const postEdad = async (id, payload) => {
    const res = await fetch(`${API}/edad-estimada`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ ...payload, id_unico: id }),
    });
    return res.ok ? res.json() : null;
  };

  // Propagar los mismos datos a otras propiedades del mismo coto/colonia (ABIE, etc.)
  const aplicarAOtras = async (payload, otras) => {
    let n = 0;
    for (const o of otras) {
      const ok = await postEdad(o.id_unico, payload);
      if (ok) { setHechos(prev => ({ ...prev, [o.id_unico]: true })); n++; }
    }
    toast.success(`Aplicado a ${n} más`);
  };

  const guardar = async (it) => {
    const id = it.id_unico;
    const payload = construirPayload(it);
    if (!payload.anio_exacto && !payload.edad_rango && !payload.conservacion && !payload.grado_remodelacion && !payload.colonia && !payload.tipo && !payload.retirado && payload.nivel === undefined) {
      toast.error("Indica al menos edad, conservación, remodelación, colonia, tipo, nivel o retiro");
      return;
    }
    set(setGuardando)(id, true);
    try {
      const data = await postEdad(id, payload);
      if (!data) throw new Error();
      setHechos(prev => ({ ...prev, [id]: true }));
      if (data.puntos != null) setPuntos(data.puntos);
      const base = data.edad_efectiva != null ? `Guardado · edad efectiva ${data.edad_efectiva} años` : "Guardado ✓";
      toast.success(base);
      // Si el perito marcó "aplicar al grupo", propagar a las variantes del mismo coto
      if (aplicarGrupo[id]) {
        const otras = grupoDe(it);
        if (otras.length) await aplicarAOtras(payload, otras);
      }
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      set(setGuardando)(id, false);
    }
  };

  // Reporte de un clic: los datos de esta propiedad son incorrectos/basura →
  // se excluye de la búsqueda de comparables (activo=False) para que no meta ruido.
  const marcarBasura = async (it) => {
    const id = it.id_unico;
    if (!window.confirm("¿Marcar esta propiedad como información incorrecta? Se excluirá de la búsqueda de comparables para que no meta ruido.")) return;
    set(setGuardando)(id, true);
    try {
      const data = await postEdad(id, { datos_basura: true });
      if (!data) throw new Error();
      setHechos(prev => ({ ...prev, [id]: true }));
      toast.success("Reportada como datos incorrectos · excluida de comparables");
    } catch {
      toast.error("No se pudo reportar");
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
            <div>
              <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332] leading-tight">Verificación de Datos por Zona</h1>
              <p className="text-sm font-semibold text-[#52B788]">Verifica y Gana</p>
            </div>
          </div>
          {puntos != null && (
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4332] bg-[#D9ED92]/40 border border-[#52B788]/40 rounded-full px-3 py-1">
              <Award className="w-4 h-4 text-[#52B788]" /> {puntos} pts
            </div>
          )}
        </div>
        {/* Beneficio: qué se gana y en qué se convierte */}
        <div className="mb-6 rounded-xl bg-gradient-to-r from-[#EAF3EE] to-[#F4F8F6] border border-[#B7E4C7] p-4">
          <p className="text-sm text-[#1B4332] font-semibold mb-1">Ayuda a completar los datos de tu zona y gana puntos 🎯</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tú conoces las colonias mejor que nadie. Corrige o completa la información de estas
            propiedades (edad, colonia, tipo, nivel, estado de conservación) o marca las que ya no están publicadas.
            <b> Cada propiedad que verificas suma 1 punto</b>. Al llegar a <b>150 puntos ganas una opinión de valor gratis</b> (valor $320).
            De paso, haces más preciso el mercado que todos usamos.
          </p>
        </div>

        {/* Filtros */}
        <Card className="bg-white shadow-sm border-0 mb-6">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Estado</label>
              <Select value={estado} onValueChange={onEstado}>
                <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Municipio</label>
              <Select value={municipio} onValueChange={onMunicipio} disabled={!estado}>
                <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="Municipio" /></SelectTrigger>
                <SelectContent>
                  {municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Colonia</label>
              <Popover open={openCol} onOpenChange={setOpenCol}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" disabled={!municipio}
                          className="h-9 w-56 justify-between text-sm font-normal">
                    <span className="truncate">{colonia || (municipio ? "Todas las colonias" : "Elige municipio")}</span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={`Buscar en ${colonias.length} colonias…`} />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__todas" onSelect={() => { setColonia(""); setOpenCol(false); }}>
                          <Check className={`w-4 h-4 mr-2 ${colonia === "" ? "opacity-100" : "opacity-0"}`} />Todas
                        </CommandItem>
                        {colonias.map(c => (
                          <CommandItem key={c} value={c} onSelect={() => { setColonia(c); setOpenCol(false); }}>
                            <Check className={`w-4 h-4 mr-2 ${colonia === c ? "opacity-100" : "opacity-0"}`} />{c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Tipo</label>
              <Select value={tipo || "__todos"} onValueChange={v => setTipo(v === "__todos" ? "" : v)}>
                <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos">Todos los tipos</SelectItem>
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

        {/* Colonias: oficiales SEPOMEX + nombres YA usados en la zona (fraccionamientos
            no oficiales) — compartido por todas las fichas para autocompletar y homogenizar. */}
        <datalist id="col-oficiales">
          {coloniasOficiales.map(c => <option key={"of" + c.nombre + c.cp} value={c.nombre}>{c.cp}</option>)}
          {coloniasExistentes
            .filter(n => !coloniasOficiales.some(o => norm(o.nombre) === norm(n)))
            .map(n => <option key={"ex" + n} value={n} />)}
        </datalist>
        {/* Cotos/conjuntos/edificios ya usados en la zona → elegir uno existente
            en vez de inventar variantes ('Albaterra' vs 'Fracc. Albaterra'). */}
        <datalist id="conj-existentes">
          {conjuntosExistentes.map(n => <option key={n} value={n} />)}
        </datalist>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
          {items.map(it => hechos[it.id_unico] ? (
            /* Ficha bloqueada tras guardar / saltar */
            <Card key={it.id_unico} className="bg-[#F0F7F3] border border-[#52B788]/40 rounded-xl">
              <div className="px-4 py-3 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hechos[it.id_unico] === "no_se" ? "bg-slate-200" : "bg-[#52B788]"}`}>
                  <Check className={`w-5 h-5 ${hechos[it.id_unico] === "no_se" ? "text-slate-500" : "text-white"}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#1B4332] truncate">{it.colonia}</p>
                  <p className="text-xs text-slate-500">{hechos[it.id_unico] === "no_se" ? "Saltada" : "Guardado"}</p>
                </div>
              </div>
            </Card>
          ) : (
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
                {/* Corregir colonia (si el dato vino mal, ej. viene el coto como colonia) */}
                <div>
                  <label className={LBL}>Colonia <span className="normal-case font-normal text-slate-400">(oficial SEPOMEX — corrige si está mal)</span></label>
                  <Input value={coloniaEdit[it.id_unico] ?? it.colonia ?? ""}
                         onChange={e => set(setColoniaEdit)(it.id_unico, e.target.value)}
                         list="col-oficiales" placeholder="Colonia oficial" className={INP} />
                  {(() => {
                    // Chips de "misma zona": si el nombre scrapeado está mal pero el CP
                    // es correcto, sugieren las otras colonias oficiales de ese mismo CP
                    // para elegir la correcta de un clic (atajo, no obligatorio).
                    const actual = coloniaEdit[it.id_unico] ?? it.colonia ?? "";
                    const cpAncla = String(it.codigo_postal
                      || coloniasOficiales.find(c => norm(c.nombre) === norm(actual))?.cp || "");
                    if (!cpAncla) return null;
                    const mismas = coloniasOficiales
                      .filter(c => String(c.cp) === cpAncla && norm(c.nombre) !== norm(actual))
                      .slice(0, 8);
                    if (!mismas.length) return null;
                    return (
                      <div className="mt-1.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Otras colonias del mismo CP {cpAncla} (por si el nombre está mal)</p>
                        <div className="flex flex-wrap gap-1">
                          {mismas.map(c => (
                            <button key={c.nombre} type="button"
                              onClick={() => set(setColoniaEdit)(it.id_unico, c.nombre)}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-[#B7E4C7] text-[#1B4332] bg-[#F0FAF5] hover:bg-[#E0F4E8]">
                              {c.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Coto / conjunto / edificio (pegado a colonia) — autocompleta con los ya usados */}
                <div>
                  <label className={LBL}>Coto / conjunto / edificio <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <Input value={conjuntos[it.id_unico] || ""}
                         onChange={e => setConjuntos(prev => ({ ...prev, [it.id_unico]: e.target.value }))}
                         list="conj-existentes" placeholder="Elige uno existente o escribe" className={INP} />
                </div>
                {/* Nivel / piso: solo departamento, local u oficina (torre/plaza) */}
                {(() => {
                  const tipoEff = tipoEdit[it.id_unico] ?? it.tipo_propiedad;
                  if (!["departamento", "local", "oficina"].includes(tipoEff)) return null;
                  return (
                    <div>
                      <label className={LBL}>Nivel / piso <span className="normal-case font-normal text-slate-400">(en qué piso está)</span></label>
                      <Input type="number" value={nivelEdit[it.id_unico] ?? ""}
                             onChange={e => set(setNivelEdit)(it.id_unico, e.target.value)}
                             placeholder="Ej. 3 (PB = 0)" className={INP} />
                    </div>
                  );
                })()}
                {/* Corregir tipo de propiedad (si el scrapeo lo trae mal) */}
                <div>
                  <label className={LBL}>Tipo <span className="normal-case font-normal text-slate-400">(corrige si el scrapeo está mal)</span></label>
                  <Select value={tipoEdit[it.id_unico] ?? it.tipo_propiedad ?? ""} onValueChange={v => set(setTipoEdit)(it.id_unico, v)}>
                    <SelectTrigger className={INP + " w-full"}><SelectValue placeholder="Tipo de propiedad" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_OPCIONES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Edad de construcción: rango + año exacto */}
                <div>
                  <label className={LBL}>Edad de construcción <span className="normal-case font-normal text-slate-400">(original)</span></label>
                  <div className="flex gap-2">
                    <Select value={edadRango[it.id_unico] || ""} onValueChange={v => onEdadRango(it.id_unico, v)}>
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
                           className={INP + " w-20"} title="Año exacto si lo sabes" />
                  </div>
                </div>
                {/* Remodelación: colapsada hasta marcar el check (evita confusión) */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={!!remodOn[it.id_unico]}
                              onCheckedChange={v => toggleRemod(it.id_unico, !!v)}
                              className="data-[state=checked]:bg-[#52B788] border-[#52B788]" />
                    <span className={LBL + " mb-0"}>¿Se remodeló?</span>
                  </label>
                  {remodOn[it.id_unico] && (
                    <div className="mt-2">
                      <Select value={remodGrado[it.id_unico] || ""} onValueChange={v => set(setRemodGrado)(it.id_unico, v)}>
                        <SelectTrigger className={INP + " w-full"}><SelectValue placeholder="Grado" /></SelectTrigger>
                        <SelectContent>
                          {GRADOS_REMOD.map(g => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label} <span className="text-slate-400">{g.hint}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 mt-2">
                        <Select value={remodRango[it.id_unico] || ""} onValueChange={v => set(setRemodRango)(it.id_unico, v)}>
                          <SelectTrigger className={INP + " flex-1"}><SelectValue placeholder="¿Hace cuánto? (rango)" /></SelectTrigger>
                          <SelectContent>
                            {REMOD_RANGES.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" min="1900" max={new Date().getFullYear()} placeholder="Año"
                               value={remodAnio[it.id_unico] || ""} onChange={e => set(setRemodAnio)(it.id_unico, e.target.value)}
                               className={INP + " w-20"} title="Año exacto si lo sabes (tiene prioridad sobre el rango)" />
                      </div>
                      <p className="text-[13px] text-slate-500 mt-1.5 leading-snug">
                        Ligera: pintura/pisos · Básica: acabados · Intermedia: +instalaciones · Completa: +estructura
                      </p>
                    </div>
                  )}
                </div>
                {/* Conservación */}
                <div>
                  <label className={LBL}>Conservación</label>
                  <Select value={conserv[it.id_unico] || ""} onValueChange={v => set(setConserv)(it.id_unico, v)}>
                    <SelectTrigger className={INP}><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      {CONSERVACIONES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aplicar al grupo: visible sólo si hay otras del mismo coto en la lista */}
                {(() => {
                  const g = grupoDe(it);
                  return g.length > 0 ? (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <Checkbox checked={!!aplicarGrupo[it.id_unico]}
                                onCheckedChange={v => set(setAplicarGrupo)(it.id_unico, !!v)}
                                className="data-[state=checked]:bg-[#52B788] border-[#52B788]" />
                      <span className="text-xs text-slate-600">
                        Aplicar también a <b>{g.length}</b> más del mismo coto (<b>{it.colonia}</b>)
                      </span>
                    </label>
                  ) : null;
                })()}

                {/* Acciones */}
                <div className="flex items-center justify-between gap-2 pt-2.5 mt-0.5 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Marca si el anuncio ya no está publicado">
                      <Checkbox checked={!!retiradoChk[it.id_unico]}
                                onCheckedChange={v => set(setRetiradoChk)(it.id_unico, !!v)}
                                className="data-[state=checked]:bg-red-500 border-red-400" />
                      <span className="text-xs text-slate-500">Retirado</span>
                    </label>
                    <button type="button" onClick={() => marcarBasura(it)} disabled={guardando[it.id_unico]}
                            title="Reporta que los datos de esta propiedad son incorrectos; se excluye de la búsqueda de comparables"
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-40">
                      <AlertTriangle className="w-3.5 h-3.5" /> Datos incorrectos
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saltar(it)} variant="outline"
                            className="h-9 border-slate-300 text-slate-500 hover:bg-slate-50">No sé</Button>
                    <Button onClick={() => guardar(it)} disabled={guardando[it.id_unico]}
                            className="h-9 px-6 bg-[#52B788] hover:bg-[#40916C] text-white shadow-sm">
                      {guardando[it.id_unico] ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
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
