import { defineConfig } from "vite";
import { resolve } from "node:path";
import { signalingPlugin } from "./vite-signaling-plugin";

export default defineConfig({
  plugins: [signalingPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        view: resolve(__dirname, "view.html"),
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    host: true, // expose on the LAN so a phone can reach it
  },
  preview: {
    port: 5188,
    strictPort: true,
    host: true,
  },
});
