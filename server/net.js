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

// ICE servers offered to the browser for WebRTC. STUN finds a direct path;
// TURN relays media when direct peer-to-peer is blocked. Defaults to the free
// Open Relay TURN so it works across networks out of the box; override with a
// private TURN via TURN_URL / TURN_USERNAME / TURN_CREDENTIAL env vars.
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
  } else {
    servers.push({
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    });
  }
  return servers;
}
