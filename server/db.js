import mongoose from 'mongoose';

// La conexión se reutiliza entre llamadas (importante en Vercel, donde cada
// petición puede ejecutarse en una función que ya estaba "caliente").
let cached = globalThis.__atklMongo;
if (!cached) cached = globalThis.__atklMongo = { promise: null };

export function connectDB() {
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) return Promise.reject(new Error('Falta MONGODB_URI (archivo .env o variables del hosting)'));
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, { dbName: process.env.MONGODB_DB || 'atkl', serverSelectionTimeoutMS: 10000 })
      .then(() => mongoose.connection)
      .catch((e) => {
        cached.promise = null; // permite reintentar en la siguiente petición
        throw e;
      });
  }
  return cached.promise;
}
