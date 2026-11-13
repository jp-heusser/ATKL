/* Lo que un artista puede hacer con su propio perfil. */
import { Router } from 'express';
import Artist from '../models/Artist.js';
import { requireAuth } from '../auth.js';
import { assign, cleanLinks, linksWithLegacy } from '../util.js';
import { savePhoto, removePhoto } from '../photos.js';

const router = Router();
router.use(requireAuth);

const mine = (req) => (req.user.artist ? Artist.findById(req.user.artist) : null);
const view = (a) => ({ slug: a.slug, name: a.name, role: a.role, city: a.city, photo: a.photo, links: linksWithLegacy(a), active: a.active });

router.get('/artist', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  res.json(view(artist));
});

// El artista edita nombre, rol, ciudad y enlaces (la foto se sube aparte). No puede cambiar slug, orden ni visibilidad.
router.put('/artist', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  const body = req.body || {};
  assign(artist, body, ['name', 'role', 'city']);
  if (body.links !== undefined) {
    artist.links = cleanLinks(body.links);
    artist.instagram = []; // ya vienen dentro de links
  }
  await artist.save();
  res.json(view(artist));
});

// Foto de perfil: { image: "data:image/jpeg;base64,…" }
router.put('/photo', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  await savePhoto(artist, req.body?.image);
  await artist.save();
  res.json({ photo: artist.photo });
});

router.delete('/photo', async (req, res) => {
  const artist = await mine(req);
  if (!artist) return res.status(404).json({ error: 'Tu cuenta no tiene un perfil de artista asociado' });
  await removePhoto(artist);
  await artist.save();
  res.json({ photo: '' });
});

export default router;
