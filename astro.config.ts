import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const site = process.env.PUBLIC_SITE_URL || 'https://fullmuscle.invalid';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    {
      name: 'isolated-vite-cache',
      hooks: {
        'astro:config:setup': ({ command, config, updateConfig }) => {
          // Check/build must not replace the optimized dependencies of a running dev server.
          const namespace = process.env.FULLMUSCLE_E2E_DEV === 'true' ? 'e2e/' : '';
          updateConfig({
            vite: { cacheDir: fileURLToPath(new URL(`./node_modules/.vite-astro/${namespace}${command}/`, config.root)) },
          });
        },
      },
    },
    react(),
  ],
  vite: { plugins: [tailwindcss()] },
  security: {
    checkOrigin: true,
  },
});
