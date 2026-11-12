// Normaliza una lista de enlaces recibida del cliente: [{url,label}] sin vacíos.
export function cleanLinks(list, { keepEmptyUrl = false } = {}) {
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => ({
      url: String((typeof e === 'string' ? e : e?.url) ?? '').trim(),
      label: String((typeof e === 'string' ? '' : e?.label) ?? '').trim(),
      icon: String((typeof e === 'string' ? '' : e?.icon) ?? '').trim(),
    }))
    .filter((e) => e.url || (keepEmptyUrl && e.label));
}

export const str = (v) => (typeof v === 'string' ? v.trim() : undefined);

// Copia a "doc" solo los campos permitidos que vengan en "body".
export function assign(doc, body, fields) {
  for (const f of fields) {
    const v = str(body[f]);
    if (v !== undefined) doc[f] = v;
  }
}

// Destacados de Instagram: hasta 3 URLs de posts o reels públicos, normalizadas.
// Acepta  https://www.instagram.com/p/XXXX/ , /reel/XXXX/ , /reels/XXXX/ , /tv/XXXX/  (con o sin ?parámetros).
export const MAX_INSTAGRAM = 3;
export function cleanInstagram(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const v = String(raw ?? '').trim();
    if (!v) continue;
    const m = /^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})(?:[/?#].*)?$/.exec(v);
    if (!m) throw Object.assign(new Error('Pega el enlace de una publicación o reel de Instagram (instagram.com/p/… o /reel/…)'), { status: 400 });
    const url = `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/`;
    if (!out.includes(url)) out.push(url);
  }
  if (out.length > MAX_INSTAGRAM) throw Object.assign(new Error(`Máximo ${MAX_INSTAGRAM} publicaciones de Instagram`), { status: 400 });
  return out;
}
