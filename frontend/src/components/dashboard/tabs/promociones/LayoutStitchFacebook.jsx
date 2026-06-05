import {
  Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, CheckCircle2,
  Bed, Bath, Square, MapPin
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

export default function LayoutStitchFacebook({
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
  const construccion = fichaAvaluo?.construccion ? `${fichaAvaluo.construccion} m²` : '--';
  const ubicacion = fichaAvaluo?.colonia ?? fichaAvaluo?.municipio ?? '--';
  const asesor = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Asesor';

  const heroImg = fotos[0] ?? null;

  const serif = 'Playfair Display, Georgia, serif';

  return (
    <div
      className="bg-gray-100 min-h-screen flex items-center justify-center p-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Facebook 3:2 canvas */}
      <div
        className="bg-white overflow-hidden relative shadow-2xl flex flex-col"
        style={{ aspectRatio: '3 / 2', width: '100%', maxWidth: '1200px' }}
      >
        {/* Top Nav Bar */}
        <nav
          className="bg-white border-b border-gray-200 w-full flex justify-between items-center z-20 flex-shrink-0"
          style={{ padding: '12px 80px' }}
        >
          <h1
            className="text-2xl font-bold text-black"
            style={{ fontFamily: serif }}
          >
            {direccion}
          </h1>
          <div className="hidden md:flex gap-8 items-center">
            <span className="text-xs uppercase tracking-widest text-gray-500 font-medium">Portafolio</span>
            <span
              className="text-xs uppercase tracking-widest font-medium border-b-2 pb-1"
              style={{ color: '#775a19', borderColor: '#775a19' }}
            >
              Exclusivos
            </span>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-medium">Experiencia</span>
          </div>
          <button
            className="text-xs uppercase tracking-widest text-white font-medium px-8 py-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#000', letterSpacing: '0.1em' }}
          >
            CONSULTAR
          </button>
        </nav>

        {/* Image area (flex-grow) */}
        <section className="relative flex-grow overflow-hidden group">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: heroImg
                ? `url('${heroImg}')`
                : 'linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)',
            }}
          />

          {/* Subtle gradient overlay (low opacity) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.40) 0%, transparent 60%)' }}
          />

          {/* Info Card Overlay (bottom-left) */}
          <div className="absolute bottom-0 left-0 w-full flex flex-col justify-end" style={{ padding: '0 80px 24px' }}>
            <div
              className="backdrop-blur-sm max-w-xl border-l-4"
              style={{
                backgroundColor: 'rgba(249,249,249,0.90)',
                borderColor: '#000',
                padding: '32px',
              }}
            >
              <p
                className="uppercase mb-2 font-semibold"
                style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#775a19' }}
              >
                Propiedad Exclusiva
              </p>
              <h2
                className="text-black leading-none mb-4"
                style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 700 }}
              >
                {direccion}
              </h2>

              {/* Divider */}
              <div className="w-full border-t border-gray-200 my-4" />

              {/* Property Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Precio</p>
                  <p className="text-base font-bold text-black">{precio}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Construcción</p>
                  <p className="text-base font-bold text-black">{construccion}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Recámaras</p>
                  <p className="text-base font-bold text-black">{recamaras}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Ubicación</p>
                  <p className="text-base font-bold text-black">{ubicacion}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="bg-white border-t border-gray-200 flex flex-col md:flex-row justify-between items-center w-full flex-shrink-0"
          style={{ padding: '16px 80px' }}
        >
          <span className="text-[10px] uppercase tracking-widest text-gray-400">
            © {new Date().getFullYear()} {asesor.toUpperCase()}. TODOS LOS DERECHOS RESERVADOS.
          </span>
          <div className="flex gap-8 mt-2 md:mt-0">
            {['Legal', 'Privacidad', 'Prensa', 'Ficha Técnica'].map((item) => (
              <span
                key={item}
                className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#775a19] cursor-pointer transition-colors"
              >
                {item}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

