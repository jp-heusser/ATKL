/* Cliente de la API. Por defecto usa /api en el mismo dominio (proxy de Vite en desarrollo,
   función serverless en Vercel). VITE_API_URL solo hace falta si la API vive en otro dominio. */
export const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
// La API se usa siempre, salvo en builds solo estáticos (GitHub Pages: VITE_STATIC_ONLY=true).
export const USE_API = import.meta.env.VITE_STATIC_ONLY !== 'true';

const KEY = 'atkl_token';
export const getToken = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);
  } catch {}
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
