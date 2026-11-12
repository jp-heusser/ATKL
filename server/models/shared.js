import mongoose from 'mongoose';

const isLink = (v) => v === '' || /^(https:\/\/|mailto:)/.test(v);

/* Un enlace: URL + nombre opcional. La plataforma (Instagram, SoundCloud…)
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
  },
  { _id: false },
);
