<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import BrandHeader from "../components/BrandHeader.vue";
import DeviceNote from "../components/DeviceNote.vue";
import AnimatedQr from "../components/AnimatedQr.vue";
import {
  createFountainEncoder,
  createFountainDecoder,
  scanQR,
  createOffer,
  createAnswer,
  acceptAnswer,
  type FountainEncoder,
} from "../lib/offline";
import { ensureBarcodeDetector } from "../lib/barcodePolyfill";
import { baseNotices } from "../composables/useCapabilities";

type Role = "camera" | "viewer";
type Step =
  | "intro"
  | "show-offer" // camera: display offer, wait for user to scan reply
  | "scan-answer" // camera: scanning the viewer's reply
  | "scan-offer" // viewer: scanning the camera's offer
  | "show-answer" // viewer: display reply, wait for stream
  | "connected";

const role = ref<Role | null>(null);
const step = ref<Step>("intro");
const error = ref("");
const progress = ref(0); // 0..1 while scanning
const pct = computed(() => Math.round(progress.value * 100));

const offerEnc = ref<FountainEncoder | null>(null);
const answerEnc = ref<FountainEncoder | null>(null);

const scanVideo = ref<HTMLVideoElement>();
const stageVideo = ref<HTMLVideoElement>(); // the connected-view video (self-cam or remote)
const cameraStream = ref<MediaStream | null>(null); // camera role: the feed we send + preview
const recvStream = ref<MediaStream | null>(null); // viewer role: the incoming feed
const videoReady = ref(false);
const needTap = ref(false);
const connState = ref("new");

const blockers = baseNotices().filter((n) => n.severity === "blocker");

let scanStream: MediaStream | null = null; // viewer role: temp camera for scanning
let pc: RTCPeerConnection | null = null;
let scanCancel: (() => void) | null = null;

/* ---------------- on-screen diagnostics log ---------------- */
// A phone has no dev console, so we surface a timestamped log in the UI.
const logs = ref<{ t: string; msg: string }[]>([]);
const logEl = ref<HTMLDivElement>();
const copied = ref(false);
let t0 = performance.now();

function log(msg: string) {
  logs.value.push({ t: `${((performance.now() - t0) / 1000).toFixed(1)}s`, msg });
}
watch(
  () => logs.value.length,
  () => nextTick(() => logEl.value && (logEl.value.scrollTop = logEl.value.scrollHeight)),
);
async function copyLog() {
  try {
    await navigator.clipboard.writeText(logs.value.map((l) => `${l.t} ${l.msg}`).join("\n"));
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard blocked */
  }
}

function summarizeCandidates(label: string, sdpJson: string) {
  try {
    const sdp = JSON.parse(sdpJson).sdp || "";
    const cands = sdp.split("\n").filter((l: string) => l.includes("a=candidate"));
    const types: Record<string, number> = {};
    for (const c of cands) {
      const m = c.match(/typ (\w+)/);
      if (m) types[m[1]] = (types[m[1]] || 0) + 1;
    }
    const summary = Object.entries(types)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    log(`${label}: ${cands.length} ICE candidate(s) [${summary || "none"}]`);
  } catch {
    /* ignore */
  }
}

/* ---------------- connected-view stream binding ---------------- */
// Reactively attach whichever stream belongs on the stage to the video element.
// This survives the element being re-created as the step changes (the old bug:
// a one-shot attach landed on a video that was then unmounted -> blank screen).
const stageStream = computed(() => (role.value === "camera" ? cameraStream.value : recvStream.value));
watch(
  [stageVideo, stageStream],
  ([el, stream]) => {
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play()
        .then(() => {
          needTap.value = false;
          log("stage video playing");
        })
        .catch(() => {
          needTap.value = true;
          log("autoplay blocked — tap to play");
        });
    }
  },
  { flush: "post" },
);
function onMeta() {
  videoReady.value = true;
  const v = stageVideo.value;
  if (v) log(`video ready: ${v.videoWidth}×${v.videoHeight}`);
}
function tapPlay() {
  stageVideo.value
    ?.play()
    .then(() => (needTap.value = false))
    .catch(() => {});
}

function watchPc(p: RTCPeerConnection) {
  connState.value = p.connectionState;
  p.onconnectionstatechange = () => {
    connState.value = p.connectionState;
    log(`connection: ${p.connectionState}`);
    if (p.connectionState === "connected") step.value = "connected";
    else if (["failed", "disconnected"].includes(p.connectionState) && step.value !== "connected")
      error.value = "The direct connection dropped. Make sure both phones share one hotspot and try again.";
  };
  p.oniceconnectionstatechange = () => log(`ICE: ${p.iceConnectionState}`);
}

async function getRearCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
}

async function startScan(): Promise<string> {
  await ensureBarcodeDetector(); // loads the zxing polyfill on iOS/Firefox; no-op on Chromium
  progress.value = 0;
  const dec = createFountainDecoder();
  const { done, cancel } = scanQR(scanVideo.value!, dec, (p) => (progress.value = p));
  scanCancel = cancel;
  return done;
}

/* ---------------- camera role (offerer) ---------------- */
async function beCamera() {
  error.value = "";
  logs.value = [];
  t0 = performance.now();
  role.value = "camera";
  log("role: camera (sending video)");
  try {
    cameraStream.value = await getRearCamera();
    const vt = cameraStream.value.getVideoTracks()[0];
    const s = vt?.getSettings();
    log(`camera on: ${s?.width || "?"}×${s?.height || "?"}`);
    const res = await createOffer(cameraStream.value);
    pc = res.pc;
    watchPc(pc);
    summarizeCandidates("offer", res.sdp);
    offerEnc.value = await createFountainEncoder(res.sdp);
    log(`offer ready: ${offerEnc.value.frameCount} QR block(s)`);
    step.value = "show-offer";
  } catch (e: any) {
    log(`error: ${friendly(e)}`);
    error.value = friendly(e);
    role.value = null;
  }
}

async function scanReply() {
  step.value = "scan-answer";
  await nextTick();
  try {
    if (scanVideo.value && cameraStream.value) {
      scanVideo.value.srcObject = cameraStream.value;
      await scanVideo.value.play().catch(() => {});
    }
    log("scanning watcher's reply…");
    const answerSdp = await startScan();
    log("reply received — connecting");
    summarizeCandidates("answer (remote)", answerSdp);
    await acceptAnswer(pc!, answerSdp);
    step.value = "connected";
  } catch (e: any) {
    if (String(e?.message) !== "cancelled") {
      log(`error: ${friendly(e)}`);
      error.value = friendly(e);
    }
  }
}

/* ---------------- viewer role (answerer) ---------------- */
async function beViewer() {
  error.value = "";
  logs.value = [];
  t0 = performance.now();
  role.value = "viewer";
  log("role: watcher (receiving video)");
  step.value = "scan-offer";
  await nextTick();
  try {
    scanStream = await getRearCamera();
    if (scanVideo.value) {
      scanVideo.value.srcObject = scanStream;
      await scanVideo.value.play().catch(() => {});
    }
    log("scanning camera phone's offer…");
    const offerSdp = await startScan();
    log("offer received — building reply");

    const res = await createAnswer(offerSdp, (stream) => {
      // Stash the incoming stream; the reactive binding shows it once the
      // connected view mounts. Do NOT flip `step` here — we still need to show
      // the answer QR until the camera phone scans it.
      recvStream.value = stream;
      log(`remote track received (${stream.getVideoTracks().length} video)`);
    });
    pc = res.pc;
    watchPc(pc);
    summarizeCandidates("answer", res.sdp);
    // Scanning camera no longer needed — free it.
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
    answerEnc.value = await createFountainEncoder(res.sdp);
    log(`reply ready: ${answerEnc.value.frameCount} QR block(s) — show to camera phone`);
    step.value = "show-answer";
  } catch (e: any) {
    if (String(e?.message) !== "cancelled") {
      log(`error: ${friendly(e)}`);
      error.value = friendly(e);
    }
    if (step.value === "scan-offer") role.value = null;
  }
}

function friendly(e: any): string {
  if (e?.name === "NotAllowedError") return "Camera permission was denied. Allow it and try again.";
  if (e?.name === "NotFoundError") return "No camera found on this device.";
  return `Something went wrong: ${e?.message || e}`;
}

function reset() {
  scanCancel?.();
  scanCancel = null;
  pc?.close();
  pc = null;
  cameraStream.value?.getTracks().forEach((t) => t.stop());
  scanStream?.getTracks().forEach((t) => t.stop());
  cameraStream.value = null;
  scanStream = null;
  recvStream.value = null;
  offerEnc.value = null;
  answerEnc.value = null;
  progress.value = 0;
  error.value = "";
  videoReady.value = false;
  needTap.value = false;
  connState.value = "new";
  role.value = null;
  step.value = "intro";
}

onBeforeUnmount(() => {
  scanCancel?.();
  pc?.close();
  cameraStream.value?.getTracks().forEach((t) => t.stop());
  scanStream?.getTracks().forEach((t) => t.stop());
});

const connClass = computed(() =>
  connState.value === "connected"
    ? "border-mint/50 text-mint"
    : ["failed", "disconnected"].includes(connState.value)
      ? "border-glow-b/50 text-glow-b"
      : "border-line text-muted2",
);
</script>

<template>
  <!-- connected: full-screen split view (video + diagnostics), both roles -->
  <div v-if="step === 'connected'" class="fixed inset-0 bg-black flex flex-col">
    <div class="relative flex-1 min-h-0" @click="tapPlay">
      <video
        ref="stageVideo"
        autoplay
        muted
        playsinline
        class="w-full h-full object-contain"
        @loadedmetadata="onMeta"
      ></video>

      <div class="absolute top-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <button class="text-white/80 hover:text-white" @click.stop="reset" aria-label="Stop">
          <i class="pi pi-times"></i>
        </button>
        <span class="font-round font-semibold text-white/90 text-sm">Baby Cam Cut · offline</span>
        <span class="ml-auto text-[11px] font-round px-2 py-0.5 rounded-full border" :class="connClass">
          {{ connState }}
        </span>
      </div>

      <div class="absolute bottom-2 left-3 text-[11px] text-white/70 bg-black/40 px-2 py-0.5 rounded">
        {{ role === "camera" ? "Your camera — streaming out" : "Watching the camera phone" }}
      </div>

      <div v-if="!videoReady" class="absolute inset-0 grid place-items-center text-center pointer-events-none">
        <div class="text-white/70 text-sm">
          <div class="mx-auto mb-2 w-8 h-8 rounded-full border-2 border-white/20 border-t-glow-a animate-spin"></div>
          {{ role === "viewer" ? "Waiting for video…" : "Starting camera…" }}
        </div>
      </div>

      <button v-if="needTap" class="absolute inset-0 grid place-items-center bg-black/50" @click.stop="tapPlay">
        <span class="rounded-full bg-glow-a text-night-800 px-5 py-2 font-round font-bold">Tap to play</span>
      </button>
    </div>

    <!-- diagnostics log -->
    <div class="h-52 shrink-0 bg-[#0b0e1c] border-t border-line flex flex-col">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-line">
        <i class="pi pi-list text-muted2 text-xs"></i>
        <span class="font-round font-semibold text-xs text-moon">Diagnostics</span>
        <button class="ml-auto text-muted hover:text-moon text-xs flex items-center gap-1" @click="copyLog">
          <i :class="copied ? 'pi pi-check' : 'pi pi-copy'"></i>{{ copied ? "Copied" : "Copy" }}
        </button>
        <button class="text-muted hover:text-moon text-xs flex items-center gap-1" @click="reset">
          <i class="pi pi-times"></i>Stop
        </button>
      </div>
      <div ref="logEl" class="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-[#9fb0d0]">
        <div v-for="(l, i) in logs" :key="i"><span class="text-muted2">{{ l.t }}</span> {{ l.msg }}</div>
      </div>
    </div>
  </div>

  <!-- all other steps: normal page -->
  <div v-else class="max-w-xl mx-auto px-5 py-6 min-h-dvh flex flex-col">
    <BrandHeader back />

    <div v-if="blockers.length" class="flex flex-col gap-2.5 mb-4">
      <DeviceNote v-for="n in blockers" :key="n.id" :note="n" />
    </div>

    <!-- intro / role choice -->
    <template v-if="step === 'intro'">
      <p class="text-muted text-sm mb-2 leading-relaxed">
        No internet needed. Put both phones on one personal hotspot, then link them by scanning QR codes. Nothing
        leaves your two devices.
      </p>
      <ol class="text-muted2 text-sm mb-5 list-decimal pl-5 space-y-1">
        <li>On one phone, turn on its personal hotspot; connect the other phone to it.</li>
        <li>Pick a role on each phone below.</li>
        <li>Point each phone's camera at the other's screen when asked.</li>
      </ol>
      <div class="flex flex-col gap-4">
        <button
          class="text-left rounded-2xl border border-line bg-night-700 hover:border-glow-a/60 hover:bg-night-600 transition p-5 flex items-start gap-4"
          @click="beCamera"
        >
          <span class="text-3xl">🎥</span>
          <span class="flex-1">
            <span class="block font-round font-bold text-lg">This phone is the camera</span>
            <span class="block text-muted text-sm mt-1">Watches the baby and sends the video.</span>
          </span>
        </button>
        <button
          class="text-left rounded-2xl border border-line bg-night-700 hover:border-glow-a/60 hover:bg-night-600 transition p-5 flex items-start gap-4"
          @click="beViewer"
        >
          <span class="text-3xl">📺</span>
          <span class="flex-1">
            <span class="block font-round font-bold text-lg">This phone watches</span>
            <span class="block text-muted text-sm mt-1">Shows the video from the camera phone.</span>
          </span>
        </button>
      </div>
    </template>

    <!-- camera: show offer -->
    <template v-else-if="step === 'show-offer'">
      <p class="font-round font-bold text-lg mb-1">Step 1 — show this to the watcher</p>
      <p class="text-muted text-sm mb-4">
        On the watching phone, choose “This phone watches” and point it at this code. The codes cycle — it's fine
        if the watcher misses a few.
      </p>
      <div class="grid place-items-center mb-5">
        <AnimatedQr v-if="offerEnc" :next="offerEnc.nextPart" :size="260" />
      </div>
      <button
        class="rounded-xl bg-glow-a text-night-800 px-5 py-3 font-round font-bold self-center flex items-center gap-2"
        @click="scanReply"
      >
        <i class="pi pi-qrcode"></i>Next — scan their reply
      </button>
    </template>

    <!-- camera: scan answer / viewer: scan offer (shared scanner UI) -->
    <template v-else-if="step === 'scan-answer' || step === 'scan-offer'">
      <p class="font-round font-bold text-lg mb-1">
        {{ step === "scan-offer" ? "Step 1 — scan the camera phone" : "Step 2 — scan the watcher's reply" }}
      </p>
      <p class="text-muted text-sm mb-4">Point this phone at the code on the other phone and hold steady.</p>
      <div class="relative rounded-2xl overflow-hidden bg-black border border-line aspect-video">
        <video ref="scanVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
        <div class="absolute inset-0 border-2 border-glow-a/60 m-10 rounded-xl pointer-events-none"></div>
      </div>
      <div class="mt-4">
        <div class="h-2.5 rounded-full bg-night-700 overflow-hidden">
          <div
            class="h-full bg-glow-a transition-all duration-200"
            :class="{ 'animate-pulse': pct === 0 }"
            :style="{ width: `${Math.max(pct, pct === 0 ? 8 : pct)}%` }"
          ></div>
        </div>
        <p class="text-center text-muted2 text-sm mt-2 font-mono">
          {{ pct === 0 ? "looking for code…" : `receiving ${pct}%` }}
        </p>
      </div>
    </template>

    <!-- viewer: show answer -->
    <template v-else-if="step === 'show-answer'">
      <p class="font-round font-bold text-lg mb-1">Step 2 — show this reply back</p>
      <p class="text-muted text-sm mb-4">
        On the camera phone, tap “Next — scan their reply” and point it at this code. The video starts
        automatically once it connects.
      </p>
      <div class="grid place-items-center">
        <AnimatedQr v-if="answerEnc" :next="answerEnc.nextPart" :size="260" />
      </div>
    </template>

    <p v-if="error" class="text-glow-b text-sm mt-4">{{ error }}</p>
    <button
      v-if="error && step !== 'intro'"
      class="mt-3 self-center rounded-xl border border-line bg-night-700 px-4 py-2.5 font-round font-semibold text-sm"
      @click="reset"
    >
      Start over
    </button>
  </div>
</template>
