import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lmgroktfy.com',
  adapter: cloudflare(),
  i18n: {
    locales: ['ar', 'de', 'en', 'es', 'fr', 'ja'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
