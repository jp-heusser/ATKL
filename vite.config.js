import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = rutas relativas: funciona en GitHub Pages (/ATKL-LINKS/),
// en un dominio propio y en cualquier hosting estático sin cambiar nada.
export default defineConfig({
  base: './',
  plugins: [react()],
});
