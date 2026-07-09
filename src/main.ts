import "./style.css";
import QRCode from "qrcode";

// --- Elements -------------------------------------------------------------
const video = document.getElementById("video") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLCanvasElement;
const zoom = document.getElementById("zoom") as HTMLCanvasElement;
const zoomPanel = document.getElementById("zoomPanel") as HTMLElement;
const startNotice = document.getElementById("startNotice") as HTMLElement;

const pipVideo = document.getElementById("pipVideo") as HTMLVideoElement;

const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const zoomBtn = document.getElementById("zoomBtn") as HTMLButtonElement;
const pipBtn = document.getElementById("pipBtn") as HTMLButtonElement;
const shareBtn = document.getElementById("shareBtn") as HTMLButtonElement;
const editBtn = document.getElementById("editBtn") as HTMLButtonElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

const sharePanel = document.getElementById("sharePanel") as HTMLElement;
const qrCanvas = document.getElementById("qr") as HTMLCanvasElement;
const shareLink = document.getElementById("shareLink") as HTMLAnchorElement;
const shareStatus = document.getElementById("shareStatus") as HTMLParagraphElement;

const octx = overlay.getContext("2d")!;
const zctx = zoom.getContext("2d")!;

// --- State ----------------------------------------------------------------
// Selection is stored normalized (0..1) relative to the video frame so it
// stays correct regardless of how the video is displayed/resized.
interface Rect { x: number; y: number; w: number; h: number; }
let selection: Rect | null = null;

let dragging = false;
let dragStart = { x: 0, y: 0 }; // in overlay-canvas pixels
let dragNow = { x: 0, y: 0 };

let zoomRAF = 0;
let sharing = false;

function setStatus(msg: string) {
  status.textContent = msg;
}

// --- Webcam ---------------------------------------------------------------
startBtn.addEventListener("click", startWebcam);

async function startWebcam() {
  try {
    setStatus("Requesting camera…");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    startNotice.classList.add("hidden");
    syncOverlaySize();
    setStatus("Drag a box on the feed to mark a region.");
  } catch (err) {
    setStatus("Could not access the webcam: " + (err as Error).message);
  }
}

// Keep the overlay canvas resolution matched to its on-screen size so the
// selection rectangle is drawn crisply and coordinates map 1:1 to the video.
function syncOverlaySize() {
  const rect = overlay.getBoundingClientRect();
  overlay.width = Math.round(rect.width);
  overlay.height = Math.round(rect.height);
  drawOverlay();
}

window.addEventListener("resize", () => {
  if (video.srcObject) syncOverlaySize();
});

// --- Drawing the selection overlay ---------------------------------------
function drawOverlay() {
  octx.clearRect(0, 0, overlay.width, overlay.height);

  let box: Rect | null = null;
  if (dragging) {
    box = pixelRectFromDrag();
  } else if (selection) {
    box = normToPixel(selection);
  }

  if (!box) return;

  // Dim everything except the selected region.
  octx.fillStyle = "rgba(0, 0, 0, 0.5)";
  octx.fillRect(0, 0, overlay.width, overlay.height);
  octx.clearRect(box.x, box.y, box.w, box.h);

  // Outline.
  octx.strokeStyle = "#4f9dff";
  octx.lineWidth = 2;
  octx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
}

function pixelRectFromDrag(): Rect {
  const x = Math.min(dragStart.x, dragNow.x);
  const y = Math.min(dragStart.y, dragNow.y);
  const w = Math.abs(dragNow.x - dragStart.x);
  const h = Math.abs(dragNow.y - dragStart.y);
  return { x, y, w, h };
}

function normToPixel(n: Rect): Rect {
  return {
    x: n.x * overlay.width,
    y: n.y * overlay.height,
    w: n.w * overlay.width,
    h: n.h * overlay.height,
  };
}

// --- Pointer (drag) handling ---------------------------------------------
function pointerPos(e: PointerEvent) {
  const rect = overlay.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * overlay.width,
    y: ((e.clientY - rect.top) / rect.height) * overlay.height,
  };
}

overlay.addEventListener("pointerdown", (e) => {
  if (!video.srcObject) return;
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
  // Ignore accidental tiny drags.
  if (box.w < 10 || box.h < 10) {
    drawOverlay();
    return;
  }

  selection = {
    x: box.x / overlay.width,
    y: box.y / overlay.height,
    w: box.w / overlay.width,
    h: box.h / overlay.height,
  };

  zoomBtn.disabled = false;
  pipBtn.disabled = false;
  shareBtn.disabled = false;
  clearBtn.disabled = false;
  setStatus("Region marked. Zoom in, pop out, or share to your phone.");
  drawOverlay();
});

// --- Zoom render loop -----------------------------------------------------
// The loop draws the selected region into the zoom canvas. It runs whenever
// the zoom panel is shown OR a Picture-in-Picture window is open, so both can
// share the same live source.
function startRender() {
  if (zoomRAF || !selection) return;
  const sel = selection;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Source rect in video pixels.
  const sx = Math.round(sel.x * vw);
  const sy = Math.round(sel.y * vh);
  const sw = Math.round(sel.w * vw);
  const sh = Math.round(sel.h * vh);

  // Render at native region resolution; CSS (panel) or PiP scales it up.
  zoom.width = sw;
  zoom.height = sh;

  const render = () => {
    zctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    zoomRAF = requestAnimationFrame(render);
  };
  render();
}

function stopRenderIfIdle() {
  // Only stop drawing when no consumer (panel, PiP, or phone share) needs frames.
  const pipOpen = document.pictureInPictureElement === pipVideo;
  const panelOpen = !zoomPanel.classList.contains("hidden");
  if (!pipOpen && !panelOpen && !sharing && zoomRAF) {
    cancelAnimationFrame(zoomRAF);
    zoomRAF = 0;
  }
}

// --- Zoom (in-page) view --------------------------------------------------
zoomBtn.addEventListener("click", () => {
  if (!selection) return;
  startRender();
  zoomPanel.classList.remove("hidden");
  document.getElementById("stage")!.classList.add("hidden");
  editBtn.classList.remove("hidden");
  zoomBtn.classList.add("hidden");
  setStatus("Showing selected region. Press “Edit selection” to change it.");
});

editBtn.addEventListener("click", () => {
  zoomPanel.classList.add("hidden");
  document.getElementById("stage")!.classList.remove("hidden");
  editBtn.classList.add("hidden");
  zoomBtn.classList.remove("hidden");
  stopRenderIfIdle();
  syncOverlaySize();
  setStatus("Drag a new box, or press “Zoom into selection”.");
});

// --- Picture-in-Picture (always-on-top floating window) -------------------
pipBtn.addEventListener("click", async () => {
  if (!selection) return;

  // Toggle off if already open.
  if (document.pictureInPictureElement === pipVideo) {
    await document.exitPictureInPicture();
    return;
  }

  try {
    startRender();
    // Feed the live zoom canvas into the hidden video, then pop it out.
    if (!pipVideo.srcObject) {
      pipVideo.srcObject = zoom.captureStream(30);
    }
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
    setStatus("Popped out. The floating window stays on top of other apps.");
  } catch (err) {
    setStatus("Could not open pop-out window: " + (err as Error).message);
  }
});

pipVideo.addEventListener("enterpictureinpicture", () => {
  pipBtn.textContent = "📌 Close pop-out";
});

pipVideo.addEventListener("leavepictureinpicture", () => {
  pipBtn.textContent = "📌 Pop out (always on top)";
  pipVideo.srcObject = null;
  stopRenderIfIdle();
});

// --- Share to phone (WebRTC over LAN) -------------------------------------
// The PC is the "publisher": it opens a signaling WebSocket, and for every
// phone that joins it spins up a peer connection carrying the live crop.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let signalWs: WebSocket | null = null;
let shareStream: MediaStream | null = null;
const peers = new Map<number, RTCPeerConnection>();

shareBtn.addEventListener("click", () => {
  if (sharing) stopSharing();
  else startSharing();
});

async function startSharing() {
  if (!selection) return;
  sharing = true;
  startRender();
  if (!shareStream) shareStream = zoom.captureStream(30);

  // Build the phone-facing link + QR from the PC's LAN IP.
  let host = location.host;
  try {
    const info = await fetch("/api/lan-info").then((r) => r.json());
    const ip: string | undefined = info.ips?.[0];
    if (ip) host = `${ip}:${location.port || "5188"}`;
  } catch {
    /* fall back to current host */
  }
  const url = `http://${host}/view.html`;
  shareLink.textContent = url;
  shareLink.href = url;
  QRCode.toCanvas(qrCanvas, url, { width: 220, margin: 1 }).catch(() => {});

  sharePanel.classList.remove("hidden");
  shareBtn.textContent = "📱 Stop sharing";
  setShareStatus("Waiting for a phone to connect…");

  connectSignaling();
}

function connectSignaling() {
  signalWs = new WebSocket(`ws://${location.host}/signal`);
  signalWs.onopen = () => signalWs?.send(JSON.stringify({ type: "publisher" }));
  signalWs.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "viewer-join") {
      await createPeer(msg.viewerId);
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
    if (sharing) setShareStatus("Signaling disconnected.");
  };
}

async function createPeer(viewerId: number) {
  peers.get(viewerId)?.close(); // replace any stale peer for this viewer
  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers.set(viewerId, pc);

  shareStream!.getTracks().forEach((t) => pc.addTrack(t, shareStream!));
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      signalWs?.send(JSON.stringify({ type: "ice", viewerId, candidate: e.candidate }));
    }
  };
  pc.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      peers.delete(viewerId);
    }
    updateViewerCount();
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signalWs?.send(JSON.stringify({ type: "offer", viewerId, sdp: offer }));
}

function updateViewerCount() {
  const n = [...peers.values()].filter((p) => p.connectionState === "connected").length;
  setShareStatus(n > 0 ? `📶 ${n} phone${n === 1 ? "" : "s"} watching.` : "Waiting for a phone to connect…");
}

function stopSharing() {
  sharing = false;
  peers.forEach((p) => p.close());
  peers.clear();
  signalWs?.close();
  signalWs = null;
  shareStream?.getTracks().forEach((t) => t.stop());
  shareStream = null;
  sharePanel.classList.add("hidden");
  shareBtn.textContent = "📱 Share to phone";
  stopRenderIfIdle();
  setStatus("Stopped sharing to phone.");
}

function setShareStatus(msg: string) {
  shareStatus.textContent = msg;
}

// --- Clear ----------------------------------------------------------------
clearBtn.addEventListener("click", async () => {
  if (sharing) stopSharing();
  if (document.pictureInPictureElement === pipVideo) {
    await document.exitPictureInPicture();
  }
  if (!zoomPanel.classList.contains("hidden")) editBtn.click();
  selection = null;
  zoomBtn.disabled = true;
  pipBtn.disabled = true;
  shareBtn.disabled = true;
  clearBtn.disabled = true;
  drawOverlay();
  setStatus("Selection cleared. Drag a new box on the feed.");
});
