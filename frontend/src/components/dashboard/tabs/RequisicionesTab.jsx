import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Search, Users, Bell, X, Phone, Mail, Building2, MapPinned, ListChecks, Plus,
} from "lucide-react";
import { toast } from "sonner";
import MapaAvaluos from "@/components/MapaAvaluos";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const RQ = `${API}/api/requisiciones`;

const TIPOS = [
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "terreno", label: "Terreno" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "bodega", label: "Bodega" },
];
const TIPO_LABEL = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));

const CRITERIOS_VACIOS = {
  tipo: "casa", municipio: "", colonia: "", precio_min: "", precio_max: "",
  recamaras_min: "", banos_min: "", m2_min: "", notas: "",
};

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString("es-MX")}` : "—");
const lbl = "text-xs font-semibold text-[#1B4332]";
const inputCls = "h-9 text-sm bg-white";

const diasRestantes = (expiraIso) => {
  const dias = Math.ceil((new Date(expiraIso) - new Date()) / 86400000);
  return dias > 0 ? dias : 0;
};

const criteriosResumen = (r) => {
  const partes = [r.municipio];
  if (r.colonia) partes.push(r.colonia);
  if (r.precio_max) partes.push(`hasta ${money(r.precio_max)}`);
  if (r.recamaras_min) partes.push(`${r.recamaras_min}+ rec`);
  if (r.banos_min) partes.push(`${r.banos_min}+ baños`);
  if (r.m2_min) partes.push(`${r.m2_min}+ m²c`);
  return partes.filter(Boolean).join(" · ");
};

const iniciales = (nombre) => (nombre || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

const Avatar = ({ foto, nombre, size = 32 }) => (
  foto ? (
    <img src={foto} alt={nombre} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-[#D9ED92]/50 text-[#1B4332] font-bold flex items-center justify-center shrink-0"
         style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {iniciales(nombre)}
    </div>
  )
);

const KpiTile = ({ label, valor, Icon, acento }) => (
  <Card className="bg-white border-0 shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className={`text-3xl font-bold font-['Outfit'] ${acento ? "text-red-600" : "text-[#1B4332]"}`}>{valor}</p>
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${acento ? "bg-red-50" : "bg-[#D9ED92]/40"}`}>
          <Icon className={`w-5 h-5 ${acento ? "text-red-500" : "text-[#1B4332]"}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ContactoChip = ({ contacto }) => {
  if (!contacto) return <span className="text-xs text-slate-400 italic">Sin contacto disponible</span>;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      <span className="flex items-center gap-1 font-semibold text-[#1B4332]"><Building2 className="w-3.5 h-3.5" />{contacto.company_name || contacto.empresa_afiliada || contacto.name}</span>
      {contacto.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{contacto.phone}</span>}
      {contacto.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{contacto.email}</span>}
    </div>
  );
};

const TarjetaMatch = ({ m }) => (
  <div className="rounded-lg border border-[#B7E4C7] bg-[#F0FAF5] p-3 space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-[#1B4332]">{m.colonia}, {m.municipio}</span>
      <span className="text-sm font-bold text-[#1B4332]">{money(m.precio)}</span>
    </div>
    <p className="text-xs text-slate-500">
      {m.m2_construccion ? `${m.m2_construccion} m²c · ` : ""}{m.recamaras ? `${m.recamaras} rec · ` : ""}{m.banos ? `${m.banos} baños` : ""}
    </p>
    <ContactoChip contacto={m.contacto} />
  </div>
);

const TarjetaFeed = ({ r }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3 flex gap-3">
    <Avatar foto={r.foto_asesor} nombre={r.nombre_asesor} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#1B4332]">{TIPO_LABEL[r.tipo] || r.tipo} · {criteriosResumen(r)}</span>
        <span className="text-[11px] text-slate-400 shrink-0">{diasRestantes(r.expira_en)}d restantes</span>
      </div>
      <p className="text-xs text-slate-500">{r.nombre_asesor}{r.empresa ? ` · ${r.empresa}` : ""}</p>
      {r.notas && <p className="text-xs text-slate-500 italic">{r.notas}</p>}
    </div>
  </div>
);

const TarjetaMia = ({ r, onCerrar }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className="text-sm font-bold text-[#1B4332]">{TIPO_LABEL[r.tipo] || r.tipo}</span>
        <p className="text-xs text-slate-500">{criteriosResumen(r)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {r.coincidencias_nuevas?.length > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5">
            {r.coincidencias_nuevas.length} nueva{r.coincidencias_nuevas.length > 1 ? "s" : ""}
          </span>
        )}
        <span className="text-[11px] text-slate-400">{diasRestantes(r.expira_en)}d restantes</span>
        <button type="button" onClick={() => onCerrar(r.id)} title="Cerrar requisición" className="text-slate-400 hover:text-red-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
    {r.notas && <p className="text-xs text-slate-500 italic">{r.notas}</p>}
    {r.coincidencias_nuevas?.length > 0 && (
      <div className="space-y-1.5 pt-1">
        {r.coincidencias_nuevas.map((m) => <TarjetaMatch key={m.id_unico} m={m} />)}
      </div>
    )}
  </div>
);

const NuevoRequerimientoModal = ({ open, onOpenChange, onCreated }) => {
  const [criterios, setCriterios] = useState({ ...CRITERIOS_VACIOS });
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);

  const setCampo = (campo, valor) => setCriterios((prev) => ({ ...prev, [campo]: valor }));

  const crear = async () => {
    if (!criterios.municipio.trim()) { toast.error("Municipio es obligatorio"); return; }
    setLoading(true);
    setMatches(null);
    try {
      const res = await fetch(RQ, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criterios),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo crear la requisición");
      setMatches(data.matches || []);
      if (data.matches?.length) {
        toast.success(`${data.matches.length} coincidencia${data.matches.length > 1 ? "s" : ""} encontrada${data.matches.length > 1 ? "s" : ""}`);
      } else {
        toast.info("Sin coincidencias por ahora — la requisición queda activa 15 días");
      }
      onCreated?.();
    } catch (e) {
      toast.error(e.message || "No se pudo crear la requisición");
    } finally {
      setLoading(false);
    }
  };

  const cerrar = () => {
    onOpenChange(false);
    setCriterios({ ...CRITERIOS_VACIOS });
    setMatches(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cerrar(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Outfit'] text-[#1B4332] flex items-center gap-2">
            <Search className="w-5 h-5 text-[#52B788]" /> Nuevo requerimiento
          </DialogTitle>
          <DialogDescription>Buscamos de inmediato en el mercado; si no hay nada, queda activa 15 días y te avisamos si algo calza.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-[#F8FAF8] p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className={lbl}>Tipo</Label>
              <Select value={criterios.tipo} onValueChange={(v) => setCampo("tipo", v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className={lbl}>Municipio</Label>
              <Input className={inputCls} value={criterios.municipio} onChange={(e) => setCampo("municipio", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Colonia (opcional)</Label>
              <Input className={inputCls} value={criterios.colonia} onChange={(e) => setCampo("colonia", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Precio mín.</Label>
              <Input type="number" className={inputCls} value={criterios.precio_min} onChange={(e) => setCampo("precio_min", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Precio máx.</Label>
              <Input type="number" className={inputCls} value={criterios.precio_max} onChange={(e) => setCampo("precio_max", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Recámaras mín.</Label>
              <Input type="number" className={inputCls} value={criterios.recamaras_min} onChange={(e) => setCampo("recamaras_min", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>Baños mín.</Label>
              <Input type="number" className={inputCls} value={criterios.banos_min} onChange={(e) => setCampo("banos_min", e.target.value)} />
            </div>
            <div>
              <Label className={lbl}>m²C mín.</Label>
              <Input type="number" className={inputCls} value={criterios.m2_min} onChange={(e) => setCampo("m2_min", e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Label className={lbl}>Notas (opcional)</Label>
              <Input className={inputCls} value={criterios.notas} onChange={(e) => setCampo("notas", e.target.value)} placeholder="Ej. cliente busca cerca de escuela X" />
            </div>
          </div>

          {matches !== null && matches.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-[#1B4332]">Coincidencias encontradas ahora:</p>
              {matches.map((m) => <TarjetaMatch key={m.id_unico} m={m} />)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cerrar} disabled={loading}>
            {matches !== null ? "Listo" : "Cancelar"}
          </Button>
          {matches === null && (
            <Button onClick={crear} disabled={loading} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] h-9">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar y publicar requerimiento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RequisicionesTab = () => {
  const [mias, setMias] = useState([]);
  const [feed, setFeed] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rMias, rFeed] = await Promise.all([
        fetch(`${RQ}/mias`, { credentials: "include" }),
        fetch(RQ, { credentials: "include" }),
      ]);
      if (rMias.ok) setMias(await rMias.json());
      if (rFeed.ok) setFeed(await rFeed.json());
    } catch {
      /* silencioso: el tab sigue usable */
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cerrar = async (id) => {
    try {
      const res = await fetch(`${RQ}/${id}/cerrar`, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error();
      cargar();
    } catch {
      toast.error("No se pudo cerrar la requisición");
    }
  };

  const totalNuevas = mias.reduce((acc, r) => acc + (r.coincidencias_nuevas?.length || 0), 0);

  const zonasConDemanda = useMemo(() => {
    const claves = new Set([...feed, ...mias].map((r) => `${r.colonia || ""}|${r.municipio}`));
    return claves.size;
  }, [feed, mias]);

  const puntosMapa = useMemo(() => (
    [...feed, ...mias]
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({ lat: r.lat, lng: r.lng, direccion: `${r.colonia ? r.colonia + ", " : ""}${r.municipio}`, tipo: TIPO_LABEL[r.tipo] || r.tipo }))
  ), [feed, mias]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-['Outfit'] font-bold text-[#1B4332] text-lg">Bolsa de Requerimientos</h2>
          <p className="text-xs text-slate-500">Requerimientos de clientes entre asesores e inmobiliarias de la red.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo requerimiento
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Mis requerimientos activos" valor={mias.length} Icon={ListChecks} />
        <KpiTile label="Coincidencias nuevas" valor={totalNuevas} Icon={Bell} acento={totalNuevas > 0} />
        <KpiTile label="Requerimientos en la red" valor={feed.length} Icon={Users} />
        <KpiTile label="Zonas con demanda" valor={zonasConDemanda} Icon={MapPinned} />
      </div>

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-base flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-[#52B788]" /> Zonas con demanda activa
          </h3>
        </div>
        <CardContent className="p-0">
          <MapaAvaluos valuaciones={puntosMapa} height={200} />
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-[#52B788]" /> Requerimientos de otros asesores
          </h3>
          <p className="text-xs text-slate-500">Si tienes algo que calce, contacta directamente al asesor.</p>
        </div>
        <CardContent className="p-4 space-y-2">
          {cargando ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cargando…</div>
          ) : feed.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay requerimientos activos de otros asesores por ahora.</p>
          ) : (
            feed.map((r) => <TarjetaFeed key={r.id} r={r} />)
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-['Outfit'] font-bold text-[#1B4332] text-base flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#52B788]" /> Mis requerimientos
          </h3>
          {totalNuevas > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2.5 py-1">{totalNuevas} nueva{totalNuevas > 1 ? "s" : ""}</span>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          {cargando ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cargando…</div>
          ) : mias.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aún no tienes requerimientos activos.</p>
          ) : (
            mias.map((r) => <TarjetaMia key={r.id} r={r} onCerrar={cerrar} />)
          )}
        </CardContent>
      </Card>

      <NuevoRequerimientoModal open={modalOpen} onOpenChange={setModalOpen} onCreated={cargar} />
    </div>
  );
};

export default RequisicionesTab;
