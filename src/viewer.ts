// Phone-side viewer. Connects to the signaling server, receives the PC's
// cropped WebRTC stream, and plays it full-screen. Only *receives* video, so
// it needs no camera permission and works over plain http on the LAN.

const video = document.getElementById("view") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLElement;
const msg = document.getElementById("msg") as HTMLElement;

// STUN helps candidate discovery; on a home LAN, host/mDNS candidates connect
// even without internet.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let reconnectTimer: number | undefined;

function showOverlay(text: string) {
  msg.textContent = text;
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

function teardownPeer() {
  if (pc) {
    pc.close();
    pc = null;
  }
  video.srcObject = null;
}

function connect() {
  ws = new WebSocket(`ws://${location.host}/signal`);

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

function join() {
  ws?.send(JSON.stringify({ type: "viewer-join" }));
}

function setupPeer() {
  teardownPeer();
  pc = new RTCPeerConnection(RTC_CONFIG);

  pc.ontrack = (e) => {
    video.srcObject = e.streams[0];
    video.play().catch(() => {});
    hideOverlay();
    requestWakeLock();
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) ws?.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
  };

  pc.onconnectionstatechange = () => {
    if (pc && ["failed", "disconnected"].includes(pc.connectionState)) {
      showOverlay("Connection lost. Reconnecting…");
    }
  };
}

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

// Tap anywhere to toggle fullscreen.
document.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
});

connect();
