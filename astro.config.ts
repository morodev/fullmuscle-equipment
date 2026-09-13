import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL || 'https://fullmuscle.invalid';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
  ],
  vite: { plugins: [tailwindcss()] },
  security: {
    checkOrigin: true,
  },
});
