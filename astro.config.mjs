// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://axionlab.uz',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'uz',
    locales: ['uz', 'en', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/projects/interceptor'),
      i18n: {
        defaultLocale: 'uz',
        locales: {
          uz: 'uz-UZ',
          en: 'en',
          ru: 'ru',
        },
      },
    }),
  ],
  adapter: vercel(),
});
