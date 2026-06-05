import {
  Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, CheckCircle2,
  Bed, Bath, Square, MapPin, Phone, Mail, User
} from 'lucide-react';

const parseFeatureItem = (str) => {
  const raw = (str || '').trim();
  const numMatch = raw.match(/\b(\d+(?:m2|m²)?)\b/i);
  const qty = numMatch ? numMatch[1] : null;
  let label = qty ? raw.replace(qty, '').replace(/\s+/, ' ').trim() : raw;
  const lower = label.toLowerCase();
  let Icon = CheckCircle2;
  if (lower.includes('alberca') || lower.includes('piscina')) Icon = Waves;
  else if (lower.includes('aire') || lower.includes('acondicionado')) Icon = Wind;
  else if (lower.includes('auto') || lower.includes('cochera') || lower.includes('estacionamiento')) Icon = Car;
  else if (lower.includes('camara') || lower.includes('circuito') || lower.includes('cctv')) Icon = Camera;
  else if (lower.includes('jardin') || lower.includes('arbol') || lower.includes('areas verdes')) Icon = Trees;
  else if (lower.includes('gym') || lower.includes('gimnasio')) Icon = Dumbbell;
  else if (lower.includes('seguridad') || lower.includes('vigilancia') || lower.includes('caseta')) Icon = Shield;
  else if (lower.includes('cava') || lower.includes('vino')) Icon = Wine;
  else if (lower.includes('smart') || lower.includes('inteligente')) Icon = Monitor;
  else if (lower.includes('biometrico') || lower.includes('huella')) Icon = Fingerprint;
  else if (lower.includes('sala') || lower.includes('family')) Icon = Sofa;
  else if (lower.includes('casa club')) Icon = Home;
  return { label, qty, Icon };
};

export default function LayoutStitchLetter({
  fichaAvaluo,
  session,
  formatMXN,
  amenidades = [],
  instalaciones = [],
  espacios = [],
  descripcionTexto,
  texts,
  idioma,
}) {
  const fotos = fichaAvaluo?.fotos || [];
  const direccion = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const precio = fichaAvaluo?.valor
    ? formatMXN(fichaAvaluo.valor)
    : '$2,500,000';
  const recamaras = fichaAvaluo?.recamaras ?? fichaAvaluo?.cuartos ?? '--';
  const banos = fichaAvaluo?.banos ?? '--';
  const terreno = fichaAvaluo?.terreno ? `${fichaAvaluo.terreno} m²` : '--';
  const construccion = fichaAvaluo?.construccion ? `${fichaAvaluo.construccion} m²` : '--';
  const estacionamiento = fichaAvaluo?.estacionamiento ?? fichaAvaluo?.cajones ?? '--';
  const ubicacion = fichaAvaluo?.colonia ?? fichaAvaluo?.municipio ?? '--';
  const asesor = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Asesor';
  const email = session?.user?.email ?? '';
  const telefono = session?.user?.phone ?? '';

  const descripcion =
    descripcionTexto ||
    'Una propuesta arquitectónica sin concesiones que fusiona precisión tectónica con la fluidez natural del entorno. Grandes volúmenes se abren sin fricción al horizonte, donde la alberca infinita actúa como extensión visual del paisaje. Cada detalle ha sido curado para eliminar el ruido visual y elevar la experiencia de habitar.';

  const heroImg = fotos[0] ?? null;
  const galleryImages = fotos.length >= 6 ? fotos.slice(0, 6) : [...fotos, ...Array(Math.max(0, 6 - fotos.length)).fill(null)];

  const serif = 'Playfair Display, Georgia, serif';

  return (
    <div
      id="pv-ficha-root"
      className="bg-gray-100 flex flex-col items-center py-10 print:py-0 font-sans"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Page */}
      <div
        className="bg-white shadow-2xl overflow-hidden flex flex-col border border-gray-300 relative"
        style={{ width: '8.5in', minHeight: '11in', padding: '0.6in' }}
      >
        {/* Header */}
        <header className="flex justify-between items-baseline border-b border-gray-300 pb-5 mb-6">
          <div>
            <h1
              className="text-[36px] tracking-tight leading-none font-bold uppercase text-black"
              style={{ fontFamily: serif }}
            >
              {direccion}
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 uppercase tracking-widest">
              <MapPin size={14} />
              {ubicacion}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Folio</span>
            <span className="text-sm font-bold text-gray-800">
              {new Date().getFullYear()}-{String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}
            </span>
          </div>
        </header>

        {/* Hero Image */}
        <section className="mb-6">
          <div className="w-full overflow-hidden" style={{ height: '240px' }}>
            {heroImg ? (
              <img
                alt="Vista principal"
                className="w-full h-full object-cover"
                src={heroImg}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-xs uppercase tracking-widest">Sin fotografía</span>
              </div>
            )}
          </div>
        </section>

        {/* Specs + Narrative Grid (letter layout: 4 cols specs | 8 cols narrative) */}
        <section className="grid gap-8 mb-6 items-start" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {/* Left: Specs */}
          <div className="border-r border-gray-300 pr-8">
            <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">
              Especificaciones
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-end border-b border-gray-200 pb-1">
                <span className="text-[11px] uppercase text-gray-700 font-medium">Precio</span>
                <span
                  className="text-[20px] font-semibold"
                  style={{ color: '#775a19', fontFamily: serif }}
                >
                  {precio}
                </span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-200 pb-1">
                <span className="text-[11px] uppercase text-gray-700 font-medium">Construcción</span>
                <span className="text-base font-bold text-gray-800">{construccion}</span>
              </div>
              <div className="flex justify-between items-end border-b border-gray-200 pb-1">
                <span className="text-[11px] uppercase text-gray-700 font-medium">Terreno</span>
                <span className="text-base font-bold text-gray-800">{terreno}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block mb-1 opacity-60">Recámaras</span>
                  <div className="flex items-center gap-2">
                    <Bed size={16} className="text-black" />
                    <span className="text-base font-bold text-gray-800">{recamaras}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block mb-1 opacity-60">Baños</span>
                  <div className="flex items-center gap-2">
                    <Bath size={16} className="text-black" />
                    <span className="text-base font-bold text-gray-800">{banos}</span>
                  </div>
                </div>
              </div>
              <div className="pt-1">
                <span className="text-[10px] uppercase text-gray-400 block mb-1 opacity-60">Estacionamiento</span>
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-black" />
                  <span className="text-base font-bold uppercase text-gray-800">{estacionamiento} cajones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Narrative */}
          <div>
            <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
              Descripción
            </h2>
            <p
              className="text-[16px] text-gray-900 leading-relaxed italic border-l-4 pl-6 py-1 mb-4"
              style={{ borderColor: '#775a19' }}
            >
              {descripcion.split('. ')[0]}.
            </p>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              {descripcion.split('. ').slice(1).join('. ')}
            </p>
          </div>
        </section>

        {/* Gallery 3×2 */}
        <section className="flex-grow">
          <h2 className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
            Galería de Imágenes
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {galleryImages.map((src, i) => (
              <div key={i} className="aspect-square bg-gray-200 overflow-hidden">
                {src ? (
                  <img
                    alt={`Fotografía ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    src={src}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Square size={24} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-6 pt-6 border-t border-gray-300 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
              <User size={28} className="text-gray-400" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">{asesor}</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Asesor Inmobiliario</p>
              {(telefono || email) && (
                <p className="text-[11px] text-black mt-0.5">
                  {telefono}{telefono && email ? ' | ' : ''}{email}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 leading-tight">
              © {new Date().getFullYear()} {asesor.toUpperCase()}.<br />
              TODOS LOS DERECHOS RESERVADOS.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

