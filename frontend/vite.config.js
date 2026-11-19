import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Vite + React, com o plugin PWA: gera o manifesto e o service worker que
// deixam o AchaPet instalável no celular e abrindo mesmo com internet ruim.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "AchaPet - animais perdidos e encontrados",
        short_name: "AchaPet",
        description: "Mapa de animais perdidos e encontrados da Grande Vitória.",
        lang: "pt-BR",
        theme_color: "#f29e4c",
        background_color: "#fff8ee",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Fotos dos anúncios no Supabase Storage: cache para abrir rápido.
            urlPattern: /\/storage\/v1\/object\/public\/fotos\//,
            handler: "CacheFirst",
            options: { cacheName: "fotos", expiration: { maxEntries: 200, maxAgeSeconds: 7 * 86400 } },
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "mapa", expiration: { maxEntries: 300, maxAgeSeconds: 7 * 86400 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Em desenvolvimento, /api vai para o Express local.
    proxy: { "/api": "http://localhost:3001" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testes/setup.js"],
    css: false,
  },
});
