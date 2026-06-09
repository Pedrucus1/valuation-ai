import {
  Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, CheckCircle2,
  MapPin, ArrowUpRight, Square as SquareIcon, Bed, Bath
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

export default function LayoutStitchTikTok({
  fichaAvaluo,
  session,
  formatMXN,
  amenidades = [],
  instalaciones = [],
  espacios = [],
  descripcionTexto,
  texts,
  idioma,
  palette = {},
  puntosDestacados = [],
}) {
  const fotos = fichaAvaluo?.fotos || [];
  const direccion = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const precio = fichaAvaluo?.valor
    ? formatMXN(fichaAvaluo.valor)
    : '$2,500,000';
  const construccion = fichaAvaluo?.construccion ? `${fichaAvaluo.construccion} m²` : '--';
  const recamaras = fichaAvaluo?.recamaras ?? '--';
  const banos = fichaAvaluo?.banos ?? '--';
  const terreno = fichaAvaluo?.terreno ? `${fichaAvaluo.terreno} m²` : '--';
  const ubicacion = fichaAvaluo?.colonia ?? fichaAvaluo?.municipio ?? '--';
  const asesor = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Asesor';

  const heroImg = fotos[0] ?? null;
  const accent = palette?.accent || '#e9c176';

  return (
    /* TikTok/Reels 9:16 canvas — fixed 1080×1920px */
    <div
      className="relative overflow-hidden shadow-2xl bg-black"
      style={{ width: 1080, height: 1920, fontFamily: 'Inter, sans-serif' }}
    >
      {/* Full-bleed Hero Background */}
      {heroImg ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${heroImg}')` }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)' }}
        />
      )}

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Architectural Guide Lines */}
      <div className="absolute top-0 bottom-0 left-10 w-px pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <div className="absolute top-0 bottom-0 right-10 w-px pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

      {/* Top: Brand + Story Progress */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-center z-20" style={{ padding: '40px' }}>
        <div className="opacity-90">
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 56, maxWidth: 200, objectFit: 'contain' }} />
            : (
              <div
                className="text-white uppercase font-medium"
                style={{ fontSize: '26px', letterSpacing: '0.2em' }}
              >
                {asesor}
              </div>
            )}
        </div>
        <div className="flex gap-3">
          <div className="h-2 rounded-full" style={{ width: '88px', backgroundColor: 'rgba(255,255,255,0.20)' }} />
          <div className="h-2 rounded-full" style={{ width: '88px', backgroundColor: 'rgba(255,255,255,0.20)' }} />
          <div className="h-2 rounded-full" style={{ width: '88px', backgroundColor: 'rgba(255,255,255,1)' }} />
        </div>
      </div>

      {/* Floating Price Badge */}
      <div
        className="absolute z-20"
        style={{
          top: '28%',
          right: '40px',
          animation: 'float 4s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
        <div
          className="backdrop-blur-xl border px-12 py-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.40)', borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <p
            className="uppercase mb-2"
            style={{ fontSize: '20px', color: 'rgba(255,255,255,0.60)', letterSpacing: '0.2em', fontWeight: 600 }}
          >
            Precio
          </p>
          <p
            className="text-white"
            style={{ fontSize: '44px', fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600, lineHeight: 1.2 }}
          >
            {precio}
          </p>
        </div>
      </div>

      {/* Bottom Content */}
      <div
        className="absolute bottom-0 left-0 w-full z-20 flex flex-col items-start"
        style={{ padding: '40px 40px 112px' }}
      >
        {/* Stats row: construccion + recamaras + banos + terreno + ubicacion */}
        <div
          className="flex gap-16 w-full border-b pb-12 mb-20 flex-wrap"
          style={{ borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <div className="flex items-center gap-6">
            <SquareIcon size={36} className="text-white opacity-80" />
            <span className="text-white tracking-wider font-medium" style={{ fontSize: '28px' }}>{construccion}</span>
          </div>
          <div className="flex items-center gap-6">
            <Bed size={36} className="text-white opacity-80" />
            <span className="text-white tracking-wider font-medium" style={{ fontSize: '28px' }}>{recamaras} rec.</span>
          </div>
          <div className="flex items-center gap-6">
            <Bath size={36} className="text-white opacity-80" />
            <span className="text-white tracking-wider font-medium" style={{ fontSize: '28px' }}>{banos} baños</span>
          </div>
          <div className="flex items-center gap-6">
            <MapPin size={36} className="text-white opacity-80" />
            <span className="text-white tracking-wider font-medium uppercase" style={{ fontSize: '28px' }}>{ubicacion}</span>
          </div>
        </div>

        {/* Main Title */}
        <h1
          className="text-white mb-16 leading-none uppercase tracking-tight"
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '80px',
            fontWeight: 700,
          }}
        >
          {direccion.split(',')[0]}<br />
          {direccion.split(',').slice(1).join(',').trim() || ''}
        </h1>

        {/* CTA Row */}
        <div
          className="w-full flex items-center justify-between group cursor-pointer border-t pt-16"
          style={{ borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <div className="flex flex-col">
            <p
              className="uppercase mb-3"
              style={{ fontSize: '22px', color: accent, letterSpacing: '0.25em', fontWeight: 600 }}
            >
              Disponible Ahora
            </p>
            <p
              className="text-white tracking-widest font-medium"
              style={{ fontSize: '26px', letterSpacing: '0.1em' }}
            >
              LINK EN BIO
            </p>
          </div>
          <div
            className="rounded-full border flex items-center justify-center"
            style={{
              width: '112px',
              height: '112px',
              borderColor: 'rgba(255,255,255,0.20)',
              transition: 'all 0.5s',
            }}
          >
            <ArrowUpRight size={48} className="text-white" />
          </div>
        </div>

        {/* PropValu badge */}
        <div className="flex items-center gap-3 mt-10 self-center">
          <div
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>P</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
            propvalu.mx
          </span>
        </div>
      </div>
    </div>
  );
}
