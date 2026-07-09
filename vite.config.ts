import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { signalingPlugin } from "./vite-signaling-plugin";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const buildTime = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    signalingPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "favicon-32.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // Hotel mode must run with no internet, so precache generously and let
        // the app shell + all route chunks (incl. jsQR / qrcode) work offline.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: "Baby Cam Cut",
        short_name: "BabyCamCut",
        description: "Watch your little one — on your desktop, another device, or fully offline.",
        theme_color: "#0e1122",
        background_color: "#0e1122",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: { port: 5188, strictPort: true, host: true },
  preview: { port: 5188, strictPort: true, host: true },
});
