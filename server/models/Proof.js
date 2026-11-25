import mongoose from 'mongoose';

/* Comprobante de transferencia (imagen) de un pedido. Solo lo ven los administradores. */
const proofSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    type: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export default mongoose.model('Proof', proofSchema);
