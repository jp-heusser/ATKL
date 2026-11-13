import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Normal (Vercel, desarrollo): base '/' y direcciones limpias tipo /nombre-artista.
// Solo estático (GitHub Pages, VITE_STATIC_ONLY=true): base './' para que funcione en /ATKL-LINKS/.
export default defineConfig({
  base: process.env.VITE_STATIC_ONLY === 'true' ? './' : '/',
  plugins: [react()],
  // En desarrollo, /api va a la API local (npm run server).
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
