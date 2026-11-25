/* Dibuja un código QR (SVG). La librería se carga solo cuando hace falta. */
import { useEffect, useState } from 'react';

export default function Qr({ value, size = 220 }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode').then(({ default: QR }) =>
      QR.toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then((s) => alive && setSvg(s)),
    );
    return () => {
      alive = false;
    };
  }, [value]);
  return <div className="qr" style={{ width: size, height: size }} role="img" aria-label="Código QR de la entrada" dangerouslySetInnerHTML={{ __html: svg }} />;
}
