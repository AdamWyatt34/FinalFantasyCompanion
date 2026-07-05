import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: `dotnet run` serves the API on 5000, `npm run dev` proxies /api to it.
// Build: output lands in the API's wwwroot so `dotnet run` is the whole app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": "http://localhost:5000" },
  },
  build: {
    outDir: "../src/Companion.Api/wwwroot",
    emptyOutDir: true,
  },
});
