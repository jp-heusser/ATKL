/* Fila de íconos de redes (sello y artistas). */
import { resolveLink, isValidLink } from '../platforms.js';
import { PlatformIcon } from './LinkButton.jsx';

export default function SocialIcons({ links, label }) {
  const list = (links || []).filter(isValidLink).map(resolveLink);
  if (!list.length) return null;
  return (
    <nav className="label-socials" aria-label={label}>
      {list.map((l) => (
        <a
          key={l.url}
          href={l.url}
          aria-label={l.name}
          title={l.name}
          {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          <PlatformIcon icon={l.icon} badge={l.badge} size={19} />
        </a>
      ))}
    </nav>
  );
}
