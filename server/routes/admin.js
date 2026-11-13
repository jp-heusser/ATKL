/* Administración: sello, artistas y cuentas. Solo rol "admin". */
import { Router } from 'express';
import Label from '../models/Label.js';
import Artist from '../models/Artist.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin, hashPassword, tempPassword } from '../auth.js';
import { assign, cleanLinks, cleanSocials, plainLinks, linksWithLegacy } from '../util.js';
import { savePhoto, removePhoto } from '../photos.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const ARTIST_TEXT = ['name', 'role', 'city']; // la foto se sube aparte

function applyArtist(artist, body) {
  assign(artist, body, ARTIST_TEXT);
  if (body.socials !== undefined) artist.socials = cleanSocials(body.socials);
  if (body.links !== undefined) {
    artist.links = cleanLinks(body.links);
    artist.instagram = []; // ya vienen dentro de links
  }
  if (typeof body.active === 'boolean') artist.active = body.active;
  if (Number.isFinite(body.order)) artist.order = body.order;
}

/* ----- Sello ----- */
router.get('/label', async (_req, res) => {
  const label = await Label.findOne({ key: 'main' }).select('name bio socials links -_id').lean();
  res.json(label || { name: 'ATKL Records', bio: '', socials: [], links: [] });
});

router.put('/label', async (req, res) => {
  const body = req.body || {};
  const label = (await Label.findOne({ key: 'main' })) || new Label({ key: 'main', name: 'ATKL Records' });
  assign(label, body, ['name', 'bio']);
  if (body.socials !== undefined) label.socials = cleanLinks(body.socials);
  if (body.links !== undefined) label.links = cleanLinks(body.links, { keepEmptyUrl: true });
  await label.save();
  res.json({ name: label.name, bio: label.bio, socials: label.socials, links: label.links });
});

/* ----- Artistas ----- */
router.get('/artists', async (_req, res) => {
  const [artists, users] = await Promise.all([
    Artist.find().sort({ order: 1, name: 1 }).lean(),
    User.find({ artist: { $ne: null } }).select('email artist active').lean(),
  ]);
  const account = new Map(users.map((u) => [String(u.artist), u.email]));
  res.json(
    artists.map((a) => ({
      slug: a.slug, name: a.name, role: a.role, city: a.city, photo: a.photo,
      socials: plainLinks(a.socials), links: linksWithLegacy(a), active: a.active, order: a.order, account: account.get(String(a._id)) || null,
    })),
  );
});

router.post('/artists', async (req, res) => {
  const body = req.body || {};
  const count = await Artist.countDocuments();
  const artist = new Artist({ slug: String(body.slug || '').trim().toLowerCase(), name: String(body.name || '').trim(), order: count });
  applyArtist(artist, body);
  await artist.save();
  res.status(201).json({ slug: artist.slug });
});

router.put('/artists/:slug', async (req, res) => {
  const artist = await Artist.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
  applyArtist(artist, req.body || {});
  await artist.save();
  res.json({ ok: true });
});

router.put('/artists/:slug/photo', async (req, res) => {
  const artist = await Artist.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
  await savePhoto(artist, req.body?.image);
  await artist.save();
  res.json({ photo: artist.photo });
});

router.delete('/artists/:slug/photo', async (req, res) => {
  const artist = await Artist.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
  await removePhoto(artist);
  await artist.save();
  res.json({ photo: '' });
});

/* ----- Cuentas de artista -----
   Crea la cuenta (o le reinicia la contraseña) y devuelve una contraseña temporal UNA sola vez. */
router.post('/accounts', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const artist = await Artist.findOne({ slug: String(req.body?.slug || '').toLowerCase() });
  if (!artist) return res.status(404).json({ error: 'Artista no encontrado' });
  if (!email) return res.status(400).json({ error: 'Falta el correo' });

  const password = tempPassword();
  let user = await User.findOne({ email });
  if (user && user.role === 'admin') return res.status(400).json({ error: 'Ese correo es de un administrador' });
  if (!user) user = new User({ email, role: 'artist' });
  user.artist = artist._id;
  user.active = true;
  user.passwordHash = await hashPassword(password);
  await user.save();
  artist.owner = user._id;
  await artist.save();
  res.status(201).json({ email, tempPassword: password });
});

export default router;
