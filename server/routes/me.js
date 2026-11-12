/* Lo que un artista puede hacer con su propio perfil. */
import { Router } from 'express';
import Artist from '../models/Artist.js';
import { requireAuth } from '../auth.js';
import { assign, cleanLinks } from '../util.js';

const router = Router();
router.use(requireAuth);

const mine = (req) => (req.user.artist ? Artist.findById(req.user.artist) : null);
const view = (a) => ({ slug: a.slug, name: a.name, role: a.role, city: a.city, photo: a.photo, links: a.links, active: a.active });

router.get('/artist', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  res.json(view(artist));
});

// El artista edita nombre, rol, ciudad, foto y enlaces. No puede cambiar slug, orden ni visibilidad.
router.put('/artist', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  const body = req.body || {};
  assign(artist, body, ['name', 'role', 'city']);
  if (typeof body.photo === 'string') {
    const photo = body.photo.trim();
    if (photo && !/^https:\/\//.test(photo)) return res.status(400).json({ error: 'La foto debe ser una URL https://' });
    artist.photo = photo;
  }
  if (body.links !== undefined) artist.links = cleanLinks(body.links);
  await artist.save();
  res.json(view(artist));
});

export default router;
