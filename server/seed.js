/* Carga en MongoDB los datos actuales de la web (src/data/label.js y artists.js).
   Uso:  npm run seed
   Se puede ejecutar varias veces: solo agrega lo que falta; nunca modifica ni borra
   lo que ya está en la base. */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import Label from './models/Label.js';
import Artist from './models/Artist.js';
import User from './models/User.js';
import { label } from '../src/data/label.js';
import { artists } from '../src/data/artists.js';

const toLink = (e) => (typeof e === 'string' ? { url: e, label: '', icon: '', embed: false } : { url: e.url || '', label: e.label || '', icon: e.icon || '', embed: !!e.embed });

try {
  const conn = await connectDB();
  console.log(`Conectado a la base "${conn.name}"`);

  // Solo INSERTA lo que falta. Lo que ya existe en la base no se toca,
  // para no pisar lo editado desde el panel (enlaces, fotos, etc.).
  const opts = { upsert: true, runValidators: true };

  const l = await Label.updateOne(
    { key: 'main' },
    { $setOnInsert: { name: label.name, bio: label.bio, socials: label.socials.map(toLink), links: label.links.map(toLink) } },
    opts,
  );
  console.log(`Sello: ${label.name} → ${l.upsertedCount ? 'creado' : 'ya existía, sin cambios'}`);

  const base = await Artist.countDocuments();
  let added = 0;
  for (const a of artists) {
    const r = await Artist.updateOne(
      { slug: a.slug },
      { $setOnInsert: { name: a.name, role: a.role || '', city: a.city || '', photo: a.photo || '', socials: (a.socials || []).map(toLink), links: a.links.map(toLink), order: base + added, active: true, owner: null } },
      opts,
    );
    if (r.upsertedCount) added++;
    console.log(`Artista: ${a.name} → ${r.upsertedCount ? 'creado' : 'ya existía, sin cambios'}`);
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
