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
// hardened browsers like Vanadium). Three ways to supply TURN, in priority:
//
//   1. Cloudflare Realtime TURN (recommended — free 1,000 GB/mo, relayed media
//      goes through Cloudflare, not this server):
//        TURN_KEY_ID=...            TURN_KEY_API_TOKEN=...
//   2. A static TURN server (e.g. self-hosted coturn in turn/):
//        TURN_URL=turn:host:3478,turn:host:3478?transport=tcp
//        TURN_USERNAME=...          TURN_CREDENTIAL=...
//   3. Nothing set → STUN only (same-network works; cross-network won't).
const STUN = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] };

// Cloudflare returns creds valid for `ttl`; cache and reuse to avoid an API
// call per request.
let cfCache = null; // { servers, expires }

export async function getIceServers() {
  if (process.env.TURN_KEY_ID && process.env.TURN_KEY_API_TOKEN) {
    if (cfCache && cfCache.expires > Date.now()) return cfCache.servers;
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TURN_KEY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const cf = data.iceServers;
        const servers = [STUN, ...(Array.isArray(cf) ? cf : [cf])];
        cfCache = { servers, expires: Date.now() + 12 * 60 * 60 * 1000 };
        return servers;
      }
    } catch {
      /* fall through to static/STUN */
    }
  }

  if (process.env.TURN_URL) {
    return [
      STUN,
      {
        urls: process.env.TURN_URL.split(",").map((s) => s.trim()),
        username: process.env.TURN_USERNAME || "",
        credential: process.env.TURN_CREDENTIAL || "",
      },
    ];
  }

  return [STUN];
}
