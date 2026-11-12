import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { checkPassword, hashPassword, signToken, publicUser, requireAuth, MIN_PASSWORD } from '../auth.js';

const router = Router();

// Máximo 10 intentos de login cada 15 minutos por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = email ? await User.findOne({ email }).select('+passwordHash') : null;
  const ok = user && user.active && (await checkPassword(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/password', requireAuth, async (req, res) => {
  const current = String(req.body?.current || '');
  const next = String(req.body?.next || '');
  if (next.length < MIN_PASSWORD)
    return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await checkPassword(current, user.passwordHash)))
    return res.status(400).json({ error: 'La contraseña actual no es correcta' });
  user.passwordHash = await hashPassword(next);
  await user.save();
  res.json({ ok: true });
});

export default router;
