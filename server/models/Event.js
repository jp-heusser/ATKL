import mongoose from 'mongoose';

/* Evento con venta de entradas.
   status: draft = oculto · published = visible y a la venta · closed = visible, venta cerrada */
const eventSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug solo admite minúsculas, números y guiones'],
      maxlength: 80,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    venue: { type: String, trim: true, default: '', maxlength: 120 },
    address: { type: String, trim: true, default: '', maxlength: 200 },
    city: { type: String, trim: true, default: '', maxlength: 60 },
    startsAt: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
    // Imagen 16:9: dirección donde se sirve (/api/events/<id>/image?v=…). Vacío = sin imagen.
    image: { type: String, default: '' },
    imageFull: { type: String, default: '' }, // original sin recortar (vista ampliada)
    // Opcional: venta en otra plataforma (Toliv, Passline…). Se muestra como botón.
    ticketUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
      validate: { validator: (v) => v === '' || /^https:\/\//.test(v), message: 'El link de venta debe empezar con https://' },
    },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startsAt: 1 });

export default mongoose.model('Event', eventSchema);
