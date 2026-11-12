import { useEffect, useState } from 'react';
import { useHub } from './useHub.js';
import { api, getToken, setToken, USE_API } from './api.js';
import Lightning from './components/Lightning.jsx';
import Home from './components/Home.jsx';
import ArtistPage from './components/ArtistPage.jsx';
import Login from './components/Login.jsx';
import Panel from './components/Panel.jsx';

// Rutas por hash: #slug → artista · #acceso → login · #panel → edición
const currentSlug = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));

export default function App() {
  const { label, artists, reload } = useHub();
  const [slug, setSlug] = useState(currentSlug);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => USE_API && !!getToken());

  useEffect(() => {
    const onHash = () => setSlug(currentSlug());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Recupera la sesión guardada.
  useEffect(() => {
    if (!checking) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch((e) => e.status === 401 && setToken(null))
      .finally(() => setChecking(false));
  }, [checking]);

  const isPanel = USE_API && (slug === 'acceso' || slug === 'panel');
  const artist = artists.find((a) => a.slug === slug);

  let view;
  if (isPanel) {
    if (checking) view = <main className="page" />;
    else if (user) view = <Panel user={user} onLogout={() => { setUser(null); location.hash = ''; }} onChanged={reload} />;
    else view = <Login onLogin={(u) => { setUser(u); location.hash = 'panel'; }} />;
  } else {
    view = artist ? <ArtistPage artist={artist} /> : <Home label={label} artists={artists} />;
  }

  return (
    <>
      <Lightning />
      {view}
      <footer className="site-footer">
        <a href="#">ATKL Records</a> · {new Date().getFullYear()}
        {USE_API && !isPanel && (
          <>
            {' '}· <a href={user ? '#panel' : '#acceso'}>{user ? 'Mi panel' : 'Acceso'}</a>
          </>
        )}
      </footer>
    </>
  );
}
