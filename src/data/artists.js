/* ============================================================
   ARTISTAS DE ATKL
   Para agregar un artista, copia un bloque y completa:

   slug   → identificador para su link: https://…/#slug
            (solo minúsculas, números y guiones; sin tildes ni espacios)
   name   → nombre artístico
   role   → opcional: "DJ", "Productor", "Live act"…
   city   → opcional
   photo  → opcional: archivo en public/artists/ (ej. 'artists/slug.jpg').
            Cuadrada, 400×400 px. Sin foto se muestran sus iniciales.
   links  → URLs completas de sus redes, en el orden en que se mostrarán.
            La plataforma se reconoce sola. Para un correo usa 'mailto:…'.
            Para ponerle otro nombre a un link: { url: '…', label: 'Booking' }

   El orden de esta lista es el orden en la página principal.
   ============================================================ */

export const artists = [
  {
    slug: 'desmont-landvik',
    name: 'Desmont Landvik',
    role: 'DJ / Productor · Hard Techno',
    city: 'Rancagua',
    photo: 'artists/desmont-landvik.webp',
    links: [
      'https://www.instagram.com/desmontlandvik/',
      'https://on.soundcloud.com/tAwKU0d8BWOERA4juP',
      'https://www.youtube.com/@desmontlandvikdj',
      { url: 'https://open.spotify.com/track/2emf5ixBnhgaTYn2Ycosqz', label: 'Exótico Duro (Original Mix)' },
      { url: 'https://youtu.be/VyUzf8bwogY', label: 'Warehouse Sessions #002 · Steel Factory' },
      { url: 'https://youtu.be/1giXQ_IhCbM', label: 'Warehouse Sessions #001 · Initiation' },
      { url: 'https://www.mavelpoint.com/es/artist/desmont-landvik/overview', label: 'Press kit · Booking' },
    ],
  },
  {
    slug: 'dkstle',
    name: 'DKSTLE',
    role: 'DJ · Cantante · Artista multidisciplinaria',
    city: '',
    photo: '',
    links: [{ url: 'https://esponsor.com/dkstle', label: 'Página oficial · eSponsor', icon: 'web' }],
  },
  {
    slug: 'lurtz',
    name: 'LURTZ',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
      { url: 'https://linktr.ee/lurtz.dj._', label: 'Página oficial · Linktree', icon: 'web' },
    ],
  },
   {
    slug: 'malagata',
    name: 'MALA GATA',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
  {
    slug: '23ones',
    name: '23ONES',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
    {
    slug: 'sweethate',
    name: 'SWEAT HATE',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
    {
    slug: 'rodro',
    name: 'RODRO',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
    {
    slug: 'petitemort',
    name: 'PETITE MORT',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
    {
    slug: 'p4blo',
    name: 'P4BL0',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  },
    {
    slug: 'cyber',
    name: 'CYBER',
    role: 'DJ',
    city: '',
    photo: '',
    links: [
    ],
  }
];
