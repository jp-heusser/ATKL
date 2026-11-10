/* ============================================================
   DATOS DEL SELLO (basado en linktr.ee/atkl.records)

   socials → íconos pequeños bajo la descripción.
   links   → botones de la página principal, en orden.
             { url, label }  ·  si "url" está vacía, el botón NO se muestra.
   ============================================================ */
export const label = {
  name: 'ATKL Records',
  bio: 'Label and collective of Techno and Hard Techno, Chilean based.',

  socials: [
    'https://www.instagram.com/atkl.records/',
    'https://atklrecords.bandcamp.com/',
    'https://soundcloud.com/attackill-records-atkl',
    'https://www.beatport.com/label/atkl-records/109000',
    'https://www.youtube.com/channel/UCKwh6WcbFZCmJJy4Jx5av5w',
    // 'https://open.spotify.com/…',      ← falta el link de Spotify
    // 'mailto:correo@del-sello.cl',      ← falta el correo
  ],

  links: [
    // Pendientes: están en el Linktree, falta pegar su URL para que aparezcan.
    { label: "[PODCAST] - A'KILLER", url: '' },
    { label: '[HPN004] SebastianRed - Old World', url: '' },
    { label: '[PODCAST] PetiteMørt - ATKL Records [PVM005]', url: '' },
    { label: '[ATK006] BASSTIVN - Power To The People', url: '' },
    { label: 'DKSTLE x ATKL RECORDS / RANCAGUA, CHILE.', url: '' },
    { label: '[ATK005] - ZÊNA - 23onës', url: '' },

    { label: '[FREE DOWNLOAD] HARD EDITS VOL. 1, by ATKL Records', url: 'https://atklrecords.bandcamp.com/album/free-download-hard-edits-vol-1' },
    { label: 'Trick Or Treat VA I', url: 'https://www.beatport.com/release/trick-or-treat-va-i/4342085' },

    { label: 'RODRO - INSANITY [FREE DL]', url: '' },

    { label: 'SoundCloud', url: 'https://soundcloud.com/attackill-records-atkl' },
    { label: 'Bandcamp', url: 'https://atklrecords.bandcamp.com/' },
    { label: 'Beatport', url: 'https://www.beatport.com/label/atkl-records/109000' },
    { label: 'YouTube', url: 'https://www.youtube.com/channel/UCKwh6WcbFZCmJJy4Jx5av5w' },
    { label: 'Instagram', url: 'https://www.instagram.com/atkl.records/' },
  ],
};
