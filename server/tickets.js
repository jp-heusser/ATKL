/* Utilidades de la venta de entradas. */
import crypto from 'node:crypto';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex'); // link privado del pedido
export const newTicketCode = () => crypto.randomBytes(16).toString('hex'); // contenido del QR

// Código corto legible: ATK-7F3K9Q (sin 0/O/1/I para dictarlo sin confusiones).
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const newOrderCode = () =>
  'ATK-' + Array.from(crypto.randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join('');

// RUT chileno: valida dígito verificador. Devuelve el RUT normalizado (12345678-5) o null.
export function normalizeRut(input) {
  const s = String(input || '').replace(/[.\s]/g, '').toUpperCase();
  const m = /^(\d{7,8})-?([\dK])$/.exec(s);
  if (!m) return null;
  let sum = 0;
  let mul = 2;
  for (let i = m[1].length - 1; i >= 0; i--) {
    sum += Number(m[1][i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const dv = 11 - (sum % 11);
  const expected = dv === 11 ? '0' : dv === 10 ? 'K' : String(dv);
  return expected === m[2] ? `${m[1]}-${m[2]}` : null;
}

// Documento: si parece RUT debe ser válido; si no, se acepta como pasaporte.
export function cleanDoc(input) {
  const raw = String(input || '').trim();
  if (!raw) return { error: 'Falta el RUT o pasaporte' };
  if (/^[\d.\s]+-?[\dkK]$/.test(raw)) {
    const rut = normalizeRut(raw);
    return rut ? { doc: rut } : { error: 'El RUT no es válido' };
  }
  if (!/^[A-Za-z0-9-]{5,20}$/.test(raw)) return { error: 'RUT o pasaporte no válido' };
  return { doc: raw.toUpperCase() };
}

export const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

// Ventas abiertas hasta 6 horas después del inicio.
export const salesOpen = (event) =>
  event.status === 'published' && new Date(event.startsAt).getTime() + 6 * 3600e3 > Date.now();
