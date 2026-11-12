/* Carga en MongoDB los datos actuales de la web (src/data/label.js y artists.js).
   Uso:  npm run seed
   Se puede ejecutar varias veces: actualiza lo existente, no duplica ni borra. */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import Label from './models/Label.js';
import Artist from './models/Artist.js';
import User from './models/User.js';
import { label } from '../src/data/label.js';
import { artists } from '../src/data/artists.js';

const toLink = (e) => (typeof e === 'string' ? { url: e, label: '' } : { url: e.url || '', label: e.label || '' });

try {
  const conn = await connectDB();
  console.log(`Conectado a la base "${conn.name}"`);

  await Label.findOneAndUpdate(
    { key: 'main' },
    { name: label.name, bio: label.bio, socials: label.socials.map(toLink), links: label.links.map(toLink) },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log(`Sello: ${label.name} (${label.links.length} enlaces)`);

  for (const [i, a] of artists.entries()) {
    await Artist.findOneAndUpdate(
      { slug: a.slug },
      { name: a.name, role: a.role || '', city: a.city || '', photo: a.photo || '', links: a.links.map(toLink), order: i },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    console.log(`Artista: ${a.name}`);
  }

  // Crea las colecciones e índices (incluida "users", aún vacía).
  await Promise.all([Label.init(), Artist.init(), User.init(), User.createCollection()]);
  console.log('Listo.');
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
