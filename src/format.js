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

// Imagen de evento → 16:9 (1600×900) JPEG.
// - Si ya es casi 16:9 (o más ancha): se recorta al centro.
// - Si es vertical o cuadrada (reel 9:16, post 4:5…): va ENTERA al centro y los costados se
//   rellenan con la misma imagen ampliada y borrosa (sin recortar el flyer).
export async function eventImage16x9(file, W = 1600, quality = 0.84) {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o WebP)');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) throw new Error('No se pudo leer la imagen');
  const H = Math.round((W * 9) / 16);
  const ratio = bmp.width / bmp.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  const cover = (target, tw, th) => {
    const s = Math.max(tw / bmp.width, th / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    target.drawImage(bmp, (tw - w) / 2, (th - h) / 2, w, h);
  };

  if (ratio >= 1.6) {
    cover(ctx, W, H); // casi 16:9 o más ancha: recorte normal
  } else {
    // Fondo borroso: se dibuja muy chico y se amplía (funciona en todos los navegadores, también Safari).
    const tiny = document.createElement('canvas');
    tiny.width = 40;
    tiny.height = 23;
    const tctx = tiny.getContext('2d');
    tctx.imageSmoothingQuality = 'high';
    cover(tctx, tiny.width, tiny.height);
    ctx.drawImage(tiny, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, W, H);
    // Flyer completo al centro, con una sombra para separarlo del fondo.
    const s = H / bmp.height;
    const w = bmp.width * s;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.drawImage(bmp, (W - w) / 2, 0, w, H);
  }
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}
