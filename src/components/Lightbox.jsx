/* Imagen a pantalla completa. Se cierra tocando fuera, con la X o con Escape.
   Se monta directo en <body> (portal): la animación de la página crearía un contenedor
   que la dejaría encerrada en la columna de texto. */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Lightbox({ src, alt, onClose }) {
  const closeBtn = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // sin scroll detrás
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      <button ref={closeBtn} type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
    </div>,
    document.body,
  );
}
