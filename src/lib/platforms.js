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
  giLink,
  giMail,
  giDownload,
  giTicket,
  giMusic,
  giMic,
  giCalendar,
  giGlobe,
  giPlay,
  giBag,
} from './icons.js';

const PLATFORMS = [
  { match: /instagram\.com/, key: 'instagram', name: 'Instagram', icon: siInstagram, handle: true },
  { match: /soundcloud\.com/, key: 'soundcloud', name: 'SoundCloud', icon: siSoundcloud, handle: true },
  { match: /spotify\.com/, key: 'spotify', name: 'Spotify', icon: siSpotify },
  { match: /beatport\.com/, key: 'beatport', name: 'Beatport', icon: siBeatport },
  { match: /bandcamp\.com/, key: 'bandcamp', name: 'Bandcamp', icon: siBandcamp },
  { match: /(youtube\.com|youtu\.be)/, key: 'youtube', name: 'YouTube', icon: siYoutube, handle: true },
  { match: /tiktok\.com/, key: 'tiktok', name: 'TikTok', icon: siTiktok, handle: true },
  { match: /mixcloud\.com/, key: 'mixcloud', name: 'Mixcloud', icon: siMixcloud, handle: true },
  { match: /(ra\.co|residentadvisor\.net)/, key: 'ra', name: 'Resident Advisor', badge: 'RA' },
  { match: /(twitter\.com|x\.com)/, key: 'x', name: 'X', icon: siX, handle: true },
  { match: /facebook\.com/, key: 'facebook', name: 'Facebook', icon: siFacebook },
  { match: /music\.apple\.com/, key: 'applemusic', name: 'Apple Music', icon: siApplemusic },
  { match: /tidal\.com/, key: 'tidal', name: 'Tidal', icon: siTidal },
  { match: /discogs\.com/, key: 'discogs', name: 'Discogs', icon: siDiscogs },
  { match: /twitch\.tv/, key: 'twitch', name: 'Twitch', icon: siTwitch, handle: true },
];

/* Íconos que se pueden elegir a mano en el panel (campo "icon" de cada enlace).
   '' = automático según la URL. */
const GENERIC = [
  { key: 'link', name: 'Enlace', icon: giLink },
  { key: 'web', name: 'Sitio web', icon: giGlobe },
  { key: 'mail', name: 'Correo', icon: giMail },
  { key: 'music', name: 'Música', icon: giMusic },
  { key: 'play', name: 'Play / video', icon: giPlay },
  { key: 'podcast', name: 'Podcast', icon: giMic },
  { key: 'download', name: 'Descarga', icon: giDownload },
  { key: 'ticket', name: 'Entradas', icon: giTicket },
  { key: 'event', name: 'Evento / fecha', icon: giCalendar },
  { key: 'shop', name: 'Tienda / merch', icon: giBag },
];
export const ICON_CHOICES = [...PLATFORMS.map(({ key, name, icon, badge }) => ({ key, name, icon, badge })), ...GENERIC];
const ICON_BY_KEY = Object.fromEntries(ICON_CHOICES.map((c) => [c.key, c]));

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
  // Ícono elegido a mano: reemplaza al automático.
  const chosen = typeof entry === 'string' ? null : ICON_BY_KEY[entry.icon];
  const pick = (auto) => (chosen ? { icon: chosen.icon, badge: chosen.icon ? null : chosen.badge } : auto);

  if (url.startsWith('mailto:')) {
    const email = url.slice(7).split('?')[0];
    return { url, name: custom || 'Correo', detail: email, ...pick({ icon: giMail, badge: null }), external: false };
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
    ...pick({ icon: p?.icon || (p?.badge ? undefined : giLink), badge: p?.badge || null }),
    external: true,
  };
}

export const isValidLink = (entry) => {
  const url = typeof entry === 'string' ? entry : entry?.url;
  return /^(https:\/\/|mailto:)/.test(url || '');
};
