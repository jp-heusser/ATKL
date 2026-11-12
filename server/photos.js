/* Fotos de perfil: se guardan en MongoDB (colección "photos") y se sirven en /api/photos/:id.
   La web las recorta a 400×400 antes de subirlas, así que pesan poco (~30-60 kB). */
import Photo from './models/Photo.js';

const MAX_BYTES = 600 * 1024;

const MAGIC = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

// "data:image/jpeg;base64,…" → { type, buffer }, validando formato real y tamaño.
function parseImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw bad('La imagen debe ser JPG, PNG o WebP');
  const buffer = Buffer.from(m[2], 'base64');
  if (!MAGIC[m[1]].every((b, i) => buffer[i] === b)) throw bad('El archivo no es una imagen válida');
  if (buffer.length > MAX_BYTES) throw bad('La imagen es demasiado grande (máximo 600 kB)');
  return { type: m[1], buffer };
}

// Guarda la foto y deja su dirección en artist.photo (no hace artist.save()).
export async function savePhoto(artist, dataUrl) {
  const { type, buffer } = parseImage(dataUrl);
  await Photo.findOneAndUpdate({ artist: artist._id }, { type, data: buffer }, { upsert: true });
  artist.photo = `/api/photos/${artist._id}?v=${Date.now()}`; // ?v cambia en cada subida: evita caché vieja
}

export async function removePhoto(artist) {
  await Photo.deleteOne({ artist: artist._id });
  artist.photo = '';
}
