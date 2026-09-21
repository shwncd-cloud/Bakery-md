import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hornillas POS',
        short_name: 'Hornillas',
        description: 'Point of sale for Hornillas bakery and cafe',
        theme_color: '#8C5E3C',
        background_color: '#FAF4E8',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Only precache the app shell. API calls are handled by our own
        // offline outbox (src/offline), not the service worker cache -
        // POS data must never be served stale.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
