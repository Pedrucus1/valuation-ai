// Carousel de logos de afiliados.
// tipo="inmobiliaria" | "valuador" — filtra qué mostrar.
// Si AFILIADOS está vacío (sin datos reales) el banner no se renderiza.

const AFILIADOS = [
  // Agregar aquí cuando haya inmobiliarias/valuadores reales registrados.
  // { id: 1, nombre: "RE/MAX Jalisco", tipo: "inmobiliaria", iniciales: "RE", color: "#003DA5" },
];

const LogoChip = ({ afiliado }) => (
  <div
    className="flex items-center gap-2.5 mx-6 flex-shrink-0 select-none"
    title={afiliado.nombre}
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0"
      style={{
        backgroundColor: afiliado.color,
        filter: "grayscale(100%) opacity(0.55)",
      }}
    >
      {afiliado.iniciales}
    </div>
    <span
      className="text-sm font-semibold whitespace-nowrap"
      style={{ filter: "grayscale(100%) opacity(0.45)", color: "#334155" }}
    >
      {afiliado.nombre}
    </span>
  </div>
);

const AfiliadosCarousel = ({
  titulo,
  tipo, // "inmobiliaria" | "valuador" | undefined (todos)
}) => {
  const lista = tipo
    ? AFILIADOS.filter((a) => a.tipo === tipo)
    : AFILIADOS;

  if (lista.length === 0) return null;

  const tituloPorDefecto =
    tipo === "inmobiliaria"
      ? "Inmobiliarias verificadas en PropValu"
      : tipo === "valuador"
      ? "Valuadores verificados que ya usan PropValu"
      : "Inmobiliarias y valuadores que ya confían en PropValu";

  const doble = [...lista, ...lista];

  return (
    <section className="bg-white border-y border-slate-100 py-8 overflow-hidden">
      <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
        {titulo || tituloPorDefecto}
      </p>
      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, white, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, white, transparent)" }}
        />
        <div className="logo-track">
          {doble.map((a, i) => (
            <LogoChip key={`${a.id}-${i}`} afiliado={a} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AfiliadosCarousel;
