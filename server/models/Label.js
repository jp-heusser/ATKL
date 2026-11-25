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
    // Datos para pagar entradas por transferencia (se muestran al comprar).
    payment: {
      bank: { type: String, trim: true, default: '', maxlength: 60 },
      accountType: { type: String, trim: true, default: '', maxlength: 40 },
      accountNumber: { type: String, trim: true, default: '', maxlength: 40 },
      holder: { type: String, trim: true, default: '', maxlength: 80 },
      rut: { type: String, trim: true, default: '', maxlength: 20 },
      email: { type: String, trim: true, default: '', maxlength: 120 },
      note: { type: String, trim: true, default: '', maxlength: 300 },
    },
  },
  { timestamps: true },
);

export default mongoose.model('Label', labelSchema);
