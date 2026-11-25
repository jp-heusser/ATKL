import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// Todo se genera en el servidor (datos en vivo desde MongoDB).
// Producción: Vercel. Para probar localmente un build: ASTRO_ADAPTER=node npm run build && node dist/server/entry.mjs
export default defineConfig({
  output: 'server',
  adapter: process.env.ASTRO_ADAPTER === 'node' ? node({ mode: 'standalone' }) : vercel(),
  vite: {
    ssr: { external: ['mongoose', 'bcryptjs', 'jsonwebtoken', 'qrcode'] },
  },
});
