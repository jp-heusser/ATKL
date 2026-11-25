/* Imagen de evento: la original va completa y nítida delante (sin recortar),
   y detrás la misma imagen ampliada y difuminada con CSS rellena el marco.
   El marco cambia de forma según la imagen: horizontal → 16:9; vertical (reel) → más alto. */
import { useState } from 'react';

export default function EventMedia({ src, alt = '', variant = 'card', lazy = false }) {
  const [portrait, setPortrait] = useState(false);
  return (
    <div className={`ev-media ev-media-${variant}${portrait ? ' is-portrait' : ''}`}>
      <img className="ev-media-bg" src={src} alt="" aria-hidden="true" decoding="async" loading={lazy ? 'lazy' : undefined} />
      <img
        className="ev-media-fg"
        src={src}
        alt={alt}
        decoding="async"
        loading={lazy ? 'lazy' : undefined}
        onLoad={(e) => setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.05)}
      />
    </div>
  );
}
