// Phone-side viewer. Connects to the signaling server, receives the PC's
// cropped WebRTC stream, and plays it full-screen. Only *receives* video, so
// it needs no camera permission and works over plain http on the LAN.

const video = document.getElementById("view") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLElement;
const msg = document.getElementById("msg") as HTMLElement;
const popout = document.getElementById("popout") as HTMLButtonElement;

// ICE servers come from the server so a TURN relay can be added without a
// rebuild; falls back to public STUN.
let rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
async function loadIceConfig() {
  try {
    const data = await fetch("/api/ice").then((r) => r.json());
    if (data.iceServers?.length) rtcConfig = { iceServers: data.iceServers };
  } catch {
    /* keep the STUN fallback */
  }
}

let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let reconnectTimer: number | undefined;

function showOverlay(text: string) {
  msg.textContent = text;
  overlay.classList.remove("hidden");
  popout.classList.add("hidden"); // no stream to pop out while reconnecting
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

// Pop-out (Picture-in-Picture): float the baby video always-on-top on a desktop
// while you work. Shown only once the stream is playing and PiP is available.
type WebkitVideo = HTMLVideoElement & {
  webkitSetPresentationMode?: (mode: string) => void;
  webkitSupportsPresentationMode?: (mode: string) => boolean;
};
function pipSupported(): boolean {
  const v = video as WebkitVideo;
  return (
    (document.pictureInPictureEnabled ?? false) ||
    typeof v.webkitSetPresentationMode === "function"
  );
}
popout.addEventListener("click", async (e) => {
  e.stopPropagation(); // don't also trigger the tap-to-fullscreen handler
  const v = video as WebkitVideo;
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
    else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode("picture-in-picture");
  } catch {
    /* PiP can be refused (e.g. no user gesture) — ignore */
  }
});

function teardownPeer() {
  if (pc) {
    pc.close();
    pc = null;
  }
  video.srcObject = null;
}

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}/signal`);

  ws.onopen = () => {
    showOverlay("Connecting to PC…");
    join();
  };

  ws.onmessage = async (ev) => {
    const data = JSON.parse(ev.data);

    if (data.type === "offer") {
      setupPeer();
      await pc!.setRemoteDescription(data.sdp);
      const answer = await pc!.createAnswer();
      await pc!.setLocalDescription(answer);
      ws!.send(JSON.stringify({ type: "answer", sdp: answer }));
    } else if (data.type === "ice") {
      try {
        await pc?.addIceCandidate(data.candidate);
      } catch {
        /* ignore late/duplicate candidates */
      }
    } else if (data.type === "no-publisher") {
      showOverlay("Waiting for the PC to start sharing…");
    } else if (data.type === "publisher-ready") {
      join();
    } else if (data.type === "publisher-gone") {
      teardownPeer();
      showOverlay("PC stopped sharing. Waiting…");
    }
  };

  ws.onclose = () => {
    teardownPeer();
    showOverlay("Disconnected. Reconnecting…");
    scheduleReconnect();
  };

  ws.onerror = () => ws?.close();
}

const room = new URLSearchParams(location.search).get("room") || "";

function join() {
  ws?.send(JSON.stringify({ type: "viewer-join", room }));
}

function setupPeer() {
  teardownPeer();
  pc = new RTCPeerConnection(rtcConfig);

  pc.ontrack = (e) => {
    video.srcObject = e.streams[0];
    // Don't hide the overlay yet — wait for the video to actually play (below).
    // Autoplay of a WebRTC stream is blocked on some phones until you tap.
    video.play().catch(() => showOverlay("Tap to start video"));
    requestWakeLock();
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) ws?.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
  };

  pc.oniceconnectionstatechange = () => {
    const s = pc?.iceConnectionState;
    console.log("[camCut] ice:", s);
    if (s === "checking") showOverlay("Connecting to PC…");
    else if (s === "failed") showOverlay("Couldn't connect. Check you're on the same Wi-Fi.");
    else if (s === "disconnected") showOverlay("Connection dropped. Reconnecting…");
  };
}

// Overlay hides only once frames are truly rendering — so a stalled/black
// stream shows a status message instead of a mysterious black screen.
video.addEventListener("playing", () => {
  hideOverlay();
  if (pipSupported()) popout.classList.remove("hidden");
});

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(connect, 2000);
}

// Keep the phone screen awake while watching (best-effort).
let wakeLock: WakeLockSentinel | null = null;
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    }
  } catch {
    /* wake lock is a nice-to-have */
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && video.srcObject) requestWakeLock();
});

// Tap anywhere: make sure playback is running (covers autoplay blocks), then
// toggle fullscreen.
document.addEventListener("click", () => {
  if (video.srcObject && video.paused) video.play().catch(() => {});
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
});

loadIceConfig().then(connect);
