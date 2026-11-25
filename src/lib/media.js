// '/api/photos/…' y '/api/events/…' se sirven desde el mismo sitio; 'artists/x.jpg' desde public/; https tal cual.
export const photoUrl = (p) => (!p ? '' : /^(https:|data:|blob:|\/)/.test(p) ? p : `/${p}`);
