import { resolveLink } from '../platforms.js';
import { getEmbed } from '../embeds.js';
import EmbedBlock from './EmbedBlock.jsx';

export function PlatformIcon({ icon, badge, size = 18 }) {
  if (icon) {
    return (
      <svg className="pf-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {icon.stroke ? (
          <path d={icon.path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d={icon.path} fill="currentColor" />
        )}
      </svg>
    );
  }
  return (
    <span className="pf-badge" aria-hidden="true">
      {badge}
    </span>
  );
}

// Guarda la posición del cursor dentro del botón para el brillo que lo sigue (CSS --mx / --my).
const trackGlow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

export default function LinkButton({ entry }) {
  const l = resolveLink(entry);
  return (
    <a
      className="link-btn"
      onPointerMove={trackGlow}
      href={l.url}
      {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <PlatformIcon icon={l.icon} badge={l.badge} />
      <span className="link-text">
        <span className="link-name">{l.name}</span>
        {l.detail && <span className="link-detail">{l.detail}</span>}
      </span>
      <span className="link-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

// Un elemento de la lista: reproductor incrustado si el enlace lo pide y la URL lo permite; si no, botón.
export function LinkItem({ entry }) {
  return typeof entry !== 'string' && entry.embed && getEmbed(entry.url) ? <EmbedBlock entry={entry} /> : <LinkButton entry={entry} />;
}
