import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? "/urc-teleoperation-2026/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    // Transform the app's entry and views (plus everything they import) as soon
    // as the dev server starts, so they're cached before the browser asks.
    warmup: {
      clientFiles: ["./src/main.jsx", "./src/views/*.jsx"],
    },
    watch: {
      ignored: ["**/server/**", "**/base-pi/**"],
    },
  },
}));
