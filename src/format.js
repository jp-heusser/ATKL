/* Formatos comunes: dinero en CLP y fechas en hora de Chile. */
const TZ = 'America/Santiago';

export const clp = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

export const fullDate = (d) =>
  new Intl.DateTimeFormat('es-CL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

export const shortDateTime = (d) =>
  new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

export const dayMonth = (d) => {
  const parts = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: 'numeric', month: 'short' }).formatToParts(new Date(d));
  return { day: parts.find((p) => p.type === 'day')?.value, month: parts.find((p) => p.type === 'month')?.value?.replace('.', '') };
};

// Para <input type="datetime-local"> (hora local del navegador del admin).
export const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export const STATUS = {
  pending: { label: 'En revisión', cls: 'st-pending' },
  approved: { label: 'Aprobado', cls: 'st-ok' },
  rejected: { label: 'Rechazado', cls: 'st-bad' },
  cancelled: { label: 'Anulado', cls: 'st-bad' },
};

// Comprime una imagen en el navegador (JPEG, lado mayor ≤ maxSide) → dataURL.
export async function compressImage(file, maxSide = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw new Error('Sube una imagen (captura de pantalla o foto del comprobante)');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) throw new Error('No se pudo leer la imagen. Prueba con una captura de pantalla.');
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}
