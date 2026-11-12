/* API de ATKL en local:  npm run server  → http://localhost:3001/api/hub */
import app from './app.js';
import { connectDB } from './db.js';
import { assertAuthConfig } from './auth.js';

const PORT = process.env.PORT || 3001;

try {
  assertAuthConfig();
  const c = await connectDB();
  console.log(`MongoDB conectado (base "${c.name}")`);
  app.listen(PORT, () => console.log(`API ATKL en http://localhost:${PORT}/api/hub`));
} catch (e) {
  console.error('No se pudo iniciar la API:', e.message);
  process.exit(1);
}
