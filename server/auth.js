/* Autenticación: contraseñas con bcrypt y sesión con token JWT.
   En la web el token va en una cookie httpOnly (no la puede leer JavaScript);
   los scripts y pruebas pueden usar la cabecera Authorization: Bearer … */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from './models/User.js';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('Falta JWT_SECRET en .env (mínimo 32 caracteres)');
  return s;
};
export const assertAuthConfig = () => void secret();

export const MIN_PASSWORD = 10;
export const SESSION_COOKIE = 'atkl_session';
export const SESSION_DAYS = 7;

// Opciones de la cookie de sesión (secure fuera de localhost).
export const sessionCookie = (secure) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge: SESSION_DAYS * 24 * 3600,
});

// Usuario a partir de un token (para las páginas del panel). null si no es válido.
export async function userFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret());
    const user = await User.findById(payload.sub);
    return user && user.active ? user : null;
  } catch {
    return null;
  }
}
export const hashPassword = (plain) => bcrypt.hash(plain, 12);
export const checkPassword = (plain, hash) => bcrypt.compare(plain, hash);
export const tempPassword = () => crypto.randomBytes(9).toString('base64url'); // 12 caracteres

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: `${SESSION_DAYS}d` });

export const publicUser = (u) => ({ email: u.email, role: u.role, artist: u.artist ? String(u.artist) : null });

// Exige sesión válida. Deja el usuario en req.user.
export async function requireAuth(req, res, next) {
  try {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return res.status(401).json({ error: 'Inicia sesión' });
    const payload = jwt.verify(m[1], secret());
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Sesión no válida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión vencida. Inicia sesión otra vez' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

// Exige uno de los roles indicados (usar después de requireAuth).
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'No tienes permiso para esto' });
