/* Datos de la web.
   1) Muestra de inmediato los datos locales (src/data).
   2) Si la API responde, los reemplaza por los de MongoDB.
   Así la web sigue funcionando aunque la API no esté disponible.

   VITE_API_URL: dirección de la API en producción (ej. https://api.atklrecords.cl).
   En desarrollo se deja vacío: Vite redirige /api a http://localhost:3001. */
import { useCallback, useEffect, useState } from 'react';
import { label as localLabel } from './data/label.js';
import { artists as localArtists } from './data/artists.js';
import { API, USE_API } from './api.js';

export function useHub() {
  const [hub, setHub] = useState({ label: localLabel, artists: localArtists, source: 'local' });

  const reload = useCallback(() => {
    if (!USE_API) return;
    fetch(`${API}/api/hub`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => {
        if (d?.label && Array.isArray(d.artists)) setHub({ label: d.label, artists: d.artists, source: 'api' });
      })
      .catch(() => {}); // sin API: se quedan los datos locales
  }, []);

  useEffect(reload, [reload]);

  return { ...hub, reload };
}
