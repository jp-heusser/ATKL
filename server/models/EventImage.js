import mongoose from 'mongoose';

/* Imagen de un evento, guardada en la base. Una por evento.
   - data: la imagen original, sin recortar (el encuadre y el fondo difuminado los hace el CSS).
   - fullData: solo en imágenes subidas con una versión anterior (original aparte). */
const eventImageSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    type: { type: String, required: true },
    data: { type: Buffer, required: true },
    // Original sin recortar (p. ej. el reel 9:16 completo) para verla en grande. Opcional.
    fullType: { type: String, default: '' },
    fullData: { type: Buffer, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('EventImage', eventImageSchema);
