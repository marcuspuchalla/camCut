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
