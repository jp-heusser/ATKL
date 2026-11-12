import mongoose from 'mongoose';

/* Cuentas para el login (etapa siguiente). Aún no hay rutas que lo usen.
   - admin:  gestiona el sello y todos los artistas.
   - artist: edita solo su propio perfil (campo "artist").
   La contraseña NUNCA se guarda en texto: solo su hash (bcrypt/argon2). */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Correo no válido'],
      maxlength: 120,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'artist'], default: 'artist' },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', default: null },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
