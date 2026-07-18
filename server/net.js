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
// hardened browsers like Vanadium).
//
// There is deliberately NO public/Google STUN fallback: every STUN request
// sends the user's IP to whoever runs the server — the same third-party
// pattern as the Google Fonts case (see docs/legal-briefing.md §3.4). Only
// servers the operator configured are handed out. coturn (turn/) answers STUN
// on the same port with no credentials, so a TURN_URL gives you STUN for free.
//
// Configuration, in priority:
//   1. Self-hosted coturn (recommended — see turn/README.md):
//        TURN_URL=turn:host:3478,turn:host:3478?transport=tcp
//        TURN_USERNAME=...          TURN_CREDENTIAL=...
//      STUN is derived from the TURN_URL hosts automatically.
//   2. Cloudflare Realtime TURN (relayed media transits Cloudflare — this has
//      GDPR consequences for video of children, see docs/legal-briefing.md;
//      don't enable it silently):
//        TURN_KEY_ID=...            TURN_KEY_API_TOKEN=...
//   3. STUN_URL=stun:host:3478[,stun:...] — explicit STUN without TURN.
//   4. Nothing set → no ICE servers: same-network streaming still works via
//      host candidates; cross-network needs 1–3.

function stunServers() {
  if (process.env.STUN_URL) {
    return [{ urls: process.env.STUN_URL.split(",").map((s) => s.trim()) }];
  }
  if (process.env.TURN_URL) {
    const urls = [
      ...new Set(
        process.env.TURN_URL.split(",")
          .map((s) => {
            const m = s.trim().match(/^turn:([^?]+)/); // plain turn: only — turns: ports speak TLS, not STUN
            return m ? `stun:${m[1]}` : null;
          })
          .filter(Boolean),
      ),
    ];
    if (urls.length) return [{ urls }];
  }
  return [];
}

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
        // Cloudflare's response already includes its own STUN urls.
        const servers = [...stunServers(), ...(Array.isArray(cf) ? cf : [cf])];
        cfCache = { servers, expires: Date.now() + 12 * 60 * 60 * 1000 };
        return servers;
      }
    } catch {
      /* fall through to static/STUN */
    }
  }

  if (process.env.TURN_URL) {
    return [
      ...stunServers(),
      {
        urls: process.env.TURN_URL.split(",").map((s) => s.trim()),
        username: process.env.TURN_USERNAME || "",
        credential: process.env.TURN_CREDENTIAL || "",
      },
    ];
  }

  return stunServers();
}
