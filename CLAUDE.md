# Baby Cam Cut — working agreement

A free, non-commercial, open-source (GPL-3.0) baby monitor. One device is the
camera, another watches. Picture and sound travel peer-to-peer over WebRTC; the
server only introduces the two devices and never sees the media.

## 1. Always update the news section for user-visible changes

`src/news.ts` is the changelog users read at `/news`, and the source of release
notes for the app stores.

**After any change that alters what a user can see, hear or do, add an entry.**
Do it in the same change, not later.

- Write it from the user's chair: _"You can now hear your baby, not just see
  them"_ — never _"added an audio track to the peer connection"_.
- **Do not** add entries for refactors, dependency bumps, type fixes, build
  changes or tests. Internal work belongs in git log, not in front of a parent.
- Bump the version in `package.json` and use it as the entry's `version`.

The file's header comment has the full rules and examples. Read it before adding.

## 2. Never make medical or safety claims — this is a hard line

The app must never be described as detecting breathing, movement, sleep or vital
signs, as preventing SIDS, or as "safe", "reliable", "secure", "24/7" or
"uninterrupted". Under EU MDR, a product becomes a **regulated medical device
based on what its maker claims**, not on what it technically does. One sentence
of marketing copy is the entire difference between a video tool and a device
requiring certification.

This applies everywhere, not just the UI: README, store listings, screenshots,
keywords, the app store **category** (Utilities — never Health & Fitness or
Medical), commit messages and social posts.

Say instead: _"sends picture and sound from one of your devices to another"_,
_"for healthy children"_, _"a convenience, not a safety device"_.

## 3. Keep the project non-commercial — it is load-bearing, not a preference

The EU Product Liability Directive 2024/2853 (German transposition due
**9 Dec 2026**) imposes strict, non-disclaimable liability for personal injury,
and exempts open-source software **only when supplied outside a commercial
activity**. The Cyber Resilience Act and the GPSR hang on the same test.

So this project has: no ads, no in-app purchases, no donation buttons, no
accounts, no analytics, no data monetisation, and no framing as anyone's
business or portfolio piece. **Do not add any of them**, and do not reintroduce
a VAT ID to the Impressum. If a change would make the project look commercial,
stop and ask first — the downside is personal injury liability for a solo
individual. See `docs/legal-briefing.md`.

## 4. No third-party requests, ever

Nothing may be fetched from another origin at runtime — no CDN fonts, scripts,
styles or images. Two independent reasons: Hotel mode must work with no
internet, and sending a visitor's IP to a third party without a legal basis is
the exact pattern German courts have ruled on. Bundle it, or don't use it.

## 5. WebRTC constraints worth knowing before you touch media code

- **One `getUserMedia` call only.** Acquire camera and mic together. A second
  call permanently mutes the first call's tracks on iOS
  ([WebKit 179363](https://bugs.webkit.org/show_bug.cgi?id=179363)) — this will
  silently break video on iPhones.
- **Audio DSP stays off** (`echoCancellation`, `noiseSuppression`,
  `autoGainControl` all `false`). Noise suppression is built to remove steady
  non-speech sound, which is exactly the breathing you want to hear.
- **The canvas transmit path is throttle-sensitive — keep its defenses.** The
  live clock/watermark burned into the picture mean every frame goes through
  the canvas. Main-thread timers are throttled to ~1/min in hidden pages, so
  `useCamera.ts` drives drawing from a Web Worker tick (worker timers aren't
  throttled) and captures via `captureStream(0)` + `requestFrame()`, with a
  Screen Wake Lock keeping the page visible while live. Don't move the draw
  loop back to `setInterval`/`requestAnimationFrame` on the main thread — that
  reintroduces the overnight-freeze bug.
- **iOS suspends WebRTC on screen lock.** An iPhone cannot be the camera with
  its screen off; this is a platform limit, not a bug to fix. Document it, don't
  fight it.

## 6. Verify before claiming

`npm run build` must pass. Type errors are caught by `vue-tsc`. Media behaviour
cannot be verified by the type checker or a build — if a change touches camera,
mic, or streaming, say plainly that it needs testing on real devices rather than
implying it works.
