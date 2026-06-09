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
  palette = {},
  puntosDestacados = [],
}) {
  const fotos = fichaAvaluo?.fotos || [];
  const direccion = fichaAvaluo?.direccion || 'The Obsidian Villa';
  const valorNum = fichaAvaluo?.valor ?? fichaAvaluo?.precio_oferta ?? null;
  const precio = valorNum ? formatMXN(valorNum) : '$2,500,000';
  const m2c = fichaAvaluo?.m2_construccion ?? fichaAvaluo?.construccion ?? null;
  const m2t = fichaAvaluo?.m2_terreno ?? fichaAvaluo?.terreno ?? null;
  const precioM2 = (valorNum && m2c) ? formatMXN(Math.round(valorNum / m2c)) : null;
  const recamaras = fichaAvaluo?.recamaras ?? fichaAvaluo?.cuartos ?? '--';
  const banos = fichaAvaluo?.banos ?? '--';
  const construccion = m2c ? `${m2c} m²` : '--';
  const terreno = m2t ? `${m2t} m²` : '--';
  const estacionamiento = fichaAvaluo?.estacionamiento ?? fichaAvaluo?.cajones ?? '--';
  const niveles = fichaAvaluo?.niveles ?? null;
  const antiguedad = fichaAvaluo?.antiguedad ?? null;
  const conservacion = fichaAvaluo?.conservacion ?? null;
  const tipo = fichaAvaluo?.tipo ?? null;
  const ubicacion = fichaAvaluo?.colonia ?? fichaAvaluo?.municipio ?? '--';
  const asesor = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Asesor';
  const email = session?.user?.email ?? '';
  const telefono = session?.user?.phone ?? '';
  const serif = 'Playfair Display, Georgia, serif';
  const accent = palette?.accent || '#775a19';

  const descripcion =
    descripcionTexto ||
    'Una propuesta arquitectónica sin concesiones que fusiona precisión tectónica con la fluidez natural del entorno. Grandes volúmenes se abren sin fricción al horizonte, donde la alberca infinita actúa como extensión visual del paisaje. Cada detalle ha sido curado para eliminar el ruido visual y elevar la experiencia de habitar.';

  const verified = (puntosDestacados || []).filter(p => p?.verificado).map(p => p.texto);
  const otros = (puntosDestacados || []).filter(p => !p?.verificado).map(p => p.texto);
  const especiales = [...new Set([...verified, ...amenidades, ...instalaciones, ...espacios, ...otros]
    .filter(Boolean))].slice(0, 14);
  const especialesCols = especiales.length > 6 ? '1fr 1fr' : '1fr';

  const heroImg = fotos[0] ?? null;
  const restantes = fotos.slice(1);
  const galleryImages = restantes.length >= 4
    ? restantes.slice(0, 4)
    : [...restantes, ...Array(Math.max(0, 4 - restantes.length)).fill(null)];

  const specRows = [
    { l: 'Precio', v: precio, big: true },
    ...(precioM2 ? [{ l: 'Precio / m²', v: precioM2 }] : []),
    { l: 'Construcción', v: construccion },
    { l: 'Terreno', v: terreno },
    ...(tipo ? [{ l: 'Tipo', v: tipo }] : []),
    ...(niveles ? [{ l: 'Niveles', v: niveles }] : []),
    ...(antiguedad ? [{ l: 'Antigüedad', v: `${antiguedad}` }] : []),
    ...(conservacion ? [{ l: 'Conservación', v: conservacion }] : []),
  ];

  return (
    <div
      id="pv-ficha-root"
      style={{ width: 794, height: 1123, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 34, background: '#fff', border: '1px solid #d1d5db', fontFamily: 'Inter, sans-serif', position: 'relative' }}
    >
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #d1d5db', paddingBottom: 12, marginBottom: 12, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: serif, fontSize: 32, lineHeight: 1, fontWeight: 700, textTransform: 'uppercase', color: '#000', letterSpacing: '-0.01em' }}>
            {direccion}
          </h1>
          <p style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 12 }}>
            <MapPin size={13} />
            {ubicacion}{tipo ? ` · ${tipo}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 42, maxWidth: 130, objectFit: 'contain' }} />
            : <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em' }}>LOGO</span>}
        </div>
      </header>

      {/* Hero LARGE */}
      <section style={{ flexShrink: 0, marginBottom: 14 }}>
        <div style={{ width: '100%', height: 400, overflow: 'hidden', background: '#e5e5e5' }}>
          {heroImg ? (
            <img alt="Vista principal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={heroImg} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Sin fotografía</span>
            </div>
          )}
        </div>
      </section>

      {/* Specs | Narrative + Lo Especial */}
      <section style={{ flexShrink: 0, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Specs */}
        <div style={{ borderRight: '1px solid #d1d5db', paddingRight: 24 }}>
          <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>Especificaciones</h2>
          {specRows.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #eee', padding: '5px 0' }}>
              <span style={{ fontSize: 10.5, textTransform: 'uppercase', color: '#555', fontWeight: 500 }}>{s.l}</span>
              <span style={{ fontSize: s.big ? 18 : 13, fontWeight: s.big ? 600 : 700, color: s.big ? accent : '#222', fontFamily: s.big ? serif : 'inherit' }}>{s.v}</span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12 }}>
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#aaa', display: 'block', marginBottom: 2 }}>Recámaras</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bed size={15} /><span style={{ fontSize: 14, fontWeight: 700 }}>{recamaras}</span></div>
            </div>
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#aaa', display: 'block', marginBottom: 2 }}>Baños</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bath size={15} /><span style={{ fontSize: 14, fontWeight: 700 }}>{banos}</span></div>
            </div>
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#aaa', display: 'block', marginBottom: 2 }}>Estac.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Car size={15} /><span style={{ fontSize: 14, fontWeight: 700 }}>{estacionamiento}</span></div>
            </div>
          </div>
        </div>

        {/* Right: Narrative + Lo Especial */}
        <div>
          <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Descripción</h2>
          <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.5, fontStyle: 'italic', borderLeft: `4px solid ${accent}`, paddingLeft: 16, marginBottom: 14 }}>
            {descripcion}
          </p>
          {especiales.length > 0 && (
            <div>
              <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>Lo Especial</h2>
              <div style={{ display: 'grid', gridTemplateColumns: especialesCols, gap: '5px 16px' }}>
                {especiales.map((a, i) => {
                  const { label, Icon } = parseFeatureItem(a);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <Icon size={13} style={{ color: accent, flexShrink: 0 }} />
                      <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Gallery — fills remaining (strip that grows) */}
      <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Galería de Imágenes</h2>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {galleryImages.map((src, i) => (
            <div key={i} style={{ background: '#e5e5e5', overflow: 'hidden' }}>
              {src ? (
                <img alt={`Fotografía ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={src} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Square size={24} color="#d1d5db" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ flexShrink: 0, marginTop: 12, paddingTop: 10, borderTop: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: '1px solid #d1d5db', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {session?.user?.photoURL
              ? <img src={session.user.photoURL} alt={asesor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={26} color="#9ca3af" />}
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111' }}>{asesor}</h3>
            <p style={{ fontSize: 9.5, color: '#aaa', textTransform: 'uppercase' }}>Asesor Inmobiliario</p>
            {(telefono || email) && (
              <p style={{ fontSize: 11, color: '#000', marginTop: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                {telefono && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{telefono}</span>}
                {email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={10} />{email}</span>}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 8 }}>P</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa' }}>propvalu.mx</span>
          </div>
          <p style={{ fontSize: 9, color: '#aaa' }}>© {new Date().getFullYear()} {asesor.toUpperCase()}</p>
        </div>
      </footer>
    </div>
  );
}
