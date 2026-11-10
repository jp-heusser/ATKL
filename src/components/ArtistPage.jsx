import { useEffect, useState } from 'react';
import { isValidLink } from '../platforms.js';
import LinkButton from './LinkButton.jsx';
import Avatar from './Avatar.jsx';

export default function ArtistPage({ artist }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `${artist.name} — ATKL Records`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'ATKL Records';
    };
  }, [artist]);

  const copy = async () => {
    const url = `${location.origin}${location.pathname}#${artist.slug}`;
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
        <a href="#">← ATKL Records</a>
      </nav>

      <header className="artist-head">
        <Avatar artist={artist} size={96} />
        <h1 className="artist-title">{artist.name}</h1>
        {(artist.role || artist.city) && (
          <p className="artist-meta">{[artist.role, artist.city].filter(Boolean).join(' · ')}</p>
        )}
      </header>

      <div className="link-stack">
        {artist.links.filter(isValidLink).map((entry, i) => (
          <LinkButton key={i} entry={entry} />
        ))}
      </div>

      <button type="button" className="copy-btn" onClick={copy}>
        {copied ? 'Link copiado ✓' : 'Copiar link de este perfil'}
      </button>
    </main>
  );
}
