import mongoose from 'mongoose';

const isLink = (v) => v === '' || /^(https:\/\/|mailto:)/.test(v);

/* Un enlace: URL + nombre opcional + ícono opcional. La plataforma (Instagram, SoundCloud…)
   la reconoce el frontend a partir de la URL. */
export const linkSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
      validate: { validator: isLink, message: 'La URL debe empezar con https:// o mailto:' },
    },
    label: { type: String, trim: true, default: '', maxlength: 120 },
    // Ícono elegido a mano (clave de src/platforms.js). Vacío = automático según la URL.
    icon: { type: String, trim: true, default: '', maxlength: 30, match: [/^[a-z0-9-]*$/, 'Ícono no válido'] },
  },
  { _id: false },
);
