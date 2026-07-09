import { ref, shallowRef } from "vue";

/**
 * Device / browser capability detection.
 *
 * Two kinds of signals:
 *  - RELIABLE feature probes (secure context, getUserMedia, WebRTC, scriptable
 *    Picture-in-Picture). These directly gate a feature, so their notes are
 *    definitive.
 *  - BEST-EFFORT environment heuristics. Hardened setups (GrapheneOS Vanadium,
 *    Tor Browser, strict privacy modes) intentionally avoid a distinctive
 *    user-agent, so we cannot name the OS with certainty. Instead we watch for
 *    the capability *failures* they typically cause and explain the likely
 *    reason without overclaiming.
 */

export type Severity = "blocker" | "warn" | "info";

export interface CapNotice {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const lc = ua.toLowerCase();

// Firefox family incl. forks (Mull, Fennec, Tor Browser, Firefox iOS) — none
// expose a scriptable Picture-in-Picture API.
export const isFirefox = /firefox|fxios/i.test(lc);
export const isIOS =
  /iphone|ipad|ipod/i.test(lc) ||
  (typeof navigator !== "undefined" &&
    navigator.platform === "MacIntel" &&
    (navigator as any).maxTouchPoints > 1);
export const isAndroid = /android/i.test(lc);
// Tor Browser is Firefox-based; also flag its explicit token if present.
export const isTor = /\btor\b/i.test(lc) || (isFirefox && lc.includes("rv:") && (window as any).__torbutton !== undefined);

export const isSecure =
  typeof window !== "undefined" ? window.isSecureContext !== false : true;

export const hasGetUserMedia =
  typeof navigator !== "undefined" &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export const hasWebRTC =
  typeof RTCPeerConnection !== "undefined" ||
  typeof (globalThis as any).webkitRTCPeerConnection !== "undefined";

/** Standard PiP or Safari's webkit presentation mode — but never Firefox. */
export function hasScriptablePiP(): boolean {
  if (isFirefox) return false;
  const stdEnabled = (document as any).pictureInPictureEnabled === true;
  const vid = document.createElement("video");
  const webkitPiP = typeof (vid as any).webkitSetPresentationMode === "function";
  return stdEnabled || webkitPiP;
}

/** Best-effort: is Brave? navigator.brave.isBrave() resolves async. */
async function detectBrave(): Promise<boolean> {
  const b = (navigator as any).brave;
  if (b && typeof b.isBrave === "function") {
    try {
      return await b.isBrave();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Reason Picture-in-Picture (the pop-out window) can't be offered here.
 * Returns null when it IS available.
 */
export function pipUnavailableNote(): CapNotice | null {
  if (hasScriptablePiP()) return null;
  if (isFirefox) {
    return {
      id: "pip-firefox",
      severity: "info",
      title: "No pop-out button in Firefox",
      detail:
        "Firefox has picture-in-picture, but it can't be opened from a web page — only from its own video toolbar. Use the little pop-out icon Firefox overlays on the video, or open this in Chrome, Edge or Safari for the one-click button.",
    };
  }
  return {
    id: "pip-unsupported",
    severity: "info",
    title: "Pop-out window not available here",
    detail:
      "This browser doesn't let a page open an always-on-top picture-in-picture window. Chrome, Edge and Safari support it.",
  };
}

/** Global blockers/warnings that apply to any camera or streaming mode. */
export function baseNotices(): CapNotice[] {
  const out: CapNotice[] = [];

  if (!isSecure) {
    out.push({
      id: "insecure",
      severity: "blocker",
      title: "Camera needs a secure connection",
      detail:
        "Browsers only allow camera access over HTTPS (or on localhost). Open this page via its https:// address.",
    });
  }

  if (!hasGetUserMedia) {
    out.push({
      id: "no-gum",
      severity: "blocker",
      title: "Camera access is blocked on this device",
      detail:
        "Your browser doesn't expose the camera API. Hardened setups like GrapheneOS / Vanadium, Tor Browser, or strict privacy modes often disable it. Try a standard Chromium or Safari browser, or allow camera access in your browser's settings.",
    });
  }

  if (!hasWebRTC) {
    out.push({
      id: "no-webrtc",
      severity: "blocker",
      title: "Live streaming isn't available on this device",
      detail:
        "WebRTC (the peer-to-peer video technology) is turned off here. This is common on hardened operating systems and privacy browsers that disable it to prevent IP leaks. Local pop-out still works; cross-device streaming won't.",
    });
  }

  return out;
}

/**
 * Reactive capability report. Runs the synchronous probes immediately and the
 * async Brave probe in the background, appending a note if a hardened
 * environment is detected.
 */
export function useCapabilities() {
  const notices = shallowRef<CapNotice[]>(baseNotices());
  const brave = ref(false);

  // A hardened/custom environment is *likely* when a mainstream-looking
  // browser is missing camera or WebRTC in a secure context. We say "likely"
  // and name examples rather than asserting the exact OS.
  const looksHardened = isSecure && (!hasGetUserMedia || !hasWebRTC);
  if (looksHardened && !notices.value.some((n) => n.id === "hardened")) {
    notices.value = [
      ...notices.value,
      {
        id: "hardened",
        severity: "warn",
        title: "Looks like a hardened or custom setup",
        detail:
          "Some camera or streaming features are missing. That usually means a privacy-focused OS or browser (e.g. GrapheneOS / Vanadium, Tor Browser, or strict fingerprint protection). The app may not fully work here — a standard Chrome, Edge or Safari is the safe bet.",
      },
    ];
  }

  detectBrave().then((isB) => {
    brave.value = isB;
    if (isB) {
      notices.value = [
        ...notices.value,
        {
          id: "brave",
          severity: "info",
          title: "Using Brave?",
          detail:
            "Brave Shields can block the camera or WebRTC. If streaming fails, lower the shield for this site (WebRTC IP handling set to default).",
        },
      ];
    }
  });

  return { notices, brave };
}
