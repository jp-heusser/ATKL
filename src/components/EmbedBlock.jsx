/* Un enlace mostrado como reproductor incrustado: YouTube, SoundCloud o Instagram.
   Los iframes cargan solo al acercarse a la pantalla (loading="lazy"). */
import { useEffect, useRef, useState } from 'react';
import { getEmbed } from '../embeds.js';

/* ---------- Instagram (su script reemplaza un blockquote por un iframe) ---------- */
let igScript;
const loadInstagram = () =>
  (igScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      igScript = null;
      reject(new Error('embed.js'));
    };
    document.body.appendChild(s);
  }));

function InstagramEmbed({ permalink }) {
  const box = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return setNear(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const el = box.current;
    // Contenido creado a mano (no con React) porque Instagram lo reemplaza.
    const bq = document.createElement('blockquote');
    bq.className = 'instagram-media';
    bq.setAttribute('data-instgrm-permalink', permalink);
    bq.setAttribute('data-instgrm-version', '14');
    const a = document.createElement('a');
    a.href = permalink;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Ver publicación en Instagram ↗';
    bq.appendChild(a);
    el.replaceChildren(bq);
    loadInstagram()
      .then(() => window.instgrm?.Embeds?.process())
      .catch(() => {});
    return () => el.replaceChildren();
  }, [near, permalink]);

  return <div ref={box} className="embed-ig" />;
}

/* ---------- Bloque ---------- */
export default function EmbedBlock({ entry }) {
  const e = getEmbed(entry.url);
  if (!e) return null;
  const title = entry.label || `${e.name}`;

  return (
    <figure className={`embed embed-${e.type}${e.ratio === '9 / 16' ? ' embed-vertical' : ''}`}>
      {entry.label && <figcaption className="embed-caption">{entry.label}</figcaption>}
      {e.type === 'instagram' ? (
        <InstagramEmbed permalink={e.permalink} />
      ) : (
        <iframe
          src={e.src}
          title={title}
          loading="lazy"
          style={e.ratio ? { aspectRatio: e.ratio } : { height: e.height }}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </figure>
  );
}
