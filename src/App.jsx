import { useEffect, useState } from 'react';
import { useHub } from './useHub.js';
import { api, getToken, setToken, USE_API } from './api.js';
import Lightning from './components/Lightning.jsx';
import Home from './components/Home.jsx';
import ArtistPage from './components/ArtistPage.jsx';
import Login from './components/Login.jsx';
import Panel from './components/Panel.jsx';

// Tema: siempre abre en oscuro; el claro se elige con el botón y se recuerda en este navegador.
const savedTheme = () => {
  try {
    return localStorage.getItem('atkl_theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

// Rutas por hash: #slug → artista · #acceso → login · #panel → edición
const currentSlug = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));

export default function App() {
  const { label, artists, reload } = useHub();
  const [slug, setSlug] = useState(currentSlug);
  const [theme, setTheme] = useState(savedTheme);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => USE_API && !!getToken());

  useEffect(() => {
    const onHash = () => setSlug(currentSlug());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f4f1' : '#000000');
    try {
      localStorage.setItem('atkl_theme', theme);
    } catch {}
  }, [theme]);

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
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          {theme === 'light' ? (
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </svg>
      </button>
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
