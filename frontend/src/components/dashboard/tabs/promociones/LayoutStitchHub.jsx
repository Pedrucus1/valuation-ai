import React from 'react';
import LayoutStitchGallery from './LayoutStitchGallery';
import LayoutStitchLetter from './LayoutStitchLetter';
import LayoutStitchAsymmetry from './LayoutStitchAsymmetry';
import LayoutStitchFacebook from './LayoutStitchFacebook';
import LayoutStitchTikTok from './LayoutStitchTikTok';
import LayoutStitchKit from './LayoutStitchKit';

// ── HUB ROUTER: Nuevos Diseños de Stitch ───────────────────────────────────────────────────
// Este componente recibe las props y el `formato` elegido,
// y manda llamar al archivo correspondiente de la nueva suite generada por Stitch.

const LayoutStitchHub = (props) => {
  const { formato } = props;

  switch (formato) {
    case 'stitch_letter':
      return <LayoutStitchLetter {...props} />;
    case 'stitch_asymmetry':
      return <LayoutStitchAsymmetry {...props} />;
    case 'stitch_facebook':
      return <LayoutStitchFacebook {...props} />;
    case 'stitch_tiktok':
      return <LayoutStitchTikTok {...props} />;
    case 'stitch_kit':
      return <LayoutStitchKit {...props} />;
    case 'stitch_gallery':
    default:
      // Por defecto, o si es la galería principal
      return <LayoutStitchGallery {...props} />;
  }
};

export default LayoutStitchHub;
