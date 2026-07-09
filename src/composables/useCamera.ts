import { ref, shallowRef, onBeforeUnmount } from "vue";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
} // all normalized 0..1

const SEL_KEY = "bcc.selection";

function loadSelection(): Rect | null {
  try {
    const raw = localStorage.getItem(SEL_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (typeof r?.x === "number" && typeof r?.w === "number") return r;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Camera acquisition + device switching + a cropped output stream.
 *
 * The raw camera feed is drawn onto an offscreen canvas each frame; if a crop
 * selection exists, only that region is drawn (scaled to fill). The canvas is
 * captured via captureStream() so the cropped video can be sent over WebRTC or
 * shown in a pop-out. We drive the draw loop with setInterval (not
 * requestAnimationFrame) so it keeps running when the window loses focus.
 */
export function useCamera() {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  (video as any).playsInline = true;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const rawStream = shallowRef<MediaStream | null>(null);
  const outStream = shallowRef<MediaStream | null>(null);
  const devices = ref<MediaDeviceInfo[]>([]);
  const currentDeviceId = ref<string | undefined>(undefined);
  const selection = ref<Rect | null>(loadSelection());
  const running = ref(false);
  const error = ref("");

  let drawTimer: number | undefined;
  const FPS = 30;

  function saveSelection() {
    try {
      if (selection.value) localStorage.setItem(SEL_KEY, JSON.stringify(selection.value));
      else localStorage.removeItem(SEL_KEY);
    } catch {
      /* ignore */
    }
  }

  function setSelection(r: Rect | null) {
    selection.value = r;
    saveSelection();
  }

  function draw() {
    if (!ctx || !video.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sel = selection.value;

    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;
    if (sel) {
      sx = Math.round(sel.x * vw);
      sy = Math.round(sel.y * vh);
      sw = Math.max(2, Math.round(sel.w * vw));
      sh = Math.max(2, Math.round(sel.h * vh));
    }
    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = sw;
      canvas.height = sh;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  }

  async function populateDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      devices.value = all.filter((d) => d.kind === "videoinput");
    } catch {
      /* ignore */
    }
  }

  async function start(deviceId?: string) {
    error.value = "";
    try {
      stopTracks();
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      rawStream.value = stream;
      currentDeviceId.value = stream.getVideoTracks()[0]?.getSettings().deviceId;
      video.srcObject = stream;
      await video.play().catch(() => {});
      await populateDevices();

      if (!drawTimer) {
        drawTimer = window.setInterval(draw, Math.round(1000 / FPS));
      }
      // Give the canvas one frame before capturing so it has valid dimensions.
      draw();
      if (!outStream.value) {
        outStream.value = canvas.captureStream(FPS);
      }
      running.value = true;
    } catch (e: any) {
      error.value =
        e?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : e?.name === "NotFoundError"
            ? "No camera found on this device."
            : `Could not start the camera: ${e?.message || e}`;
      running.value = false;
    }
  }

  async function switchTo(deviceId: string) {
    await start(deviceId);
  }

  /** Cycle to the next available camera (front/back on phones). */
  async function flip() {
    if (devices.value.length < 2) return;
    const idx = devices.value.findIndex((d) => d.deviceId === currentDeviceId.value);
    const next = devices.value[(idx + 1) % devices.value.length];
    if (next) await switchTo(next.deviceId);
  }

  function stopTracks() {
    rawStream.value?.getTracks().forEach((t) => t.stop());
  }

  function stop() {
    if (drawTimer) {
      clearInterval(drawTimer);
      drawTimer = undefined;
    }
    stopTracks();
    outStream.value?.getTracks().forEach((t) => t.stop());
    outStream.value = null;
    rawStream.value = null;
    running.value = false;
  }

  onBeforeUnmount(stop);

  return {
    video,
    rawStream,
    outStream,
    devices,
    currentDeviceId,
    selection,
    setSelection,
    running,
    error,
    start,
    switchTo,
    flip,
    stop,
  };
}
