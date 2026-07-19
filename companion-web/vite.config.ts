import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Fully static app: `npm run dev` is the whole dev loop, `npm run build` emits
// dist/. Relative base so the build works at any GitHub Pages project path.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": a new deploy waits until the user taps Refresh in the
      // UpdateToast — never a surprise mid-session reload.
      registerType: "prompt",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "FF Companion",
        short_name: "FF Companion",
        description:
          "Replay companion for classic Final Fantasy — availability, missables, curated routes",
        theme_color: "#0a1030",
        background_color: "#04061a",
        display: "standalone",
        scope: ".",
        start_url: ".",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
