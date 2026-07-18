# Baby Cam Cut 👶🌙

**Turn any device with a camera into a baby monitor — mark the region you care
about, and watch it live on your phone over a private peer-to-peer link.**

Point an old phone or a laptop webcam at the crib, optionally drag a box to zoom
into just that spot, and share a link. Whoever opens it watches the live feed —
and the video travels **directly between the two devices**, never through a
server. No app to install, no account, no cloud recording.

---

## ⚠️ Not a safety device — use at your own risk

Baby Cam Cut only sends live picture and sound from one of your devices to
another. **It does not watch your child for you** — not automatically, not
continuously. It detects nothing: no breathing, no movement, no crying, no
danger. It is not a medical device, and it is intended for healthy children
only.

**The stream can stop at any time without warning** — network trouble, an empty
battery, the operating system stepping in — **and the failure may not be shown
to you.** Use it as a convenience, at your own risk. It never replaces having
an adult nearby; never leave a child alone relying on this or any other
technology.

---

## Why I built this

Our baby naps in a crib behind me while I work, and I wanted to keep half an eye
on her without turning around — and to glance at my phone when I step away.

The first idea was a webcam streamed over RTSP into VLC (which has an always-on-top
window). That's a lot of moving parts for a small floating video. It turned out the
browser already has everything needed:

- **Picture-in-Picture** gives an always-on-top floating window on the desktop.
- **WebRTC** streams the cropped feed straight to a phone, peer-to-peer.
- A tiny **signaling server** just introduces the two devices; the video never
  passes through it.

So Baby Cam Cut is a browser-only baby monitor: use one device as the camera, watch
from any other, and keep the video on your own devices.

---

## Features

- 🎥 **Any device is the camera** — a spare/old phone pointed at the crib, or a laptop
  webcam. Pick front/back (or any connected camera).
- ✂️ **Optional crop** — drag a box to watch just one region (the crib, not the whole
  room), or stream the whole frame.
- 📱 **Watch anywhere** — share a link or QR code; the viewer sees the live feed
  full-screen, screen kept awake. Copy the link or hand it off via the native share
  sheet (WhatsApp, Messages, …).
- 🔗 **One permanent link** — each camera has a stable id in its URL. Bookmark it once;
  the same camera and the same viewer link come back on any computer, any day. Share
  the viewer link with your partner a single time.
- 📌 **Always-on-top pop-out** (desktop) — float the crop over your other windows.
- 🔒 **Peer-to-peer** — video flows directly between devices over WebRTC; the server
  only relays the tiny connection handshake and never sees your stream.
- 🌙 Calm, dark, one-handed **night-nursery** interface.

---

## How to use it

**On the camera device** (the one watching the crib):

1. Open the app and **Start camera**; pick front/back if needed.
2. Optionally **drag a box** to zoom into a region (or leave it for the full frame).
3. Press **Go live**.
4. **Copy** or **Share** the viewer link / scan the QR — send it to whoever's watching.

**On the watching device** (your phone, your partner's phone, an old tablet):

- Open the link. You'll see the live feed. Tap for fullscreen.

Bookmark the camera page on the camera device — it's your permanent link.

---

## Run it locally (test before deploying)

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev        # http://localhost:5188  (hot reload, for development)
```

Or run the exact production server locally:

```bash
npm run build
npm start          # serves the built app + signaling on http://localhost:5188
```

### Local testing notes

- The **camera side needs a secure context** (`getUserMedia`). `localhost` counts as
  secure, so **use the computer as the camera** when testing locally.
- The **viewer only receives** video, so it works over plain `http` on your LAN — open
  the printed `http://<your-LAN-IP>:5188/view?room=…` link on your phone. Locally the
  app builds the viewer link with your LAN IP automatically.
- To use a **phone as the camera**, you need HTTPS — that works once deployed (below).

---

## Deploy to your own domain (Coolify)

The included multi-stage `Dockerfile` builds the app and runs the standalone server.

1. In Coolify, add an application from this repo, build type **Dockerfile**.
2. Set the domain (e.g. `https://bcc.fmp.dev`) — Coolify provisions TLS.
3. The server listens on `$PORT` (Coolify sets it); it defaults to `5188`.

Once served over HTTPS, **any device — including a phone — can be the camera**, and
the same permanent links work from anywhere on the internet. The video still flows
peer-to-peer between the camera and each viewer.

### The one caveat: NAT traversal

WebRTC connects the two devices directly. Whether that succeeds depends on where they
are:

| Situation | Result |
|-----------|--------|
| Camera + viewer on the **same Wi-Fi** | ✅ Direct P2P — video stays on your LAN |
| Different networks (e.g. viewer on cellular) | ⚠️ Usually still direct via STUN hole-punching |
| Behind a **strict/symmetric NAT** | ❌ Direct P2P impossible without a TURN relay |

For the common case (watching from home Wi-Fi) it's pure P2P and nothing touches a
server. A TURN relay (which would route media through a server) is only needed for the
hard cross-network cases and isn't configured by default.

### Access

Anyone with a room link can watch that camera, so treat links as secret. For a family
baby monitor that's usually fine; if you want it locked down, add a login in front.

---

## How it works

- The camera frame is drawn to a hidden canvas — the whole frame, or just your crop —
  on a timer (so it keeps updating even when the window loses focus).
- That canvas becomes a `MediaStream` via `captureStream()`. For the desktop pop-out
  it's handed to `requestPictureInPicture()`; for phones it's sent over a WebRTC peer
  connection.
- A small WebSocket **signaling** service (a Vite dev plugin in development, the
  standalone `server/` in production) matches cameras and viewers by **room id** and
  relays only the SDP/ICE handshake. The media itself is peer-to-peer.

No RTSP, no ffmpeg, no VLC. The browser does all of it.

---

## License

[GPL-3.0](./LICENSE) © Marcus Puchalla
