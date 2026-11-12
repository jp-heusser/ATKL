/* Crea una cuenta (o reinicia su contraseña) y muestra una contraseña temporal.
   Administrador:  npm run create-user -- admin correo@dominio.cl
   Artista:        npm run create-user -- artist correo@dominio.cl slug-del-artista */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import User from './models/User.js';
import Artist from './models/Artist.js';
import { hashPassword, tempPassword } from './auth.js';

const [role, emailArg, slug] = process.argv.slice(2);
const email = (emailArg || '').trim().toLowerCase();

try {
  if (!['admin', 'artist'].includes(role) || !email) {
    throw new Error('Uso: npm run create-user -- admin correo   |   npm run create-user -- artist correo slug');
  }
  await connectDB();
  let artist = null;
  if (role === 'artist') {
    artist = await Artist.findOne({ slug: (slug || '').toLowerCase() });
    if (!artist) throw new Error(`No existe un artista con slug "${slug || ''}"`);
  }
  const password = tempPassword();
  const user = (await User.findOne({ email })) || new User({ email });
  user.role = role;
  user.artist = artist?._id || null;
  user.active = true;
  user.passwordHash = await hashPassword(password);
  await user.save();
  if (artist) {
    artist.owner = user._id;
    await artist.save();
  }
  console.log(`Cuenta lista: ${email} (${role}${artist ? ' · ' + artist.name : ''})`);
  console.log(`Contraseña temporal: ${password}`);
  console.log('Cámbiala al entrar al panel.');
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
