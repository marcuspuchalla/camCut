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
 * Camera + microphone acquisition, device switching, and an output stream.
 *
 * Video: every frame is drawn onto an offscreen canvas (cropped to the
 * selection if one exists) and a live clock + URL watermark are burned into
 * the picture, so the watcher can tell "quiet room" from "frozen app" at a
 * glance. That means the canvas is ALWAYS in the transmit path — a deliberate
 * trade-off, reconciled three ways against the old background-freeze bug
 * (browsers throttle main-thread timers to ~1/min when the page is hidden):
 *
 *  1. The draw tick comes from a Web Worker's setInterval via postMessage —
 *     message events keep firing in hidden pages where main-thread timers
 *     don't.
 *  2. The canvas track uses captureStream(0) + requestFrame() after each
 *     draw, so frame capture doesn't depend on the compositor painting a
 *     hidden page.
 *  3. The camera view holds a Screen Wake Lock while live (useWakeLock), so
 *     the overnight case is a *visible* page anyway; a persistent banner
 *     warns whenever the lock isn't held.
 *
 * This still needs verification on real phones with the screen dimmed —
 * neither the type checker nor a build can prove it.
 *
 * Audio: the mic is requested in the SAME getUserMedia call as the camera. On
 * iOS a second getUserMedia() call permanently mutes the tracks from the first
 * one, so audio must never be acquired separately.
 * See https://bugs.webkit.org/show_bug.cgi?id=179363
 *
 * Baby-monitor audio deliberately disables the browser's voice-call DSP: noise
 * suppression is tuned to remove steady non-speech sound, which is exactly the
 * breathing and room tone you want to hear, and AGC pumps the noise floor
 * during silence. See BABY_AUDIO below.
 */

/**
 * Chrome historically bundles the whole audio-processing chain behind
 * echoCancellation, so AGC/noise suppression only actually switch off when
 * echoCancellation is false too. These are requests, not commands — always read
 * back getSettings() to see what the browser really gave you.
 */
const BABY_AUDIO: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
  sampleRate: 48000,
};

const FPS = 30;
const HIDDEN_FPS = 10; // page hidden: enough for a ticking clock, fewer wakeups

// The worker exists only to own a setInterval, because worker timers are not
// throttled when the page is hidden. It receives an interval in ms and posts
// a tick at that rate. Inline via Blob: no separate file, no external request.
const TICK_WORKER_SRC = `
  let t = null;
  onmessage = (e) => {
    clearInterval(t);
    if (e.data > 0) t = setInterval(() => postMessage(0), e.data);
  };
`;

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
  /** False when the device has no mic, or the user denied only the mic. */
  const hasAudio = ref(false);
  /** User-facing mute. Keeps the track attached so no renegotiation is needed. */
  const micOn = ref(true);
  /** Watermark text burned into the corner of the picture (the share host). */
  const overlayLabel = ref("");

  let tickWorker: Worker | null = null;
  let capStream: MediaStream | null = null;

  function saveSelection() {
    try {
      if (selection.value) localStorage.setItem(SEL_KEY, JSON.stringify(selection.value));
      else localStorage.removeItem(SEL_KEY);
    } catch {
      /* ignore */
    }
  }

  function tickInterval(): number {
    return Math.round(1000 / (document.visibilityState === "hidden" ? HIDDEN_FPS : FPS));
  }

  function onVisibility() {
    tickWorker?.postMessage(tickInterval());
  }

  function startDrawLoop() {
    if (tickWorker) return;
    const blob = new Blob([TICK_WORKER_SRC], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    tickWorker = new Worker(url);
    URL.revokeObjectURL(url);
    tickWorker.onmessage = draw;
    tickWorker.postMessage(tickInterval());
    document.addEventListener("visibilitychange", onVisibility);
  }

  function stopDrawLoop() {
    document.removeEventListener("visibilitychange", onVisibility);
    tickWorker?.terminate();
    tickWorker = null;
  }

  function setSelection(r: Rect | null) {
    selection.value = r;
    saveSelection();
    // The canvas track keeps streaming across crop changes (it just resizes),
    // so no stream rebuild or renegotiation is needed — draw() picks it up.
  }

  /** Live clock + watermark, drawn into the transmitted frame itself so the
   *  watcher can see the stream is still advancing even when nothing moves. */
  function drawOverlay(w: number, h: number) {
    if (!ctx) return;
    const fs = Math.min(48, Math.max(12, Math.round(h * 0.055)));
    const margin = Math.round(fs * 0.5);
    const padX = Math.round(fs * 0.45);
    const padY = Math.round(fs * 0.28);

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    ctx.font = `600 ${fs}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(time).width;
    const boxH = fs + padY * 2;
    const yBox = h - margin - boxH;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(margin, yBox, tw + padX * 2, boxH);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(time, margin + padX, yBox + boxH / 2);

    const label = overlayLabel.value;
    if (label) {
      const wfs = Math.max(10, Math.round(fs * 0.55));
      ctx.font = `500 ${wfs}px system-ui, -apple-system, sans-serif`;
      const lw = ctx.measureText(label).width;
      const lboxH = wfs + padY * 2;
      const xBox = w - margin - lw - padX * 2;
      const lyBox = h - margin - lboxH;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(xBox, lyBox, lw + padX * 2, lboxH);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(label, xBox + padX, lyBox + lboxH / 2);
    }
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
    drawOverlay(sw, sh);

    // captureStream(0) means frames only leave the canvas when we ask —
    // independent of whether a hidden page ever paints.
    const track: any = capStream?.getVideoTracks()[0];
    if (track?.requestFrame) track.requestFrame();
    else (capStream as any)?.requestFrame?.(); // older Firefox: on the stream
  }

  async function populateDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      devices.value = all.filter((d) => d.kind === "videoinput");
    } catch {
      /* ignore */
    }
  }

  function videoConstraints(deviceId?: string): MediaTrackConstraints {
    return deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } };
  }

  /** (Re)build the outgoing stream: the persistent canvas track + current audio. */
  function buildOutStream() {
    const raw = rawStream.value;
    if (!raw) return;
    startDrawLoop();
    draw(); // give the canvas valid dimensions before capturing
    if (!capStream) capStream = canvas.captureStream(0);
    outStream.value = new MediaStream([...capStream.getVideoTracks(), ...raw.getAudioTracks()]);
  }

  async function start(deviceId?: string) {
    error.value = "";
    try {
      stopTracks();
      // Camera + mic in ONE call — a second getUserMedia() permanently mutes the
      // first one's tracks on iOS.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints(deviceId),
          audio: BABY_AUDIO,
        });
      } catch (e: any) {
        // A device with no mic (or a mic-only denial) rejects the whole request.
        // Video alone is still a useful monitor, so fall back rather than fail.
        if (e?.name === "NotAllowedError") throw e;
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(deviceId) });
      }

      rawStream.value = stream;
      // ended fires when the OS/browser revokes the device (another app took
      // the camera, permission withdrawn) — never for our own stop() calls.
      // Without this the page keeps looking "live" while sending nothing.
      stream.getTracks().forEach((t) => {
        t.onended = () => {
          if (rawStream.value !== stream) return;
          error.value =
            "The system cut off the camera or microphone (another app may have taken it). Start the camera again.";
          running.value = false;
        };
      });
      hasAudio.value = stream.getAudioTracks().length > 0;
      stream.getAudioTracks().forEach((t) => (t.enabled = micOn.value));
      currentDeviceId.value = stream.getVideoTracks()[0]?.getSettings().deviceId;
      video.srcObject = stream;
      await video.play().catch(() => {});
      await populateDevices();

      buildOutStream();
      running.value = true;
    } catch (e: any) {
      error.value =
        e?.name === "NotAllowedError"
          ? "Camera or microphone permission was denied. Allow access and try again."
          : e?.name === "NotFoundError"
            ? "No camera found on this device."
            : `Could not start the camera: ${e?.message || e}`;
      running.value = false;
    }
  }

  function toggleMic() {
    micOn.value = !micOn.value;
    rawStream.value?.getAudioTracks().forEach((t) => (t.enabled = micOn.value));
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
    stopDrawLoop();
    stopTracks();
    outStream.value?.getTracks().forEach((t) => t.stop());
    capStream?.getTracks().forEach((t) => t.stop());
    capStream = null;
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
    hasAudio,
    micOn,
    toggleMic,
    overlayLabel,
    start,
    switchTo,
    flip,
    stop,
  };
}
