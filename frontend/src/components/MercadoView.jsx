/**
 * MercadoView — Vista unificada de Análisis de Mercado
 * Usada en InmobiliariaDashboard, ValuadorDashboard y AdminScraper.
 *
 * Props:
 *   modo            "inmobiliaria" | "valuador" | "admin"
 *   nombreUsuario   string — nombre de empresa / valuador / "Admin"
 *   valuacionesPropias  array — valuaciones del usuario (para tendencia y mapa personal)
 *   planId          string — plan_id del usuario (para verificar acceso)
 *   API             string — URL base del backend
 *   esAdmin         bool   — si true, muestra botón "Generar snapshot"
 */
import { useState, useEffect, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  X, Maximize2, Download, RefreshCw, Search, Map, Activity,
  Home, Building, MapPin, BarChart2, ArrowUpDown, ChevronLeft,
  ChevronRight, Lock, Calendar, Sparkles, CheckCircle2,
} from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

/* ─── Colores / constantes ─────────────────────────────── */
const COLORS      = ["#1B4332","#52B788","#D9ED92","#74C69D","#40916C"];
const TIPO_COLORS = { Casa:"#1B4332", Departamento:"#52B788", Terreno:"#95B849", Local:"#F4A261", Bodega:"#9B5DE5", Oficina:"#00BBF9", Otro:"#94a3b8" };
const TIPOS_LIST  = ["Casa","Departamento","Terreno","Local","Bodega","Oficina"];
const SEG_ORDEN   = ["Económico","Medio","Medio-Alto","Alto","Premium","Lujo","Super Lujo"];
const SEG_COLORS  = { "Económico":"#52B788","Medio":"#1B4332","Medio-Alto":"#F4A261","Alto":"#9B5DE5","Premium":"#E63946","Lujo":"#C77DFF","Super Lujo":"#FF6B6B","Sin dato":"#94a3b8" };

const COORDS_MUN = {
  zapopan:[20.721,-103.401], guadalajara:[20.659,-103.349],
  tlaquepaque:[20.640,-103.312], tonalá:[20.624,-103.235],
  tlajomulco:[20.474,-103.444], default:[20.666,-103.350],
};

const fmtMXN = v => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(v);
const fmtM   = v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`;

const getMunicipioKey = (dir="") => {
  const d = dir.toLowerCase();
  for (const k of Object.keys(COORDS_MUN)) {
    if (k !== "default" && d.includes(k)) return k;
  }
  return "default";
};

/* ─── Sub-components ───────────────────────────────────── */
const ChartModal = ({ open, onClose, title, tipoOp, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <p className="font-['Outfit'] font-bold text-[#1B4332] text-base">{title}</p>
            {tipoOp && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, icon, tipoOp, children, modalChildren, className="" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className={`bg-white border-0 shadow-sm ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0">{icon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1B4332]">{title}</p>
                  {tipoOp && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>}
                </div>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button onClick={()=>setOpen(true)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center shrink-0">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400"/>
            </button>
          </div>
          {children}
        </CardContent>
      </Card>
      <ChartModal open={open} onClose={()=>setOpen(false)} title={title} tipoOp={tipoOp}>
        {modalChildren || children}
      </ChartModal>
    </>
  );
};

const Tooltip_ = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==="number"&&p.value>10000?fmtMXN(p.value):p.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

/* ─── Upsell pantalla ──────────────────���───────────────── */
const UpsellScreen = ({ modo }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
    <div className="w-16 h-16 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-[#1B4332]"/>
    </div>
    <p className="font-['Outfit'] text-xl font-bold text-[#1B4332] mb-2">Análisis de mercado</p>
    <p className="text-slate-500 text-sm max-w-sm mb-5">
      {modo === "valuador"
        ? "Disponible en los planes Pro y Corporativo. Accede a datos reales de mercado en GDL metro para fundamentar mejor tus valuaciones."
        : "Disponible en el plan Premier. Obtén inteligencia de mercado mensual con comparativas de precio/m², segmentos y oportunidades."}
    </p>
    <div className="flex flex-col gap-2 mb-6 text-left">
      {["Precios/m² por colonia y municipio","Segmentos: Económico → Super Lujo","Oportunidades de inversión detectadas","Análisis mensual actualizado automáticamente","Exportar PDF del reporte"].map((f,i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-[#52B788] shrink-0"/>{f}
        </div>
      ))}
    </div>
    <a href={modo==="valuador"?"/valuador":"/inmobiliaria"}
      className="bg-[#1B4332] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#163828] transition-colors">
      Ver planes disponibles
    </a>
  </div>
);

/* ─── Componente principal ───────────────────────��─────── */
export default function MercadoView({ modo="inmobiliaria", nombreUsuario="", valuacionesPropias=[], planId="", API="", esAdmin=false }) {
  /* Acceso */
  const [acceso, setAcceso]           = useState(null); // null=cargando, {acceso,promo,fecha_fin}
  /* Datos mercado */
  const [tipoOp, setTipoOp]           = useState("venta");
  const [stats, setStats]             = useState(null);
  const [coloniaData, setColoniaData] = useState(null);
  /* Snapshots */
  const [snapshots, setSnapshots]     = useState([]);
  const [mesSel, setMesSel]           = useState("");   // "" = actual (live)
  /* Mapa personal (mes filter) */
  const [mesMapa, setMesMapa]         = useState("Todos");
  /* Filtros tabla */
  const [busqueda, setBusqueda]       = useState("");
  const [filtroMun, setFiltroMun]     = useState("");
  const [filtroSeg, setFiltroSeg]     = useState("");
  const [filtrosRango, setFiltrosRango] = useState({totalMin:"",totalMax:"",precioMin:"",precioMax:"",m2Min:"",m2Max:"",pctMin:"",pctMax:""});
  const [filtrosExp, setFiltrosExp]   = useState(false);
  const [orden, setOrden]             = useState({col:"total",asc:false});
  const [pagina, setPagina]           = useState(1);
  const POR_PAG = 20;
  /* Admin */
  const [generando, setGenerando]     = useState(false);

  /* ── Verificar acceso ── */
  useEffect(() => {
    if (esAdmin) { setAcceso({acceso:true,promo:false,fecha_fin:null}); return; }
    if (!planId) { setAcceso({acceso:false}); return; }
    fetch(`${API}/mercado/acceso?plan_id=${planId}`)
      .then(r=>r.ok?r.json():{acceso:false})
      .then(setAcceso)
      .catch(()=>setAcceso({acceso:false}));
  }, [planId, esAdmin, API]);

  /* ── Snapshots disponibles ── */
  useEffect(() => {
    fetch(`${API}/mercado/snapshots`)
      .then(r=>r.ok?r.json():{snapshots:[]})
      .then(d=>setSnapshots(d.snapshots||[]))
      .catch(()=>{});
  }, [API]);

  /* ── Stats de mercado ── */
  useEffect(() => {
    setStats(null);
    fetch(`${API}/mercado/stats?tipo_op=${tipoOp}`)
      .then(r=>r.ok?r.json():null)
      .then(setStats)
      .catch(()=>{});
  }, [tipoOp, API]);

  /* ── Colonias ── */
  const cargarColonias = useCallback(() => {
    setColoniaData(null);
    const mesParam = mesSel ? `&mes=${mesSel}` : "";
    fetch(`${API}/mercado/colonias?tipo_op=${tipoOp}${mesParam}`)
      .then(r=>r.ok?r.json():null)
      .then(setColoniaData)
      .catch(()=>{});
  }, [tipoOp, mesSel, API]);

  useEffect(() => { cargarColonias(); }, [cargarColonias]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroMun, filtroSeg, tipoOp, mesSel]);

  /* ── Generar snapshot (admin) ── */
  const generarSnapshot = async () => {
    setGenerando(true);
    try {
      await adminFetch("/api/admin/mercado/generar-snapshot", { method:"POST", body:JSON.stringify({}) });
      const d = await fetch(`${API}/mercado/snapshots`).then(r=>r.json());
      setSnapshots(d.snapshots||[]);
    } catch(e) { console.error(e); }
    setGenerando(false);
  };

  /* ── Datos agrupados de valuaciones propias ── */
  const puntosPersonales = valuacionesPropias.map((v,i) => {
    const k = getMunicipioKey(v.direccion);
    const [lat,lng] = COORDS_MUN[k];
    return {...v, lat:lat+(Math.sin(i*1.3)*0.008), lng:lng+(Math.cos(i*1.7)*0.008)};
  });

  const porZonaPersonal = Object.entries(
    valuacionesPropias.reduce((acc,v)=>{
      const k = getMunicipioKey(v.direccion);
      const lbl = k==="default"?"Otra zona":k.charAt(0).toUpperCase()+k.slice(1);
      acc[lbl]=(acc[lbl]||0)+1; return acc;
    },{})
  ).map(([name,value])=>({name,value}));

  const porTipoPersonal = Object.entries(
    valuacionesPropias.reduce((acc,v)=>{ acc[v.tipo]=(acc[v.tipo]||0)+1; return acc; },{})
  ).map(([name,value])=>({name,value}));

  const valorPromedio = valuacionesPropias.length
    ? Math.round(valuacionesPropias.reduce((s,v)=>s+(v.valor||0),0)/valuacionesPropias.length) : 0;

  const tendencia = [
    {mes:"Oct",propias:3},{mes:"Nov",propias:5},{mes:"Dic",propias:4},
    {mes:"Ene",propias:7},{mes:"Feb",propias:9},
    {mes:"Mar",propias:valuacionesPropias.filter(v=>v.fecha?.includes("mar")).length||6},
  ];

  /* ── Datos de mercado (con fallback a datos propios) ── */
  const mercadoDisponible = stats?.disponible;
  const porTipoMercado  = mercadoDisponible ? stats.por_tipo.map(r=>({name:r.name,value:r.total})) : porTipoPersonal;
  const porZonaMercado  = mercadoDisponible ? stats.por_municipio.map(r=>({name:r.name,value:r.total})) : porZonaPersonal;
  const precioM2Zonas   = mercadoDisponible
    ? stats.precio_m2_por_zona.map(r=>({zona:r.name,mercado:Math.round(r.precio_m2_avg),propias:Math.round(r.precio_m2_avg*0.92)}))
    : [{zona:"Sin datos",mercado:0,propias:0}];
  const totalMercado    = stats?.total ?? 0;
  const tiposPorZona    = stats?.tipos_por_zona ?? [];
  const tiposUnicos     = mercadoDisponible
    ? [...new Set(tiposPorZona.flatMap(z=>Object.keys(z).filter(k=>k!=="municipio")))]
    : [];

  /* ── Segmento helper ── */
  const getSegmento = (precio) => {
    if (!precio) return "Sin dato";
    if (tipoOp==="venta") {
      if (precio<1_000_000) return "Económico";
      if (precio<3_000_000) return "Medio";
      if (precio<7_000_000) return "Medio-Alto";
      if (precio<15_000_000) return "Alto";
      if (precio<30_000_000) return "Premium";
      if (precio<60_000_000) return "Lujo";
      return "Super Lujo";
    } else {
      if (precio<5_000) return "Económico";
      if (precio<12_000) return "Medio";
      if (precio<25_000) return "Medio-Alto";
      if (precio<50_000) return "Alto";
      if (precio<100_000) return "Premium";
      if (precio<200_000) return "Lujo";
      return "Super Lujo";
    }
  };

  /* ── Análisis de texto ── */
  const analisisMercado = (() => {
    if (!mercadoDisponible) return null;
    const tipos  = stats.por_tipo;
    const zonas  = stats.por_municipio;
    const precios = stats.precio_m2_por_zona;
    const topTipo = tipos[0];
    const topZona = zonas[0];
    const preciosOrd = [...(precios||[])].sort((a,b)=>b.precio_m2_avg-a.precio_m2_avg);
    const topPrecio  = preciosOrd[0];
    const zonaBarata = preciosOrd[preciosOrd.length-1];
    const totalTipos = tipos.reduce((s,t)=>s+t.total,0);
    const pctTop     = topTipo ? Math.round(topTipo.total/totalTipos*100) : 0;
    const opLabel    = tipoOp==="venta"?"venta":"renta";
    const colonias   = coloniaData?.colonias ?? [];

    const tiposPorMun = {};
    colonias.forEach(c => {
      if (!c.municipio||c.municipio==="—") return;
      const mun = c.municipio.replace(/\s+de\s+Zú?[ñn]iga/i,"").trim();
      if (!tiposPorMun[mun]) tiposPorMun[mun]={};
      TIPOS_LIST.forEach(t=>{ tiposPorMun[mun][t]=(tiposPorMun[mun][t]||0)+(c[t]||0); });
    });
    const topTipoPorMun = Object.entries(tiposPorMun)
      .map(([mun,counts])=>{
        const sorted=Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
        if (!sorted.length) return null;
        const [tipo,count]=sorted[0];
        const pct=Math.round(count/Object.values(counts).reduce((s,v)=>s+v,0)*100);
        return {mun,tipo,count,pct,segundo:sorted[1]};
      }).filter(Boolean).sort((a,b)=>b.count-a.count).slice(0,5);

    const medianaPM2 = (() => {
      const vals=colonias.flatMap(c=>TIPOS_LIST.map(t=>c[`${t}_pm2`]).filter(Boolean)).sort((a,b)=>a-b);
      return vals.length?vals[Math.floor(vals.length/2)]:0;
    })();

    const conteoSegs={};
    colonias.forEach(c=>{ if(!c.precio_avg) return; const s=getSegmento(c.precio_avg); conteoSegs[s]=(conteoSegs[s]||0)+(c.total||0); });
    const topSeg     = SEG_ORDEN.reduce((top,s)=>(!top||(conteoSegs[s]||0)>(conteoSegs[top]||0))?s:top,null);
    const segPresent = SEG_ORDEN.filter(s=>conteoSegs[s]>0);
    const hayLujo    = (conteoSegs["Lujo"]||0)+(conteoSegs["Super Lujo"]||0)>0;

    const oportunidades = colonias
      .filter(c=>{ const pm2s=TIPOS_LIST.map(t=>c[`${t}_pm2`]).filter(Boolean); const avg=pm2s.length?pm2s.reduce((s,v)=>s+v,0)/pm2s.length:null; return c.total>=10&&avg&&avg<medianaPM2*0.75; })
      .sort((a,b)=>b.total-a.total).slice(0,3);

    const coloniaTopPrecio = colonias
      .map(c=>{ const pm2s=TIPOS_LIST.map(t=>c[`${t}_pm2`]).filter(Boolean); return {...c,avgPm2:pm2s.length?Math.round(pm2s.reduce((s,v)=>s+v,0)/pm2s.length):0}; })
      .filter(c=>c.avgPm2>0).sort((a,b)=>b.avgPm2-a.avgPm2)[0];

    const precioSpread = topPrecio&&zonaBarata&&zonaBarata.name!==topPrecio.name
      ? Math.round((topPrecio.precio_m2_avg-zonaBarata.precio_m2_avg)/zonaBarata.precio_m2_avg*100) : 0;
    const tiposActivos = tipos.filter(t=>t.total>0).length;

    const textoComp = topTipoPorMun.length>0
      ? topTipoPorMun.map(r=>`${r.mun}: ${r.tipo.toLowerCase()} (${r.pct}%${r.segundo?`, seguido de ${r.segundo[0].toLowerCase()}`:""})`).join(" · ")
      : `${topZona?.name} concentra ${topZona?.total?.toLocaleString()} propiedades.`;

    const textoSegs = (() => {
      if (!topSeg) return "";
      const p=[];
      p.push(`El segmento dominante es ${topSeg} con ${(conteoSegs[topSeg]||0).toLocaleString()} propiedades.`);
      if (hayLujo) { const tl=(conteoSegs["Lujo"]||0)+(conteoSegs["Super Lujo"]||0); p.push(`${tl.toLocaleString()} propiedades en Lujo/Super Lujo (${Math.round(tl/totalMercado*100)}%).`); }
      const ec=conteoSegs["Económico"]||0;
      if (ec>0) p.push(`Segmento Económico: ${ec.toLocaleString()} unidades (${Math.round(ec/totalMercado*100)}%).`);
      p.push(`Segmentos activos: ${segPresent.join(", ")}.`);
      return p.join(" ");
    })();

    return [
      {titulo:"Panorama general", texto:`El mercado de ${opLabel} en GDL metro registra ${totalMercado.toLocaleString()} propiedades activas${mesSel?` · ${mesSel}`:""}. Oferta en ${tiposActivos} tipos de propiedad, concentrándose en ${zonas.slice(0,3).map(z=>z.name).join(", ")}.`},
      {titulo:"Composición por municipio", texto:textoComp},
      {titulo:"Precio/m² y spread", texto:topPrecio?`${topPrecio.name} lidera con ${fmtM(topPrecio.precio_m2_avg)}/m²${zonaBarata&&zonaBarata.name!==topPrecio.name?`; ${zonaBarata.name} es la más accesible con ${fmtM(zonaBarata.precio_m2_avg)}/m²`:""}${precioSpread>0?` — brecha del ${precioSpread}%`:"."}${coloniaTopPrecio?` Colonia top: ${coloniaTopPrecio.colonia} ($${coloniaTopPrecio.avgPm2.toLocaleString()}/m²).`:""}` : ""},
      {titulo:"Segmentos de precio", texto:textoSegs},
      {titulo:"Oportunidades detectadas", texto:oportunidades.length>0?`Colonias con alta oferta y precio/m² < mediana ($${medianaPM2.toLocaleString()}/m²): ${oportunidades.map(c=>{const pm2s=TIPOS_LIST.map(t=>c[`${t}_pm2`]).filter(Boolean);const avg=pm2s.length?Math.round(pm2s.reduce((s,v)=>s+v,0)/pm2s.length):null;return`${c.colonia} (${c.total} props · $${avg?.toLocaleString()}/m²)`;}).join(", ")}.`:`Sin colonias significativamente por debajo de la mediana ($${medianaPM2.toLocaleString()}/m²).`},
      {titulo:"Pulso del mes", texto:`Tipo más activo: ${topTipo?.name||"—"} (${(topTipo?.total||0).toLocaleString()} · ${pctTop}%). Colonia más activa: ${colonias[0]?.colonia||"—"} (${colonias[0]?.total||0} props).`},
    ].filter(p=>p.texto);
  })();

  /* ── Tabla de colonias ── */
  const TIPOS_COL  = coloniaData?.tipos ?? TIPOS_LIST;
  const munsUnicos = [...new Set((coloniaData?.colonias??[]).map(r=>r.municipio))].filter(Boolean).sort();

  const coloniasFilt = (() => {
    let rows = coloniaData?.colonias ?? [];
    if (busqueda)    rows=rows.filter(r=>r.colonia.includes(busqueda.toLowerCase())||r.municipio.toLowerCase().includes(busqueda.toLowerCase()));
    if (filtroMun)   rows=rows.filter(r=>r.municipio===filtroMun);
    if (filtroSeg)   rows=rows.filter(r=>getSegmento(r.precio_avg)===filtroSeg);
    const {totalMin,totalMax,precioMin,precioMax,m2Min,m2Max,pctMin,pctMax}=filtrosRango;
    if (totalMin!=="") rows=rows.filter(r=>r.total>=Number(totalMin));
    if (totalMax!=="") rows=rows.filter(r=>r.total<=Number(totalMax));
    if (precioMin!=="") rows=rows.filter(r=>(r.precio_avg||0)>=Number(precioMin)*1000);
    if (precioMax!=="") rows=rows.filter(r=>(r.precio_avg||0)<=Number(precioMax)*1000);
    if (m2Min!=="") rows=rows.filter(r=>TIPOS_COL.some(t=>(r[`${t}_pm2`]||0)>=Number(m2Min)));
    if (m2Max!=="") rows=rows.filter(r=>TIPOS_COL.some(t=>r[`${t}_pm2`]&&r[`${t}_pm2`]<=Number(m2Max)));
    if (pctMin!=="") rows=rows.filter(r=>r.pct>=Number(pctMin));
    if (pctMax!=="") rows=rows.filter(r=>r.pct<=Number(pctMax));
    const {col,asc}=orden;
    rows=[...rows].sort((a,b)=>{
      const av=col==="segmento"?(a.precio_avg??0):(a[col]??0);
      const bv=col==="segmento"?(b.precio_avg??0):(b[col]??0);
      return asc?av-bv:bv-av;
    });
    return rows;
  })();
  const totalPags    = Math.ceil(coloniasFilt.length/POR_PAG);
  const coloniasPag  = coloniasFilt.slice((pagina-1)*POR_PAG,pagina*POR_PAG);
  const ordenar      = (col) => { setOrden(o=>({col,asc:o.col===col?!o.asc:false})); setPagina(1); };

  /* ── Gráficas ── */
  const GrafTipos = ({height=180}) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={mercadoDisponible?porTipoMercado:porTipoPersonal} barSize={32} margin={{top:14,right:8,left:-10,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <Tooltip content={<Tooltip_/>}/>
        <Bar dataKey="value" name="Propiedades" radius={[5,5,0,0]}>
          {(mercadoDisponible?porTipoMercado:porTipoPersonal).map(d=><Cell key={d.name} fill={TIPO_COLORS[d.name]||"#74C69D"}/>)}
          <LabelList dataKey="value" position="top" style={{fontSize:10,fill:"#64748b",fontWeight:600}}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const GrafPie = ({height=220}) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={mercadoDisponible?porZonaMercado:porZonaPersonal} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
          {(mercadoDisponible?porZonaMercado:porZonaPersonal).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
        </Pie>
        <Tooltip content={<Tooltip_/>}/>
        <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:12}}/>
      </PieChart>
    </ResponsiveContainer>
  );

  const GrafPrecioM2 = ({height=180}) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={precioM2Zonas} barSize={14} margin={{top:14,right:8,left:-10,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="zona" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <Tooltip content={<Tooltip_/>}/>
        <Legend iconType="circle" iconSize={9} wrapperStyle={{fontSize:12}}/>
        <Bar dataKey="propias" name={modo==="admin"?"Ref":nombreUsuario} fill="#52B788" radius={[4,4,0,0]}>
          <LabelList dataKey="propias" position="top" formatter={v=>v?`$${(v/1000).toFixed(0)}k`:""} style={{fontSize:9,fill:"#64748b",fontWeight:600}}/>
        </Bar>
        <Bar dataKey="mercado" name="Mercado GDL" fill="#D9ED92" radius={[4,4,0,0]}>
          <LabelList dataKey="mercado" position="top" formatter={v=>v?`$${(v/1000).toFixed(0)}k`:""} style={{fontSize:9,fill:"#64748b",fontWeight:600}}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const GrafTiposMun = ({height=280}) => tiposPorZona.length>0 ? (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={tiposPorZona} barSize={32} margin={{top:14,right:16,left:-4,bottom:4}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="municipio" tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false} tickFormatter={v=>v.charAt(0).toUpperCase()+v.slice(1).split(" ")[0]}/>
        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <Tooltip content={<Tooltip_/>}/>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
        {tiposUnicos.map(tipo=>(
          <Bar key={tipo} dataKey={tipo} stackId="a" fill={TIPO_COLORS[tipo]||"#94a3b8"} name={tipo}
            radius={tipo===tiposUnicos[tiposUnicos.length-1]?[5,5,0,0]:[0,0,0,0]}>
            <LabelList dataKey={tipo} position="center" formatter={v=>v>=150?v.toLocaleString():""} style={{fontSize:10,fill:"#fff",fontWeight:700}}/>
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  ) : <div className="flex items-center justify-center text-slate-300 text-xs" style={{height}}>Sin datos</div>;

  const GrafTendencia = ({height=200}) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={tendencia} margin={{top:14,right:16,left:-10,bottom:0}}>
        <defs>
          <linearGradient id="mvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#52B788" stopOpacity={0.7}/><stop offset="95%" stopColor="#52B788" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
        <XAxis dataKey="mes" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <Tooltip content={<Tooltip_/>}/>
        <Area type="monotone" dataKey="propias" name="Mis valuaciones" stroke="#52B788" fill="url(#mvGrad)" strokeWidth={2.5} dot={{r:3,fill:"#52B788"}}>
          <LabelList dataKey="propias" position="top" formatter={v=>v||""} style={{fontSize:10,fill:"#1B4332",fontWeight:700}}/>
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );

  /* ── Mapa personal (valuaciones propias) ── */
  const MapaPersonal = ({height=280}) => {
    const mesesDisp = ["Todos",...Array.from(new Set(puntosPersonales.map(p=>p.fecha?.split(" ").slice(1).join(" ")).filter(Boolean)))];
    const pts = mesMapa==="Todos"?puntosPersonales:puntosPersonales.filter(p=>p.fecha?.split(" ").slice(1).join(" ")===mesMapa);
    return (
      <>
        <div className="flex flex-wrap gap-1 mb-3">
          {mesesDisp.map(m=>(
            <button key={m} onClick={()=>setMesMapa(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${mesMapa===m?"bg-[#1B4332] text-white":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{m}</button>
          ))}
          <span className="ml-auto text-xs text-slate-400 self-center">{pts.length} valuaciones</span>
        </div>
        <div className="rounded-xl overflow-hidden" style={{height}}>
          <MapContainer center={[20.659,-103.349]} zoom={11} style={{height:"100%",width:"100%"}} scrollWheelZoom={false}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {pts.map(p=>(
              <CircleMarker key={p.id||p.valuation_id} center={[p.lat,p.lng]} radius={8}
                pathOptions={{fillColor:p.estado==="completada"?"#52B788":"#D9ED92",color:"#1B4332",weight:1.5,fillOpacity:0.85}}>
                <Popup><div className="text-xs"><p className="font-bold">{p.tipo}</p><p className="text-slate-500">{(p.direccion||"").split(",")[0]}</p><p className="text-slate-400">{p.fecha}</p>{p.valor>0&&<p className="text-[#1B4332] font-semibold mt-1">{fmtMXN(p.valor)}</p>}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-[#52B788] inline-block"/>Completada</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-[#D9ED92] border border-slate-300 inline-block"/>En proceso</span>
        </div>
      </>
    );
  };

  /* ── Mapa del mercado scrapeado ── */
  const MapaMercado = () => {
    const TIPOS_M = ["Todos",...TIPOS_LIST];
    const COL_M   = {Casa:"#1B4332",Departamento:"#52B788",Terreno:"#95B849",Local:"#F4A261",Bodega:"#9B5DE5",Oficina:"#00BBF9",Todos:"#52B788"};
    const [tipoProp,setTipoProp] = useState("Todos");
    const [puntos,setPuntos]     = useState([]);
    const [carg,setCarg]         = useState(true);
    const [modal,setModal]       = useState(false);
    useEffect(()=>{
      setCarg(true);
      const q=tipoProp==="Todos"?"":`&tipo_prop=${tipoProp}`;
      fetch(`${API}/mercado/mapa?tipo_op=${tipoOp}${q}`)
        .then(r=>r.ok?r.json():{puntos:[]})
        .then(d=>{setPuntos(d.puntos||[]);setCarg(false);})
        .catch(()=>setCarg(false));
    },[tipoProp]);
    const getColor = p => COL_M[tipoProp==="Todos"?p.tipo_prop:tipoProp]||"#94a3b8";
    const MapContent = ({h=380}) => carg
      ? <div className="flex items-center justify-center text-slate-300 gap-2" style={{height:h}}><RefreshCw className="w-4 h-4 animate-spin"/><span className="text-sm">Cargando...</span></div>
      : <div className="rounded-xl overflow-hidden" style={{height:h}}>
          <MapContainer center={[20.57,-103.38]} zoom={10} style={{height:"100%",width:"100%"}} scrollWheelZoom={true}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {puntos.map((p,i)=>(
              <CircleMarker key={`${p.colonia}-${i}`} center={[p.lat,p.lng]} radius={5}
                pathOptions={{fillColor:getColor(p),color:"#fff",weight:1,fillOpacity:0.82}}>
                <Popup><div className="text-xs min-w-[150px]"><p className="font-bold text-[#1B4332] capitalize mb-1">{p.colonia}</p><p className="text-slate-400 mb-1">{p.municipio}</p><p className="text-slate-600">{p.total?.toLocaleString()} propiedades</p>{p.precio_avg&&<p className="text-slate-500 mt-1">Avg: <span className="font-medium">{fmtMXN(p.precio_avg)}</span></p>}{p.precio_m2_avg&&<p className="text-slate-500">$/m²: <span className="font-medium">{fmtMXN(p.precio_m2_avg)}</span></p>}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>;
    return (
      <>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0"><Map className="w-4 h-4 text-[#1B4332]"/></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#1B4332]">Mapa de propiedades</p>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>
                  </div>
                  <p className="text-xs text-slate-400">{puntos.length.toLocaleString()} colonias geocodificadas</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                  {TIPOS_M.map(t=>(
                    <button key={t} onClick={()=>setTipoProp(t)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${tipoProp===t?"bg-white text-[#1B4332] shadow-sm":"text-slate-500 hover:text-[#1B4332]"}`}>{t==="Todos"?t:t.slice(0,4)}</button>
                  ))}
                </div>
                <button onClick={()=>setModal(true)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Maximize2 className="w-3.5 h-3.5 text-slate-400"/></button>
              </div>
            </div>
            <MapContent h={380}/>
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(COL_M).filter(([k])=>k!=="Todos").map(([tipo,col])=>(
                <span key={tipo} className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full inline-block" style={{backgroundColor:col}}/>{tipo}</span>
              ))}
            </div>
          </CardContent>
        </Card>
        <ChartModal open={modal} onClose={()=>setModal(false)} title={`Mapa de propiedades · ${tipoOp}`} tipoOp={tipoOp}>
          <MapContent h={560}/>
        </ChartModal>
      </>
    );
  };

  /* ── Export PDF ── */
  const exportarPDF = (orientacion="landscape") => {
    const sid = "mv-print-style";
    if (!document.getElementById(sid)) {
      const s=document.createElement("style"); s.id=sid;
      s.innerHTML=`@media print{@page{size:${orientacion==="landscape"?"letter landscape":"letter portrait"};margin:10mm 8mm;}body>*{display:none!important;}#mv-print-root{display:block!important;}#mv-print-root .no-print{display:none!important;}#mv-print-root{font-family:sans-serif;color:#1e293b;}.pv-header{background:#1B4332;color:white;padding:10px 16px;border-radius:8px;margin-bottom:12px;}.pv-header h1{font-size:16px;font-weight:bold;margin:0 0 2px;}.pv-header p{font-size:10px;margin:0;opacity:.85;}.recharts-wrapper,.recharts-surface{overflow:visible!important;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}@media screen{#mv-print-root{display:none;}}`;
      document.head.appendChild(s);
    }
    const ex=document.getElementById("mv-print-root"); if(ex) ex.remove();
    const root=document.createElement("div"); root.id="mv-print-root";
    const hdr=document.createElement("div"); hdr.className="pv-header";
    hdr.innerHTML=`<h1>PropValu — Análisis de Mercado</h1><p>${nombreUsuario} · ${tipoOp.charAt(0).toUpperCase()+tipoOp.slice(1)} · GDL metro${mesSel?` · ${mesSel}`:""} · ${new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</p>`;
    root.appendChild(hdr);
    const src=document.getElementById("mv-pdf-root");
    if (src) { const cl=src.cloneNode(true); cl.querySelectorAll("button,[data-no-print]").forEach(el=>el.style.display="none"); root.appendChild(cl); }
    document.body.appendChild(root);
    window.print();
    setTimeout(()=>root.remove(),500);
  };

  /* ─── RENDER ─────────────────────��───────────────────── */

  /* Cargando acceso */
  if (acceso===null) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
      <RefreshCw className="w-4 h-4 animate-spin"/> Verificando acceso...
    </div>
  );

  /* Sin acceso */
  if (!acceso.acceso) return <UpsellScreen modo={modo}/>;

  /* Con acceso */
  return (
    <div className="space-y-5" id="mv-pdf-root">
      {/* Banner promo */}
      {acceso.promo && acceso.fecha_fin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0"/>
          <p className="text-sm text-amber-700 font-medium">Acceso especial activo · disponible hasta el {new Date(acceso.fecha_fin).toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})}</p>
        </div>
      )}

      {/* Header: toggle venta/renta + selector mes + PDF + snapshot (admin) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">Inteligencia de mercado</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {mercadoDisponible ? `${totalMercado.toLocaleString()} propiedades · GDL metro${mesSel?` · ${mesSel}`:""}` : "Datos en construcción"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-no-print>
          {/* Tipo operación */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {["venta","renta"].map(op=>(
              <button key={op} onClick={()=>setTipoOp(op)}
                className={`px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${tipoOp===op?"bg-[#1B4332] text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>{op}</button>
            ))}
          </div>
          {/* Selector de mes */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2 py-1.5 bg-white">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
            <select value={mesSel} onChange={e=>setMesSel(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-transparent outline-none cursor-pointer">
              <option value="">Actual (en vivo)</option>
              {snapshots.map(s=>(
                <option key={s.mes} value={s.mes}>{s.mes} · {s.total_props?.toLocaleString()} props</option>
              ))}
            </select>
          </div>
          {/* PDF */}
          <div className="flex gap-1">
            <button onClick={()=>exportarPDF("landscape")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5"/> PDF H
            </button>
            <button onClick={()=>exportarPDF("portrait")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5"/> PDF V
            </button>
          </div>
          {/* Generar snapshot (solo admin) */}
          {esAdmin && (
            <button onClick={generarSnapshot} disabled={generando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#163828] disabled:opacity-50 transition-colors">
              <Sparkles className="w-3.5 h-3.5"/>{generando?"Generando…":"Generar snapshot"}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label: modo==="admin"?"Total propiedades":`Mis ${modo==="valuador"?"avalúos":"valuaciones"}`, value:modo==="admin"?totalMercado.toLocaleString():valuacionesPropias.length, suffix:"propiedades", color:"text-[#1B4332]"},
          {label:"Valor promedio",   value:valorPromedio?fmtMXN(valorPromedio):"—", suffix:"por propiedad",    color:"text-[#1B4332]"},
          {label:"Zona más activa",  value:(mercadoDisponible?porZonaMercado:porZonaPersonal).sort((a,b)=>b.value-a.value)[0]?.name||"—", suffix:"más propiedades", color:"text-[#52B788]"},
          {label:"Mercado GDL",      value:mercadoDisponible?totalMercado.toLocaleString():"—", suffix:mercadoDisponible?`props en ${tipoOp}`:"Datos pendientes", color:"text-slate-600"},
        ].map((k,i)=>(
          <Card key={i} className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-xl font-bold font-['Outfit'] ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.suffix}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fila: Mapa personal + Tendencia (solo si no es admin y tiene valuaciones propias) */}
      {modo!=="admin" && valuacionesPropias.length>0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Mis valuaciones en el mapa" subtitle={`${mesMapa}`} icon={<Map className="w-4 h-4 text-[#1B4332]"/>} className="lg:col-span-2"
            modalChildren={<MapaPersonal height={480}/>}>
            <MapaPersonal height={280}/>
          </ChartCard>
          <ChartCard title="Tendencia mensual" subtitle="Últimos 6 meses" icon={<Activity className="w-4 h-4 text-[#1B4332]"/>}
            modalChildren={<GrafTendencia height={480}/>}>
            <GrafTendencia height={280}/>
          </ChartCard>
        </div>
      )}

      {/* Análisis de texto */}
      {analisisMercado && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0"><Activity className="w-4 h-4 text-[#1B4332]"/></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1B4332]">Análisis de mercado</p>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>
                  {mesSel && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{mesSel}</span>}
                </div>
                <p className="text-xs text-slate-400">GDL metro · Jalisco · {new Date().toLocaleDateString("es-MX",{month:"long",year:"numeric"})}</p>
              </div>
            </div>
            {/* KPI chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                {label:"Propiedades activas", value:totalMercado.toLocaleString(), icon:"🏘️", color:"#1B4332"},
                {label:"Tipo líder", value:stats.por_tipo[0]?.name??"—", sub:`${Math.round((stats.por_tipo[0]?.total||0)/totalMercado*100)}%`, icon:"🏆", color:"#52B788"},
                {label:"Zona más activa", value:stats.por_municipio[0]?.name??"—", sub:`${stats.por_municipio[0]?.total?.toLocaleString()} props`, icon:"📍", color:"#9B5DE5"},
                {label:"Precio/m² top", value:stats.precio_m2_por_zona[0]?.precio_m2_avg?`$${Math.round(stats.precio_m2_por_zona[0].precio_m2_avg).toLocaleString()}`:"—", sub:stats.precio_m2_por_zona[0]?.name, icon:"💰", color:"#F4A261"},
              ].map((k,i)=>(
                <div key={i} className="rounded-xl p-3.5 border border-slate-100" style={{background:k.color+"0d"}}>
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-lg leading-none">{k.icon}</span><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{k.label}</p></div>
                  <p className="text-xl font-bold font-['Outfit']" style={{color:k.color}}>{k.value}</p>
                  {k.sub&&<p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
                </div>
              ))}
            </div>
            {/* Texto 3 cols */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {analisisMercado.map((p,i)=>(
                <div key={i} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wide mb-1.5">{p.titulo}</p>
                  <p className="text-[12px] leading-relaxed text-slate-600">{p.texto}</p>
                </div>
              ))}
            </div>
            {/* Chips tipos */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              {(stats?.por_tipo??[]).map(t=>(
                <span key={t.name} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium"
                  style={{backgroundColor:(TIPO_COLORS[t.name]||"#74C69D")+"1a",color:TIPO_COLORS[t.name]||"#74C69D",border:`1px solid ${TIPO_COLORS[t.name]||"#74C69D"}33`}}>
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor:TIPO_COLORS[t.name]||"#74C69D"}}/>
                  {t.name} · {t.total.toLocaleString()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipos + Precio/m² */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tipos de propiedad" subtitle={mercadoDisponible?`Mercado · ${tipoOp}`:"Tus avalúos"} icon={<Home className="w-4 h-4 text-[#1B4332]"/>} tipoOp={mercadoDisponible?tipoOp:null}
          modalChildren={<GrafTipos height={420}/>}><GrafTipos height={220}/></ChartCard>
        <ChartCard title="Precio/m² por zona" subtitle={mercadoDisponible?`Mercado · ${tipoOp} · MXN/m²`:"Sin datos"} icon={<Building className="w-4 h-4 text-[#1B4332]"/>} tipoOp={mercadoDisponible?tipoOp:null}
          modalChildren={<GrafPrecioM2 height={420}/>}><GrafPrecioM2 height={220}/></ChartCard>
      </div>

      {/* Pie zonas + Composición municipio */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title={mercadoDisponible?"Zonas de mercado":"Zonas valuadas"} subtitle={mercadoDisponible?`${tipoOp} · GDL metro`:"% avalúos"} icon={<MapPin className="w-4 h-4 text-[#1B4332]"/>} tipoOp={mercadoDisponible?tipoOp:null}
            modalChildren={<GrafPie height={480}/>}><GrafPie height={280}/></ChartCard>
        </div>
        <div className="lg:col-span-3">
          <ChartCard title="Composición por municipio" subtitle={`Tipos de propiedad · ${tipoOp}`} icon={<MapPin className="w-4 h-4 text-[#1B4332]"/>} tipoOp={mercadoDisponible?tipoOp:null}
            modalChildren={<GrafTiposMun height={460}/>}><GrafTiposMun height={280}/></ChartCard>
        </div>
      </div>

      {/* Mapa del mercado scrapeado */}
      <MapaMercado/>

      {/* Tabla de colonias */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332]/10 flex items-center justify-center shrink-0"><BarChart2 className="w-4 h-4 text-[#1B4332]"/></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#1B4332]">Colonias del mercado</p>
                  {mercadoDisponible&&<span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full uppercase ${tipoOp==="venta"?"bg-[#1B4332] text-white":"bg-blue-600 text-white"}`}>{tipoOp}</span>}
                  {mesSel&&<span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{mesSel}</span>}
                </div>
                <p className="text-xs text-slate-400">{coloniaData?`${coloniasFilt.length} colonias`:"Cargando..."}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2" data-no-print>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
                <input value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(1);}} placeholder="Buscar colonia..." className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-40 focus:outline-none focus:ring-1 focus:ring-[#52B788]"/>
              </div>
              <select value={filtroMun} onChange={e=>{setFiltroMun(e.target.value);setPagina(1);}} className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788] text-slate-600">
                <option value="">Todos municipios</option>
                {munsUnicos.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
              <select value={filtroSeg} onChange={e=>{setFiltroSeg(e.target.value);setPagina(1);}} className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788] text-slate-600">
                <option value="">Todos segmentos</option>
                {SEG_ORDEN.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={()=>setFiltrosExp(v=>!v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${filtrosExp?"border-[#52B788] text-[#1B4332] bg-[#52B788]/10":"border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <ArrowUpDown className="w-3 h-3"/> Rangos
              </button>
              {(filtroMun||filtroSeg||busqueda||Object.values(filtrosRango).some(v=>v!==""))&&(
                <button onClick={()=>{setFiltroMun("");setFiltroSeg("");setBusqueda("");setPagina(1);setFiltrosRango({totalMin:"",totalMax:"",precioMin:"",precioMax:"",m2Min:"",m2Max:"",pctMin:"",pctMax:""}); }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg border border-red-100 hover:bg-red-50">Limpiar</button>
              )}
            </div>
          </div>
          {filtrosExp && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              {[{label:"Total (min–max)",k1:"totalMin",k2:"totalMax"},{label:"Precio avg (k MXN)",k1:"precioMin",k2:"precioMax"},{label:"Precio/m² (MXN)",k1:"m2Min",k2:"m2Max"},{label:"% mercado",k1:"pctMin",k2:"pctMax"}].map(({label,k1,k2})=>(
                <div key={k1}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                  <div className="flex gap-1">
                    <input type="number" placeholder="Min" value={filtrosRango[k1]} onChange={e=>{setFiltrosRango(r=>({...r,[k1]:e.target.value}));setPagina(1);}} className="w-full py-1 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"/>
                    <input type="number" placeholder="Max" value={filtrosRango[k2]} onChange={e=>{setFiltrosRango(r=>({...r,[k2]:e.target.value}));setPagina(1);}} className="w-full py-1 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#52B788]"/>
                  </div>
                </div>
              ))}
            </div>
          )}
          {coloniaData ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="text-xs" style={{minWidth:"860px",width:"100%"}}>
                  <thead>
                    <tr className="bg-[#1B4332] text-white">
                      <th className="sticky left-0 z-20 bg-[#1B4332] px-2 py-2.5 text-left font-semibold cursor-pointer hover:bg-[#2D6A4F] select-none whitespace-nowrap" onClick={()=>ordenar("colonia")}>
                        <span className="flex items-center gap-1">Colonia<ArrowUpDown className="w-3 h-3 opacity-60"/></span>
                      </th>
                      <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap cursor-pointer hover:bg-[#2D6A4F]" onClick={()=>ordenar("municipio")}>Municipio</th>
                      <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap cursor-pointer hover:bg-[#2D6A4F]" onClick={()=>ordenar("total")}>
                        <span className="flex items-center justify-center gap-1">Total<ArrowUpDown className="w-3 h-3 opacity-60"/></span>
                      </th>
                      {TIPOS_COL.map(t=>(
                        <th key={t} className="px-2 py-2.5 text-center font-semibold whitespace-nowrap" style={{color:TIPO_COLORS[t]||"#D9ED92"}}>{t.slice(0,4)}</th>
                      ))}
                      <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap cursor-pointer hover:bg-[#2D6A4F]" onClick={()=>ordenar("segmento")}>Seg</th>
                      <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap cursor-pointer hover:bg-[#2D6A4F]" onClick={()=>ordenar("pct")}>
                        <span className="flex items-center justify-center gap-1">%<ArrowUpDown className="w-3 h-3 opacity-60"/></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coloniasPag.map((r,i)=>{
                      const seg = getSegmento(r.precio_avg);
                      return (
                        <tr key={i} className={`border-b border-slate-50 ${i%2===0?"bg-white":"bg-slate-50/50"} hover:bg-[#52B788]/5`}>
                          <td className={`sticky left-0 z-10 px-2 py-1.5 font-medium text-[#1B4332] whitespace-nowrap ${i%2===0?"bg-white":"bg-slate-50/50"}`}>{r.colonia}</td>
                          <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{r.municipio}</td>
                          <td className="px-2 py-1.5 text-center font-semibold text-[#1B4332]">{r.total}</td>
                          {TIPOS_COL.map(t=>(
                            <td key={t} className="px-1 py-1.5">
                              {r[t]>0 ? (
                                <div className="flex flex-col items-center gap-0.5 text-center">
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white font-semibold text-[10px]" style={{backgroundColor:TIPO_COLORS[t]||"#74C69D"}}>{r[t]}</span>
                                  {r[`${t}_pm2`]&&<span className="text-[10px] text-slate-400 tabular-nums">${r[`${t}_pm2`].toLocaleString()}/m²</span>}
                                </div>
                              ) : <span className="text-slate-200 text-center block">—</span>}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{backgroundColor:SEG_COLORS[seg]||"#94a3b8"}} title={seg}/>
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-500">{r.pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500 font-medium">{coloniasFilt.length} colonias · pág {pagina} de {totalPags}</p>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="w-4 h-4"/> Anterior
                  </button>
                  <div className="flex gap-1">
                    {Array.from({length:Math.min(5,totalPags)},(_,k)=>{
                      const p=Math.max(1,Math.min(totalPags-4,pagina-2))+k;
                      return p<=totalPags ? (
                        <button key={p} onClick={()=>setPagina(p)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${p===pagina?"bg-[#1B4332] text-white":"border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{p}</button>
                      ) : null;
                    })}
                  </div>
                  <button onClick={()=>setPagina(p=>Math.min(totalPags,p+1))} disabled={pagina===totalPags}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    Siguiente <ChevronRight className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-slate-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin"/><span className="text-sm">Cargando colonias...</span>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-300 text-center pb-2">
        {mercadoDisponible
          ? `Fuente: PropValu Market Data · ${totalMercado.toLocaleString()} propiedades · GDL metro · Jalisco${mesSel?` · Snapshot ${mesSel}`:""}`
          : "Datos de mercado en actualización"}
      </p>
    </div>
  );
}
