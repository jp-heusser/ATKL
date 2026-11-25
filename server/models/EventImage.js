import mongoose from 'mongoose';

/* Imagen 16:9 de un evento (portada/flyer), guardada en la base. Una por evento. */
const eventImageSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    type: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export default mongoose.model('EventImage', eventImageSchema);
