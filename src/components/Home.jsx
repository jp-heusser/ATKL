import { link } from '../router.js';
import { isValidLink } from '../platforms.js';
import { LinkItem } from './LinkButton.jsx';
import SocialIcons from './SocialIcons.jsx';
import Avatar from './Avatar.jsx';

const LOGO = `${import.meta.env.BASE_URL}logo-atkl.webp`;

export default function Home({ label, artists }) {
  const links = label.links.filter(isValidLink);

  return (
    <main className="page">
      <header className="label-head">
        <div className="logo-wrap">
          <img className="logo" src={LOGO} alt="" width="960" height="606" />
          <img className="logo logo-ghost" src={LOGO} alt="" aria-hidden="true" />
        </div>
        <h1 className="label-name">{label.name}</h1>
        <p className="label-bio">{label.bio}</p>
        <SocialIcons links={label.socials} label="Redes de ATKL Records" />
      </header>

      <div className="link-stack">
        {links.map((entry, i) => (
          <div key={entry.url + entry.label} className="rise" style={{ animationDelay: `${80 + i * 55}ms` }}>
            <LinkItem entry={entry} />
          </div>
        ))}
      </div>

      {artists.length > 0 && (
        <details className="artists-box">
          <summary>
            <span>Artistas</span>
            <span className="summary-right">
              <span className="count">{artists.length}</span>
              <span className="chev" aria-hidden="true">
                ↓
              </span>
            </span>
          </summary>
          <ul className="artist-list">
            {artists.map((a) => (
              <li key={a.slug}>
                <a className="artist-row" href={link(a.slug)}>
                  <Avatar artist={a} size={40} />
                  <span className="artist-text">
                    <span className="artist-name">{a.name}</span>
                    {(a.role || a.city) && (
                      <span className="artist-meta">{[a.role, a.city].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                  <span className="row-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
