/* Publicaciones o reels de Instagram incrustados (embed oficial, sin tokens).
   - El script de Instagram se carga solo cuando la sección entra en pantalla.
   - Si no carga (bloqueador, sin conexión), queda un enlace a cada publicación. */
import { useEffect, useRef, useState } from 'react';

const SCRIPT = 'https://www.instagram.com/embed.js';
let scriptPromise;
const loadScript = () =>
  (scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('embed.js'));
    };
    document.body.appendChild(s);
  }));

const isPost = (u) => /^https:\/\/www\.instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/$/.test(u);

function Embed({ url }) {
  const box = useRef(null);

  useEffect(() => {
    const el = box.current;
    // El script de Instagram reemplaza el blockquote por un iframe: por eso este
    // contenido se crea a mano y no con React.
    const bq = document.createElement('blockquote');
    bq.className = 'instagram-media';
    bq.setAttribute('data-instgrm-permalink', url);
    bq.setAttribute('data-instgrm-version', '14');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Ver publicación en Instagram ↗';
    bq.appendChild(a);
    el.replaceChildren(bq);
    loadScript()
      .then(() => window.instgrm?.Embeds?.process())
      .catch(() => {});
    return () => el.replaceChildren();
  }, [url]);

  return <div ref={box} className="ig-item" />;
}

export default function InstagramEmbeds({ urls }) {
  const list = (urls || []).filter(isPost).slice(0, 3);
  const section = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!list.length || visible) return;
    if (!('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '300px' });
    io.observe(section.current);
    return () => io.disconnect();
  }, [list.length, visible]);

  if (!list.length) return null;

  return (
    <section ref={section} className="ig-section" aria-label="Instagram">
      <h2 className="ig-title">Instagram</h2>
      <div className="ig-list">{visible && list.map((u) => <Embed key={u} url={u} />)}</div>
    </section>
  );
}
