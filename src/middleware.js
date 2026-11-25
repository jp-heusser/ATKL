/* Antes de cada página:
   - En el panel, la puerta y el acceso: carga el usuario de la cookie de sesión (Astro.locals.user).
   - Cabeceras de seguridad para todas las respuestas. */
import { defineMiddleware } from 'astro:middleware';
import { connectDB } from '../server/db.js';
import { userFromToken, SESSION_COOKIE } from '../server/auth.js';

const NEEDS_USER = /^\/(panel|puerta|acceso)(\/|$)/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  if (NEEDS_USER.test(ctx.url.pathname)) {
    const token = ctx.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        await connectDB();
        ctx.locals.user = await userFromToken(token);
      } catch (e) {
        console.error('Sesión:', e.message);
      }
      if (!ctx.locals.user) ctx.cookies.delete(SESSION_COOKIE, { path: '/' });
    }
  }

  const res = await next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'DENY'); // el sitio no se puede cargar dentro de otra página
  if (NEEDS_USER.test(ctx.url.pathname)) res.headers.set('Cache-Control', 'private, no-store');
  return res;
});
