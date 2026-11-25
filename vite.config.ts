import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MTI6-GTADWIY Cockpit',
        short_name: 'MTI6 Cockpit',
        description: 'MTI6-GTADWIY World-OS Multi-Domain Telemetry & Command Cockpit',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // v236: the app bundle passed the 2 MiB default precache
        // limit (2.1 MB) as the camera registry grew. The limit
        // is a service-worker precache setting, not a code size
        // rule — raised to 3 MiB so the app still installs
        // offline. The bundle itself is unchanged by this.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
