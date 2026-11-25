import mongoose from 'mongoose';

/* Tipo de entrada de un evento (General, Preventa, VIP…).
   remaining baja al RESERVAR (pedido pendiente) y vuelve si el pago se rechaza.
   sold sube al APROBAR. Siempre se modifican con operaciones atómicas ($inc con condición),
   para no vender más de la capacidad aunque compren varios a la vez. */
const ticketTypeSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, default: '', maxlength: 200 },
    price: { type: Number, required: true, min: [1, 'El precio debe ser mayor a 0'], max: 10000000 }, // CLP
    capacity: { type: Number, required: true, min: 0, max: 100000 },
    remaining: { type: Number, required: true, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    maxPerOrder: { type: Number, default: 6, min: 1, max: 20 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model('TicketType', ticketTypeSchema);
