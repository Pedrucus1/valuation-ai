import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, X, AlertTriangle, FilePlus2 } from "lucide-react";
import { toast } from "sonner";

const MAX_FILAS = 3;

const TIPOS = [
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "terreno", label: "Terreno" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "bodega", label: "Bodega" },
];

const CONSERVACIONES = ["Excelente", "Muy Bueno", "Bueno", "Regular", "Malo"];

const FILA_VACIA = {
  tipo: "casa", direccion: "", coto_edificio: "", colonia: "", municipio: "",
  precio: "", anio: "", m2_construccion: "", m2_terreno: "", recamaras: "",
  banos: "", medios_banos: "", estacionamientos: "", niveles: "", piso: "",
  conservacion: "", amenidades: "", descripcion: "", link: "",
};

const lbl = "text-xs font-semibold text-[#1B4332]";
const inputCls = "h-9 text-sm";

// Formulario compartido para dar de alta 1-3 propiedades a mano (sin plantilla).
// El backend es la única fuente de verdad de qué es obligatorio por tipo — este
// form no duplica esa validación, solo pinta los errores que regresa el server.
const PropiedadManualForm = ({ open, onOpenChange, endpoint, authHeaders = {}, onSuccess }) => {
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
        body: JSON.stringify({ filas }),
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Outfit'] text-[#1B4332] flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-[#52B788]" /> Agregar propiedad
          </DialogTitle>
          <DialogDescription>Captura hasta {MAX_FILAS} propiedades a mano, sin plantilla.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {filas.map((f, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-3 relative">
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

              {/* Ubicación */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

              {/* Números */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div><Label className={lbl}>Precio</Label><Input type="number" className={inputCls} value={f.precio} onChange={(e) => setCampo(i, "precio", e.target.value)} /></div>
                <div><Label className={lbl}>Año</Label><Input type="number" className={inputCls} value={f.anio} onChange={(e) => setCampo(i, "anio", e.target.value)} /></div>
                <div><Label className={lbl}>m²C</Label><Input type="number" className={inputCls} value={f.m2_construccion} onChange={(e) => setCampo(i, "m2_construccion", e.target.value)} /></div>
                <div><Label className={lbl}>m²T</Label><Input type="number" className={inputCls} value={f.m2_terreno} onChange={(e) => setCampo(i, "m2_terreno", e.target.value)} /></div>
                <div><Label className={lbl}>Niveles</Label><Input type="number" className={inputCls} value={f.niveles} onChange={(e) => setCampo(i, "niveles", e.target.value)} /></div>
                <div><Label className={lbl}>Recámaras</Label><Input type="number" className={inputCls} value={f.recamaras} onChange={(e) => setCampo(i, "recamaras", e.target.value)} /></div>
                <div><Label className={lbl}>Baños</Label><Input type="number" className={inputCls} value={f.banos} onChange={(e) => setCampo(i, "banos", e.target.value)} /></div>
                <div><Label className={lbl}>Medios baños</Label><Input type="number" className={inputCls} value={f.medios_banos} onChange={(e) => setCampo(i, "medios_banos", e.target.value)} /></div>
                <div><Label className={lbl}>Estacionamientos</Label><Input type="number" className={inputCls} value={f.estacionamientos} onChange={(e) => setCampo(i, "estacionamientos", e.target.value)} /></div>
                <div><Label className={lbl}>Piso</Label><Input type="number" className={inputCls} value={f.piso} onChange={(e) => setCampo(i, "piso", e.target.value)} /></div>
              </div>

              {/* Detalle */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="col-span-1">
                  <Label className={lbl}>Conservación</Label>
                  <Select value={f.conservacion} onValueChange={(v) => setCampo(i, "conservacion", v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{CONSERVACIONES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label className={lbl}>Amenidades</Label>
                  <Input className={inputCls} value={f.amenidades} onChange={(e) => setCampo(i, "amenidades", e.target.value)} placeholder="Alberca, Seguridad 24h..." />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <Label className={lbl}>Link de origen (opcional)</Label>
                  <Input type="url" className={inputCls} value={f.link} onChange={(e) => setCampo(i, "link", e.target.value)}
                    placeholder="https://..." />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <Label className={lbl}>Descripción</Label>
                  <Textarea rows={2} className="text-sm resize-none" value={f.descripcion} onChange={(e) => setCampo(i, "descripcion", e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          {filas.length < MAX_FILAS && (
            <Button type="button" variant="outline" onClick={agregarFila}
              className="w-full border-dashed border-[#B7E4C7] text-[#1B4332] hover:bg-[#F0FAF5] h-9">
              <Plus className="w-4 h-4 mr-1.5" /> Agregar otra propiedad
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={guardar} disabled={loading} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropiedadManualForm;
