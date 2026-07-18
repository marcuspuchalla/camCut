# Baby Cam Cut — Handoff for the next agent

**Written:** 2026-07-18 · **App version:** 0.11.0 · **Branch:** main (uncommitted changes present)

---

## Update — 2026-07-18 later, v0.12.0 (Tasks A–D executed, uncommitted)

Tasks A–C are implemented and type-check/build clean; D is verified on desktop.
What changed, in one screen:

- **A — resilience:** viewer-driven reconnect watchdog in `useSignaling.ts`
  (getStats byte-stall detection incl. audio-only stall, disconnected-grace,
  join-response timeout), app-level WS ping/pong + server-side dead-socket
  sweep (`server/signaling.js`), Opus `usedtx=0;useinbandfec=1` munged into
  offer *and* answer, audio `networkPriority: high`, viewer
  `jitterBufferTarget` 500 ms, Screen Wake Lock (`useWakeLock.ts`) with
  persistent not-held banner, `Publisher.setStream()`/replaceTrack for camera
  flips while live. **STUN is off Google everywhere** (`server/net.js`,
  `useSignaling.ts`, `src/lib/offline.ts`, Datenschutz §6): STUN derives from
  `TURN_URL` (coturn answers STUN) or `STUN_URL`; no third-party fallback.
- **B — still-live proof:** clock + share-host watermark burned into every
  frame in `useCamera.ts`. Canvas is now ALWAYS the transmit path; the freeze
  bug is countered by a Web-Worker draw tick + `captureStream(0)`/
  `requestFrame()` + Wake Lock (see updated CLAUDE.md §5). **Not yet verified
  on a real phone with the screen dimmed — this is the top open test.**
- **C — own-risk messaging:** one-time first-run acknowledgement
  (`FirstRunNotice.vue`, gated on all stream routes in `App.vue`,
  `bcc.ownRiskAck` in localStorage), short forms in StreamOut/Viewer/footer,
  README section, stronger Nutzungsbedingungen (instructive wording only, per
  its legal comment), `docs/store-listing.md` draft (Utilities, MDR-safe).
- **D — PWA:** desktop Chrome verified against the real server: SW activates,
  manifest/icons valid, standalone config present, first-run gate + viewer
  work, **kill-the-connection acceptance passed** (silent media death detected
  ~10 s, recovery < 1 s). Android/iOS install + camera/mic in standalone and
  the overnight run remain **real-device tests** (§4 list still stands).
- Datenschutz §6 now states no third party is contacted for STUN/TURN — if
  Cloudflare TURN (`TURN_KEY_ID`) is ever enabled, that section must be
  rewritten first.

You are picking up a free, non-commercial, open-source (GPL-3.0) baby monitor.
One device is the camera, another watches. Picture **and now sound** travel
peer-to-peer over WebRTC; the server only introduces the two devices and never
sees the media. Read `CLAUDE.md` first — it holds the hard rules. This document
is the state, the open questions, and your task list.

---

## 1. Current status — what works today

| Area | State | Notes |
|---|---|---|
| Video P2P streaming | ✅ working | Camera → viewer over WebRTC, room-based signaling |
| **Audio** | ✅ added, ⚠️ untested on hardware | Mic + camera in one `getUserMedia`; DSP off; mute both ends; tap-to-listen on iOS |
| Crop / full-frame | ✅ working | Full-frame sends native track (no canvas throttle); crop uses canvas |
| Background video freeze | ✅ fixed for full-frame | Crop mode still freezes when backgrounded — by design, document it |
| PWA install | ✅ working | vite-plugin-pwa, autoUpdate, offline precache incl. wasm |
| Hotel mode (offline, QR pairing) | ✅ present | `src/views/Hotel.vue` — cross-network via QR |
| No third-party requests (UI) | ✅ done | Google Fonts self-hosted, Umami removed |
| Usage counter | ✅ done | `/api/stats` — aggregate integers only, no PII |
| Legal pages | ✅ drafted, ⚠️ not lawyer-reviewed | Impressum (TMG→DDG, VAT ID removed), Datenschutz, Nutzungsbedingungen |
| News / changelog | ✅ done | `/news`, driven by `src/news.ts` |

### ⚠️ Not verified — do not assume these work
- **No audio/video change has been tested on a real phone.** Build passes and
  types check; neither can tell you a microphone works. See §4 test list.
- **Overnight resilience is unverified.** The single most important unknown.

### Key files
- `src/composables/useCamera.ts` — camera + mic capture, crop, `BABY_AUDIO` constraints
- `src/composables/useSignaling.ts` — WebRTC publisher/viewer, `createPublisher` / `createViewer`
- `src/views/StreamOut.vue` — camera UI · `src/views/Viewer.vue` — watcher UI
- `server/signaling.js` — room relay + `stats` counters
- `server/net.js` — STUN/TURN config (`getIceServers`) ⚠️ see §3
- `docs/legal-briefing.md` — the questions for the lawyer

---

## 2. Open questions — publication

These are unresolved and mostly **not** yours to answer in code — they gate
whether store work should even start. Flag them; don't guess.

1. **Is a free hobby app "commercial activity" when its author is a professional
   software freelancer?** This one question decides four EU regulations at once
   (see §3 legal). Expressly unresolved in the legal literature. Lawyer question.
2. **Trader vs Non-Trader in App Store Connect / Google Play.** Must be decided
   *before* onboarding — the declaration is later evidence. The chosen direction
   is **Non-Trader** (free, unmonetised, no ads, no accounts).
3. **Apple:** a plain web-view wrapper gets rejected under Guideline 4.2. Needs
   Capacitor (not the archived PWABuilder), locally bundled code, and real native
   surface (background audio, push, native offline screen). Category **Utilities**
   — never Health/Medical (triggers a regulated-medical-device declaration since
   March 2026).
4. **Apple background audio:** WebKit bug 241480 (mic dies when a web view
   backgrounds) is open + unassigned since 2022. **Prototype this before building
   the wrapper** — it decides if iOS is viable at all.
5. **Google Play:** new personal accounts need **12 testers × 14 continuous days**
   of closed testing before production. This is the timeline bottleneck (~3–4
   weeks). Personal account publishes only name + country; organization publishes
   full home address + phone. No Google account exists yet.
6. **iOS platform limit:** an iPhone cannot be the camera with its screen off
   (Safari suspends WebRTC on lock). Not fixable. The working combination is
   **Android as camera, iPhone as viewer.**

Full detail and sourcing live in the release deck and `docs/legal-briefing.md`.

---

## 3. Legal problems that could arise in Germany

**None of this is legal advice.** It is a compilation for a lawyer to resolve.
The user has chosen the **non-commercial / hobby** path; everything below assumes
that and explains why it's load-bearing.

### 3.1 Product liability — the existential one
- **EU Product Liability Directive 2024/2853** covers software, creates
  **strict (fault-independent) liability** for personal injury, German
  transposition due **9 December 2026** (under 5 months). It exempts open-source
  software **only when supplied outside a commercial activity**.
- Liability for personal injury is **not disclaimable** (§ 14 ProdHaftG). No
  terms-of-service text removes it. The subject here is injury to an infant.
- **The whole defence is staying genuinely non-commercial** so the FOSS exemption
  holds: no ads, no in-app purchases, no donation buttons, no accounts, no
  analytics, no data monetisation, no VAT ID in the Impressum, no framing as the
  user's business/portfolio. **Do not add any of these.** If a change would make
  the project look commercial, stop and ask.
- Software with ongoing updates keeps being "placed on the market" with each
  release, so don't rely on being grandfathered before the deadline.

### 3.2 Same "commercial activity" hinge — three more regimes
- **Cyber Resilience Act (EU) 2024/2847** — manufacturer duties (CE marking,
  5-year support guarantee, 24-hour incident reporting) are unmeetable by one
  person. Applies only to commercial activity; the EU Commission states
  explicitly that non-monetised FOSS is out of scope.
- **GPSR (EU) 2023/988** — same test; mostly satisfied by a proper Impressum if
  it applies at all.
- **ProdHaftG § 1(2) Nr. 3** (current law) — exemption needs *both* no economic
  purpose *and* not in the course of a profession (cumulative).

### 3.3 Medical device (MDR) — the language trap
- A product becomes a **regulated medical device based on what its maker claims**,
  not what it technically does. Breathing is a physiological process.
- **Never** describe the app as: detecting breathing/movement/vital signs,
  apnea, SIDS/plötzlicher Kindstod, sleep tracking, cry detection, health
  monitoring — or as "safe", "secure", "reliable", "24/7", "uninterrupted".
- Applies everywhere: UI, store listing, screenshots, keywords, README, commits,
  social posts. Category Utilities, not Health/Medical.
- Safe language: "sends picture and sound from one of your devices to another",
  "for healthy children", "a convenience, not a safety device".

### 3.4 Data protection (GDPR / § 25 TDDDG)
- ✅ **Google Fonts self-hosted** — the LG München I (3 O 17493/20) pattern is
  removed.
- ✅ **Umami removed** — also protects the PLD exemption (using personal data for
  non-security purposes can revive the product characterisation).
- ✅ Usage counter is aggregate integers, no device access → outside § 25 TDDDG.
- ⚠️ **STUN still hits Google.** `server/net.js` defaults to
  `stun.l.google.com` — every connection attempt sends the user's IP to Google,
  structurally the same problem as the font. **Recommended fix: switch to own
  coturn (already scaffolded in `turn/`) or an EU STUN.** Small change.
- ⚠️ **TURN relays the media if configured.** Recommended relay is **Cloudflare**
  (`TURN_KEY_ID` / `TURN_KEY_API_TOKEN`). When a direct path fails (~10–20% of
  connections), the encrypted baby video routes through Cloudflare = processing
  under Art. 4(2) GDPR, video of children, US transfer. Needs a DPA / transfer
  basis / possible DSFA — lawyer question. Do **not** silently enable a
  third-party TURN without surfacing this.

### 3.5 Settled — not problems
- **BFSG** (accessibility): does not apply (no contract concluded; plus micro-
  enterprise exemption). Good design anyway.
- **Cookie banner:** not needed (no cookies, no tracking, no device access).
- **Data protection officer:** not needed (< 20 people).

---

## 4. Your tasks

Ordered. Each has an acceptance check. Respect `CLAUDE.md` throughout, and **add
a `src/news.ts` entry for every user-visible change** (user's-chair wording, no
implementation detail).

### Task A — Connectivity & resilience (highest value)
The product is "keep streaming when I'm not looking." Make it survive network
drops and OS timeouts on **any** device.

- **Reconnect watchdog.** Monitor `pc.connectionState` and track `muted` on both
  publisher and viewer; auto-reconnect on `failed`/`disconnected`/silent stall.
  The Chromium background-audio bug (audio drops after minutes with screen off)
  means the viewer must recover on its own. Today `useSignaling.ts` reconnects
  the WebSocket but does not detect a dead-but-"connected" peer.
- **Better ICE / NAT traversal.** Improve success rate for cross-network without
  a third-party relay where possible. If TURN is needed, prefer **own coturn**
  (see `turn/`) over Cloudflare for the GDPR reasons in §3.4 — and if you wire any
  relay, surface the privacy consequence, don't hide it.
- **Move STUN off Google** (`server/net.js`) — own coturn or EU STUN.
- **Screen Wake Lock** on the camera device with re-acquire on `visibilitychange`
  (it auto-releases). Show a persistent banner when the lock isn't held.
- **Opus tuning for a monitor:** `usedtx=0` (don't drop "silent" breathing),
  `useinbandfec=1`, and prioritise audio over video (`setParameters`
  `networkPriority`). Raise the viewer's jitter buffer for overnight stability.
- **Acceptance:** kill Wi-Fi on the viewer mid-stream → it recovers within
  seconds without a manual reload. Camera on Android with screen off + plugged in
  → audio survives for hours (test empirically; this is the go/no-go).

### Task B — On-screen "still-live" proof (explicitly requested)
Silence + a still image is ambiguous between "baby asleep" and "app frozen".
- **Burn the streaming device's current clock into the video**, updating every
  second, so the watcher can see it's still live even when nothing moves. It must
  update from the *camera device's* real time and be visible on the viewer.
- **Small watermark with the streaming device's URL** (its origin / room link, or
  a short device label), unobtrusive, in a corner.
- Implementation note: these must be drawn into the transmitted frame. That means
  the **canvas path is now always on** (today full-frame bypasses the canvas to
  avoid background throttling — see §1). Reconcile this: either draw the overlay
  via `OffscreenCanvas` in a Worker (survives backgrounding) or accept the canvas
  and lean harder on Wake Lock + the reconnect watchdog. **Do not silently
  reintroduce the overnight-freeze bug** — whichever way you go, verify the clock
  keeps advancing when the camera screen dims, or clearly tell the user to keep
  the screen on.
- **Acceptance:** on the viewer, the timestamp visibly ticks every second and the
  URL watermark is legible; both survive a reconnect.

### Task C — "Own risk" messaging everywhere (explicitly requested)
Make it unmistakable that this is used at the user's own risk and makes **no
claim to watch the child automatically or continuously** — it is only a way to
look at something.
- Strengthen `src/views/Nutzungsbedingungen.vue` (already has the safety notice),
  and add a **first-run acknowledgement** the user taps once before first use.
- Echo a short form in the app UI (camera + viewer), the README, and store
  listing copy.
- Keep it MDR-safe (§3.3): "not a safety device", "does not monitor
  automatically", "may fail without notice and the failure may not be shown",
  "never replaces adult supervision". The German liability wording in the terms
  is deliberate — read the comment at the top of `Nutzungsbedingungen.vue` before
  editing (a blanket "no liability" clause backfires under § 309/§ 306 BGB).
- **Acceptance:** a new user cannot reach a live stream without having seen the
  own-risk notice once; the "not automatic / not continuous" point appears in
  terms, first-run, and UI.

### Task D — PWA install on arbitrary devices (explicitly requested)
- Verify install + launch on Android/Chrome, iOS/Safari (Add to Home Screen),
  and desktop. Confirm icon, name, standalone (no browser chrome), offline shell.
- Confirm camera + mic permission prompts work **in installed standalone mode**
  (iOS is historically fragile here — never re-call `getUserMedia` on navigation;
  keep Vue Router in history mode, not hash).
- **Acceptance:** installs and runs as a standalone app on all three platforms;
  camera + mic function after install.

### Task E — Verify, then report honestly
- `npm run build` must pass (`vue-tsc` gates types).
- For anything touching media/streaming, **test on real devices** and say plainly
  what was and wasn't verified. Do not imply hardware works because the build does.

---

## 5. Guardrails (from CLAUDE.md — do not violate)
1. One `getUserMedia` call only (a second permanently mutes the first on iOS).
2. Audio DSP stays off (`echoCancellation`/`noiseSuppression`/`autoGainControl`
   all false) — noise suppression erases the breathing you want to hear.
3. No third-party runtime requests — bundle everything (Hotel mode is offline).
4. No medical/safety claims — hard MDR line.
5. Keep the project non-commercial — it's the product-liability defence.
6. Update `src/news.ts` for every user-visible change.

---

## 6. What the user still owes (not your job, but blockers)
- One hour with a Fachanwalt für IT-Recht (briefing ready in
  `docs/legal-briefing.md`) — decides commercial-activity + trader status.
- Real-device testing sign-off (especially overnight).
- Decision on TURN provider (own coturn vs Cloudflare) once the lawyer weighs in.
