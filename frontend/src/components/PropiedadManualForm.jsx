import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, X, AlertTriangle, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { AMENIDADES_ICONS } from "@/components/dashboard/tabs/PromocionesTab";

const MAX_FILAS = 10;

const TIPOS = [
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "terreno", label: "Terreno" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "bodega", label: "Bodega" },
];

const CONSERVACIONES = ["Excelente", "Muy Bueno", "Bueno", "Regular", "Malo"];

// Igual que Verificación por Zona: la edad se captura por rango (si no se sabe
// el año exacto) o por año específico — el rango se convierte a "edad" en años,
// que el backend prioriza solo si no hay año explícito (normalizar_fila).
const RANGOS_EDAD = [
  { value: "nuevo", label: "Nuevo", mid: 0 },
  { value: "1-5", label: "1–5 años", mid: 3 },
  { value: "6-10", label: "6–10 años", mid: 8 },
  { value: "11-15", label: "11–15 años", mid: 13 },
  { value: "16-20", label: "16–20 años", mid: 18 },
  { value: "21-30", label: "21–30 años", mid: 25 },
  { value: "31-40", label: "31–40 años", mid: 35 },
  { value: "40+", label: "Más de 40 años", mid: 50 },
];

const GRADOS_REMOD = [
  { value: "ligera", label: "Ligera / cosmética" },
  { value: "basica", label: "Básica" },
  { value: "intermedia", label: "Intermedia" },
  { value: "completa", label: "Completa" },
];

const FILA_VACIA = {
  tipo: "casa", direccion: "", coto_edificio: "", colonia: "", municipio: "",
  precio: "", edadModo: "anio", anio: "", edad: "",
  m2_construccion: "", m2_terreno: "", recamaras: "",
  banos: "", medios_banos: "", estacionamientos: "", niveles: "", piso: "",
  conservacion: "", remodelado: false, grado_remodelacion: "", anio_remodelacion: "",
  amenidades: [], descripcion: "", link: "",
};

const toggleArr = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const lbl = "text-xs font-semibold text-[#1B4332]";
const inputCls = "h-9 text-sm bg-white";
const seccion = "text-[11px] font-bold uppercase tracking-wide text-[#52B788] mb-0.5 leading-tight";

// Formulario compartido para dar de alta 1-3 propiedades a mano (sin plantilla).
// El backend es la única fuente de verdad de qué es obligatorio por tipo — este
// form no duplica esa validación, solo pinta los errores que regresa el server.
const PropiedadManualForm = ({ open, onOpenChange, endpoint, authHeaders = {}, onSuccess, nota }) => {
  const [filas, setFilas] = useState([{ ...FILA_VACIA }]);
  const [errores, setErrores] = useState({}); // { [index]: string[] }
  const [loading, setLoading] = useState(false);

  const setCampo = (i, campo, valor) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  };

  const agregarFila = () => filas.length < MAX_FILAS && setFilas((prev) => [...prev, { ...FILA_VACIA }]);
  const quitarFila = (i) => setFilas((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => { setFilas([{ ...FILA_VACIA }]); setErrores({}); };

  const guardar = async () => {
    setLoading(true);
    setErrores({});
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({ filas: filas.map((f) => ({ ...f, amenidades: (f.amenidades || []).join(", ") })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo guardar");
      if (data.rechazadas?.length) {
        const porFila = {};
        data.rechazadas.forEach((r) => { porFila[r.fila - 1] = r.faltan; });
        setErrores(porFila);
      }
      const creadas = data.creadas ?? data.al_pool ?? 0;
      if (creadas > 0) {
        toast.success(`${creadas} propiedad${creadas > 1 ? "es" : ""} guardada${creadas > 1 ? "s" : ""}` +
          (data.duplicadas ? ` · ${data.duplicadas} ya existían` : ""));
        onSuccess?.(data);
        if (!data.rechazadas?.length) { reset(); onOpenChange(false); }
      } else if (!data.rechazadas?.length) {
        toast.info("Nada nuevo que guardar (ya existían todas)");
      }
    } catch (e) {
      toast.error(e.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Outfit'] text-[#1B4332] flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-[#52B788]" /> Agregar propiedad
          </DialogTitle>
          <DialogDescription>Captura hasta {MAX_FILAS} propiedades a mano, sin plantilla.</DialogDescription>
          {nota && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
              {nota}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-2">
          {filas.map((f, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-[#F8FAF8] p-2.5 space-y-1.5 relative">
              {filas.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Propiedad {i + 1}</span>
                  <button type="button" onClick={() => quitarFila(i)} aria-label="Quitar propiedad"
                    className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {errores[i]?.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>Falta: {errores[i].join(", ")}</span>
                </div>
              )}

              <div>
              <p className={seccion}>Ubicación</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <div className="col-span-1">
                  <Label className={lbl}>Tipo</Label>
                  <Select value={f.tipo} onValueChange={(v) => setCampo(i, "tipo", v)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className={lbl}>Dirección</Label>
                  <Input className={inputCls} value={f.direccion} onChange={(e) => setCampo(i, "direccion", e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Label className={lbl}>Coto / Edificio</Label>
                  <Input className={inputCls} value={f.coto_edificio} onChange={(e) => setCampo(i, "coto_edificio", e.target.value)} />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className={lbl}>Colonia</Label>
                  <Input className={inputCls} value={f.colonia} onChange={(e) => setCampo(i, "colonia", e.target.value)} />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className={lbl}>Municipio</Label>
                  <Input className={inputCls} value={f.municipio} onChange={(e) => setCampo(i, "municipio", e.target.value)} />
                </div>
              </div>
              </div>

              <div>
              <p className={seccion}>Datos</p>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                <div>
                  <div className="h-4 flex items-center"><Label className={lbl}>Precio</Label></div>
                  <Input type="number" className={inputCls} value={f.precio} onChange={(e) => setCampo(i, "precio", e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 h-4">
                    <Label className={lbl + " truncate leading-none"}>Año</Label>
                    <div className="flex h-full text-[9px] leading-none rounded border border-slate-200 overflow-hidden shrink-0">
                      <button type="button" onClick={() => setCampo(i, "edadModo", "anio")}
                        className={`h-full px-1 flex items-center ${f.edadModo !== "rango" ? "bg-[#1B4332] text-white" : "text-slate-500"}`}>Año</button>
                      <button type="button" onClick={() => setCampo(i, "edadModo", "rango")}
                        className={`h-full px-1 flex items-center ${f.edadModo === "rango" ? "bg-[#1B4332] text-white" : "text-slate-500"}`}>Rango</button>
                    </div>
                  </div>
                  {f.edadModo === "rango" ? (
                    <Select value={f.edad ? String(f.edad) : ""} onValueChange={(v) => { setCampo(i, "edad", Number(v)); setCampo(i, "anio", ""); }}>
                      <SelectTrigger className={inputCls + " pv-force-green"}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{RANGOS_EDAD.map((r) => <SelectItem key={r.value} value={String(r.mid)}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input type="number" className={inputCls + " pv-force-green"} value={f.anio}
                      onChange={(e) => { setCampo(i, "anio", e.target.value); setCampo(i, "edad", ""); }} />
                  )}
                </div>
                <div>
                  <div className="h-4 flex items-center"><Label className={lbl}>Conservación</Label></div>
                  <Select value={f.conservacion} onValueChange={(v) => setCampo(i, "conservacion", v)}>
                    <SelectTrigger className={inputCls + " pv-force-green"}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{CONSERVACIONES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-1.5 cursor-pointer h-4">
                    <Checkbox checked={f.remodelado}
                      onCheckedChange={(v) => { setCampo(i, "remodelado", !!v); if (!v) { setCampo(i, "grado_remodelacion", ""); setCampo(i, "anio_remodelacion", ""); } }} />
                    <span className={lbl}>¿Se remodeló?</span>
                  </label>
                  {f.remodelado && (
                    <div className="flex gap-1.5 mt-1">
                      <Select value={f.grado_remodelacion} onValueChange={(v) => setCampo(i, "grado_remodelacion", v)}>
                        <SelectTrigger className={inputCls + " flex-1 pv-force-green"}><SelectValue placeholder="Grado" /></SelectTrigger>
                        <SelectContent>{GRADOS_REMOD.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" className={inputCls + " w-20 shrink-0"} placeholder="Año"
                        value={f.anio_remodelacion} onChange={(e) => setCampo(i, "anio_remodelacion", e.target.value)} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="h-4 flex items-center"><Label className={lbl}>m²C</Label></div>
                  <Input type="number" className={inputCls} value={f.m2_construccion} onChange={(e) => setCampo(i, "m2_construccion", e.target.value)} />
                </div>
                <div>
                  <div className="h-4 flex items-center"><Label className={lbl}>m²T</Label></div>
                  <Input type="number" className={inputCls} value={f.m2_terreno} onChange={(e) => setCampo(i, "m2_terreno", e.target.value)} />
                </div>
                <div><Label className={lbl}>Niveles</Label><Input type="number" className={inputCls} value={f.niveles} onChange={(e) => setCampo(i, "niveles", e.target.value)} /></div>
                <div><Label className={lbl}>Piso</Label><Input type="number" className={inputCls} value={f.piso} onChange={(e) => setCampo(i, "piso", e.target.value)} /></div>
                <div><Label className={lbl}>Recámaras</Label><Input type="number" className={inputCls} value={f.recamaras} onChange={(e) => setCampo(i, "recamaras", e.target.value)} /></div>
                <div><Label className={lbl}>Baños</Label><Input type="number" className={inputCls} value={f.banos} onChange={(e) => setCampo(i, "banos", e.target.value)} /></div>
                <div><Label className={lbl}>Medios baños</Label><Input type="number" className={inputCls} value={f.medios_banos} onChange={(e) => setCampo(i, "medios_banos", e.target.value)} /></div>
                <div><Label className={lbl}>Estacionamientos</Label><Input type="number" className={inputCls} value={f.estacionamientos} onChange={(e) => setCampo(i, "estacionamientos", e.target.value)} /></div>
              </div>
              </div>

              <div>
                <Label className={lbl}>Amenidades</Label>
                <div className="flex flex-wrap gap-1 p-1.5 bg-white rounded-lg border border-slate-200 mt-0.5">
                  {AMENIDADES_ICONS.map(({ label, Icon }) => {
                    const active = f.amenidades.includes(label);
                    return (
                      <button key={label} type="button" title={label}
                        onClick={() => setCampo(i, "amenidades", toggleArr(f.amenidades, label))}
                        className={`flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-md border transition-colors ${active ? "bg-[#52B788] border-[#52B788] text-white" : "bg-white border-slate-200 text-[#52B788] hover:bg-[#F0FAF5]"}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label className={lbl}>Link de origen (opcional)</Label>
                  <Input type="url" className={inputCls} value={f.link} onChange={(e) => setCampo(i, "link", e.target.value)}
                    placeholder="https://..." />
                </div>
                <div>
                  <Label className={lbl}>Descripción</Label>
                  <Input className={inputCls} value={f.descripcion} onChange={(e) => setCampo(i, "descripcion", e.target.value)} />
                </div>
              </div>
            </div>
          ))}

        </div>

        <DialogFooter className="sm:justify-between">
          {filas.length < MAX_FILAS ? (
            <Button type="button" variant="outline" onClick={agregarFila}
              className="border-dashed border-[#B7E4C7] text-[#1B4332] hover:bg-[#F0FAF5] h-9">
              <Plus className="w-4 h-4 mr-1.5" /> Agregar otra propiedad
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={guardar} disabled={loading} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] h-9">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {/* Año/Conservación muestran placeholder ("—") mientras no se elige nada, y
          el CSS global pinta gris cualquier input/select con placeholder visible
          (index.css) — acá se fuerza el mismo filo verde que el resto del form,
          esté elegido o no, para que no se vean "distintos" al resto de cajas. */}
      <style>{`.pv-force-green[role="combobox"] { border-color: #52B788 !important; background-color: #fff !important; }`}</style>
    </Dialog>
  );
};

export default PropiedadManualForm;
