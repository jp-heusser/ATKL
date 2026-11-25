/* Ayudas para las páginas de Astro: conexión a la base con manejo de errores. */
import { connectDB } from './db.js';

// Ejecuta una consulta; si la base no responde devuelve `fallback` (y lo deja en el log).
export async function safe(fn, fallback = null) {
  try {
    await connectDB();
    return await fn();
  } catch (e) {
    console.error('Base de datos:', e.message);
    return fallback;
  }
}
