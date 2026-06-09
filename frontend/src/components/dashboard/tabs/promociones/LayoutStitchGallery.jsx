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
    .filter(Boolean))].slice(0, 12);

  const heroImg = fotos[0] ?? null;
  // gallery uses fotos after the hero
  const restantes = fotos.slice(1);
  const galleryImages = restantes.length >= 6
    ? restantes.slice(0, 6)
    : [...restantes, ...Array(Math.max(0, 6 - restantes.length)).fill(null)];

  return (
    <div
      id="pv-ficha-root"
      className="bg-white overflow-hidden flex flex-col border border-gray-300 relative"
      style={{ width: 794, height: 1123, padding: 34, fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header className="flex justify-between items-end border-b border-gray-300 pb-3 mb-3" style={{ flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <h1
            className="tracking-tight leading-none font-bold uppercase text-black"
            style={{ fontFamily: serif, fontSize: 30 }}
          >
            {direccion}
          </h1>
          <p className="text-gray-500 flex items-center gap-1 mt-1 uppercase tracking-widest" style={{ fontSize: 12 }}>
            <MapPin size={13} />
            {ubicacion}{tipo ? ` · ${tipo}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {session?.user?.picture
            ? <img src={session.user.picture} alt="Logo" style={{ height: 38, maxWidth: 120, objectFit: 'contain' }} />
            : <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em' }}>LOGO</span>}
        </div>
      </header>

      {/* Hero LARGE */}
      <section style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ width: '100%', height: 410, overflow: 'hidden', position: 'relative', background: '#e5e5e5' }}>
          {heroImg ? (
            <img alt="Vista principal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={heroImg} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-xs uppercase tracking-widest">Sin fotografía</span>
            </div>
          )}
          {/* Price overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))',
            padding: '34px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Precio</span>
              <span style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{precio}</span>
            </div>
            {precioM2 && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Precio / m²</span>
                <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: '#fff' }}>{precioM2}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Specs strip */}
      <section style={{ flexShrink: 0, marginBottom: 12 }}>
        <div className="border-b border-t border-gray-300" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          {[
            { l: 'Construcción', v: construccion },
            { l: 'Terreno', v: terreno },
            { l: 'Recámaras', v: recamaras, Icon: Bed },
            { l: 'Baños', v: banos, Icon: Bath },
            { l: 'Estac.', v: estacionamiento, Icon: Car },
            ...(antiguedad ? [{ l: 'Antigüedad', v: `${antiguedad}` }] : []),
            ...(conservacion ? [{ l: 'Conservación', v: conservacion }] : []),
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{s.l}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.Icon && <s.Icon size={13} className="text-black" />}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{s.v}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Descripción + Lo Especial */}
      <section style={{ flexShrink: 0, marginBottom: 10, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Descripción</h2>
          <p style={{ fontSize: 12.5, color: '#444', lineHeight: 1.5, fontStyle: 'italic', borderLeft: `3px solid ${accent}`, paddingLeft: 12 }}>
            {descripcion}
          </p>
        </div>
        {especiales.length > 0 && (
          <div>
            <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Lo Especial</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
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
      <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>Galería</h2>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '1fr 1fr', gap: 8 }}>
          {galleryImages.map((src, i) => (
            <div key={i} style={{ background: '#e5e5e5', overflow: 'hidden' }}>
              {src ? (
                <img alt={`Fotografía ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={src} />
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
      <footer style={{ flexShrink: 0, marginTop: 12, paddingTop: 10, borderTop: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: '1px solid #d1d5db', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {session?.user?.photoURL
              ? <img src={session.user.photoURL} alt={asesor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={26} className="text-gray-400" />}
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
