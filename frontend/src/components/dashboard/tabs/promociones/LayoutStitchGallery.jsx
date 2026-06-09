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

export default function LayoutStitchGallery({
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
  const accent = palette?.accent || '#775a19';
  const serif = 'Playfair Display, Georgia, serif';

  const descripcion =
    descripcionTexto ||
    'Una propuesta arquitectónica sin concesiones que fusiona precisión tectónica con la fluidez natural del entorno. Grandes volúmenes se abren sin fricción al horizonte, donde la alberca infinita actúa como extensión visual del paisaje.';

  // "Lo Especial" — combina puntos verificados + amenidades + instalaciones + espacios
  const verified = (puntosDestacados || []).filter(p => p?.verificado).map(p => p.texto);
  const otros = (puntosDestacados || []).filter(p => !p?.verificado).map(p => p.texto);
  const especiales = [...new Set([...verified, ...amenidades, ...instalaciones, ...espacios, ...otros]
    .filter(Boolean))].slice(0, 14);
  const especialesCols = especiales.length > 6 ? '1fr 1fr' : '1fr';

  const heroImg = fotos[0] ?? null;
  const restantes = fotos.slice(1);
  // gallery grows: when few photos, fewer rows so each tile is bigger
  const galleryCount = restantes.length >= 6 ? 6 : (restantes.length >= 3 ? 3 : Math.max(restantes.length, 3));
  const galleryImages = [...restantes.slice(0, galleryCount),
    ...Array(Math.max(0, galleryCount - restantes.length)).fill(null)];
  const galleryRows = galleryImages.length > 3 ? 2 : 1;

  const specs = [
    { l: 'Construcción', v: construccion },
    { l: 'Terreno', v: terreno },
    { l: 'Recámaras', v: recamaras, Icon: Bed },
    { l: 'Baños', v: banos, Icon: Bath },
    { l: 'Estac.', v: estacionamiento, Icon: Car },
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

      {/* Hero LARGE (~46% page height) */}
      <section style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ width: '100%', height: 470, overflow: 'hidden', position: 'relative', background: '#e5e5e5' }}>
          {heroImg ? (
            <img alt="Vista principal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={heroImg} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Sin fotografía</span>
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))',
            padding: '46px 22px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Precio</span>
              <span style={{ fontFamily: serif, fontSize: 36, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{precio}</span>
            </div>
            {precioM2 && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Precio / m²</span>
                <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: '#fff' }}>{precioM2}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Specs strip */}
      <section style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ borderTop: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', padding: '9px 0' }}>
          {specs.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{s.l}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.Icon && <s.Icon size={13} color="#000" />}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{s.v}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Descripción + Lo Especial */}
      <section style={{ flexShrink: 0, marginBottom: 12, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Descripción</h2>
          <p style={{ fontSize: 12.5, color: '#444', lineHeight: 1.5, fontStyle: 'italic', borderLeft: `3px solid ${accent}`, paddingLeft: 12 }}>
            {descripcion}
          </p>
        </div>
        {especiales.length > 0 && (
          <div>
            <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Lo Especial</h2>
            <div style={{ display: 'grid', gridTemplateColumns: especialesCols, gap: '4px 10px' }}>
              {especiales.map((a, i) => {
                const { label, Icon } = parseFeatureItem(a);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}>
                    <Icon size={12} style={{ color: accent, flexShrink: 0 }} />
                    <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Gallery — fills remaining space */}
      <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Galería</h2>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: `repeat(${galleryRows}, 1fr)`, gap: 8 }}>
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
