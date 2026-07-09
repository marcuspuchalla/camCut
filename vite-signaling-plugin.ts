import type { Plugin } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";

// A tiny WebRTC signaling relay that rides on the Vite dev server.
//
// It knows about exactly one publisher (the PC running camCut) and any number
// of viewers (phones). Its only job is to shuttle SDP offers/answers and ICE
// candidates between them — the actual video travels peer-to-peer over WebRTC,
// never through this server.
//
// It also exposes GET /api/lan-info so the PC page can discover its own LAN IP
// and build a link/QR code the phone can reach.

type Peer = WebSocket & { role?: "publisher" | "viewer"; viewerId?: number };

export function signalingPlugin(): Plugin {
  return {
    name: "camcut-signaling",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      let publisher: Peer | null = null;
      const viewers = new Map<number, Peer>();
      let nextViewerId = 1;

      const send = (ws: Peer | null | undefined, msg: unknown) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      };

      // Only handle our /signal path; leave Vite's own HMR socket alone.
      server.httpServer?.on("upgrade", (req, socket, head) => {
        const path = (req.url ?? "").split("?")[0];
        if (path !== "/signal") return;
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      });

      wss.on("connection", (ws: Peer) => {
        ws.on("message", (data) => {
          let msg: any;
          try {
            msg = JSON.parse(data.toString());
          } catch {
            return;
          }

          switch (msg.type) {
            case "publisher":
              publisher = ws;
              ws.role = "publisher";
              console.log("[camCut] publisher connected");
              // Nudge any viewers that were waiting for a publisher.
              for (const v of viewers.values()) send(v, { type: "publisher-ready" });
              break;

            case "viewer-join": {
              let id = ws.viewerId;
              if (id == null) {
                id = nextViewerId++;
                ws.role = "viewer";
                ws.viewerId = id;
                viewers.set(id, ws);
              }
              console.log(
                `[camCut] viewer ${id} joined (publisher ${publisher ? "present" : "absent"})`,
              );
              if (publisher) send(publisher, { type: "viewer-join", viewerId: id });
              else send(ws, { type: "no-publisher" });
              break;
            }

            case "offer":
              send(viewers.get(msg.viewerId), { type: "offer", sdp: msg.sdp });
              break;

            case "answer":
              send(publisher, { type: "answer", viewerId: ws.viewerId, sdp: msg.sdp });
              break;

            case "ice":
              if (ws.role === "publisher") {
                send(viewers.get(msg.viewerId), { type: "ice", candidate: msg.candidate });
              } else {
                send(publisher, { type: "ice", viewerId: ws.viewerId, candidate: msg.candidate });
              }
              break;
          }
        });

        ws.on("close", () => {
          if (ws.role === "publisher") {
            publisher = null;
            for (const v of viewers.values()) send(v, { type: "publisher-gone" });
          } else if (ws.role === "viewer" && ws.viewerId != null) {
            viewers.delete(ws.viewerId);
            send(publisher, { type: "viewer-leave", viewerId: ws.viewerId });
          }
        });
      });

      // LAN IP discovery for building the phone link + QR.
      server.middlewares.use("/api/lan-info", (_req, res) => {
        const ips: string[] = [];
        for (const ifaces of Object.values(os.networkInterfaces())) {
          for (const i of ifaces ?? []) {
            if (i.family === "IPv4" && !i.internal) ips.push(i.address);
          }
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ips }));
      });
    },
  };
}
