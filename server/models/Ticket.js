import mongoose from 'mongoose';

/* Entrada individual (una por persona). Se crean al aprobar el pedido.
   code: aleatorio de 32 caracteres; es lo que va en el QR.
   valid → used (al escanearla en puerta) · void (pedido anulado) */
const ticketSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    seq: { type: Number, required: true }, // 1..cantidad dentro del pedido
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    typeName: { type: String, required: true },
    holder: { type: String, required: true },
    doc: { type: String, default: '' },
    status: { type: String, enum: ['valid', 'used', 'void'], default: 'valid' },
    usedAt: { type: Date, default: null },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Segunda barrera: aunque un pedido se aprobara dos veces a la vez, no puede tener entradas duplicadas.
ticketSchema.index({ order: 1, seq: 1 }, { unique: true });

export default mongoose.model('Ticket', ticketSchema);
