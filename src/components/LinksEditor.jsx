/* Editor de una lista de enlaces: URL, nombre opcional e ícono, con agregar, quitar y reordenar.
   Si la URL es de YouTube, SoundCloud o un post de Instagram, se puede mostrar incrustada. */
import { resolveLink, ICON_CHOICES } from '../platforms.js';
import { PlatformIcon } from './LinkButton.jsx';
import { getEmbed } from '../embeds.js';

export default function LinksEditor({ links, onChange, labelPlaceholder = 'Nombre (opcional)', allowEmbed = true }) {
  const set = (i, patch) => onChange(links.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="links-editor">
      {links.map((l, i) => {
        const embed = allowEmbed ? getEmbed(l.url) : null;
        const info = /^(https:\/\/|mailto:)/.test(l.url) ? resolveLink({ url: l.url, icon: l.icon }) : null;
        return (
          <div className="le-row" key={i}>
            <span className="le-icon">{info ? <PlatformIcon icon={info.icon} badge={info.badge} /> : '·'}</span>
            <div className="le-fields">
              <input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={l.url}
                onChange={(e) => set(i, { url: e.target.value })}
                aria-label={`URL del enlace ${i + 1}`}
              />
              <input
                type="text"
                placeholder={labelPlaceholder}
                value={l.label}
                maxLength={120}
                onChange={(e) => set(i, { label: e.target.value })}
                aria-label={`Nombre del enlace ${i + 1}`}
              />
              <select value={l.icon || ''} onChange={(e) => set(i, { icon: e.target.value })} aria-label={`Ícono del enlace ${i + 1}`}>
                <option value="">Ícono: automático</option>
                {ICON_CHOICES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
              {embed && (
                <label className="check le-embed">
                  <input type="checkbox" checked={!!l.embed} onChange={(e) => set(i, { embed: e.target.checked })} />
                  Mostrar incrustado (reproductor de {embed.name})
                </label>
              )}
            </div>
            <div className="le-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === links.length - 1} aria-label="Bajar">↓</button>
              <button type="button" onClick={() => onChange(links.filter((_, k) => k !== i))} aria-label="Quitar">✕</button>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn-ghost" onClick={() => onChange([...links, { url: '', label: '', icon: '', embed: false }])}>
        + Agregar enlace
      </button>
    </div>
  );
}
