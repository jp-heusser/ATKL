/* API de ATKL: mismas rutas que antes, ahora atendidas por un endpoint de Astro
   (src/pages/api/[...path].js) con el mini-router de server/router.js. */
import { Router, createRes } from './router.js';
import { connectDB } from './db.js';
import { assertAuthConfig, SESSION_COOKIE } from './auth.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import ticketRoutes from './routes/tickets.js';
import adminTicketRoutes from './routes/adminTickets.js';
import doorRoutes from './routes/door.js';

const MAX_BODY = 4 * 1024 * 1024; // fotos y comprobantes llegan en base64 (máx. 2 MB)

const app = Router();
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminTicketRoutes);
app.use('/api/door', doorRoutes);
app.use('/api', ticketRoutes);
app.use('/api', publicRoutes);

function handleError(err, res) {
  if (err?.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join('. ');
    return res.status(400).json({ error: msg || 'Datos no válidos' });
  }
  if (err?.code === 11000) return res.status(409).json({ error: 'Ya existe un registro con ese valor (slug o correo)' });
  if (err?.name === 'CastError') return res.status(404).json({ error: 'No encontrado' });
  if (err?.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: 'Error interno' });
}

export async function handleApi({ request, cookies, clientAddress }) {
  const url = new URL(request.url);
  const res = createRes();
  res.set('Cache-Control', 'no-store');
  const headers = Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v]));

  // Cookie de sesión → cabecera Authorization (las rutas solo miran req.headers.authorization).
  const session = cookies.get(SESSION_COOKIE)?.value;
  if (!headers.authorization && session) {
    headers.authorization = `Bearer ${session}`;
    // Protección CSRF: con cookie, los cambios solo se aceptan desde el mismo sitio.
    // Se compara con el host real de la petición (detrás de Vercel viene en x-forwarded-host).
    const host = headers['x-forwarded-host'] || headers.host || url.host;
    let originHost = null;
    try {
      originHost = headers.origin ? new URL(headers.origin).host : null;
    } catch {}
    if (!['GET', 'HEAD'].includes(request.method) && headers.origin && originHost !== host)
      return new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const req = {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    params: {},
    headers,
    ip: (headers['x-forwarded-for'] || '').split(',')[0].trim() || clientAddress || '',
    body: {},
  };

  try {
    if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
      const len = Number(headers['content-length'] || 0);
      if (len > MAX_BODY) return res.status(413).json({ error: 'La imagen es demasiado grande' }).toResponse();
      const text = await request.text();
      if (text.length > MAX_BODY) return res.status(413).json({ error: 'La imagen es demasiado grande' }).toResponse();
      if (text) {
        try {
          req.body = JSON.parse(text);
        } catch {
          return res.status(400).json({ error: 'JSON no válido' }).toResponse();
        }
      }
    }
    assertAuthConfig();
    await connectDB();
    const done = await app.handle(req, res);
    if (!done) res.status(404).json({ error: 'No encontrado' });
  } catch (err) {
    if (/MONGODB_URI|JWT_SECRET|ECONNREFUSED|querySrv|ServerSelection/i.test(String(err?.message || err?.name))) {
      console.error(err.message);
      res.status(503).json({ error: 'Servicio no disponible' });
    } else handleError(err, res);
  }

  for (const c of res.cookies || []) {
    if (c.value === null) cookies.delete(c.name, { path: '/' });
    else cookies.set(c.name, c.value, c.opts);
  }
  return res.toResponse();
}
