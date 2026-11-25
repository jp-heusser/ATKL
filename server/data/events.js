/* Eventos que crea "npm run seed" si todavía no existen en la base (se buscan por slug).
   Una vez creados, se editan desde el panel: el seed no los vuelve a tocar.

   startsAt: fecha y hora con zona horaria de Chile (-03:00 en verano).
   imageUrl: se descarga al ejecutar el seed y se guarda en la base (máx. 1,5 MB).
   ticketUrl: venta en otra plataforma (se muestra como botón). */
export const events = [
  {
    slug: 'grooveland-apocalypse',
    title: 'Grooveland Apocalypse',
    startsAt: '2026-11-28T23:00:00-03:00',
    venue: 'La Fabrika',
    address: 'Cachapoal #1420',
    city: 'Rancagua',
    status: 'published',
    description: [
      'Hardgroove & Schranz Session. Producido por ATKL.',
      '',
      'El apocalipsis llega a la pista de baile. Prepárate para una noche de alta intensidad, ritmos frenéticos y oscuridad.',
      '',
      'Line up: Monokromatico · Dyeizi · Asterss · Jeremias Hinojosa · Cyber · Desmont Landvik',
    ].join('\n'),
    imageUrl: 'https://tolivmarket-production.s3.sa-east-1.amazonaws.com/events/covers/d36a8cc667284e399bd1a8dd14babb43.jpg',
    ticketUrl: 'https://www.toliv.com/eventos/chile/rancagua/grooveland-apocalypse-26916',
  },
];
