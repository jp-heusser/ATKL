import mongoose from 'mongoose';
import { linkSchema } from './shared.js';

/* Datos del sello. Hay un solo documento (key: 'main'). */
const labelSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, default: '', maxlength: 300 },
    socials: { type: [linkSchema], default: [] }, // íconos pequeños
    links: { type: [linkSchema], default: [] }, // botones, en orden
  },
  { timestamps: true },
);

export default mongoose.model('Label', labelSchema);
