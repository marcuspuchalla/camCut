import "./style.css";
import QRCode from "qrcode";

// --- Elements -------------------------------------------------------------
const video = document.getElementById("video") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLCanvasElement;
const zoom = document.getElementById("zoom") as HTMLCanvasElement;
const startNotice = document.getElementById("startNotice") as HTMLElement;
const controls = document.getElementById("controls") as HTMLElement;
const pipVideo = document.getElementById("pipVideo") as HTMLVideoElement;
const liveBadge = document.getElementById("liveBadge") as HTMLElement;

const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const camSelect = document.getElementById("camSelect") as HTMLSelectElement;
const flipBtn = document.getElementById("flipBtn") as HTMLButtonElement;
const goLiveBtn = document.getElementById("goLiveBtn") as HTMLButtonElement;
const fullFrameBtn = document.getElementById("fullFrameBtn") as HTMLButtonElement;
const pipBtn = document.getElementById("pipBtn") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

const sharePanel = document.getElementById("sharePanel") as HTMLElement;
const qrCanvas = document.getElementById("qr") as HTMLCanvasElement;
const shareLink = document.getElementById("shareLink") as HTMLAnchorElement;
const shareStatus = document.getElementById("shareStatus") as HTMLParagraphElement;
const cameraLink = document.getElementById("cameraLink") as HTMLAnchorElement;
const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
const shareNativeBtn = document.getElementById("shareNativeBtn") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLElement;

const octx = overlay.getContext("2d")!;
const zctx = zoom.getContext("2d")!;

// --- Room identity --------------------------------------------------------
// A stable room id lives in the page URL so the camera + viewer links stay the
// same across days and computers. Bookmark the page once and it comes back.
function makeRoomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const room =
  new URLSearchParams(location.search).get("room") ||
  localStorage.getItem("bcc-room") ||
  makeRoomId();
localStorage.setItem("bcc-room", room);
{
  const u = new URL(location.href);
  if (u.searchParams.get("room") !== room) {
    u.searchParams.set("room", room);
    history.replaceState(null, "", u);
  }
  cameraLink.textContent = u.href;
  cameraLink.href = u.href;
}

// --- Selection (optional crop) --------------------------------------------
interface Rect { x: number; y: number; w: number; h: number; }
const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const SEL_KEY = "bcc-selection";

function loadSelection(): Rect | null {
  try {
    const s = localStorage.getItem(SEL_KEY);
    return s ? (JSON.parse(s) as Rect) : null;
  } catch {
    return null;
  }
}

// null = stream the whole frame; a Rect = stream just that region.
let selection: Rect | null = loadSelection();
let dragging = false;
let dragStart = { x: 0, y: 0 };
let dragNow = { x: 0, y: 0 };

let zoomTimer = 0;
let sharing = false;
let camStream: MediaStream | null = null;

function setStatus(msg: string) {
  status.textContent = msg;
}

function showToast(msg: string) {
  toast.textContent = msg;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

// --- Camera ---------------------------------------------------------------
startBtn.addEventListener("click", () => startCamera());
flipBtn.addEventListener("click", flipCamera);
camSelect.addEventListener("change", () => startCamera(camSelect.value));

async function startCamera(deviceId?: string) {
  try {
    setStatus(deviceId ? "Switching camera…" : "Starting camera…");
    camStream?.getTracks().forEach((t) => t.stop());

    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" },
      audio: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() =>
      // Fall back to any camera (e.g. laptops without a rear camera).
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
    );

    camStream = stream;
    video.srcObject = stream;
    await video.play();

    startNotice.classList.add("hidden");
    controls.classList.remove("hidden");
    pipBtn.disabled = false;
    await populateCameras();
    syncOverlaySize();

    if (selection) {
      fullFrameBtn.classList.remove("hidden");
      setStatus("Region restored. Press “Go live”, or drag a new box.");
    } else {
      setStatus("Ready. Press “Go live”, or drag a box to zoom into a region.");
    }
    drawOverlay();
  } catch (err) {
    setStatus("Couldn't open the camera: " + (err as Error).message);
  }
}

async function populateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    if (cams.length <= 1) {
      camSelect.parentElement?.classList.add("hidden");
      flipBtn.classList.add("hidden");
      return;
    }
    const active = (video.srcObject as MediaStream)?.getVideoTracks()[0]?.getSettings()?.deviceId;
    camSelect.innerHTML = "";
    cams.forEach((c, i) => {
      const opt = document.createElement("option");
      opt.value = c.deviceId;
      opt.textContent = c.label || `Camera ${i + 1}`;
      if (c.deviceId === active) opt.selected = true;
      camSelect.appendChild(opt);
    });
    camSelect.parentElement?.classList.remove("hidden");
    flipBtn.classList.remove("hidden");
  } catch {
    /* device list is optional */
  }
}

function flipCamera() {
  const opts = [...camSelect.options];
  if (opts.length < 2) return;
  const next = (camSelect.selectedIndex + 1) % opts.length;
  camSelect.selectedIndex = next;
  startCamera(camSelect.value);
}

function syncOverlaySize() {
  const rect = overlay.getBoundingClientRect();
  overlay.width = Math.round(rect.width);
  overlay.height = Math.round(rect.height);
  drawOverlay();
}

window.addEventListener("resize", () => {
  if (camStream) syncOverlaySize();
});

// --- Selection overlay ----------------------------------------------------
function drawOverlay() {
  octx.clearRect(0, 0, overlay.width, overlay.height);

  let box: Rect | null = null;
  if (dragging) box = pixelRectFromDrag();
  else if (selection) box = normToPixel(selection);
  if (!box) return;

  octx.fillStyle = "rgba(8, 10, 20, 0.55)";
  octx.fillRect(0, 0, overlay.width, overlay.height);
  octx.clearRect(box.x, box.y, box.w, box.h);

  octx.strokeStyle = "#ffc078";
  octx.lineWidth = 2;
  octx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
}

function pixelRectFromDrag(): Rect {
  const x = Math.min(dragStart.x, dragNow.x);
  const y = Math.min(dragStart.y, dragNow.y);
  return { x, y, w: Math.abs(dragNow.x - dragStart.x), h: Math.abs(dragNow.y - dragStart.y) };
}

function normToPixel(n: Rect): Rect {
  return { x: n.x * overlay.width, y: n.y * overlay.height, w: n.w * overlay.width, h: n.h * overlay.height };
}

function pointerPos(e: PointerEvent) {
  const rect = overlay.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * overlay.width,
    y: ((e.clientY - rect.top) / rect.height) * overlay.height,
  };
}

overlay.addEventListener("pointerdown", (e) => {
  if (!camStream) return;
  dragging = true;
  dragStart = pointerPos(e);
  dragNow = dragStart;
  overlay.setPointerCapture(e.pointerId);
  drawOverlay();
});

overlay.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  dragNow = pointerPos(e);
  drawOverlay();
});

overlay.addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;

  const box = pixelRectFromDrag();
  if (box.w < 12 || box.h < 12) {
    drawOverlay();
    return;
  }
  selection = {
    x: box.x / overlay.width,
    y: box.y / overlay.height,
    w: box.w / overlay.width,
    h: box.h / overlay.height,
  };
  localStorage.setItem(SEL_KEY, JSON.stringify(selection));
  fullFrameBtn.classList.remove("hidden");
  setStatus(sharing ? "Region updated — everyone watching sees it now." : "Region set. Press “Go live”.");
  drawOverlay();
});

fullFrameBtn.addEventListener("click", () => {
  selection = null;
  localStorage.removeItem(SEL_KEY);
  fullFrameBtn.classList.add("hidden");
  drawOverlay();
  setStatus(sharing ? "Now streaming the whole frame." : "Whole frame. Press “Go live”.");
});

// --- Render loop (crop/full into the hidden canvas) -----------------------
// Driven by a timer, not requestAnimationFrame, so it keeps producing frames
// when the window loses focus (otherwise the shared stream freezes to black).
function startRender() {
  if (zoomTimer) return;
  const draw = () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const sel = selection ?? FULL;
    const sw = Math.max(2, Math.round(sel.w * vw));
    const sh = Math.max(2, Math.round(sel.h * vh));
    if (zoom.width !== sw) zoom.width = sw;
    if (zoom.height !== sh) zoom.height = sh;
    zctx.drawImage(video, sel.x * vw, sel.y * vh, sel.w * vw, sel.h * vh, 0, 0, sw, sh);
  };
  draw();
  zoomTimer = window.setInterval(draw, 1000 / 30);
}

function stopRenderIfIdle() {
  const pipOpen = document.pictureInPictureElement === pipVideo;
  if (!pipOpen && !sharing && zoomTimer) {
    clearInterval(zoomTimer);
    zoomTimer = 0;
  }
}

// --- Go live (publish over WebRTC) ----------------------------------------
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let signalWs: WebSocket | null = null;
let shareStream: MediaStream | null = null;
const peers = new Map<number, RTCPeerConnection>();

goLiveBtn.addEventListener("click", () => (sharing ? stopLive() : goLive()));

async function goLive() {
  if (!camStream) return;
  sharing = true;
  startRender();
  if (!shareStream) shareStream = zoom.captureStream(30);

  const url = `${await viewerBase()}/view?room=${encodeURIComponent(room)}`;
  shareLink.textContent = url;
  shareLink.href = url;
  QRCode.toCanvas(qrCanvas, url, { width: 200, margin: 1 }).catch(() => {});
  if (typeof navigator.share === "function") shareNativeBtn.classList.remove("hidden");

  sharePanel.classList.remove("hidden");
  liveBadge.classList.remove("hidden");
  goLiveBtn.textContent = "Stop";
  goLiveBtn.classList.remove("btn--glow");
  goLiveBtn.classList.add("btn--live");
  setStatus("You're live. Send the link to whoever's watching.");
  setShareStatus("Waiting for someone to connect…");

  connectSignaling();
}

function stopLive() {
  sharing = false;
  peers.forEach((p) => p.close());
  peers.clear();
  signalWs?.close();
  signalWs = null;
  shareStream?.getTracks().forEach((t) => t.stop());
  shareStream = null;
  stopRenderIfIdle();

  sharePanel.classList.add("hidden");
  liveBadge.classList.add("hidden");
  goLiveBtn.textContent = "Go live";
  goLiveBtn.classList.add("btn--glow");
  goLiveBtn.classList.remove("btn--live");
  setStatus("Stopped. Press “Go live” to share again.");
}

// Deployed: use the real domain. Local test: swap in the LAN IP so a phone can reach it.
async function viewerBase(): Promise<string> {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (local) {
    try {
      const info = await fetch("/api/lan-info").then((r) => r.json());
      const ip: string | undefined = info.ips?.[0];
      if (ip) return `http://${ip}:${location.port || "5188"}`;
    } catch {
      /* fall through */
    }
  }
  return location.origin;
}

function connectSignaling() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  signalWs = new WebSocket(`${proto}//${location.host}/signal`);
  signalWs.onopen = () => signalWs?.send(JSON.stringify({ type: "publisher", room }));
  signalWs.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "viewer-join") await createPeer(msg.viewerId);
    else if (msg.type === "replaced") {
      setShareStatus("This camera was opened on another device — paused here.");
      stopLive();
    } else if (msg.type === "answer") {
      await peers.get(msg.viewerId)?.setRemoteDescription(msg.sdp);
    } else if (msg.type === "ice" && msg.viewerId != null) {
      try {
        await peers.get(msg.viewerId)?.addIceCandidate(msg.candidate);
      } catch {
        /* ignore late candidates */
      }
    } else if (msg.type === "viewer-leave") {
      peers.get(msg.viewerId)?.close();
      peers.delete(msg.viewerId);
      updateViewerCount();
    }
  };
  signalWs.onclose = () => {
    if (sharing) setShareStatus("Connection to the server dropped.");
  };
}

async function createPeer(viewerId: number) {
  peers.get(viewerId)?.close();
  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers.set(viewerId, pc);

  shareStream!.getTracks().forEach((t) => pc.addTrack(t, shareStream!));
  pc.onicecandidate = (e) => {
    if (e.candidate) signalWs?.send(JSON.stringify({ type: "ice", viewerId, candidate: e.candidate }));
  };
  pc.onconnectionstatechange = () => {
    console.log(`[bcc] viewer ${viewerId}: ${pc.connectionState}`);
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) peers.delete(viewerId);
    updateViewerCount();
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signalWs?.send(JSON.stringify({ type: "offer", viewerId, sdp: offer }));
}

function updateViewerCount() {
  const states = [...peers.values()].map((p) => p.connectionState);
  const connected = states.filter((s) => s === "connected").length;
  const connecting = states.filter((s) => s === "connecting" || s === "new").length;
  if (connected > 0) setShareStatus(`${connected} watching`);
  else if (connecting > 0) setShareStatus(`Connecting… (${connecting})`);
  else setShareStatus("Waiting for someone to connect…");
}

function setShareStatus(msg: string) {
  shareStatus.textContent = msg;
}

// --- Copy / share the link ------------------------------------------------
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink.href);
    showToast("Link copied");
  } catch {
    showToast("Couldn't copy — long-press the link to copy it");
  }
});

shareNativeBtn.addEventListener("click", async () => {
  try {
    await navigator.share({
      title: "Baby Cam Cut",
      text: "Watch the baby camera:",
      url: shareLink.href,
    });
  } catch {
    /* user dismissed the share sheet */
  }
});

// --- Picture-in-Picture (desktop always-on-top window) --------------------
pipBtn.addEventListener("click", async () => {
  if (!camStream) return;
  if (document.pictureInPictureElement === pipVideo) {
    await document.exitPictureInPicture();
    return;
  }
  try {
    startRender();
    if (!pipVideo.srcObject) pipVideo.srcObject = zoom.captureStream(30);
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
  } catch (err) {
    setStatus("Couldn't open the pop-out window: " + (err as Error).message);
  }
});

pipVideo.addEventListener("enterpictureinpicture", () => (pipBtn.textContent = "📌 Close pop-out"));
pipVideo.addEventListener("leavepictureinpicture", () => {
  pipBtn.textContent = "📌 Pop out";
  pipVideo.srcObject = null;
  stopRenderIfIdle();
});

// Pop-out is a desktop feature; hide it where PiP isn't supported.
if (!("pictureInPictureEnabled" in document) || !document.pictureInPictureEnabled) {
  pipBtn.classList.add("hidden");
}
