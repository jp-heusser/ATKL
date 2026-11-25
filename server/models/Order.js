import mongoose from 'mongoose';

/* Pedido de entradas pagado por transferencia.
   pending  → el comprador subió el comprobante; espera revisión
   approved → un admin validó el pago; se generaron las entradas
   rejected → el pago no se pudo validar; las entradas vuelven a estar disponibles
   cancelled→ un admin anuló un pedido aprobado (devolución, error); entradas anuladas

   El comprador accede a su pedido con un link privado /pedido/<token>.
   En la base solo se guarda el hash del token (si la base se filtra, los links no sirven). */
const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // ATK-7F3K9Q, para comunicarse con el comprador
    tokenHash: { type: String, required: true, unique: true }, // las rutas nunca lo devuelven
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
    typeName: { type: String, required: true }, // copia: el tipo puede cambiar de nombre o precio después
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    total: { type: Number, required: true },
    buyer: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, match: [/^\S+@\S+\.\S+$/, 'Correo no válido'] },
      doc: { type: String, required: true, trim: true, maxlength: 20 }, // RUT o pasaporte
      phone: { type: String, trim: true, default: '', maxlength: 30 },
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: '', maxlength: 300 }, // motivo de rechazo o anulación
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
