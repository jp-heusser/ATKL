import { useEffect, useState } from 'react';
import { artists } from './data/artists.js';
import Lightning from './components/Lightning.jsx';
import Home from './components/Home.jsx';
import ArtistPage from './components/ArtistPage.jsx';

// Cada artista tiene su link: https://…/#slug  (funciona en cualquier hosting estático)
const currentSlug = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));

export default function App() {
  const [slug, setSlug] = useState(currentSlug);

  useEffect(() => {
    const onHash = () => setSlug(currentSlug());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const artist = artists.find((a) => a.slug === slug);

  return (
    <>
      <Lightning />
      {artist ? <ArtistPage artist={artist} /> : <Home artists={artists} />}
      <footer className="site-footer">
        <a href="#">ATKL Records</a> · {new Date().getFullYear()}
      </footer>
    </>
  );
}
