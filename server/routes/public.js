/* API pública (solo lectura). */
import { Router } from 'express';
import Label from '../models/Label.js';
import Artist from '../models/Artist.js';
import Photo from '../models/Photo.js';
import { linksWithLegacy } from '../util.js';

const router = Router();
const ARTIST_FIELDS = 'slug name role city photo socials links instagram order -_id';
const present = ({ instagram, ...a }) => ({ ...a, socials: a.socials || [], links: linksWithLegacy({ links: a.links, instagram }) });

router.get('/health', (_req, res) => res.json({ ok: true }));

// Todo lo que necesita la web en una sola llamada.
router.get('/hub', async (_req, res, next) => {
  try {
    const [label, artists] = await Promise.all([
      Label.findOne({ key: 'main' }).select('name bio socials links -_id').lean(),
      Artist.find({ active: true }).select(ARTIST_FIELDS).sort({ order: 1, name: 1 }).lean(),
    ]);
    if (!label) return res.status(404).json({ error: 'Sin datos del sello. Ejecuta: npm run seed' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ label, artists: artists.map(present) });
  } catch (e) {
    next(e);
  }
});

router.get('/artists/:slug', async (req, res, next) => {
  try {
    const artist = await Artist.findOne({ slug: String(req.params.slug).toLowerCase(), active: true })
      .select(ARTIST_FIELDS)
      .lean();
    if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
    res.json(present(artist));
  } catch (e) {
    next(e);
  }
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
