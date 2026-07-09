import type { Plugin } from "vite";
import { WebSocketServer } from "ws";
import { attachSignaling } from "./server/signaling.js";
import { getLanIps } from "./server/net.js";

// Dev-server counterpart of the standalone production server: rides on Vite's
// HTTP server so `npm run dev` gives the full room-based signaling + LAN link
// experience with hot reload. Production uses server/index.js instead.

export function signalingPlugin(): Plugin {
  return {
    name: "bcc-signaling",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      attachSignaling(wss, { log: (m: string) => server.config.logger.info(`[bcc] ${m}`) });

      // Only our /signal path; leave Vite's own HMR socket alone.
      server.httpServer?.on("upgrade", (req, socket, head) => {
        if ((req.url ?? "").split("?")[0] !== "/signal") return;
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
      });

      // Pretty routes -> .html (production server does the same).
      const pretty: Record<string, string> = {
        "/view": "/view.html",
        "/impressum": "/impressum.html",
        "/datenschutz": "/datenschutz.html",
      };
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (pretty[path]) {
          const q = req.url!.includes("?") ? req.url!.slice(req.url!.indexOf("?")) : "";
          req.url = pretty[path] + q;
        }
        next();
      });

      server.middlewares.use("/api/lan-info", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ips: getLanIps() }));
      });

      server.middlewares.use("/api/ice", (_req, res) => {
        const iceServers: unknown[] = [
          { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        ];
        if (process.env.TURN_URL) {
          iceServers.push({
            urls: process.env.TURN_URL.split(",").map((s) => s.trim()),
            username: process.env.TURN_USERNAME || "",
            credential: process.env.TURN_CREDENTIAL || "",
          });
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ iceServers }));
      });
    },
  };
}
