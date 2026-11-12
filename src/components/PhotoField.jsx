/* Foto de perfil: elige una imagen, se recorta cuadrada a 400×400 en el navegador y se sube. */
import { useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

const SIZE = 400;

// Recorte centrado cuadrado + reducción → dataURL JPEG.
async function toSquareJpeg(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) throw new Error('No se pudo leer la imagen');
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function PhotoField({ artist, onUpload, onRemove }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen');
      await onUpload(await toSquareJpeg(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await onRemove();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-field">
      <Avatar artist={artist} size={72} />
      <div className="photo-actions">
        <span className="form-label">Foto de perfil</span>
        <div className="photo-buttons">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => input.current.click()}>
            {busy ? 'Subiendo…' : artist.photo ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {artist.photo && (
            <button type="button" className="btn-link" disabled={busy} onClick={remove}>
              Quitar
            </button>
          )}
        </div>
        <span className="form-hint">JPG, PNG o WebP. Se recorta cuadrada.</span>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
    </div>
  );
}
