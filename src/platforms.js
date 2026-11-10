/* Reconoce la plataforma de cada URL y le asigna nombre e ícono. */
import {
  siInstagram,
  siSoundcloud,
  siSpotify,
  siBeatport,
  siBandcamp,
  siYoutube,
  siTiktok,
  siMixcloud,
  siX,
  siFacebook,
  siApplemusic,
  siTidal,
  siDiscogs,
  siTwitch,
} from './icons.js';

const PLATFORMS = [
  { match: /instagram\.com/, name: 'Instagram', icon: siInstagram, handle: true },
  { match: /soundcloud\.com/, name: 'SoundCloud', icon: siSoundcloud, handle: true },
  { match: /spotify\.com/, name: 'Spotify', icon: siSpotify },
  { match: /beatport\.com/, name: 'Beatport', icon: siBeatport },
  { match: /bandcamp\.com/, name: 'Bandcamp', icon: siBandcamp },
  { match: /(youtube\.com|youtu\.be)/, name: 'YouTube', icon: siYoutube, handle: true },
  { match: /tiktok\.com/, name: 'TikTok', icon: siTiktok, handle: true },
  { match: /mixcloud\.com/, name: 'Mixcloud', icon: siMixcloud, handle: true },
  { match: /(ra\.co|residentadvisor\.net)/, name: 'Resident Advisor', badge: 'RA' },
  { match: /(twitter\.com|x\.com)/, name: 'X', icon: siX, handle: true },
  { match: /facebook\.com/, name: 'Facebook', icon: siFacebook },
  { match: /music\.apple\.com/, name: 'Apple Music', icon: siApplemusic },
  { match: /tidal\.com/, name: 'Tidal', icon: siTidal },
  { match: /discogs\.com/, name: 'Discogs', icon: siDiscogs },
  { match: /twitch\.tv/, name: 'Twitch', icon: siTwitch, handle: true },
];

// "@usuario" para redes donde la URL es el perfil (instagram.com/usuario, youtube.com/@canal…).
function handleFrom(url) {
  try {
    const u = new URL(url);
    // Links cortos (on.soundcloud.com, youtu.be…) no traen el usuario.
    if (u.hostname.startsWith('on.') || u.hostname === 'youtu.be') return '';
    const first = u.pathname.split('/').filter(Boolean)[0];
    if (!first || ['channel', 'c', 'user', 'watch', 'playlist'].includes(first)) return '';
    const h = decodeURIComponent(first);
    return h.startsWith('@') ? h : `@${h}`;
  } catch {
    return '';
  }
}

export function resolveLink(entry) {
  const url = typeof entry === 'string' ? entry : entry.url;
  const custom = typeof entry === 'string' ? null : entry.label;

  if (url.startsWith('mailto:')) {
    const email = url.slice(7).split('?')[0];
    return { url, name: custom || 'Correo', detail: email, badge: '@', external: false };
  }

  const p = PLATFORMS.find((x) => x.match.test(url));
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  return {
    url,
    name: custom || p?.name || host,
    // Con nombre propio, debajo se muestra la plataforma (ej. "Exótico Duro" · Spotify).
    detail: custom && custom !== p?.name ? p?.name || host : p ? (p.handle ? handleFrom(url) : '') : host,
    icon: p?.icon,
    badge: p?.badge || (!p?.icon ? '↗' : null),
    external: true,
  };
}

export const isValidLink = (entry) => {
  const url = typeof entry === 'string' ? entry : entry?.url;
  return /^(https:\/\/|mailto:)/.test(url || '');
};
