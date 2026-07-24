import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Building2, ArrowLeft, ExternalLink, MapPin, Search, Check, ChevronsUpDown, AlertTriangle, Pencil, Gavel, XCircle } from "lucide-react";
import { API } from "@/App";
import GamificacionVerificador from "@/components/GamificacionVerificador";

// Rangos finos (Ross-Heidecke). "No sé" salta sin escribir.
const AGE_RANGES = [
  { value: "preventa", label: "Preventa (aún no construida)" },
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
  "Nuevo", "Muy Bueno", "Bueno", "Regular Bueno", "Regular", "Regular Malo", "Malo", "Muy Malo",
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

const TIPOS = ["Casa", "Departamento", "Terreno", "Local", "Oficina", "Rancho"];
// Terreno sin construcción, sin importar mayúsculas ni origen del dato (el pool guarda "Terreno",
// el dropdown usa "terreno"). "terreno_construido" NO cuenta (ese sí lleva edad).
const esTerrenoSinConstruccion = (tp) => String(tp || "").trim().toLowerCase() === "terreno";
// Opciones para corregir el tipo scrapeado (valor en minúscula = como lo guarda el pool).
const TIPO_OPCIONES = [
  { v: "casa", l: "Casa" }, { v: "departamento", l: "Departamento" },
  { v: "terreno", l: "Terreno" }, { v: "terreno_construido", l: "Terreno c/ construcción" },
  { v: "local", l: "Local" }, { v: "oficina", l: "Oficina" },
  { v: "conjunto_oficinas", l: "Conjunto de oficinas" }, { v: "bodega", l: "Bodega" },
  { v: "rancho", l: "Rancho" }, { v: "edificio", l: "Edificio" },
  { v: "conjunto_deptos", l: "Conjunto de apartamentos" },
  { v: "conjunto_mini_deptos", l: "Conjunto aparta estudios" },
  { v: "hotel", l: "Hotel" }, { v: "escuela", l: "Escuela" },
  { v: "salon_eventos", l: "Salón de eventos" },
  { v: "centro_comercial", l: "Centro comercial" },
  { v: "nave_industrial", l: "Nave industrial" },
];

// Multi-select de tipo en un DROPDOWN con checkboxes (compacto: el botón muestra lo
// elegido, las opciones ocultas). Una propiedad puede ser casa Y rancho, etc.
const TipoMultiSelect = ({ opciones, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const label = value.length ? opciones.filter(o => value.includes(o.v)).map(o => o.l).join(", ") : "Tipo de propiedad";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="h-9 w-full flex items-center justify-between bg-slate-100 border border-slate-200 rounded-md px-3 text-sm">
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 max-w-[calc(100vw-1.5rem)] max-h-[55vh] overflow-y-auto p-1" align="start" collisionPadding={12}>
        {opciones.map(o => {
          const sel = value.includes(o.v);
          return (
            <button key={o.v} type="button" onClick={() => toggle(o.v)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] leading-tight text-left rounded hover:bg-slate-100">
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"}`}>
                {sel && <Check className="w-3 h-3 text-white" />}
              </span>
              {o.l}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

// Headers: si hay token admin en localStorage, mandarlo (el panel sirve para
// valuador/inmobiliaria vía cookie de sesión, y para super_admin vía X-Admin-Token).
const authHeaders = (extra = {}) => {
  const h = { ...extra };
  try {
    const t = JSON.parse(localStorage.getItem("pv_admin") || "{}")?.token;
    if (t) h["X-Admin-Token"] = t;
  } catch { /* noop */ }
  try {
    const ut = localStorage.getItem("pv_token");   // usuario normal: Bearer (no depende de cookie)
    if (ut) h["Authorization"] = `Bearer ${ut}`;
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
  if (v === "preventa") return "a futuro";
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

// Combo de colonia AISLADO: mantiene su propio query/open adentro, así escribir
// solo re-renderiza este combo y NO toda la página (que tiene 30+ tarjetas).
const ColoniaCombo = ({ colonias, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtradas = useMemo(() => {
    const s = q.toLowerCase().trim();
    const base = s ? colonias.filter(c => c.toLowerCase().includes(s)) : colonias;
    return { lista: base.slice(0, 30), total: base.length };
  }, [colonias, q]);
  const elegir = (c) => { onChange(c); setQ(""); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled}
                className="h-9 w-44 justify-between text-sm font-normal">
          <span className="truncate">{value || (disabled ? "Elige municipio" : "Todas las colonias")}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      {/* input nativo + lista simple (SIN cmdk → escritura instantánea) */}
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-slate-100">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder={`Buscar en ${colonias.length}…`}
                 className="w-full h-8 px-2 text-sm border border-slate-200 rounded outline-none focus:border-[#52B788]" />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          <button type="button" onClick={() => elegir("")}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2">
            <Check className={`w-4 h-4 ${value === "" ? "opacity-100 text-[#52B788]" : "opacity-0"}`} />Todas
          </button>
          {filtradas.lista.map(c => (
            <button type="button" key={c} onClick={() => elegir(c)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2">
              <Check className={`w-4 h-4 shrink-0 ${value === c ? "opacity-100 text-[#52B788]" : "opacity-0"}`} />
              <span className="truncate">{c}</span>
            </button>
          ))}
          {filtradas.total === 0 && <p className="px-3 py-2 text-xs text-slate-400">Sin resultados</p>}
          {filtradas.total > filtradas.lista.length && (
            <p className="px-3 py-1.5 text-xs text-slate-400">+{filtradas.total - filtradas.lista.length} más… sigue escribiendo</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Autocompletado de colonia tipo Google: estado LOCAL (escribir no re-renderiza la
// página) + muestra solo el top 12 de coincidencias (no las ~868). Reporta al padre
// solo al elegir/salir, no en cada tecla.
const ColoniaCorregir = memo(({ nombres, valorInicial, onSet, placeholder = "Colonia oficial" }) => {
  const [text, setText] = useState(valorInicial || "");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const s = text.toLowerCase().trim();
    if (!s) return [];
    const pref = [], resto = [];
    for (const c of nombres) {
      const cl = c.toLowerCase();
      if (cl.startsWith(s)) pref.push(c);
      else if (cl.includes(s)) resto.push(c);
      if (pref.length >= 12) break;
    }
    return [...pref, ...resto].slice(0, 12);
  }, [nombres, text]);
  const elegir = (c) => { setText(c); onSet(c); setOpen(false); };
  return (
    <div className="relative">
      <input value={text}
             onChange={(e) => { setText(e.target.value); setOpen(true); }}
             onFocus={() => setOpen(true)}
             onBlur={() => { onSet(text); setTimeout(() => setOpen(false), 120); }}
             placeholder={placeholder}
             className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md outline-none focus:border-[#52B788]" />
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {matches.map(c => (
            <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); elegir(c); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 truncate">{c}</button>
          ))}
        </div>
      )}
    </div>
  );
});

const EdadesZonaPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [colonia, setColonia] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloRaras, setSoloRaras] = useState(false);  // ver solo propiedades con colonia mal capturada
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [coloniasOficiales, setColoniasOficiales] = useState([]); // SEPOMEX {nombre, cp}
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [conjuntos, setConjuntos] = useState({});   // id_unico -> texto conjunto
  const [m2TerrenoEdit, setM2TerrenoEdit] = useState({}); // id_unico -> m² terreno corregido
  const [m2ConstEdit, setM2ConstEdit] = useState({});     // id_unico -> m² construcción corregido
  const gamiRef = useRef(null);   // panel de gamificación (confeti, récord, concurso)
  const [hechos, setHechos] = useState({});         // id_unico -> guardado
  // Campos por fila (id_unico -> valor)
  const [edadRango, setEdadRango] = useState({});   // año construcción por rango
  const [anioConst, setAnioConst] = useState({});   // año construcción exacto
  const [anioTerminacion, setAnioTerminacion] = useState({}); // preventa: año probable de terminación
  const [conserv, setConserv]     = useState({});   // estado de conservación
  const [remodGrado, setRemodGrado] = useState({}); // grado de remodelación
  const [remodAnio, setRemodAnio]   = useState({}); // año de remodelación (exacto)
  const [remodRango, setRemodRango] = useState({}); // antigüedad remod por rango (si no hay año)
  const [remodOn, setRemodOn]       = useState({}); // id -> mostrar campos de remodelación
  const [guardando, setGuardando]   = useState({}); // id -> bool
  const [usoMixto, setUsoMixto]     = useState({}); // id -> casa con local (uso mixto)
  const [coloniaEdit, setColoniaEdit] = useState({}); // id -> colonia corregida
  const [municipioEdit, setMunicipioEdit] = useState({}); // id -> municipio corregido
  const [poblacionEdit, setPoblacionEdit] = useState({}); // id -> población/pueblo (Cajititlán, etc.)
  const [tiposEdit, setTiposEdit] = useState({});     // id -> array de tipos (multi: casa+rancho)
  const [nivelEdit, setNivelEdit] = useState({});     // id -> nivel/piso (depto/local/oficina)
  const [retiradoChk, setRetiradoChk] = useState({}); // id -> anuncio retirado
  const [aplicarGrupo, setAplicarGrupo] = useState({}); // id -> aplicar al mismo coto
  const [coloniasExistentes, setColoniasExistentes] = useState([]); // nombres ya usados en la zona
  const [conjuntosExistentes, setConjuntosExistentes] = useState([]); // cotos ya usados en la zona

  // Coto/conjunto de una propiedad: lo tecleado gana sobre lo scrapeado.
  const cotoDe = (it) => norm((conjuntos[it.id_unico] ?? it.conjunto ?? "").trim());
  // Otras pendientes AGRUPABLES. Si la propiedad tiene coto → solo las del MISMO coto
  // (evita barrer toda la colonia). Sin coto → otras de la misma colonia que TAMPOCO
  // tengan coto (casas iguales de un fracc sin coto son pocas; el aviso las confirma).
  const grupoDe = (it) => {
    const coto = cotoDe(it);
    return items.filter(o => {
      if (o.id_unico === it.id_unico || hechos[o.id_unico]) return false;
      if (!mismoGrupo(o.colonia, it.colonia)) return false;
      return coto ? norm(o.conjunto || "") === coto : !norm(o.conjunto || "");
    });
  };
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
    } else if (v === "preventa") {
      // Aún no construida: no aplica año exacto/conservación de una edad que no existe todavía.
      set(setConserv)(id, "Nuevo");
      set(setAnioConst)(id, "");
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
      if (soloRaras) params.set("colonia_rara", "true");   // propiedades con colonia mal capturada
      else if (colonia) params.set("colonia", colonia.trim());
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

  const saltar = (it) => setHechos(prev => ({ ...prev, [it.id_unico]: "Saltada" }));

  const construirPayload = (it) => {
    const id = it.id_unico;
    const p = {};
    const muniFix = (municipioEdit[id] ?? "").trim();
    if (muniFix && muniFix !== it.municipio) p.municipio = muniFix;   // corrección de municipio
    const pobFix = (poblacionEdit[id] ?? "").trim();
    if (pobFix && pobFix !== (it.poblacion || "")) p.poblacion = pobFix;   // población/pueblo
    const colFix = (coloniaEdit[id] ?? "").trim();
    if (colFix && colFix !== it.colonia) {
      p.colonia = colFix;   // corrección de colonia
      const of = coloniasOficiales.find(c => c.nombre === colFix);   // si es oficial SEPOMEX, adjunta CP
      if (of?.cp) p.cp = of.cp;
    }
    if (conjuntos[id]) p.conjunto = conjuntos[id];
    const m2t = (m2TerrenoEdit[id] ?? "").toString().trim();
    if (m2t && Number(m2t) !== it.m2_terreno) p.m2_terreno = Number(m2t);
    const m2c = (m2ConstEdit[id] ?? "").toString().trim();
    if (m2c && Number(m2c) !== it.m2_construccion) p.m2_construccion = Number(m2c);
    const tiposSel = tiposEdit[id];   // multi-tipo: casa+rancho, etc.
    if (tiposSel && tiposSel.length && JSON.stringify(tiposSel) !== JSON.stringify([it.tipo_propiedad].filter(Boolean))) {
      p.tipo = tiposSel[0];   // primario para el motor
      p.tipos = tiposSel;     // etiquetas completas
    }
    if (usoMixto[id]) p.uso_mixto = true;   // casa con local comercial
    if (nivelEdit[id] !== undefined && nivelEdit[id] !== "") p.nivel = Number(nivelEdit[id]);  // piso/nivel
    if (retiradoChk[id]) p.retirado = true;   // anuncio ya no publicado
    if (edadRango[id] === "preventa") {
      p.edad_rango = "preventa";
      if (anioTerminacion[id]) p.anio_terminacion_estimado = Number(anioTerminacion[id]);
    } else if (anioConst[id]) p.anio_exacto = Number(anioConst[id]);
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
      if (ok) { setHechos(prev => ({ ...prev, [o.id_unico]: "Guardado" })); n++; }
    }
    toast.success(`Aplicado a ${n} más`);
  };

  const guardar = async (it) => {
    const id = it.id_unico;
    const payload = construirPayload(it);
    const esTerreno = esTerrenoSinConstruccion((tiposEdit[id]?.[0]) ?? it.tipo_propiedad);
    if (esTerreno) {
      // Terreno: no lleva edad/conservación. Guardar = confirmar correcto tal cual
      // (con o sin corrección de colonia/tipo) → lo saca de la lista sin exigir edad.
      payload.revisado = true;
    } else if (!payload.anio_exacto && !payload.edad_rango && !payload.conservacion && !payload.grado_remodelacion && !payload.colonia && !payload.municipio && !payload.poblacion && !payload.tipo && !payload.uso_mixto && !payload.retirado && payload.nivel === undefined && !payload.conjunto && !payload.m2_terreno && !payload.m2_construccion) {
      toast.error("Indica al menos edad, conservación, remodelación, colonia, municipio, tipo, nivel, m², conjunto o retiro");
      return;
    }
    set(setGuardando)(id, true);
    try {
      const data = await postEdad(id, payload);
      if (!data) throw new Error();
      setHechos(prev => ({ ...prev, [id]: "Guardado" }));
      // Reflejar la corrección en el item para que la ficha/título muestre lo corregido, no el original
      setItems(prev => prev.map(x => x.id_unico === id ? {
        ...x,
        ...(payload.colonia ? { colonia: payload.colonia } : {}),
        ...(payload.municipio ? { municipio: payload.municipio } : {}),
        ...(payload.tipo ? { tipo_propiedad: payload.tipo } : {}),
        ...(payload.m2_terreno ? { m2_terreno: payload.m2_terreno } : {}),
        ...(payload.m2_construccion ? { m2_construccion: payload.m2_construccion } : {}),
      } : x));
      gamiRef.current?.registrarPunto({ hoy: data.hoy, record: data.record, puntos: data.puntos });
      const base = data.edad_efectiva != null ? `Guardado · edad efectiva ${data.edad_efectiva} años` : "Guardado ✓";
      toast.success(base);
      // Si el perito marcó "aplicar al grupo", propagar a las variantes del mismo coto.
      // Aviso preventivo: se aplican los MISMOS datos a varias propiedades → confirmar.
      if (aplicarGrupo[id]) {
        const otras = grupoDe(it);
        const coto = cotoDe(it);
        const donde = coto ? `del coto "${conjuntos[id] ?? it.conjunto}"` : `de la colonia "${it.colonia}" (revisa que sean iguales)`;
        if (otras.length && window.confirm(
          `Vas a aplicar los MISMOS datos a ${otras.length} propiedad(es) más ${donde}.\n\n¿Continuar?`)) {
          await aplicarAOtras(payload, otras);
        }
      }
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      set(setGuardando)(id, false);
    }
  };

  // Reporte de un clic: los datos de esta propiedad son incorrectos/basura →
  // se excluye de la búsqueda de comparables (activo=False) para que no meta ruido.
  // Excluir de comparables por un motivo (un clic). Guarda el label en `hechos`
  // para el historial. Reutilizado por retirado / datos incorrectos / juicio-remate.
  const excluir = async (it, campo, label) => {
    const id = it.id_unico;
    set(setGuardando)(id, true);
    try {
      const data = await postEdad(id, { [campo]: true });
      if (!data) throw new Error();
      setHechos(prev => ({ ...prev, [id]: label }));
      toast.success(`${label} · excluida de comparables`);
    } catch {
      toast.error("No se pudo marcar");
    } finally {
      set(setGuardando)(id, false);
    }
  };

  // Reabrir una ficha ya guardada para corregirla (la saca de `hechos`).
  const editar = (it) => setHechos(prev => {
    const n = { ...prev }; delete n[it.id_unico]; return n;
  });

  const pendientes = items.filter(it => !hechos[it.id_unico]);

  // Lista combinada de nombres de colonia (oficiales SEPOMEX + existentes en la zona)
  // para el autocompletado de corrección. Estable → no cambia al escribir.
  const nombresColonia = useMemo(
    () => Array.from(new Set([...coloniasOficiales.map(c => c.nombre), ...coloniasExistentes])),
    [coloniasOficiales, coloniasExistentes]);

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8"}>
      <div className="max-w-6xl mx-auto">
        {!embedded && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-[#1B4332] hover:bg-[#D9ED92]/30">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#1B4332]" />
            <div>
              <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332] leading-tight">Verificación de Datos por Zona</h1>
              <p className="text-sm font-semibold text-[#52B788]">Verifica y Gana</p>
            </div>
          </div>
        </div>
        <div className="mb-4"><GamificacionVerificador ref={gamiRef} /></div>
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
              <ColoniaCombo colonias={colonias} value={colonia} onChange={setColonia} disabled={!municipio || soloRaras} />
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
            <label className="flex items-center gap-2 cursor-pointer h-9 ml-1"
                   title="Muestra propiedades cuya colonia está mal capturada (CP, dirección, título de anuncio) para corregirlas en lote">
              <Checkbox checked={soloRaras} onCheckedChange={v => setSoloRaras(!!v)}
                        className="data-[state=checked]:bg-amber-500 border-amber-400" />
              <span className="text-xs text-slate-600 whitespace-nowrap">Datos raros <span className="text-slate-400">(por corregir)</span></span>
            </label>
          </CardContent>
        </Card>

        {/* Resultados */}
        {buscado && !loading && pendientes.length === 0 && (
          <p className="text-center text-slate-500 py-10">
            {items.length === 0 ? "No hay propiedades sin edad con esos filtros." : "¡Listo! Etiquetaste todas. 🎉"}
          </p>
        )}

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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hechos[it.id_unico] === "Guardado" ? "bg-[#52B788]" : "bg-slate-300"}`}>
                  <Check className={`w-5 h-5 ${hechos[it.id_unico] === "Guardado" ? "text-white" : "text-slate-600"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[#1B4332] truncate">{it.colonia}</p>
                  <p className="text-xs text-slate-500">{hechos[it.id_unico]}</p>
                </div>
                <button type="button" onClick={() => editar(it)}
                        className="shrink-0 flex items-center gap-1 text-xs text-[#52B788] hover:text-[#40916C] hover:underline font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
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
                  {it.tipo_operacion && (
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${/renta/i.test(it.tipo_operacion) ? "text-amber-700 bg-amber-50 border-amber-200" : "text-[#1B4332] bg-[#EAF3EE] border-[#B7E4C7]"}`}>
                      {/renta/i.test(it.tipo_operacion) ? "RENTA" : "VENTA"}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{it.tipo_propiedad}</span>
                  {it.precio ? <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{formatCurrency(it.precio)}</span> : null}
                  {it.m2_construccion ? <span className="text-[11px] font-medium text-[#1B4332] bg-white border border-slate-200 rounded-full px-2 py-0.5">{it.m2_construccion} m²</span> : null}
                </div>
              </div>

              {/* Formulario de estimación */}
              <div className="p-4 space-y-2.5">
                {/* Municipio + Población (pueblo) — nivel entre municipio y colonia */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={LBL}>Municipio</label>
                    <ColoniaCorregir nombres={municipios} placeholder="Municipio"
                                     valorInicial={municipioEdit[it.id_unico] ?? it.municipio ?? ""}
                                     onSet={(v) => set(setMunicipioEdit)(it.id_unico, v)} />
                  </div>
                  <div>
                    <label className={LBL}>Población</label>
                    <ColoniaCorregir nombres={[]} placeholder="Pueblo (ej. Cajititlán)"
                                     valorInicial={poblacionEdit[it.id_unico] ?? it.poblacion ?? ""}
                                     onSet={(v) => set(setPoblacionEdit)(it.id_unico, v)} />
                  </div>
                </div>
                {/* Corregir colonia (si el dato vino mal, ej. viene el coto como colonia) */}
                <div>
                  <label className={LBL}>Colonia <span className="normal-case font-normal text-slate-400">(oficial SEPOMEX — corrige si está mal)</span></label>
                  <ColoniaCorregir nombres={nombresColonia}
                                   valorInicial={coloniaEdit[it.id_unico] ?? it.colonia ?? ""}
                                   onSet={(v) => set(setColoniaEdit)(it.id_unico, v)} />
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
                {/* m² editables — el scraper (sobre todo PINCALI) a veces los guarda mal */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={LBL}>m² terreno <span className="normal-case font-normal text-slate-400">(corrige si está mal)</span></label>
                    <Input type="number" value={m2TerrenoEdit[it.id_unico] ?? ""}
                           onChange={e => set(setM2TerrenoEdit)(it.id_unico, e.target.value)}
                           placeholder={it.m2_terreno != null ? `Actual: ${it.m2_terreno}` : "m² de terreno"} className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>m² construcción</label>
                    <Input type="number" value={m2ConstEdit[it.id_unico] ?? ""}
                           onChange={e => set(setM2ConstEdit)(it.id_unico, e.target.value)}
                           placeholder={it.m2_construccion != null ? `Actual: ${it.m2_construccion}` : "m² de construcción"} className={INP} />
                  </div>
                </div>
                {/* Nivel / piso: solo departamento, local u oficina (torre/plaza) */}
                {(() => {
                  const tipoEff = (tiposEdit[it.id_unico]?.[0]) ?? it.tipo_propiedad;
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
                {/* Corregir tipo (multi: puede ser casa Y rancho). Dropdown con checkboxes. */}
                <div>
                  <label className={LBL}>Tipo <span className="normal-case font-normal text-slate-400">(puede ser más de uno, ej. casa y rancho)</span></label>
                  <TipoMultiSelect opciones={TIPO_OPCIONES}
                                   value={tiposEdit[it.id_unico] ?? [it.tipo_propiedad].filter(Boolean)}
                                   onChange={(arr) => set(setTiposEdit)(it.id_unico, arr)} />
                  <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                    <Checkbox checked={!!usoMixto[it.id_unico]}
                              onCheckedChange={v => set(setUsoMixto)(it.id_unico, !!v)}
                              className="data-[state=checked]:bg-[#52B788] border-[#52B788]" />
                    <span className="text-xs text-slate-600">Uso mixto <span className="text-slate-400">(casa con local comercial)</span></span>
                  </label>
                </div>
                {/* Terreno sin construcción: no aplica edad/conservación/remodelación (solo se corrige colonia). "terreno_construido" sí las lleva. */}
                {esTerrenoSinConstruccion((tiposEdit[it.id_unico]?.[0]) ?? it.tipo_propiedad) ? (
                  <p className="text-[13px] text-slate-500 leading-snug bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Terreno sin construcción — no se pide edad ni conservación. Corrige colonia/tipo si hace falta y pulsa <b>Guardar</b> para confirmarlo (sale de la lista aunque no cambies nada).
                  </p>
                ) : (<>
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
                    {edadRango[it.id_unico] === "preventa" ? (
                      <Input type="number" min={new Date().getFullYear()} max={new Date().getFullYear() + 6}
                             placeholder="Año term."
                             value={anioTerminacion[it.id_unico] || ""} onChange={e => set(setAnioTerminacion)(it.id_unico, e.target.value)}
                             className={INP + " w-24"} title="Año probable de terminación, si se conoce" />
                    ) : (
                      <Input type="number" min="1900" max={new Date().getFullYear()} placeholder="Año"
                             value={anioConst[it.id_unico] || ""} onChange={e => set(setAnioConst)(it.id_unico, e.target.value)}
                             className={INP + " w-20"} title="Año exacto si lo sabes" />
                    )}
                  </div>
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
                </>)}

                {/* Aplicar al grupo: visible sólo si hay otras del mismo coto en la lista */}
                {(() => {
                  const g = grupoDe(it);
                  if (g.length === 0) return null;
                  const coto = cotoDe(it);
                  return (
                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <Checkbox checked={!!aplicarGrupo[it.id_unico]}
                                onCheckedChange={v => set(setAplicarGrupo)(it.id_unico, !!v)}
                                className="mt-0.5 data-[state=checked]:bg-[#52B788] border-[#52B788]" />
                      <span className="text-xs text-slate-600">
                        {coto
                          ? <>Aplicar también a <b>{g.length}</b> más del mismo coto (<b>{conjuntos[it.id_unico] ?? it.conjunto}</b>)</>
                          : <>Aplicar también a <b>{g.length}</b> más de <b>{it.colonia}</b> <span className="text-amber-600">(sin coto — verifica que sean iguales)</span></>}
                      </span>
                    </label>
                  );
                })()}

                {/* Acciones */}
                <div className="pt-2.5 mt-0.5 border-t border-slate-100 space-y-2.5">
                  {/* Motivos de exclusión (un clic → saca la propiedad de comparables) */}
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1.5">¿Excluir de comparables?</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => excluir(it, "retirado", "Retirado")} disabled={guardando[it.id_unico]}
                              title="El anuncio ya no está publicado"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium disabled:opacity-40 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Retirado
                      </button>
                      <button type="button" onClick={() => excluir(it, "datos_basura", "Datos incorrectos")} disabled={guardando[it.id_unico]}
                              title="Los datos del anuncio son incorrectos/basura"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-40 transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5" /> Info incorrecta
                      </button>
                      <button type="button" onClick={() => excluir(it, "en_juicio_remate", "En juicio/remate")} disabled={guardando[it.id_unico]}
                              title="Está en juicio o es remate; su precio no es de mercado"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium disabled:opacity-40 transition-colors">
                        <Gavel className="w-3.5 h-3.5" /> Juicio/remate
                      </button>
                    </div>
                  </div>
                  {/* Primarias */}
                  <div className="flex gap-2 justify-end">
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
