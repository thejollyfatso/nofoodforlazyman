import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "nf4lm",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.jsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-router-dom": { singleton: true },
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "No Food for Lazy Man",
        short_name: "NF4LM",
        theme_color: "#E8623A",
        background_color: "#FBE9E3",
        display: "standalone",
        icons: [
          {
            src: "/favicon/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/favicon/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/households": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/recipes": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/shopping": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/events": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/meal-plan": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
