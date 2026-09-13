import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL || 'https://fullmuscle.invalid';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone', experimentalStaticHeaders: true }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/conferma/') && !page.includes('/confirmation/'),
      i18n: {
        defaultLocale: 'it',
        locales: { it: 'it-IT', en: 'en-GB' },
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  security: {
    checkOrigin: true,
  },
});
