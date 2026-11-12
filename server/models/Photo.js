import mongoose from 'mongoose';

/* Imagen de perfil de un artista (una por artista), guardada en la base. */
const photoSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true, unique: true },
    type: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export default mongoose.model('Photo', photoSchema);
