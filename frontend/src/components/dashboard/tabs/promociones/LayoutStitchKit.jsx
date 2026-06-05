import {
  Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine,
  Monitor, Fingerprint, Sofa, Home, CheckCircle2,
  Bed, Bath, MapPin, Square as SquareIcon
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

export default function LayoutStitchKit({
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
    'La propiedad se erige como testimonio de la belleza etérea de su entorno. Esta obra arquitectónica fusiona tonos monocromáticos con una arquitectura de luz y sombra. Cada detalle ha sido curado para eliminar el ruido visual y elevar la experiencia de habitar en un entorno de lujo.';

  const heroImg = fotos[0] ?? null;
  const accent = '#c5a059';
  const serif = 'Playfair Display, Georgia, serif';

  // Merge all feature arrays for highlights
  const allFeatures = [
    ...(amenidades.length
      ? amenidades
      : ['Alberca infinity', 'Gimnasio privado', 'Seguridad 24hrs', 'Jardín paisajístico']),
    ...(instalaciones.length ? instalaciones : []),
    ...(espacios.length ? espacios : []),
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: serif,
        color: '#1a1a1a',
        backgroundColor: '#f9f9f9',
        padding: '2rem 4rem',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* Header with hero image */}
      <header style={{ marginBottom: '3rem' }}>
        {heroImg ? (
          <img
            src={heroImg}
            alt="Vista principal"
            className="w-full rounded-sm shadow-lg"
            style={{ marginBottom: '2rem', maxHeight: '400px', objectFit: 'cover' }}
          />
        ) : (
          <div
            className="w-full rounded-sm shadow-lg flex items-center justify-center"
            style={{ height: '300px', backgroundColor: '#e5e5e5', marginBottom: '2rem' }}
          >
            <span style={{ color: '#aaa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Sin fotografía
            </span>
          </div>
        )}

        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          {direccion}
        </h1>
        <p style={{ fontSize: '20px', color: '#78716c', fontStyle: 'italic' }}>
          {ubicacion} -- Donde la precisión tectónica encuentra la fluidez natural
        </p>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* The Narrative */}
        <section>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#a8a29e',
              borderBottom: '1px solid #e7e5e4',
              paddingBottom: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            La Narrativa
          </h2>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#44403c' }}>
            {descripcion}
          </p>
        </section>

        {/* Strategy Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.75rem',
              }}
            >
              Estrategia Digital
            </h3>
            <p style={{ color: '#57534e', lineHeight: 1.7 }}>
              Utiliza las publicaciones cuadradas para redes sociales y el formato vertical para Reels/Stories.
              Enfatiza el estatus <strong>"Exclusivo"</strong> para captar audiencias de alto patrimonio.
            </p>
          </div>
          <div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.75rem',
              }}
            >
              Gancho de Marketing
            </h3>
            <p style={{ color: '#57534e', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{descripcion.split('.')[0]}."
            </p>
          </div>
        </section>

        {/* Property Highlights */}
        <section
          style={{
            backgroundColor: '#fff',
            padding: '2rem',
            border: '1px solid #f0f0f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '1.5rem',
            }}
          >
            Puntos Destacados
          </h2>

          {/* Key numeric specs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: accent, lineHeight: 1 }}>{precio}</p>
              <p style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Precio</p>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{construccion}</p>
              <p style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Construcción</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{terreno}</p>
              <p style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Terreno</p>
            </div>
          </div>

          {/* Features bullets */}
          <ul
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              color: '#44403c',
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {allFeatures.slice(0, 8).map((feat, i) => {
              const { label, qty, Icon } = parseFeatureItem(feat);
              return (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: accent,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <Icon size={14} style={{ color: '#1a1a1a', flexShrink: 0 }} />
                  {qty && <strong>{qty}</strong>} {label}
                </li>
              );
            })}
            {/* Fallback if no features */}
            {allFeatures.length === 0 && [
              `${construccion} de construcción`,
              `${recamaras} Recámaras`,
              `${banos} Baños completos`,
              `${estacionamiento} cajones de estacionamiento`,
            ].map((feat, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: accent, borderRadius: '50%', flexShrink: 0 }} />
                {feat}
              </li>
            ))}
          </ul>
        </section>

        {/* Secondary photo gallery */}
        {fotos.length > 1 && (
          <section>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#a8a29e',
                borderBottom: '1px solid #e7e5e4',
                paddingBottom: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              Galería
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {fotos.slice(1, 7).map((src, i) => (
                <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#e5e5e5' }}>
                  <img
                    src={src}
                    alt={`Interior ${i + 2}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e7e5e4',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          © {new Date().getFullYear()} {asesor.toUpperCase()} • TODOS LOS DERECHOS RESERVADOS
        </p>
        {(telefono || email) && (
          <p style={{ fontSize: '13px', color: '#78716c', marginTop: '4px' }}>
            {telefono}{telefono && email ? ' • ' : ''}{email}
          </p>
        )}
      </footer>
    </div>
  );
}

