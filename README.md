# camCut 📌

**Mark a region of your webcam feed and pop it out into a small, always-on-top window.**

camCut is a tiny, dependency-light web app that turns your webcam into a focused
"picture-in-picture" monitor. You draw a box over the live feed, and camCut shows
*only* that region in a floating window that stays on top of everything else you're
doing — your editor, your browser, a full-screen app, whatever.

No servers. No accounts. No streaming stack. Just a browser tab and the built-in
[Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API).

---

## Why I built this

I have a baby who naps in a crib **behind me** while I work at my PC. I wanted a
simple way to keep half an eye on them without turning around every two minutes.

My first instinct was the classic route: point a webcam at the crib, stream it over
**RTSP**, and open it in **VLC** — because VLC has an "always on top" window mode.
That works, but it's a lot of moving parts (an RTSP server, ffmpeg, VLC config) just
to get a small floating video.

Then it clicked: the browser already has an always-on-top floating window built in —
**Picture-in-Picture**. So instead of a streaming server, camCut just:

1. grabs the webcam,
2. lets me **crop to the exact region** I care about (the crib, not the whole room),
3. and **pops that crop out** into a PiP window that floats above my work.

That's the whole idea. A baby monitor for people who live in front of a screen —
but it works just as well for keeping an eye on anything: a 3D printer, a front door,
a pot on the stove, a pet, a long-running progress bar on another machine's screen.

---

## Features

- 🎥 **Live webcam** straight in the browser (`getUserMedia`).
- ✂️ **Drag-to-crop** — draw a box over the feed to pick exactly the region you want.
- 🔍 **In-page zoom** — view just that region, scaled up to fill the panel.
- 📌 **Always-on-top pop-out** — send the cropped region to a floating PiP window that
  stays above every other application.
- 🧭 **Resolution-independent selection** — the crop is stored relative to the video
  frame, so resizing the window never breaks it.
- 🪶 **Tiny & local** — plain TypeScript + Vite, no runtime dependencies, nothing
  leaves your machine.

---

## How to use it

1. **Start webcam** and allow camera access.
2. **Drag a box** around the thing you want to watch (e.g. the crib).
3. Click **📌 Pop out (always on top)**.
4. A small floating window appears showing only that region. Drag it to a corner,
   resize it, and get back to work — it stays on top.

To watch a different spot: **Close pop-out → Clear → drag a new box → Pop out** again.

---

## Running locally

Requires [Node.js](https://nodejs.org/) 18+.

```bash
git clone <this-repo>
cd camCut
npm install
npm run dev
```

Then open the printed URL (defaults to **http://localhost:5188/**).

> The camera API (`getUserMedia`) only works over **`localhost` or HTTPS**, which the
> Vite dev server provides. If you host camCut somewhere, serve it over HTTPS.

### Build for production

```bash
npm run build     # type-checks, then outputs static files to dist/
npm run preview   # serve the built files locally
```

The `dist/` folder is fully static — drop it on any static host (GitHub Pages,
Netlify, your own box) as long as it's served over HTTPS.

---

## Browser support

Picture-in-Picture of a canvas stream works in **Chrome, Edge, and Safari**.
Firefox's PiP currently only pops out plain `<video>` elements and may not accept the
cropped canvas stream — use a Chromium-based browser or Safari for the pop-out feature.
The in-page zoom works everywhere.

---

## How it works (short version)

- The webcam frame is drawn to a hidden source; the selected region is copied out with
  `ctx.drawImage(video, sx, sy, sw, sh, …)` on a `requestAnimationFrame` loop — a live
  crop at the region's native resolution.
- For the pop-out, that crop canvas is turned into a `MediaStream` via
  `canvas.captureStream()`, fed into a hidden `<video>`, and handed to
  `video.requestPictureInPicture()` — which the OS renders as an always-on-top window.

No RTSP, no ffmpeg, no VLC. The browser does all of it.

---

## License

[GPL-3.0](./LICENSE) © Marcus Puchalla
