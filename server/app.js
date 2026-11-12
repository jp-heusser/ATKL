/* App Express de la API de ATKL (sin "listen").
   - En local la levanta server/index.js.
   - En Vercel la usa api/index.js como función serverless. */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import { assertAuthConfig } from './auth.js';

const app = express();

// Orígenes que pueden llamar a la API (separados por coma). Vacío = cualquiera (solo lectura pública).
const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use(express.json({ limit: '100kb' }));
app.disable('x-powered-by');

app.set('trust proxy', 1); // IP real detrás del proxy del hosting (para el límite de intentos)

// Antes de cualquier ruta: configuración válida y base conectada.
app.use(async (_req, res, next) => {
  try {
    assertAuthConfig();
    await connectDB();
    next();
  } catch (e) {
    console.error(e.message);
    res.status(503).json({ error: 'Servicio no disponible' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));
app.use((err, _req, res, _next) => {
  if (err?.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join('. ');
    return res.status(400).json({ error: msg || 'Datos no válidos' });
  }
  if (err?.code === 11000) return res.status(409).json({ error: 'Ya existe un registro con ese valor (slug o correo)' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

export default app;
