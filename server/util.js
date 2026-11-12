// Normaliza una lista de enlaces recibida del cliente: [{url,label}] sin vacíos.
export function cleanLinks(list, { keepEmptyUrl = false } = {}) {
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => ({
      url: String((typeof e === 'string' ? e : e?.url) ?? '').trim(),
      label: String((typeof e === 'string' ? '' : e?.label) ?? '').trim(),
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
