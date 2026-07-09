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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (pathname === "/api/lan-info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ips: getLanIps() }));
    return;
  }

  // Pretty routes.
  if (pathname === "/") pathname = "/index.html";
  else if (pathname === "/view") pathname = "/view.html";

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
