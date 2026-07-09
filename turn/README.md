# TURN relay for Baby Cam Cut

A TURN server relays the video when two devices can't reach each other directly
(different networks, cellular, strict NAT, hardened browsers like Vanadium). A
relay is unavoidable for those cases — no "pure P2P" library removes it (see the
note at the bottom). Two good options:

## Option A — Cloudflare Realtime TURN (recommended, easiest)

Free 1,000 GB/month, and **relayed video flows through Cloudflare, not your
server** (so no bandwidth cost or port-opening on your box).

1. In the Cloudflare dashboard: **Realtime → TURN → Create** a TURN app. Note the
   **Turn Token ID** and **API Token**.
2. Set two env vars on the **Baby Cam Cut app** and redeploy:
   ```
   TURN_KEY_ID=<Turn Token ID>
   TURN_KEY_API_TOKEN=<API Token>
   ```
3. The app mints short-lived credentials automatically (`/api/ice`). Open the app
   → **Test connection** → **Relay (TURN): ✓**.

That's it — no coturn, no firewall changes. Only use Option B if you specifically
want the relayed media to stay on your own hardware.

---

## Option B — Self-hosted coturn

Relayed video stays on *your* server (full privacy) but costs your server's
bandwidth when used, and needs open UDP/TCP ports. You already have the server.

**Bandwidth note:** TURN is a *fallback*. When devices can connect directly
(same Wi‑Fi, or STUN succeeds) the video goes device‑to‑device and never touches
this server. Only when a direct path is impossible does the stream flow through
here — uploaded from the camera and downloaded to the viewer (~0.5–1.5 Mbps each
way per viewer while in use).

## 1. DNS

Point a name at the server that runs coturn. If it's the same server as the app,
`bcc.fmp.dev` already resolves there — you can reuse it, or add e.g.
`turn.fmp.dev` → the server's public IP.

## 2. Firewall

Open on the server:

- `3478/udp` and `3478/tcp` — TURN control
- `49160-49200/udp` — media relay range (matches the compose file)

## 3. Deploy coturn in Coolify

- New resource → **Docker Compose** → use `turn/docker-compose.yml` from this repo.
- Set these env vars on the coturn service:
  - `TURN_USER` = `babycam`
  - `TURN_PASSWORD` = a long random string
  - `TURN_REALM` = `bcc.fmp.dev`
  - `TURN_EXTERNAL_IP` = the server's **public IPv4**
- Deploy. Check the logs show coturn listening on 3478.

> It uses `network_mode: host` so the UDP relay range is reachable. If your host
> blocks host networking, tell me and I'll switch it to explicit port mappings.

## 4. Point the app at it

Set these env vars on the **Baby Cam Cut app** (not the coturn service) and redeploy:

```
TURN_URL=turn:bcc.fmp.dev:3478,turn:bcc.fmp.dev:3478?transport=tcp
TURN_USERNAME=babycam
TURN_CREDENTIAL=<the TURN_PASSWORD you set>
```

Use whatever host you set up in step 1 in `TURN_URL`.

## 5. Verify

Open the app, click **Test connection**. You should now see **Relay (TURN): ✓**.
Then a phone on cellular / another network should be able to watch.

## Troubleshooting

- **Relay still ✗** → firewall ports not open, wrong `TURN_EXTERNAL_IP`, or the
  `TURN_URL` host doesn't resolve to this server.
- **Very restrictive networks** (some corporate/cellular) only allow 443. Running
  TURN over TLS on 443 needs a cert and a dedicated IP/subdomain — ask if you need it.
