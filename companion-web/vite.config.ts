import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Fully static app: `npm run dev` is the whole dev loop, `npm run build` emits
// dist/. Relative base so the build works at any GitHub Pages project path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
