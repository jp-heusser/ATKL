import { link, absoluteLink } from '../router.js';
import { useEffect, useState } from 'react';
import { isValidLink } from '../platforms.js';
import { LinkItem } from './LinkButton.jsx';
import Avatar from './Avatar.jsx';
import SocialIcons from './SocialIcons.jsx';

export default function ArtistPage({ artist }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `${artist.name} — ATKL Records`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'ATKL Records';
    };
  }, [artist]);

  // Sin enlaces ni íconos de redes cargados: se muestra un aviso de mantención.
  const links = (artist.links || []).filter(isValidLink);
  const empty = !links.length && !(artist.socials || []).filter(isValidLink).length;

  const copy = async () => {
    const url = absoluteLink(artist.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt?.('Copia este enlace:', url);
    }
  };

  return (
    <main className="page">
      <nav className="back">
        <a href={link('')}>← ATKL Records</a>
      </nav>

      <header className="artist-head">
        <Avatar artist={artist} size={96} />
        <h1 className="artist-title">{artist.name}</h1>
        {(artist.role || artist.city) && (
          <p className="artist-meta">{[artist.role, artist.city].filter(Boolean).join(' · ')}</p>
        )}
        <SocialIcons links={artist.socials} label={`Redes de ${artist.name}`} />
      </header>

      {empty ? (
        <div className="maintenance" role="status">
          <span className="maintenance-tag">En mantención</span>
          <p>Estamos preparando el perfil de {artist.name}. Vuelve pronto para ver sus enlaces.</p>
        </div>
      ) : (
        <div className="link-stack">
          {links.map((entry, i) => (
            <LinkItem key={i} entry={entry} />
          ))}
        </div>
      )}

      <button type="button" className="copy-btn" onClick={copy}>
        {copied ? 'Link copiado ✓' : 'Copiar link de este perfil'}
      </button>
    </main>
  );
}
