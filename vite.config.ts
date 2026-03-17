import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // Jangan restart saat .env di-save (cegah spam "[vite] .env changed, restarting server...")
    watch: {
      ignored: ["**/.env", "**/.env.*", "**/node_modules/**"],
    },
    // Proxy hanya dipakai saat npm run dev. Production (Vercel) pakai same origin + vercel.json rewrites.
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
