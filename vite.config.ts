import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { VitePWA } from "vite-plugin-pwa";
import { signalingPlugin } from "./vite-signaling-plugin";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const buildTime = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig({
  plugins: [
    signalingPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      // Cache the app shell so "Hotel mode" (and everything else) loads offline.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallback: "/index.html",
      },
      manifest: {
        name: "Baby Cam Cut",
        short_name: "BabyCamCut",
        description: "Watch your little one — on your desktop, another device, or fully offline.",
        theme_color: "#0e1122",
        background_color: "#0e1122",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        view: resolve(__dirname, "view.html"),
        impressum: resolve(__dirname, "impressum.html"),
        datenschutz: resolve(__dirname, "datenschutz.html"),
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5188,
    strictPort: true,
    host: true,
  },
});
