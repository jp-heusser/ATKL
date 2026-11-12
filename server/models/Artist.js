import mongoose from 'mongoose';
import { linkSchema } from './shared.js';

const artistSchema = new mongoose.Schema(
  {
    // Identificador de su página: …/#slug
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug solo admite minúsculas, números y guiones'],
      maxlength: 60,
      // nombres reservados por las pantallas de la web
      validate: { validator: (v) => !['acceso', 'panel'].includes(v), message: 'Ese slug está reservado' },
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, trim: true, default: '', maxlength: 80 },
    city: { type: String, trim: true, default: '', maxlength: 60 },
    photo: { type: String, trim: true, default: '', maxlength: 500 }, // ruta en public/ o URL https
    links: { type: [linkSchema], default: [], validate: [(v) => v.length <= 30, 'Máximo 30 enlaces'] },
    order: { type: Number, default: 0 }, // posición en la lista
    active: { type: Boolean, default: true }, // false = oculto en la web
    // Cuenta que podrá editar este perfil (cuando exista el login).
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

artistSchema.index({ active: 1, order: 1, name: 1 });

export default mongoose.model('Artist', artistSchema);
