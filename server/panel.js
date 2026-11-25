/* Ayudas para las páginas del panel (control de acceso y datos comunes). */
import { connectDB } from './db.js';
import Order from './models/Order.js';

// Devuelve una redirección si el usuario no puede ver la página; si puede, null.
export function guard(Astro, roles) {
  const user = Astro.locals.user;
  if (!user) return Astro.redirect(`/acceso?next=${encodeURIComponent(Astro.url.pathname + Astro.url.search)}`);
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'door') return Astro.redirect('/puerta');
    return Astro.redirect('/panel');
  }
  return null;
}

export async function pendingCount() {
  await connectDB();
  return Order.countDocuments({ status: 'pending' });
}
