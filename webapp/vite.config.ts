import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 8081 },
  plugins: [
    vue(),
    nodePolyfills({
      include: ["buffer"],
      globals: { Buffer: true },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // TODO until simple-peer#883 is fixed
      "simple-peer": "simple-peer/simplepeer.min.js",
    },
  },
  cacheDir: "../node_modules/.vite/webapp",
});
