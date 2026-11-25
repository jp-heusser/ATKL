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
import Event from './models/Event.js';
import TicketType from './models/TicketType.js';
import Order from './models/Order.js';
import Proof from './models/Proof.js';
import Ticket from './models/Ticket.js';
import Photo from './models/Photo.js';
import EventImage from './models/EventImage.js';
import { events } from './data/events.js';
import { saveEventImage, checkImageBuffer } from './photos.js';
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
  // Eventos de server/data/events.js: solo se crean si no existen.
  for (const e of events) {
    const { imageUrl, ...data } = e;
    let ev = await Event.findOne({ slug: e.slug });
    const isNew = !ev;
    if (isNew) ev = await Event.create({ ...data, startsAt: new Date(e.startsAt) });
    let img = '';
    if (imageUrl && !ev.image) {
      try {
        const r = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await saveEventImage(ev, checkImageBuffer(Buffer.from(await r.arrayBuffer()), r.headers.get('content-type')));
        await ev.save();
        img = ' + imagen descargada';
      } catch (err) {
        img = ` (no se pudo descargar la imagen: ${err.message}; súbela desde el panel)`;
      }
    }
    console.log(`Evento: ${ev.title} → ${isNew ? 'creado' : 'ya existía, sin cambios'}${img}`);
  }

  // Crea todas las colecciones e índices (también las de entradas, aunque estén vacías).
  const models = [Label, Artist, User, Photo, Event, EventImage, TicketType, Order, Proof, Ticket];
  for (const M of models) {
    await M.createCollection().catch((e) => {
      if (e?.codeName !== 'NamespaceExists') throw e;
    });
    await M.init();
  }
  console.log(`Colecciones e índices listos: ${models.map((M) => M.collection.collectionName).join(', ')}`);
  console.log('Listo.');
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
