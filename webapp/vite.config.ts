import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 1351 },
  plugins: [tailwindcss(), vue()],
  resolve: {
    conditions: ["@disco/source", ...defaultClientConditions],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // TODO until simple-peer#883 is fixed
      "simple-peer": "simple-peer/simplepeer.min.js",
      buffer: "buffer/",
    },
  },
  ssr: {
    resolve: { conditions: ["@disco/source", ...defaultServerConditions] },
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  cacheDir: "../node_modules/.vite/webapp",
});
