import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { attachSignaling } from "./signaling.js";
import { getLanIps } from "./net.js";

// Standalone production server for Baby Cam Cut: serves the built static app
// (dist/) and hosts the room-based signaling relay on /signal. Run locally
// with `npm run build && npm start`, or in the Docker image for deployment.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 5188;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(buf);
  });
}

// ICE servers offered to the browser. STUN helps devices find a direct path;
// a TURN relay (set via env) is the fallback for networks that block direct
// peer-to-peer (strict NAT, Wi-Fi client isolation, different networks).
//   TURN_URL=turn:turn.example.com:3478   TURN_USERNAME=...   TURN_CREDENTIAL=...
function iceServers() {
  const servers = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL.split(",").map((s) => s.trim()),
      username: process.env.TURN_USERNAME || "",
      credential: process.env.TURN_CREDENTIAL || "",
    });
  }
  return servers;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (pathname === "/api/lan-info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ips: getLanIps() }));
    return;
  }

  if (pathname === "/api/ice") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ iceServers: iceServers() }));
    return;
  }

  // Pretty routes.
  if (pathname === "/") pathname = "/index.html";
  else if (pathname === "/view") pathname = "/view.html";
  else if (pathname === "/impressum") pathname = "/impressum.html";
  else if (pathname === "/datenschutz") pathname = "/datenschutz.html";

  // Resolve inside DIST, guarding against path traversal.
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(DIST, safe);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isFile()) serveFile(res, filePath);
    else serveFile(res, path.join(DIST, "index.html")); // fallback
  });
});

const wss = new WebSocketServer({ noServer: true });
attachSignaling(wss, { log: (m) => console.log("[bcc]", m) });

server.on("upgrade", (req, socket, head) => {
  if ((req.url || "").split("?")[0] !== "/signal") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

server.listen(PORT, () => {
  console.log(`[bcc] Baby Cam Cut running on http://localhost:${PORT}`);
  const ips = getLanIps();
  if (ips.length) console.log(`[bcc] LAN: http://${ips[0]}:${PORT}`);
});
