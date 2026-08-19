import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DATA from "@/data/acabados_selectores.json";

// Puntaje portado de Manual-Arquitectura-ZMG/Selector_Acabados.html (probado con 16
// escenarios reales de perito). Separa instalación/hidráulica/sanitaria/estructura
// (casi nunca se remodelan) de todo lo demás, porque mezclarlas hace que una
// remodelación reciente se trague la fecha de la construcción original.
const GRUPO_ESTRUCTURA = new Set(["instalacion", "hidraulica", "sanitaria", "estructura"]);
const ORDEN_ELEMENTOS = DATA.elementos_principales;
const DISCRIMINA = DATA.discrimina;
const CAMPOS_RICOS = DATA.campos_ricos || {};

const NOMBRES_ELEMENTO = {
  muro: "Muro (interior)", cubierta: "Techo / cubierta (estructura)", agua: "Manejo de agua (tinaco/cisterna)",
  piso: "Piso", herreria: "Herrería (rejas/protecciones)", cocina: "Cocina", azulejo: "Azulejo de baño",
  azulejo_bano: "Azulejo de baño", puerta: "Puertas interiores", instalacion: "Instalación eléctrica (tomas/tablero)",
  canceleria: "Cancelería (regadera/escalera)",
  espejo: "Espejo del baño", wc: "Tipo de WC", lavabo: "Tipo de lavabo", griferia: "Tipo de grifería",
  fachada: "Acabado de fachada (exterior)", servicio: "Patio / cuarto de servicio",
  niveles: "Niveles del edificio (solo depto)", carpinteria: "Clósets / carpintería interior",
  sanitaria: "Instalación sanitaria (drenaje)", estructura: "Estructura / sistema constructivo",
  ventaneria: "Ventanería (marco y vidrio)", cochera: "Cochera / garaje",
  plafon: "Acabado de plafón interior", puerta_ingreso: "Puerta de ingreso (acceso principal)",
  zocalos: "Zócalos", apagadores_placas: "Apagadores y placas de contacto",
  iluminacion_fija: "Iluminación fija / luminarias", lamparas: "Lámparas (tipo de socket)",
  ventilacion_clima: "Ventilación y climatización", domos_tragaluces: "Domos / tragaluces",
  escaleras: "Escaleras (diseño y soporte)", barda_protecciones: "Barda perimetral / protecciones",
  gas_calentamiento: "Instalación de gas y calentador de agua",
};

const SEGMENTOS = [
  { v: "todos", l: "Todos los segmentos" }, { v: "1", l: "1 · Económica" },
  { v: "2", l: "2 · Interés social" }, { v: "3", l: "3 · Media baja" },
  { v: "4", l: "4 · Media" }, { v: "5", l: "5 · Media alta" }, { v: "6", l: "6 · Lujo" },
];

// Peso continuo (antes 3/2/1 por umbral): dos opciones solo empatan si
// cubren EXACTAMENTE las mismas décadas, no solo "ambas ≤2" o "ambas ≤4".
const puntos = (n) => 1 / n;
const decadaMidpoint = (dec) => Math.min(parseInt(dec, 10) + 5, new Date().getFullYear());

// Orden por poder discriminante: elementos donde una mayor proporción de
// opciones fecha de verdad (⟡) van primero — con pocas preguntas contestadas
// alcanza para decidir. El recorrido de visita (ORDEN_ELEMENTOS) queda como
// alternativa para quien prefiera ir físicamente de afuera hacia adentro.
const ORDEN_DISCRIMINANTE = [...ORDEN_ELEMENTOS].sort((a, b) => {
  const score = (elem) => {
    const opciones = Object.values(DISCRIMINA[elem] || {});
    if (!opciones.length) return 0;
    return opciones.filter(Boolean).length / opciones.length;
  };
  return score(b) - score(a);
});

function fecharGrupo(marcas, segmento, soloEstructura) {
  const cat = DATA[segmento] || DATA.todos;
  const catTodos = DATA.todos;
  const voto = {};
  for (const [elem, opcion] of Object.entries(marcas)) {
    if (GRUPO_ESTRUCTURA.has(elem) !== soloEstructura) continue;
    const decs = (cat[elem] && cat[elem][opcion]) || (catTodos[elem] && catTodos[elem][opcion]) || [];
    const p = puntos(decs.length);
    for (const d of decs) voto[d] = (voto[d] || 0) + p;
  }
  return Object.entries(voto).sort((a, b) => b[1] - a[1]);
}

function ResultadoBloque({ votos, titulo, onAplicar }) {
  if (!votos.length) return null;
  const max = votos[0][1];
  const top = votos.filter(([, p]) => p === max).map(([d]) => d);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
          <div className="text-lg font-bold text-[#1B4332]">{top.join(" / ")}</div>
        </div>
        {top.length === 1 ? (
          <Button type="button" size="sm" onClick={() => onAplicar(top[0])}
                  className="bg-[#52B788] hover:bg-[#40916C]">
            Usar esta década
          </Button>
        ) : (
          <span className="text-xs text-amber-700">empate — marca una seña más específica para desempatar</span>
        )}
      </div>
    </div>
  );
}

/**
 * Identificador de Edad: estima la década de construcción marcando acabados
 * observables. Puerto del Selector_Acabados.html del Manual de Arquitectura ZMG.
 */
export default function IdentificadorEdadDialog({ open, onOpenChange, tipoInicial, onAplicar }) {
  const [segmento, setSegmento] = useState("todos");
  const [tipoVivienda, setTipoVivienda] = useState(tipoInicial === "departamento" ? "depto" : "casa");
  const [marcas, setMarcas] = useState({});
  const [vista, setVista] = useState("recorrido");

  const catalogo = DATA[segmento] || DATA.todos;
  const orden = vista === "discriminante" ? ORDEN_DISCRIMINANTE : ORDEN_ELEMENTOS;
  const elementos = useMemo(
    () => orden.filter((e) => catalogo[e]).filter((e) => e !== "niveles" || tipoVivienda === "depto"),
    [orden, catalogo, tipoVivienda]
  );

  const votosEstructura = useMemo(() => fecharGrupo(marcas, segmento, true), [marcas, segmento]);
  const votosAcabado = useMemo(() => fecharGrupo(marcas, segmento, false), [marcas, segmento]);
  const noCoinciden =
    votosEstructura.length && votosAcabado.length && votosEstructura[0][0] !== votosAcabado[0][0];

  const marcar = (elem, opcion) =>
    setMarcas((prev) => {
      const next = { ...prev };
      if (opcion) next[elem] = opcion; else delete next[elem];
      return next;
    });

  const aplicar = (decada) => {
    onAplicar(decadaMidpoint(decada), { decada });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Identificador de Edad</DialogTitle>
          <DialogDescription>
            Marca los acabados que reconozcas. No hace falta llenar todo — cada seña suma puntos a su década.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Select value={tipoVivienda} onValueChange={setTipoVivienda}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="depto">Departamento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segmento} onValueChange={setSegmento}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEGMENTOS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500">Orden:</span>
          <button type="button" onClick={() => setVista("recorrido")}
            className={`px-2 py-1 rounded ${vista === "recorrido" ? "bg-[#1B4332] text-white" : "bg-slate-100 text-slate-600"}`}>
            Recorrido de visita
          </button>
          <button type="button" onClick={() => setVista("discriminante")}
            className={`px-2 py-1 rounded ${vista === "discriminante" ? "bg-[#1B4332] text-white" : "bg-slate-100 text-slate-600"}`}>
            Más discriminante primero
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
          {elementos.map((elem) => {
            const opciones = Object.keys(catalogo[elem]);
            const fichasElem = CAMPOS_RICOS[elem] || {};
            const ficha = marcas[elem] ? fichasElem[marcas[elem]] : null;
            return (
              <div key={elem}>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  {NOMBRES_ELEMENTO[elem] || elem}
                </label>
                <Select value={marcas[elem] || "__none"} onValueChange={(v) => marcar(elem, v === "__none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm bg-slate-100 border-slate-200">
                    <SelectValue placeholder="— no sé / no aplica —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— no sé / no aplica —</SelectItem>
                    {opciones.map((o) => (
                      <SelectItem key={o} value={o} title={fichasElem[o]?.como_se_identifica}>
                        {o}{(DISCRIMINA[elem] || {})[o] ? " ⟡" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ficha && (
                  <div className="mt-1.5 rounded border-l-2 border-[#52B788] bg-[#F0F7F4] px-2.5 py-1.5 text-[11px] leading-snug text-slate-700">
                    <p className="mb-1"><b className="text-[#1B4332]">Fechador:</b> {ficha.valor_como_fechador}</p>
                    <p className="mb-1"><b className="text-[#1B4332]">Se identifica:</b> {ficha.como_se_identifica}</p>
                    <p><b className="text-[#1B4332]">Confusiones:</b> {ficha.confusiones_frecuentes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {!votosEstructura.length && !votosAcabado.length ? (
            <p className="text-sm text-slate-400">Marca al menos una seña para ver el resultado.</p>
          ) : (
            <>
              {noCoinciden && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  Construcción y último acabado marcado no coinciden — probable remodelación. Léelos por separado.
                </p>
              )}
              <ResultadoBloque votos={votosEstructura}
                titulo="Construcción original (instalación / hidráulica)" onAplicar={aplicar} />
              <ResultadoBloque votos={votosAcabado}
                titulo={votosEstructura.length ? "Último acabado / remodelación" : "Década más probable"}
                onAplicar={aplicar} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
