import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Maximize2, X, Map as MapIcon } from "lucide-react";

// Mapa de avalúos reutilizable (valuador + inmobiliaria):
// - Usa la ubicación REAL del avalúo; los que no la tienen caen al centro del municipio.
// - Se centra en el más reciente y al hacer click abre un modal grande, interactivo y filtrable por tipo.

const COORDS = {
  zapopan: [20.721, -103.401], guadalajara: [20.659, -103.349],
  tlaquepaque: [20.640, -103.312], "tonalá": [20.624, -103.235],
  tlajomulco: [20.474, -103.444], default: [20.666, -103.350],
};
const COLORES_TIPO = { Casa: "#1B4332", Departamento: "#52B788", Terreno: "#95B849", Local: "#F4A261", Bodega: "#9B5DE5", Oficina: "#00BBF9" };

const fmtMXN = (v) => (v > 0 ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v) : "");
const getMunicipio = (dir) => {
  const d = (dir || "").toLowerCase();
  for (const k of Object.keys(COORDS)) if (d.includes(k)) return k;
  return "default";
};

export default function MapaAvaluos({ valuaciones = [], height = 150 }) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("Todos");

  const puntos = valuaciones.map((v, i) => {
    if (v.lat != null && v.lng != null) return { ...v, lat: v.lat, lng: v.lng };
    const [lat, lng] = COORDS[getMunicipio(v.direccion)];
    return { ...v, lat: lat + Math.sin(i * 1.3) * 0.007, lng: lng + Math.cos(i * 1.7) * 0.007 };
  });
  const centro = puntos.length ? [puntos[0].lat, puntos[0].lng] : [20.57, -103.38];
  const tipos = ["Todos", ...Array.from(new Set(puntos.map((p) => p.tipo).filter((t) => t && t !== "—")))];
  const filtrados = filtro === "Todos" ? puntos : puntos.filter((p) => p.tipo === filtro);

  if (!valuaciones.length) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-300 gap-2" style={{ height }}>
        <MapIcon className="w-8 h-8" />
        <p className="text-xs text-center">Sin avalúos<br />registrados</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative rounded-xl overflow-hidden cursor-pointer group" style={{ height }}
           onClick={() => setOpen(true)} title="Click para ampliar y filtrar">
        <MapContainer center={centro} zoom={13} style={{ height: "100%", width: "100%" }} key={centro.join(",")}
                      scrollWheelZoom={false} zoomControl={false} dragging={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {puntos.map((p, i) => (
            <CircleMarker key={i} center={[p.lat, p.lng]} radius={6}
              pathOptions={{ fillColor: COLORES_TIPO[p.tipo] || "#52B788", color: "#fff", weight: 1.5, fillOpacity: 0.88 }} />
          ))}
        </MapContainer>
        <div className="absolute inset-0 z-[500] flex items-end justify-end p-2 bg-black/0 group-hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-semibold text-[#1B4332] bg-white/90 rounded-full px-2 py-0.5 shadow flex items-center gap-1">
            <Maximize2 className="w-3 h-3" /> Ampliar
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
               style={{ height: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-[#1B4332]">Mapa de mis avalúos</p>
                <p className="text-xs text-slate-400">{filtrados.length} de {puntos.length} · arrastra y haz zoom</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-slate-50">
              {tipos.map((t) => (
                <button key={t} onClick={() => setFiltro(t)}
                  className={`text-xs font-semibold rounded-full px-3 py-1 border transition-colors ${filtro === t ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-slate-500 border-slate-200 hover:border-[#52B788]"}`}>
                  {t}{t !== "Todos" && <span className="ml-1 opacity-60">{puntos.filter((p) => p.tipo === t).length}</span>}
                </button>
              ))}
            </div>
            <div className="flex-1">
              <MapContainer center={centro} zoom={13} style={{ height: "100%", width: "100%" }}
                            scrollWheelZoom zoomControl dragging attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filtrados.map((p, i) => (
                  <CircleMarker key={i} center={[p.lat, p.lng]} radius={8}
                    pathOptions={{ fillColor: COLORES_TIPO[p.tipo] || "#52B788", color: "#fff", weight: 2, fillOpacity: 0.9 }}>
                    <Popup>
                      <div className="text-xs min-w-[140px]">
                        <p className="font-bold text-[#1B4332]">{p.tipo || "Propiedad"}</p>
                        <p className="text-slate-400">{p.direccion}</p>
                        {p.valor > 0 && <p className="text-[#1B4332] font-semibold">{fmtMXN(p.valor)}</p>}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
