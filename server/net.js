import os from "node:os";

// Non-internal IPv4 addresses of this machine, used to build a LAN link/QR so
// a phone can reach the dev/local server. Irrelevant once deployed behind a
// domain (the app then just uses its own origin).
export function getLanIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

// ICE servers offered to the browser for WebRTC. STUN finds a direct path
// (works when both devices can reach each other, e.g. same Wi-Fi). TURN relays
// media when a direct path is impossible (different networks, strict NAT,
// hardened browsers). Set a TURN server via env to enable cross-network use:
//   TURN_URL=turn:turn.example.com:3478,turn:turn.example.com:3478?transport=tcp
//   TURN_USERNAME=...   TURN_CREDENTIAL=...
// (See turn/ for a ready-to-deploy self-hosted coturn.)
export function getIceServers() {
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
