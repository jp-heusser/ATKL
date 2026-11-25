/* API pública (solo lectura). */
import { Router } from '../router.js';
import Label from '../models/Label.js';
import Artist from '../models/Artist.js';
import Photo from '../models/Photo.js';
import { linksWithLegacy } from '../util.js';
import Event from '../models/Event.js';
import { publicEvent } from './tickets.js';

const router = Router();
const ARTIST_FIELDS = 'slug name role city photo socials links instagram order -_id';
const present = ({ instagram, ...a }) => ({ ...a, socials: a.socials || [], links: linksWithLegacy({ links: a.links, instagram }) });

router.get('/health', (_req, res) => res.json({ ok: true }));

// Todo lo que necesita la web en una sola llamada.
// Datos de la portada: sello, artistas visibles y próximos eventos. null si falta el sello.
export async function getHub() {
  const [label, artists, events] = await Promise.all([
    Label.findOne({ key: 'main' }).select('name bio socials links -_id').lean(),
    Artist.find({ active: true }).select(ARTIST_FIELDS).sort({ order: 1, name: 1 }).lean(),
    Event.find({ status: { $in: ['published', 'closed'] }, startsAt: { $gte: new Date(Date.now() - 12 * 3600e3) } }).sort({ startsAt: 1 }).limit(6).lean(),
  ]);
  if (!label) return null;
  return { label, artists: artists.map(present), events: events.map(publicEvent) };
}

// Un artista visible por su slug, o null.
export async function getArtist(slug) {
  const artist = await Artist.findOne({ slug: String(slug).toLowerCase(), active: true }).select(ARTIST_FIELDS).lean();
  return artist ? present(artist) : null;
}

router.get('/hub', async (_req, res) => {
  const hub = await getHub();
  if (!hub) return res.status(404).json({ error: 'Sin datos del sello. Ejecuta: npm run seed' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(hub);
});

router.get('/artists/:slug', async (req, res) => {
  const artist = await getArtist(req.params.slug);
  if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
  res.json(artist);
});

// Fotos de perfil (guardadas en la base).
router.get('/photos/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).end();
    const photo = await Photo.findOne({ artist: req.params.id }).lean();
    if (!photo) return res.status(404).end();
    res.set({ 'Content-Type': photo.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    res.send(Buffer.isBuffer(photo.data) ? photo.data : Buffer.from(photo.data.buffer));
  } catch (e) {
    next(e);
  }
});

export default router;
