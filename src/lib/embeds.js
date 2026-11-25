/* Detecta si una URL se puede mostrar incrustada (reproductor) y cómo.
   Devuelve null si no: en ese caso el enlace se muestra como botón normal. */
// Color del reproductor de SoundCloud: rojo en modo oscuro, celeste en modo claro.
const accent = () => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? '0a96dc' : 'ee2d3d');

export function getEmbed(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  const parts = u.pathname.split('/').filter(Boolean);

  /* ---- YouTube: video, short, directo o lista ---- */
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com') {
    const list = u.searchParams.get('list');
    let id = null;
    if (host === 'youtu.be') id = parts[0];
    else if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'live', 'embed'].includes(parts[0])) id = parts[1];
    const okId = id && /^[A-Za-z0-9_-]{6,20}$/.test(id);
    const okList = list && /^[A-Za-z0-9_-]{10,60}$/.test(list);
    if (!okId && !(parts[0] === 'playlist' && okList)) return null;
    const src = okId
      ? `https://www.youtube-nocookie.com/embed/${id}${okList ? `?list=${list}` : ''}`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
    return { type: 'youtube', name: 'YouTube', src, ratio: parts[0] === 'shorts' ? '9 / 16' : '16 / 9' };
  }

  /* ---- SoundCloud: tema, set o perfil (los links cortos on.soundcloud.com no sirven) ---- */
  if (host === 'soundcloud.com' && parts.length >= 1 && !['discover', 'search', 'you', 'upload'].includes(parts[0])) {
    const tall = parts.length === 1 || parts[1] === 'sets'; // perfil o set → lista de temas
    const clean = `https://soundcloud.com/${parts.join('/')}`;
    const src =
      `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}` +
      `&color=%23${accent()}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    return { type: 'soundcloud', name: 'SoundCloud', src, height: tall ? 352 : 166 };
  }

  /* ---- Instagram: publicación o reel ---- */
  if (host === 'instagram.com') {
    const i = parts.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p));
    const id = i >= 0 ? parts[i + 1] : null;
    if (!id || !/^[A-Za-z0-9_-]{5,40}$/.test(id)) return null;
    const kind = parts[i] === 'reels' ? 'reel' : parts[i];
    return { type: 'instagram', name: 'Instagram', permalink: `https://www.instagram.com/${kind}/${id}/` };
  }

  return null;
}
