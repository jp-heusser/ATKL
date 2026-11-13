// URLs que la web sabe mostrar incrustadas (la lógica fina está en src/embeds.js).
const EMBEDDABLE = /^https:\/\/((www\.|m\.|music\.)?youtube\.com\/|youtu\.be\/|(www\.)?soundcloud\.com\/|(www\.)?instagram\.com\/)/;
export const MAX_EMBEDS = 6;

// Normaliza una lista de enlaces recibida del cliente: [{url,label,icon,embed}] sin vacíos.
export function cleanLinks(list, { keepEmptyUrl = false } = {}) {
  if (!Array.isArray(list)) return [];
  const out = list
    .map((e) => ({
      url: String((typeof e === 'string' ? e : e?.url) ?? '').trim(),
      label: String((typeof e === 'string' ? '' : e?.label) ?? '').trim(),
      icon: String((typeof e === 'string' ? '' : e?.icon) ?? '').trim(),
      embed: typeof e !== 'string' && e?.embed === true,
    }))
    .filter((e) => e.url || (keepEmptyUrl && e.label))
    .map((e) => ({ ...e, embed: e.embed && EMBEDDABLE.test(e.url) }));
  if (out.filter((e) => e.embed).length > MAX_EMBEDS)
    throw Object.assign(new Error(`Máximo ${MAX_EMBEDS} reproductores incrustados (hacen más lenta la página)`), { status: 400 });
  return out;
}

// Íconos de redes: nunca van incrustados.
export const cleanSocials = (list) => cleanLinks(list).map((e) => ({ ...e, embed: false }));
export const plainLinks = (list) => (list || []).map((l) => ({ url: l.url, label: l.label || '', icon: l.icon || '', embed: false }));

// Compatibilidad: los "destacados de Instagram" de la versión anterior (campo artist.instagram)
// se muestran como enlaces incrustados al final de la lista.
export function linksWithLegacy(artist) {
  const links = (artist.links || []).map((l) => ({ url: l.url, label: l.label || '', icon: l.icon || '', embed: !!l.embed }));
  for (const url of artist.instagram || []) links.push({ url, label: '', icon: '', embed: true });
  return links;
}

export const str = (v) => (typeof v === 'string' ? v.trim() : undefined);

// Copia a "doc" solo los campos permitidos que vengan en "body".
export function assign(doc, body, fields) {
  for (const f of fields) {
    const v = str(body[f]);
    if (v !== undefined) doc[f] = v;
  }
}

