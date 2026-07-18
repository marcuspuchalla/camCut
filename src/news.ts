/**
 * What's new — the changelog users actually read.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RULE FOR EVERY CHANGE (humans and agents alike)
 *
 * Add an entry here whenever a change alters something a user can SEE, HEAR or
 * DO. Skip it entirely when the change is internal — refactors, dependency
 * bumps, build tweaks, type fixes, test changes. Those are what git log is for.
 *
 * Write the ENTRY from the user's chair, not the diff's:
 *
 *   ✅ "You can now hear your baby, not just see them."
 *   ❌ "Added audio track to RTCPeerConnection via addTrack()."
 *
 *   ✅ "The picture no longer freezes when the camera phone's screen dims."
 *   ❌ "Bypassed canvas.captureStream() when no crop selection is active."
 *
 * These entries are also the raw material for App Store / Play release notes,
 * so they should read well to a tired parent with no idea what WebRTC is.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NEVER describe this app as detecting breathing, movement, vital signs, or as
 * preventing SIDS — and never call it "safe", "reliable" or "24/7". Those words
 * would turn a video tool into a regulated medical device under EU MDR, and
 * that is a line this project does not cross. Describe what it does: it sends
 * picture and sound from one of your devices to another.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface NewsEntry {
  /** ISO date, e.g. "2026-07-17". */
  date: string;
  /** App version this shipped in, e.g. "0.11.0". */
  version: string;
  /** Short headline, sentence case, no trailing period. */
  title: string;
  /** One or two plain sentences. What changed, and why it matters to you. */
  body: string;
  kind: "new" | "improved" | "fixed";
}

/** Newest first. */
export const news: NewsEntry[] = [
  {
    date: "2026-07-18",
    version: "0.12.1",
    title: "Camera links can only be long random ids",
    body: "The link to a camera has always been its only key, so it must be impossible to guess. The app now refuses short or hand-made room names like \"0\" everywhere — only the long random ids the app generates itself are accepted, so nobody can stumble into a stream by trying simple names.",
    kind: "improved",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "The app now tells you plainly what it is — and what it isn't",
    body: "Before your first stream, a one-time notice spells it out: Baby Cam Cut only shows you what the camera sees and hears, it doesn't watch your child for you, and a stream can stop without warning. You'll also find this reminder on the camera and watching screens. Being honest about that is part of the product.",
    kind: "new",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "A live clock on the picture shows the stream is really moving",
    body: "A sleeping baby and a frozen picture used to look identical. The camera now stamps its current time into the video itself, ticking every second, plus a small label showing which device is streaming — so one glance at the watching device tells you the stream is still coming through.",
    kind: "new",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "The stream finds its way back on its own",
    body: "If the connection drops — Wi-Fi hiccup, network change, or the phone pausing things in the background — the watching device now notices within seconds and reconnects by itself, without you reloading the page. It also spots the sneaky case where the connection looks fine but nothing is actually arriving.",
    kind: "improved",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "The camera device's screen stays awake while streaming",
    body: "Phones like to turn their screen off, and a sleeping phone can silently stop streaming. While you're live, the app now asks the device to keep the screen on — and warns you clearly whenever it can't, so you know to plug the phone in and leave the screen on.",
    kind: "new",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "Quiet sounds keep flowing all night",
    body: "The audio no longer pauses itself during silence, small network hiccups are patched over before you'd hear them, and sound gets priority over picture when the connection gets tight — because hearing the room matters more than a crisp image.",
    kind: "improved",
  },
  {
    date: "2026-07-18",
    version: "0.12.0",
    title: "Connecting no longer contacts Google",
    body: "Setting up the connection between your devices used to briefly involve a Google server, which could see your address on the internet. That's gone — connection setup now only talks to the app's own server.",
    kind: "improved",
  },
  {
    date: "2026-07-17",
    version: "0.11.0",
    title: "You can now hear your baby, not just see them",
    body: "The camera device now sends sound along with the picture, so you can hear crying or stirring from the other room. You can mute it from either end at any time. On the watching device, tap once to turn sound on — phones don't allow sound to start on its own.",
    kind: "new",
  },
  {
    date: "2026-07-17",
    version: "0.11.0",
    title: "Sound tuned for a quiet nursery",
    body: "Phones normally clean up audio for phone calls, which quietly erases exactly the soft sounds you want to hear. We turned that off, so breathing and small noises come through instead of being filtered away as background hiss.",
    kind: "improved",
  },
  {
    date: "2026-07-17",
    version: "0.11.0",
    title: "The picture no longer freezes when the camera's screen dims",
    body: "When streaming the full frame, the video used to slow to a near standstill after the camera device's screen turned off. It now keeps running. If you crop to a region, keep that device's screen on.",
    kind: "fixed",
  },
  {
    date: "2026-07-17",
    version: "0.11.0",
    title: "Nothing is loaded from anyone else's servers",
    body: "The app's font is now delivered from the app itself instead of Google, and we removed website analytics entirely. Opening Baby Cam Cut no longer tells any third party that you were here.",
    kind: "improved",
  },
];
