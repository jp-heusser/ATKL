/* Rutas de la web.

   Modo normal (Vercel, servidor propio, desarrollo): direcciones limpias
       tusitio.com/desmont-landvik     ·  /acceso  ·  /panel
   Así los links funcionan al pegarlos en Instagram, que convierte "#" en "%23".

   Modo solo estático (GitHub Pages, VITE_STATIC_ONLY=true): direcciones con "#"
       …/ATKL-LINKS/#desmont-landvik
   porque ese hosting no puede responder a rutas que no sean archivos.

   En cualquier modo se entienden también los links antiguos (/#slug) y los que
   Instagram rompió (/%23slug). */
import { useEffect, useState } from 'react';

export const PATH_MODE = import.meta.env.VITE_STATIC_ONLY !== 'true';

// Dirección de una página: link('') = inicio, link('desmont-landvik'), link('panel')…
export const link = (to = '') => (PATH_MODE ? `/${to}` : `#${to}`);
export const absoluteLink = (to = '') =>
  PATH_MODE ? `${location.origin}/${to}` : `${location.origin}${location.pathname}#${to}`;

const clean = (s) => {
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.replace(/^[#/]+/, '').replace(/\/+$/, '').trim().toLowerCase();
};

function read() {
  const fromHash = clean(location.hash);
  if (fromHash) return fromHash;
  if (!PATH_MODE) return '';
  return clean(location.pathname.split('/').filter(Boolean).pop() || ''); // "/%23slug" → "slug"
}

export function navigate(to = '', { replace = false } = {}) {
  if (PATH_MODE) {
    history[replace ? 'replaceState' : 'pushState'](null, '', `/${to}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else if (to) {
    location.hash = to;
  } else {
    history.pushState(null, '', location.pathname + location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

export function useRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const sync = () => setRoute(read());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);

    // Links viejos o rotos (/#slug, /%23slug) → se corrige la dirección a /slug.
    if (PATH_MODE && route && location.pathname !== `/${route}`) history.replaceState(null, '', `/${route}`);

    // Clics en enlaces internos: se cambia de página sin recargar.
    const onClick = (e) => {
      if (!PATH_MODE || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      e.preventDefault();
      navigate(clean(url.pathname));
    };
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return route;
}
